import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function GET(_: Request, context: { params: Promise<{ workspaceId: string }> }) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:status:${userId}`, 120, 60_000)

        const { workspaceId } = await context.params
        const result = await workspaceManager.getWorkspaceStatus(userId, workspaceId)
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}

export async function DELETE(_: Request, context: { params: Promise<{ workspaceId: string }> }) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:delete:${userId}`, 20, 60_000)

        const { workspaceId } = await context.params
        await workspaceManager.deleteWorkspace(userId, workspaceId)
        return NextResponse.json({ success: true })
    } catch (error) {
        return errorResponse(error)
    }
}
