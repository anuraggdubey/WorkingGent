import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

let agents: any[] = []

export async function POST(req: Request) {
    const body = await req.json()

    const newAgent = {
        id: uuidv4(),
        name: body.name,
        task: body.task,
        reward: body.reward,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle"
    }

    agents.push(newAgent)

    return NextResponse.json(newAgent)
}

export async function GET() {
    return NextResponse.json(agents)
}