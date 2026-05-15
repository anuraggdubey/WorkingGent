import { NextResponse } from "next/server"
import { errorResponse, parseWorkspaceCommandBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:commands:preview:${userId}`, 30, 60_000)

        const body = await req.json()
        const payload = parseWorkspaceCommandBody(body)
        const preview = await workspaceManager.previewWorkspaceCommand(userId, payload)

        return NextResponse.json({ success: true, preview })
    } catch (error) {
        return errorResponse(error)
    }
}
