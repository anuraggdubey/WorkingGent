import { NextResponse } from "next/server"
import { runBrowserAutomation } from "@/lib/agents/browserAutomationAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { task } = body

        if (!task || typeof task !== "string") {
            return NextResponse.json({ error: "Task is required" }, { status: 400 })
        }

        const result = await runBrowserAutomation(task)
        return NextResponse.json({ success: true, ...result })
    } catch (error: unknown) {
        console.error("[browser-automation] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Browser automation failed" },
            { status: 500 }
        )
    }
}
