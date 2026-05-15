import { NextResponse } from "next/server"
import { COMMAND_POLICIES } from "@/lib/github/commandPolicy"
import { errorResponse, parseWorkspaceCommandBody } from "@/lib/github/api"
import { WorkspaceManager } from "@/lib/github/workspaceManager"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { enforceRateLimit } from "@/lib/server/rateLimit"

const workspaceManager = new WorkspaceManager()

export async function GET() {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:commands:list:${userId}`, 60, 60_000)

        return NextResponse.json({ success: true, policies: COMMAND_POLICIES })
    } catch (error) {
        return errorResponse(error)
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await requireAuthenticatedUser()
        enforceRateLimit(`workspace:commands:run:${userId}`, 12, 60_000)

        const body = await req.json()
        const payload = parseWorkspaceCommandBody(body)
        const result = await workspaceManager.runWorkspaceCommand(userId, payload)

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return errorResponse(error)
    }
}
