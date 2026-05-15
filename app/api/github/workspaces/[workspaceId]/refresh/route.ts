import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(_: Request, context: { params: Promise<{ workspaceId: string }> }) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:refresh:${userId}`, 30, 60_000)

        const { workspaceId } = await context.params
        const workspace = await workspaceManager.refreshWorkspace(userId, workspaceId)
        return NextResponse.json({ success: true, workspace })
    } catch (error) {
        return errorResponse(error)
    }
}
