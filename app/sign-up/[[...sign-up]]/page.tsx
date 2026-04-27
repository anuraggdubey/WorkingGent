"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
    return (
        <main className="flex min-h-screen min-h-dvh items-center justify-center bg-background px-4 py-10">
            <SignUp
                path="/sign-up"
                routing="path"
                signInUrl="/sign-in"
                forceRedirectUrl="/agents"
                fallbackRedirectUrl="/agents"
            />
        </main>
    )
}
