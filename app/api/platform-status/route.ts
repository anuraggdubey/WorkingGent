import { NextResponse } from "next/server"
import { getGitHubOAuthConfig, readGitHubSession } from "@/lib/githubAuth"

async function getGroqStatus() {
    const apiKey = process.env.GROQ_API_KEY
    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"

    if (!apiKey) {
        return { configured: false, model, available: false }
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
        })

        if (!response.ok) {
            return { configured: true, model, available: false }
        }

        return {
            configured: true,
            model,
            available: true,
        }
    } catch {
        return { configured: true, model, available: false }
    }
}

async function getGitHubStatus() {
    const { configured } = getGitHubOAuthConfig()
    const session = await readGitHubSession()

    if (!configured) {
        return { configured: false, connected: false }
    }

    if (!session?.accessToken) {
        return { configured: true, connected: false }
    }

    try {
        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            return { configured: true, connected: false }
        }

        const payload = await response.json()
        return {
            configured: true,
            connected: true,
            login: payload.login,
            name: payload.name,
        }
    } catch {
        return { configured: true, connected: false }
    }
}

export async function GET() {
    const [groq, github] = await Promise.all([
        getGroqStatus(),
        getGitHubStatus(),
    ])

    return NextResponse.json({
        llm: groq,
        tools: {
            searchConfigured: Boolean(process.env.SERPAPI_API_KEY ?? process.env.SERP_API_KEY),
            emailConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
            github,
        },
        auth: {
            mode: "local",
        },
    })
}
