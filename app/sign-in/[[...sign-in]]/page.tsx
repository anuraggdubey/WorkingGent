"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
        <main className="flex min-h-screen min-h-dvh items-center justify-center bg-background px-4 py-10">
            <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/sign-up"
                forceRedirectUrl="/agents"
                fallbackRedirectUrl="/agents"
            />
        </main>
    )
}
