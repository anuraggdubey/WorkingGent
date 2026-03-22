import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError, createToolError } from "@/lib/agents/shared"
import { emailTool } from "@/lib/tools/emailTool"

const EMAIL_SYSTEM_PROMPT = `You generate email drafts only.

Return exactly this format:
SUBJECT: <subject>

BODY:
<email body>`

export async function generateEmailDraft(input: {
    recipientEmail: string
    subject?: string
    context: string
}) {
    const raw = await completeWithOpenRouter({
        system: EMAIL_SYSTEM_PROMPT,
        user: [
            `Recipient: ${input.recipientEmail}`,
            input.subject ? `Requested subject: ${input.subject}` : "Requested subject: generate one",
            `Context: ${input.context}`,
        ].join("\n"),
        maxTokens: 1000,
        temperature: 0.5,
    })

    const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i)
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/i)
    const subject = subjectMatch?.[1]?.trim() || input.subject?.trim()
    const body = bodyMatch?.[1]?.trim()

    if (!subject || !body) {
        throw new AgentExecutionError(
            "INVALID_LLM_OUTPUT",
            "Email draft could not be parsed from the LLM response",
            502
        )
    }

    return {
        subject,
        body,
        requiresApproval: true,
        raw,
    }
}

export async function sendDraftedEmail(input: {
    approved: boolean
    to: string
    subject: string
    body: string
}) {
    if (!input.approved) {
        throw new AgentExecutionError(
            "APPROVAL_REQUIRED",
            "Explicit approval is required before sending email",
            400
        )
    }

    try {
        return await emailTool({
            to: input.to,
            subject: input.subject,
            body: input.body,
        })
    } catch (error) {
        throw createToolError("emailTool", error, "Unable to send email")
    }
}
