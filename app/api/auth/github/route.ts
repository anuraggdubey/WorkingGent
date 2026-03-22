import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { getGitHubOAuthConfig, storeOAuthState } from "@/lib/githubAuth"

export async function GET() {
    const config = getGitHubOAuthConfig()
    if (!config.configured || !config.clientId) {
        return NextResponse.json({ error: "GitHub OAuth is not configured" }, { status: 500 })
    }

    const state = randomBytes(24).toString("hex")
    await storeOAuthState(state)

    const url = new URL("https://github.com/login/oauth/authorize")
    url.searchParams.set("client_id", config.clientId)
    url.searchParams.set("redirect_uri", config.callbackUrl)
    url.searchParams.set("scope", "read:user repo")
    url.searchParams.set("state", state)

    return NextResponse.redirect(url)
}
