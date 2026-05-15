import { NextResponse } from "next/server"
import { errorResponse, parseCreateBranchBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:branch:${userId}`, 30, 60_000)

        const body = await req.json()
        const payload = parseCreateBranchBody(body)
        const workspace = await workspaceManager.createBranch({
            userId,
            ...payload,
        })

        return NextResponse.json({ success: true, workspace })
    } catch (error) {
        return errorResponse(error)
    }
}
