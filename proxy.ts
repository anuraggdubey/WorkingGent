import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher([
    "/agents(.*)",
    "/activity(.*)",
    "/settings(.*)",
    "/dashboard(.*)",
    "/analytics(.*)",
    "/automation(.*)",
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
    if (isProtectedRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
}
