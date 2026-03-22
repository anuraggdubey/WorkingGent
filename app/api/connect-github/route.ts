import { NextResponse } from "next/server"
import { connectGitHub } from "@/lib/agents/githubAgentService"
import { readGitHubSession } from "@/lib/githubAuth"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function GET() {
    try {
        const session = await readGitHubSession()
        if (!session?.accessToken) {
            return NextResponse.json({ error: "GitHub is not connected" }, { status: 401 })
        }

        const result = await connectGitHub(session.accessToken)
        return NextResponse.json({ success: true, ...result })
    } catch (err: unknown) {
        if (err instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: err.message, code: err.code, details: err.details },
                { status: err.status }
            )
        }

        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to connect" },
            { status: 500 }
        )
    }
}
