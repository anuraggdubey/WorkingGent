import { NextResponse } from "next/server"
import { fetchRepoContext } from "@/lib/agents/githubAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { owner, repo } = body
        const pat = process.env.GITHUB_PAT

        if (!pat) {
            return NextResponse.json(
                { error: "GitHub PAT is not configured on the server. Please contact the administrator." },
                { status: 500 }
            )
        }

        if (!owner || !repo) {
            return NextResponse.json(
                { error: "Repository owner and name are required" },
                { status: 400 }
            )
        }

        const result = await fetchRepoContext({ accessToken: pat, owner, repo })

        return NextResponse.json({
            success: true,
            ...result,
        })
    } catch (err: unknown) {
        if (err instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: err.message, code: err.code, details: err.details },
                { status: err.status }
            )
        }

        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to fetch repository" },
            { status: 500 }
        )
    }
}
