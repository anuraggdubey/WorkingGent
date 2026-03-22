"use client"

import React from "react"
import { useClerk, useUser } from "@clerk/nextjs"

interface AuthUser {
    name: string
    email: string
}

interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isHydrated: boolean
    logout: () => Promise<void>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

export function useAuth(): AuthContextType {
    const { isLoaded, isSignedIn, user } = useUser()
    const { signOut } = useClerk()

    const fullName = user?.fullName?.trim()
    const fallbackName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
    const email = user?.primaryEmailAddress?.emailAddress ?? ""

    return {
        user: isSignedIn
            ? {
                name: fullName || fallbackName || email || "Member",
                email,
            }
            : null,
        isAuthenticated: Boolean(isSignedIn),
        isHydrated: isLoaded,
        logout: () => signOut(),
    }
}
