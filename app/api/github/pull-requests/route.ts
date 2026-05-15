import { NextResponse } from "next/server"
import { errorResponse, parsePullRequestBody } from "@/lib/github/api"
import { readGitHubSession } from "@/lib/githubAuth"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:pr:${userId}`, 20, 60_000)

        const session = await readGitHubSession()
        if (!session?.accessToken) {
            return NextResponse.json({ error: "GitHub is not connected" }, { status: 401 })
        }

        const body = await req.json()
        const payload = parsePullRequestBody(body)
        const result = await workspaceManager.createPullRequest({
            userId,
            workspaceId: payload.workspaceId,
            accessToken: session.accessToken,
            baseBranch: payload.baseBranch,
            title: payload.title,
            summary: payload.summary,
            issueReferences: payload.issueReferences,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
