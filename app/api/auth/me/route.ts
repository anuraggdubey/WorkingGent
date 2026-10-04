import { NextResponse } from "next/server"
import { readGitHubSession } from "@/lib/githubAuth"

export async function GET() {
    const session = await readGitHubSession()

    if (!session?.accessToken) {
        return NextResponse.json({
            isAuthenticated: false,
            user: null,
        })
    }

    return NextResponse.json({
        isAuthenticated: true,
        user: session.user || {
            login: "github_user",
            name: "Connected User",
        },
    })
}
