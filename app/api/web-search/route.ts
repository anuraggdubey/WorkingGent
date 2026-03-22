import { NextResponse } from "next/server"
import { runWebSearchAgent } from "@/lib/agents/webSearchAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { query } = body

        if (!query || typeof query !== "string") {
            return NextResponse.json({ error: "Query is required" }, { status: 400 })
        }

        const result = await runWebSearchAgent(query)
        return NextResponse.json({ success: true, ...result })
    } catch (error: unknown) {
        console.error("[web-search] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 500 })
    }
}
