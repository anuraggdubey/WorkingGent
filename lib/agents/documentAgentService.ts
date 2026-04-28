import OpenAI from "openai"
import { completeWithOpenRouter, completeWithOpenRouterMessages } from "@/lib/llm/openrouter"
import { AgentExecutionError, createLlmError } from "@/lib/agents/shared"
import type {
    DocumentPreviewMode,
    DocumentTableRow,
    GeneratedDocumentFormat,
    GeneratedDocumentPayload,
    SupportedDocumentType,
} from "@/types/document"

const MAX_CONTENT_CHARS = 18000
const MAX_GENERATED_TEXT_CHARS = 24000
const MAX_GENERATION_IMAGES = 4
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])

const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `You are a document analysis expert.

Your job is to analyze structured or unstructured document content and provide clear, useful insights.

RULES:
1. Summarize content clearly
2. Extract key points
3. Highlight important data
4. If data is tabular, identify patterns
5. Keep output structured and concise

OUTPUT FORMAT:

SUMMARY:

* Main overview

KEY INSIGHTS:

* Insight 1
* Insight 2

OPTIONAL:

* Data patterns or anomalies`

const DOCUMENT_GENERATION_SYSTEM_PROMPT = `You generate downloadable documents from user prompts.

Return valid JSON only. Do not wrap it in markdown fences.

The JSON schema is:
{
  "title": string,
  "suggestedFileName": string,
  "summary": string,
  "previewMode": "text" | "json" | "table",
  "textContent": string,
  "jsonContent": object | array | null,
  "tableColumns": string[],
  "tableRows": Array<Record<string, string | number | boolean | null>>
}

Rules:
1. Match the requested output style and structure.
2. For TXT, PDF, and DOCX, prefer previewMode "text" and produce polished textContent.
3. For JSON, prefer previewMode "json" and produce a valid jsonContent object or array. Also include a readable textContent summary.
4. For Excel/XLSX, prefer previewMode "table" and produce tableColumns plus tableRows with consistent keys. Also include a concise textContent overview.
5. suggestedFileName must be short, lowercase, and hyphenated without an extension.
6. summary should be 1-2 sentences.
7. Do not leave required fields empty unless the format genuinely does not need them.
8. If images are provided, extract any useful visible text, labels, numbers, and table-like structure from them before generating the result.
9. If the user asks for spreadsheet-style output from an image, return normalized columns and rows that are easy to edit.`

export type DocumentGenerationImageInput = {
    fileName: string
    mimeType: string
    buffer: Buffer
}

export type DocumentAnalysisInput = {
    fileName: string
    mimeType: string
    buffer: Buffer
    question?: string
}

export type DocumentAnalysisResult = {
    fileName: string
    fileType: SupportedDocumentType
    normalizedContent: string
    truncated: boolean
    analysis: string
}

export type GenerateDocumentInput = {
    prompt: string
    format: GeneratedDocumentFormat
    imageInstruction?: string
    images?: DocumentGenerationImageInput[]
}

export type GenerateDocumentResult = GeneratedDocumentPayload

export type ExportDocumentInput = {
    format: GeneratedDocumentFormat
    fileName: string
    title?: string
    textContent?: string
    jsonContent?: Record<string, unknown> | Array<unknown> | null
    tableColumns?: string[]
    tableRows?: DocumentTableRow[]
}

export type ExportDocumentResult = {
    fileName: string
    mimeType: string
    buffer: Buffer
}

export async function analyzeDocument(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult> {
    const fileType = detectDocumentType(input.fileName, input.mimeType)
    const normalized = await normalizeDocument(input.buffer, input.fileName, fileType)
    const truncated = normalized.length > MAX_CONTENT_CHARS
    const normalizedContent = truncated
        ? `${normalized.slice(0, MAX_CONTENT_CHARS)}\n\n[Content truncated to fit analysis limits.]`
        : normalized

    let analysis: string
    try {
        analysis = await completeWithOpenRouter({
            system: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
            user: buildAnalysisPrompt({
                fileName: input.fileName,
                fileType,
                question: input.question,
                normalizedContent,
            }),
            maxTokens: 2200,
            temperature: 0.3,
        })
    } catch (error) {
        throw createLlmError(error, "Document analysis failed")
    }

    return {
        fileName: input.fileName,
        fileType,
        normalizedContent,
        truncated,
        analysis,
    }
}

export async function generateDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
    const prompt = input.prompt.trim()
    const imageInstruction = input.imageInstruction?.trim() ?? ""
    const images = normalizeGenerationImages(input.images ?? [])

    if (!prompt && !imageInstruction && images.length === 0) {
        throw new AgentExecutionError(
            "EMPTY_PROMPT",
            "Add a prompt or upload at least one image to generate a document.",
            400
        )
    }

    let raw: string
    try {
        raw = images.length > 0
            ? await completeWithOpenRouterMessages({
                system: DOCUMENT_GENERATION_SYSTEM_PROMPT,
                user: buildGenerationUserMessage({
                    ...input,
                    prompt,
                    imageInstruction,
                    images,
                }),
                maxTokens: 2800,
                temperature: 0.5,
            })
            : await completeWithOpenRouter({
                system: DOCUMENT_GENERATION_SYSTEM_PROMPT,
                user: buildGenerationPrompt({
                    ...input,
                    prompt,
                    imageInstruction,
                    images,
                }),
                maxTokens: 2800,
                temperature: 0.5,
            })
    } catch (error) {
        throw createLlmError(error, "Document generation failed")
    }

    const parsed = parseGeneratedDocument(raw)

    const tableRows = normalizeTableRows(parsed.tableRows)
    const tableColumns = inferTableColumns(normalizeTableColumns(parsed.tableColumns), tableRows)

    return {
        title: parsed.title?.trim() || "Generated Document",
        suggestedFileName: sanitizeFileStem(parsed.suggestedFileName || parsed.title || "generated-document"),
        format: input.format,
        previewMode: normalizePreviewMode(parsed.previewMode, input.format),
        summary: parsed.summary || `Generated ${input.format.toUpperCase()} document.`,
        textContent: truncateGeneratedText(parsed.textContent || "", MAX_GENERATED_TEXT_CHARS),
        jsonContent: normalizeJsonContent(parsed.jsonContent),
        tableColumns,
        tableRows,
    }
}

export async function exportGeneratedDocument(input: ExportDocumentInput): Promise<ExportDocumentResult> {
    const fileStem = sanitizeFileStem(input.fileName || input.title || "generated-document")
    const payload = normalizeExportInput(input)

    switch (input.format) {
        case "txt":
            return {
                fileName: `${fileStem}.txt`,
                mimeType: "text/plain; charset=utf-8",
                buffer: Buffer.from(payload.textContent, "utf-8"),
            }
        case "json":
            return {
                fileName: `${fileStem}.json`,
                mimeType: "application/json; charset=utf-8",
                buffer: Buffer.from(JSON.stringify(payload.jsonContent ?? buildJsonFallback(payload), null, 2), "utf-8"),
            }
        case "xlsx":
            return {
                fileName: `${fileStem}.xlsx`,
                mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                buffer: await buildExcelBuffer(payload),
            }
        case "pdf":
            return {
                fileName: `${fileStem}.pdf`,
                mimeType: "application/pdf",
                buffer: await buildPdfBuffer(payload),
            }
        case "docx":
            return {
                fileName: `${fileStem}.docx`,
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                buffer: await buildDocxBuffer(payload),
            }
        default:
            throw new AgentExecutionError("UNSUPPORTED_EXPORT_FORMAT", "Unsupported export format.", 400)
    }
}

function detectDocumentType(fileName: string, mimeType: string): SupportedDocumentType {
    const lowerName = fileName.toLowerCase()
    const lowerMime = mimeType.toLowerCase()

    if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) return "pdf"
    if (
        lowerName.endsWith(".xlsx") ||
        lowerName.endsWith(".xls") ||
        lowerMime.includes("spreadsheet") ||
        lowerMime.includes("excel")
    ) return "excel"
    if (lowerName.endsWith(".csv") || lowerMime.includes("csv")) return "csv"
    if (lowerName.endsWith(".json") || lowerMime.includes("json")) return "json"
    if (lowerName.endsWith(".txt") || lowerMime.startsWith("text/")) return "txt"

    throw new AgentExecutionError(
        "UNSUPPORTED_DOCUMENT_TYPE",
        "Supported file types are PDF, Excel, CSV, JSON, and TXT.",
        400
    )
}

function buildGenerationPrompt(input: GenerateDocumentInput) {
    const prompt = resolveGenerationPrompt(input)
    const imagesSummary = (input.images?.length ?? 0) > 0
        ? `Attached images: ${input.images?.map((image) => image.fileName).join(", ")}`
        : "Attached images: none"

    return [
        "Generate a document from the following request.",
        `Requested format: ${input.format}`,
        "The result should be ready for preview, editing, and download.",
        imagesSummary,
        input.imageInstruction?.trim() ? `Image extraction instructions: ${input.imageInstruction.trim()}` : "Image extraction instructions: none",
        "",
        "User prompt:",
        prompt,
    ].join("\n")
}

function buildGenerationUserMessage(input: GenerateDocumentInput): Array<OpenAI.Chat.Completions.ChatCompletionContentPart> {
    const text = buildGenerationPrompt(input)
    const imageParts = (input.images ?? []).map<OpenAI.Chat.Completions.ChatCompletionContentPartImage>((image) => ({
        type: "image_url",
        image_url: {
            url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
        },
    }))

    return [
        { type: "text", text },
        ...imageParts,
    ]
}

function parseGeneratedDocument(raw: string) {
    try {
        return JSON.parse(stripCodeFence(raw)) as Partial<GeneratedDocumentPayload>
    } catch {
        throw new AgentExecutionError("INVALID_LLM_JSON", "The model returned invalid document data. Please try again.", 502)
    }
}

async function normalizeDocument(buffer: Buffer, fileName: string, fileType: SupportedDocumentType) {
    switch (fileType) {
        case "pdf":
            return normalizePlainText(fileName, await extractPdfText(buffer))
        case "excel":
            return normalizeWorkbook(fileName, buffer)
        case "csv":
            return normalizeCsv(fileName, buffer)
        case "json":
            return normalizeJson(fileName, buffer)
        case "txt":
            return normalizePlainText(fileName, buffer.toString("utf-8"))
        default:
            throw new AgentExecutionError("UNSUPPORTED_DOCUMENT_TYPE", "Unsupported document type.", 400)
    }
}

async function extractPdfText(buffer: Buffer) {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    try {
        const result = await parser.getText()
        return result.text
    } finally {
        await parser.destroy()
    }
}

function normalizePlainText(fileName: string, text: string) {
    const compactText = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim()

    if (!compactText) {
        throw new AgentExecutionError("EMPTY_DOCUMENT", `${fileName} does not contain readable text.`, 400)
    }

    return `DOCUMENT: ${fileName}\nTYPE: text\n\nCONTENT:\n${compactText}`
}

async function normalizeWorkbook(fileName: string, buffer: Buffer) {
    const XLSX = await import("xlsx")
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sections = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
            header: 1,
            defval: "",
            blankrows: false,
        }).slice(0, 60)

        const textRows = rows.map((row, index) => `${index + 1}. ${row.map((cell) => String(cell)).join(" | ")}`)
        return `SHEET: ${sheetName}\nROWS:\n${textRows.join("\n")}`
    }).filter(Boolean)

    if (sections.length === 0) {
        throw new AgentExecutionError("EMPTY_DOCUMENT", `${fileName} does not contain readable sheets.`, 400)
    }

    return `DOCUMENT: ${fileName}\nTYPE: spreadsheet\n\n${sections.join("\n\n")}`
}

async function normalizeCsv(fileName: string, buffer: Buffer) {
    const XLSX = await import("xlsx")
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
    }).slice(0, 80)

    if (rows.length === 0) {
        throw new AgentExecutionError("EMPTY_DOCUMENT", `${fileName} does not contain readable CSV rows.`, 400)
    }

    const textRows = rows.map((row, index) => `${index + 1}. ${row.map((cell) => String(cell)).join(" | ")}`)
    return `DOCUMENT: ${fileName}\nTYPE: csv\n\nROWS:\n${textRows.join("\n")}`
}

function normalizeJson(fileName: string, buffer: Buffer) {
    const raw = buffer.toString("utf-8")

    try {
        const parsed = JSON.parse(raw)
        const pretty = JSON.stringify(parsed, null, 2)
        return `DOCUMENT: ${fileName}\nTYPE: json\n\nCONTENT:\n${pretty}`
    } catch {
        throw new AgentExecutionError("INVALID_JSON", `${fileName} is not valid JSON.`, 400)
    }
}

function buildAnalysisPrompt(input: {
    fileName: string
    fileType: SupportedDocumentType
    question?: string
    normalizedContent: string
}) {
    return [
        `Analyze this document.`,
        `File name: ${input.fileName}`,
        `Detected type: ${input.fileType}`,
        input.question?.trim() ? `User question: ${input.question.trim()}` : "User question: none provided; give a strong general analysis.",
        "",
        "Processed document content:",
        input.normalizedContent,
    ].join("\n")
}

function normalizePreviewMode(previewMode: string | undefined, format: GeneratedDocumentFormat): DocumentPreviewMode {
    if (previewMode === "text" || previewMode === "json" || previewMode === "table") {
        return previewMode
    }

    if (format === "json") return "json"
    if (format === "xlsx") return "table"
    return "text"
}

function resolveGenerationPrompt(input: GenerateDocumentInput) {
    const prompt = input.prompt.trim()
    const imageInstruction = input.imageInstruction?.trim()

    if (prompt) return prompt
    if (imageInstruction) return imageInstruction
    if (input.images && input.images.length > 0) {
        if (input.format === "xlsx") {
            return "Extract the useful data from the uploaded image and organize it into a clean spreadsheet."
        }

        return `Extract the useful information from the uploaded image and generate a ${input.format.toUpperCase()} document.`
    }

    return ""
}

function normalizeGenerationImages(images: DocumentGenerationImageInput[]) {
    if (images.length > MAX_GENERATION_IMAGES) {
        throw new AgentExecutionError(
            "TOO_MANY_IMAGES",
            `You can attach up to ${MAX_GENERATION_IMAGES} images per generation.`,
            400
        )
    }

    return images.map((image) => {
        const mimeType = image.mimeType.toLowerCase()

        if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
            throw new AgentExecutionError(
                "UNSUPPORTED_IMAGE_TYPE",
                "Supported image types are PNG, JPG, JPEG, and WEBP.",
                400
            )
        }

        if (image.buffer.length > MAX_IMAGE_BYTES) {
            throw new AgentExecutionError(
                "IMAGE_TOO_LARGE",
                `Each image must be ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB or smaller.`,
                400
            )
        }

        return {
            ...image,
            mimeType,
        }
    })
}

function normalizeJsonContent(value: unknown) {
    if (Array.isArray(value)) return value
    if (value && typeof value === "object") return value as Record<string, unknown>
    return null
}

function normalizeTableColumns(value: unknown) {
    if (!Array.isArray(value)) return []
    return value
        .map((item) => String(item).trim())
        .filter(Boolean)
}

function normalizeTableRows(value: unknown): DocumentTableRow[] {
    if (!Array.isArray(value)) return []

    return value
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
        .map((row) => {
            const normalized: DocumentTableRow = {}
            Object.entries(row).forEach(([key, cell]) => {
                if (cell === null || ["string", "number", "boolean"].includes(typeof cell)) {
                    normalized[key] = cell as string | number | boolean | null
                } else {
                    normalized[key] = JSON.stringify(cell)
                }
            })
            return normalized
        })
}

function inferTableColumns(columns: string[], rows: DocumentTableRow[]) {
    if (columns.length > 0) return columns
    return Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
}

function sanitizeFileStem(value: string) {
    const normalized = value
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    return normalized || "generated-document"
}

function truncateGeneratedText(text: string, maxChars: number) {
    const compact = text.replace(/\r/g, "").trim()
    if (!compact) return ""
    return compact.length > maxChars ? `${compact.slice(0, maxChars)}…` : compact
}

function stripCodeFence(value: string) {
    return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
}

function normalizeExportInput(input: ExportDocumentInput) {
    return {
        title: input.title?.trim() || "Generated Document",
        textContent: (input.textContent || "").replace(/\r/g, "").trim(),
        jsonContent: input.jsonContent ?? null,
        tableColumns: input.tableColumns ?? [],
        tableRows: input.tableRows ?? [],
    }
}

function buildJsonFallback(input: ReturnType<typeof normalizeExportInput>) {
    if (input.tableRows.length > 0) return input.tableRows
    return {
        title: input.title,
        content: input.textContent,
    }
}

async function buildExcelBuffer(input: ReturnType<typeof normalizeExportInput>) {
    const XLSX = await import("xlsx")
    const workbook = XLSX.utils.book_new()
    const rows = input.tableRows.length > 0
        ? input.tableRows
        : input.jsonContent && Array.isArray(input.jsonContent)
            ? input.jsonContent
            : [{ content: input.textContent }]

    const sheet = Array.isArray(rows) && rows.every((row) => row && typeof row === "object" && !Array.isArray(row))
        ? XLSX.utils.json_to_sheet(rows as Record<string, unknown>[])
        : XLSX.utils.aoa_to_sheet([[input.textContent]])

    XLSX.utils.book_append_sheet(workbook, sheet, "Document")
    return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}

async function buildPdfBuffer(input: ReturnType<typeof normalizeExportInput>) {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595.28, 841.89])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const margin = 48
    const fontSize = 11
    const lineHeight = 16
    let y = page.getHeight() - margin

    page.drawText(input.title, {
        x: margin,
        y,
        size: 18,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
    })
    y -= 28

    const blocks = buildExportTextBlocks(input)
    for (const block of blocks) {
        const lines = wrapText(block, font, fontSize, page.getWidth() - margin * 2)
        for (const line of lines) {
            if (y < margin) {
                y = page.getHeight() - margin
                pdf.addPage([595.28, 841.89])
            }
            const currentPage = pdf.getPages()[pdf.getPageCount() - 1]
            currentPage.drawText(line, {
                x: margin,
                y,
                size: fontSize,
                font,
                color: rgb(0.15, 0.15, 0.15),
            })
            y -= lineHeight
        }
        y -= 8
    }

    return Buffer.from(await pdf.save())
}

async function buildDocxBuffer(input: ReturnType<typeof normalizeExportInput>) {
    const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } = await import("docx")
    const children: Array<Paragraph | Table> = [
        new Paragraph({
            children: [new TextRun({ text: input.title, bold: true, size: 32 })],
        }),
    ]

    if (input.tableRows.length > 0) {
        const columns = input.tableColumns.length > 0
            ? input.tableColumns
            : Array.from(new Set(input.tableRows.flatMap((row) => Object.keys(row))))

        children.push(
            new Table({
                rows: [
                    new TableRow({
                        children: columns.map((column) =>
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: column, bold: true })] })],
                            })
                        ),
                    }),
                    ...input.tableRows.map((row) =>
                        new TableRow({
                            children: columns.map((column) =>
                                new TableCell({
                                    children: [new Paragraph(String(row[column] ?? ""))],
                                })
                            ),
                        })
                    ),
                ],
            })
        )
    } else if (input.jsonContent) {
        children.push(new Paragraph(JSON.stringify(input.jsonContent, null, 2)))
    } else {
        input.textContent.split(/\n{2,}/).forEach((paragraph) => {
            children.push(new Paragraph(paragraph))
        })
    }

    const doc = new Document({
        sections: [
            {
                children,
            },
        ],
    })

    return Buffer.from(await Packer.toBuffer(doc))
}

function buildExportTextBlocks(input: ReturnType<typeof normalizeExportInput>) {
    if (input.textContent) return input.textContent.split(/\n{2,}/)
    if (input.jsonContent) return [JSON.stringify(input.jsonContent, null, 2)]
    if (input.tableRows.length > 0) {
        const columns = input.tableColumns.length > 0
            ? input.tableColumns
            : Array.from(new Set(input.tableRows.flatMap((row) => Object.keys(row))))

        return [
            columns.join(" | "),
            ...input.tableRows.map((row) => columns.map((column) => String(row[column] ?? "")).join(" | ")),
        ]
    }
    return ["Generated document"]
}

function wrapText(text: string, font: PDFFontLike, fontSize: number, maxWidth: number) {
    const words = text.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let current = ""

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
            current = candidate
        } else {
            if (current) lines.push(current)
            current = word
        }
    }

    if (current) lines.push(current)
    return lines.length > 0 ? lines : [""]
}

type PDFFontLike = {
    widthOfTextAtSize(text: string, size: number): number
}
