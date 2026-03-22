import { NextResponse } from "next/server"
import { clearGitHubSession, consumeOAuthState, getGitHubOAuthConfig, saveGitHubSession } from "@/lib/githubAuth"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")
    const config = getGitHubOAuthConfig()

    if (error) {
        return NextResponse.redirect(
            `${config.appUrl}/agents?agent=github&github_error=${encodeURIComponent(errorDescription ?? error)}`
        )
    }

    if (!config.configured || !config.clientId || !config.clientSecret) {
        return NextResponse.redirect(
            `${config.appUrl}/agents?agent=github&github_error=${encodeURIComponent("GitHub OAuth is not configured.")}`
        )
    }

    if (!code || !state || !(await consumeOAuthState(state))) {
        return NextResponse.redirect(
            `${config.appUrl}/agents?agent=github&github_error=${encodeURIComponent("GitHub OAuth state validation failed.")}`
        )
    }

    const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.callbackUrl,
        }),
        cache: "no-store",
    })

    if (!response.ok) {
        return NextResponse.redirect(
            `${config.appUrl}/agents?agent=github&github_error=${encodeURIComponent("GitHub token exchange failed.")}`
        )
    }

    const payload = await response.json()
    if (!payload.access_token || typeof payload.access_token !== "string") {
        return NextResponse.redirect(
            `${config.appUrl}/agents?agent=github&github_error=${encodeURIComponent(payload.error_description ?? "GitHub did not return an access token.")}`
        )
    }

    await saveGitHubSession(payload.access_token)

    return NextResponse.redirect(`${config.appUrl}/agents?agent=github&github_connected=1`)
}

export async function DELETE() {
    await clearGitHubSession()
    return NextResponse.json({ success: true })
}
