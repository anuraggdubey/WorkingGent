import { NextResponse } from "next/server"
import { generateEmailDraft } from "@/lib/agents/emailAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { recipientEmail, subject, context } = body

        if (!context || !recipientEmail) {
            return NextResponse.json({ error: "Recipient email and context are required" }, { status: 400 })
        }

        const draft = await generateEmailDraft({ recipientEmail, subject, context })

        return NextResponse.json({
            success: true,
            ...draft,
        })
    } catch (error: unknown) {
        console.error("[generate-email] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json({ error: error instanceof Error ? error.message : "Email generation failed" }, { status: 500 })
    }
}
