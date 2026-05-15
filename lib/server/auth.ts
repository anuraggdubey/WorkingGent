import { auth } from "@clerk/nextjs/server"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function requireAuthenticatedUser() {
    const session = await auth()

    if (!session.userId) {
        throw new AgentExecutionError("UNAUTHORIZED", "Unauthorized. Sign in to continue.", 401)
    }

    return {
        userId: session.userId,
    }
}
