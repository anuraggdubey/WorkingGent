import { NextResponse } from "next/server"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedPageRoute = createRouteMatcher([
    "/agents(.*)",
    "/activity(.*)",
    "/settings(.*)",
    "/dashboard(.*)",
    "/analytics(.*)",
    "/automation(.*)",
])

const isProtectedApiRoute = createRouteMatcher([
    "/api/analyze-document(.*)",
    "/api/analyze-repo(.*)",
    "/api/ask-repo(.*)",
    "/api/browser-automation(.*)",
    "/api/connect-github(.*)",
    "/api/createAgent(.*)",
    "/api/download(.*)",
    "/api/fetch-repo(.*)",
    "/api/export-document(.*)",
    "/api/generate-document(.*)",
    "/api/generate-email(.*)",
    "/api/payout(.*)",
    "/api/preview(.*)",
    "/api/runAgent(.*)",
    "/api/run-coding-agent(.*)",
    "/api/send-email(.*)",
    "/api/web-search(.*)",
])

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedApiRoute(req)) {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. Sign in to continue." },
                { status: 401 }
            )
        }
    }

    if (isProtectedPageRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
}
