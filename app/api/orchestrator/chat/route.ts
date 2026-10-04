import { NextResponse } from "next/server"
import { consultOrchestrator } from "@/lib/agents/orchestratorService"
import { AgentExecutionError } from "@/lib/agents/shared"

export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { messages, investorEmails, githubRepoName } = body

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "Messages array is required." },
                { status: 400 }
            )
        }

        const result = await consultOrchestrator({
            messages,
            investorEmails: Array.isArray(investorEmails) ? investorEmails : undefined,
            githubRepoName: typeof githubRepoName === "string" ? githubRepoName : undefined,
        })

        return NextResponse.json({
            success: true,
            message: result.message,
            plan: result.plan,
        })
    } catch (error: unknown) {
        console.error("[api/orchestrator/chat] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Orchestrator consultation failed." },
            { status: 500 }
        )
    }
}
