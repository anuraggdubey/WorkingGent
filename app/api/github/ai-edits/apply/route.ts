import { NextResponse } from "next/server"
import { errorResponse, parseAIEditApplyBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:ai-apply:${userId}`, 10, 60_000)

        const body = await req.json()
        const payload = parseAIEditApplyBody(body)
        const result = await workspaceManager.applyAIEditPlan({
            userId,
            workspaceId: payload.workspaceId,
            taskId: payload.taskId,
            filePaths: payload.filePaths,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
