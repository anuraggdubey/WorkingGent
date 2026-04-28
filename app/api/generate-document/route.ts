import { NextResponse } from "next/server"
import { generateDocument } from "@/lib/agents/documentAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"
import type { GeneratedDocumentFormat } from "@/types/document"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get("content-type") ?? ""
        const body = contentType.includes("multipart/form-data")
            ? await parseMultipartRequest(req)
            : await parseJsonRequest(req)
        const prompt = typeof body.prompt === "string" ? body.prompt : ""
        const format = typeof body.format === "string" ? body.format : ""

        if (!isSupportedFormat(format)) {
            return NextResponse.json(
                { error: "Supported formats are TXT, JSON, XLSX, PDF, and DOCX." },
                { status: 400 }
            )
        }

        const result = await generateDocument({
            prompt,
            format,
            imageInstruction: typeof body.imageInstruction === "string" ? body.imageInstruction : "",
            images: Array.isArray(body.images) ? body.images : [],
        })

        return NextResponse.json({
            success: true,
            ...result,
        })
    } catch (error: unknown) {
        console.error("[generate-document] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Document generation failed" },
            { status: 500 }
        )
    }
}

function isSupportedFormat(value: string): value is GeneratedDocumentFormat {
    return ["txt", "json", "xlsx", "pdf", "docx"].includes(value)
}

async function parseJsonRequest(req: Request) {
    const body = await req.json()
    return {
        prompt: typeof body.prompt === "string" ? body.prompt : "",
        format: typeof body.format === "string" ? body.format : "",
        imageInstruction: typeof body.imageInstruction === "string" ? body.imageInstruction : "",
        images: [],
    }
}

async function parseMultipartRequest(req: Request) {
    const formData = await req.formData()
    const imageEntries = formData
        .getAll("images")
        .filter((value): value is File => value instanceof File && value.size > 0)

    const images = await Promise.all(
        imageEntries.map(async (image) => ({
            fileName: image.name,
            mimeType: image.type,
            buffer: Buffer.from(await image.arrayBuffer()),
        }))
    )

    return {
        prompt: typeof formData.get("prompt") === "string" ? String(formData.get("prompt")) : "",
        format: typeof formData.get("format") === "string" ? String(formData.get("format")) : "",
        imageInstruction: typeof formData.get("imageInstruction") === "string" ? String(formData.get("imageInstruction")) : "",
        images,
    }
}
