import { NextResponse } from "next/server"
import { errorResponse, parseIssueScanBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:issues:${userId}`, 12, 60_000)

        const body = await req.json()
        const payload = parseIssueScanBody(body)
        const result = await workspaceManager.scanWorkspaceIssues(userId, payload.workspaceId)

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
