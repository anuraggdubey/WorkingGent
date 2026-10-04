import { readGitHubSession } from "@/lib/githubAuth"
import { AgentExecutionError } from "@/lib/agents/shared"

export async function requireAuthenticatedUser() {
    const session = await readGitHubSession()

    if (session?.accessToken) {
        return {
            userId: session.user?.login || "github_user",
            accessToken: session.accessToken,
            user: session.user,
        }
    }

    if (process.env.GITHUB_PAT) {
        return {
            userId: "dev_user",
            accessToken: process.env.GITHUB_PAT,
        }
    }

    throw new AgentExecutionError(
        "UNAUTHORIZED",
        "GitHub is not connected. Connect your GitHub account to continue.",
        401
    )
}
