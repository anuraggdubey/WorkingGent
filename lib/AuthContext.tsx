"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

interface AuthUser {
    name: string
    email: string
}

interface RegisterInput {
    name: string
    email: string
    password: string
}

interface LoginInput {
    email: string
    password: string
}

interface StoredAccount extends AuthUser {
    password: string
}

interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isHydrated: boolean
    register: (input: RegisterInput) => { success: boolean; error?: string }
    login: (input: LoginInput) => { success: boolean; error?: string }
    logout: () => void
}

const ACCOUNTS_KEY = "agentforge_accounts"
const SESSION_KEY = "agentforge_session"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readAccounts(): StoredAccount[] {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) as StoredAccount[] : []
}

function writeAccounts(accounts: StoredAccount[]) {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function readSession(): AuthUser | null {
    if (typeof window === "undefined") return null

    try {
        const raw = window.localStorage.getItem(SESSION_KEY)
        return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
        return null
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        setUser(readSession())
        setIsHydrated(true)

        const onStorage = (event: StorageEvent) => {
            if (!event.key || event.key === SESSION_KEY || event.key === ACCOUNTS_KEY) {
                setUser(readSession())
            }
        }

        window.addEventListener("storage", onStorage)

        return () => {
            window.removeEventListener("storage", onStorage)
        }
    }, [])

    const value = useMemo<AuthContextType>(() => ({
        user,
        isAuthenticated: Boolean(user),
        isHydrated,
        register: ({ name, email, password }) => {
            const normalizedEmail = email.trim().toLowerCase()
            const trimmedName = name.trim()

            if (!trimmedName || !normalizedEmail || !password) {
                return { success: false, error: "Name, email, and password are required." }
            }

            const accounts = readAccounts()
            if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
                return { success: false, error: "An account with this email already exists." }
            }

            const nextUser: AuthUser = { name: trimmedName, email: normalizedEmail }
            const nextAccounts = [...accounts, { ...nextUser, password }]

            writeAccounts(nextAccounts)
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
            setUser(nextUser)

            return { success: true }
        },
        login: ({ email, password }) => {
            const normalizedEmail = email.trim().toLowerCase()
            const account = readAccounts().find(
                (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password
            )

            if (!account) {
                return { success: false, error: "Invalid email or password." }
            }

            const nextUser: AuthUser = { name: account.name, email: account.email }
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
            setUser(nextUser)

            return { success: true }
        },
        logout: () => {
            window.localStorage.removeItem(SESSION_KEY)
            setUser(null)
        },
    }), [isHydrated, user])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    return context
}
