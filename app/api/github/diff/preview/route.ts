import { NextResponse } from "next/server"
import { errorResponse, parseDiffPreviewBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:diff-preview:${userId}`, 60, 60_000)

        const body = await req.json()
        const payload = parseDiffPreviewBody(body)
        const preview = await workspaceManager.previewFileEdit(
            userId,
            payload.workspaceId,
            payload.filePath,
            payload.proposedContent
        )

        return NextResponse.json({ success: true, preview })
    } catch (error) {
        return errorResponse(error)
    }
}
