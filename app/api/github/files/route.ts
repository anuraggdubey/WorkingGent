import { NextResponse } from "next/server"
import { errorResponse, parseWorkspaceFileQuery } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function GET(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:file:${userId}`, 120, 60_000)

        const { workspaceId, filePath } = parseWorkspaceFileQuery(req.url)
        const file = await workspaceManager.readWorkspaceFile(userId, workspaceId, filePath)
        return NextResponse.json({ success: true, file })
    } catch (error) {
        return errorResponse(error)
    }
}
