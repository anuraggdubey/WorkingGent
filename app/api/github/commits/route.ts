import { NextResponse } from "next/server"
import { errorResponse, parseCommitBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:commit:${userId}`, 40, 60_000)

        const body = await req.json()
        const payload = parseCommitBody(body)
        const result = await workspaceManager.commitWorkspaceChanges({
            userId,
            workspaceId: payload.workspaceId,
            message: payload.message,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
