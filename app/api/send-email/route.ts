import { NextResponse } from "next/server"
import { sendDraftedEmail } from "@/lib/agents/emailAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { to, subject, htmlBody, textBody, approved } = body

        if (!to || !subject || (!htmlBody && !textBody)) {
            return NextResponse.json(
                { error: "Recipient, subject, and body are all required" },
                { status: 400 }
            )
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return NextResponse.json(
                { error: `Invalid email address: ${to}` },
                { status: 400 }
            )
        }

        const info = await sendDraftedEmail({
            approved: Boolean(approved),
            to,
            subject,
            body: textBody ?? htmlBody,
        })

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            message: `Email sent successfully to ${to}`,
        })
    } catch (error: unknown) {
        console.error("[send-email] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        const message =
            (error as { code?: string })?.code === "EAUTH"
                ? "Authentication failed. Check your EMAIL_USER / EMAIL_PASS in .env.local."
                : (error as { code?: string })?.code === "ECONNREFUSED"
                ? "Could not connect to SMTP server. Check EMAIL_HOST / EMAIL_PORT in .env.local."
                : error instanceof Error
                ? error.message
                : "Failed to send email"

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
