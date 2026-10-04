import { NextResponse } from "next/server"
import { executeSwarm, type SwarmPlan } from "@/lib/agents/orchestratorService"
import { AgentExecutionError } from "@/lib/agents/shared"

export const maxDuration = 120

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { plan, investorEmails, userEmail, githubToken } = body

        if (!plan || typeof plan !== "object" || !plan.projectTitle) {
            return NextResponse.json(
                { error: "Valid approved SwarmPlan is required." },
                { status: 400 }
            )
        }

        // Determine base URL
        const host = req.headers.get("host") || "localhost:3000"
        const protocol = host.includes("localhost") ? "http" : "https"
        const appBaseUrl = process.env.APP_URL || `${protocol}://${host}`

        const deliverables = await executeSwarm({
            plan: plan as SwarmPlan,
            userEmail: typeof userEmail === "string" ? userEmail : undefined,
            investorEmails: Array.isArray(investorEmails) ? investorEmails : undefined,
            githubToken: typeof githubToken === "string" ? githubToken : undefined,
            appBaseUrl,
        })

        return NextResponse.json({
            success: true,
            deliverables,
        })
    } catch (error: unknown) {
        console.error("[api/orchestrator/execute] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Multi-agent swarm execution failed." },
            { status: 500 }
        )
    }
}
