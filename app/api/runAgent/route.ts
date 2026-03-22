import { NextResponse } from "next/server"
import { runAgentTask } from "@/lib/aiAgent"

export async function POST(req: Request) {
    const body = await req.json()
    const result = await runAgentTask(body.task)

    return NextResponse.json({
        message: "Agent completed task",
        result: {
            result: result.result,
            reward: body.reward,
            mode: result.mode,
            status: result.status,
        },
    })
}
