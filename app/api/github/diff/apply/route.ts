import { NextResponse } from "next/server"
import { errorResponse, parseDiffApplyBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:diff-apply:${userId}`, 60, 60_000)

        const body = await req.json()
        const payload = parseDiffApplyBody(body)
        const file = await workspaceManager.applyFileEdit(
            userId,
            payload.workspaceId,
            payload.filePath,
            payload.proposedContent,
            payload.expectedOriginalHash
        )

        return NextResponse.json({ success: true, file })
    } catch (error) {
        return errorResponse(error)
    }
}
