"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface AuthUser {
    id?: number
    login: string
    name?: string
    email?: string
    avatarUrl?: string
}

export interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isHydrated: boolean
    login: (redirectTo?: string) => void
    logout: () => Promise<void>
    refresh: () => Promise<void>
}

const defaultAuthContext: AuthContextType = {
    user: null,
    isAuthenticated: false,
    isHydrated: false,
    login: () => {},
    logout: async () => {},
    refresh: async () => {},
}

const AuthContext = createContext<AuthContextType>(defaultAuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [isHydrated, setIsHydrated] = useState<boolean>(false)

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me", { cache: "no-store" })
            if (res.ok) {
                const data = await res.json()
                if (data.isAuthenticated && data.user) {
                    setUser(data.user)
                    setIsAuthenticated(true)
                } else {
                    setUser(null)
                    setIsAuthenticated(false)
                }
            } else {
                setUser(null)
                setIsAuthenticated(false)
            }
        } catch {
            setUser(null)
            setIsAuthenticated(false)
        } finally {
            setIsHydrated(true)
        }
    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    const login = useCallback((redirectTo?: string) => {
        const query = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
        window.location.href = `/api/auth/github${query}`
    }, [])

    const logout = useCallback(async () => {
        try {
            await fetch("/api/auth/github/callback", { method: "DELETE" })
        } catch {
            // ignore network failure
        }
        setUser(null)
        setIsAuthenticated(false)
        window.location.href = "/"
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isHydrated,
                login,
                logout,
                refresh: checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    return useContext(AuthContext)
}
