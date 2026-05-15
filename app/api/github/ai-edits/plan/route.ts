import { NextResponse } from "next/server"
import { errorResponse, parseAIEditPlanBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:ai-plan:${userId}`, 10, 60_000)

        const body = await req.json()
        const payload = parseAIEditPlanBody(body)
        const result = await workspaceManager.generateAIEditPlan({
            userId,
            workspaceId: payload.workspaceId,
            prompt: payload.prompt,
            filePaths: payload.filePaths,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
