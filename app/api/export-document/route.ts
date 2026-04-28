import { exportGeneratedDocument } from "@/lib/agents/documentAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"
import type { GeneratedDocumentFormat } from "@/types/document"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const format = typeof body.format === "string" ? body.format : ""

        if (!isSupportedFormat(format)) {
            return Response.json(
                { error: "Supported formats are TXT, JSON, XLSX, PDF, and DOCX." },
                { status: 400 }
            )
        }

        const result = await exportGeneratedDocument({
            format,
            fileName: typeof body.fileName === "string" ? body.fileName : "generated-document",
            title: typeof body.title === "string" ? body.title : undefined,
            textContent: typeof body.textContent === "string" ? body.textContent : undefined,
            jsonContent: body.jsonContent,
            tableColumns: Array.isArray(body.tableColumns) ? body.tableColumns : undefined,
            tableRows: Array.isArray(body.tableRows) ? body.tableRows : undefined,
        })

        return new Response(new Uint8Array(result.buffer), {
            headers: {
                "Content-Type": result.mimeType,
                "Content-Disposition": `attachment; filename="${result.fileName}"`,
                "Content-Length": String(result.buffer.length),
            },
        })
    } catch (error: unknown) {
        console.error("[export-document] Error:", error)

        if (error instanceof AgentExecutionError) {
            return Response.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return Response.json(
            { error: error instanceof Error ? error.message : "Document export failed" },
            { status: 500 }
        )
    }
}

function isSupportedFormat(value: string): value is GeneratedDocumentFormat {
    return ["txt", "json", "xlsx", "pdf", "docx"].includes(value)
}
