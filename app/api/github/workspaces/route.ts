import { NextResponse } from "next/server"
import { readGitHubSession } from "@/lib/githubAuth"
import { parseCloneWorkspaceBody, errorResponse } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function GET() {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:list:${userId}`, 60, 60_000)

        const workspaces = await workspaceManager.listWorkspaces(userId)
        return NextResponse.json({ success: true, workspaces })
    } catch (error) {
        return errorResponse(error)
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:clone:${userId}`, 8, 60_000)

        const session = await readGitHubSession()
        if (!session?.accessToken) {
            return NextResponse.json({ error: "GitHub is not connected" }, { status: 401 })
        }

        const body = await req.json()
        const payload = parseCloneWorkspaceBody(body)
        const result = await workspaceManager.cloneWorkspace({
            userId,
            accessToken: session.accessToken,
            ...payload,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
