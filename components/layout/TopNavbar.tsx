"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, Github, Loader2, LogIn, LogOut, Menu, Sparkles, Unplug, UserCircle2, UserPlus } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAuth } from "@/lib/AuthContext"
import AuthDialog from "@/components/auth/AuthDialog"

const ROUTE_LABELS: Record<string, string> = {
    "/dashboard": "Overview",
    "/agents": "Workspace",
    "/activity": "Activity",
    "/analytics": "Analytics",
    "/automation": "Automation",
    "/settings": "Settings",
}

type PlatformStatus = {
    tools?: {
        github?: {
            configured: boolean
            connected: boolean
            login?: string
        }
    }
}

export default function TopNavbar({ onOpenCommand }: { onOpenCommand: () => void }) {
    const { user, isAuthenticated, isHydrated, logout } = useAuth()
    const pathname = usePathname()
    const [dialogMode, setDialogMode] = useState<"login" | "register">("login")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)
    const [githubBusy, setGithubBusy] = useState(false)

    const profileLabel = useMemo(() => {
        if (!user) return "Guest"
        return user.name.split(" ")[0]
    }, [user])

    const currentLabel = ROUTE_LABELS[pathname] ?? "Workspace"
    const github = platformStatus?.tools?.github

    useEffect(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => setPlatformStatus(data))
            .catch(() => setPlatformStatus(null))
    }, [])

    const handleGitHubDisconnect = async () => {
        setGithubBusy(true)

        try {
            await fetch("/api/auth/github/callback", { method: "DELETE" })
            const res = await fetch("/api/platform-status")
            const data = await res.json()
            setPlatformStatus(data)
        } catch {
            // Keep the last known state if the refresh fails.
        } finally {
            setGithubBusy(false)
        }
    }

    return (
        <>
            <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
                <div className="mx-auto flex max-w-[1520px] items-center gap-3 rounded-[28px] border border-border bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-xl sm:px-5 lg:px-6">
                    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                            <Sparkles size={18} />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-sm font-semibold tracking-[-0.03em] text-foreground">AgentForge</div>
                            <div className="text-xs text-muted">{currentLabel} section</div>
                        </div>
                    </Link>

                    <div className="ml-auto flex flex-1 justify-center lg:px-6">
                        <button onClick={onOpenCommand} className="button-secondary h-12 min-w-[148px] rounded-2xl px-4">
                            <Menu size={16} />
                            Menu
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {github?.configured ? (
                            github.connected ? (
                                <>
                                    <div className="hidden items-center gap-2 rounded-2xl border border-border bg-background/76 px-3 py-2 lg:flex">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                            <Github size={17} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-foreground">GitHub connected</div>
                                            <div className="truncate text-xs text-muted">@{github.login ?? "account"}</div>
                                        </div>
                                        <button
                                            onClick={() => void handleGitHubDisconnect()}
                                            disabled={githubBusy}
                                            className="button-ghost h-9 w-9 rounded-2xl p-0"
                                            aria-label="Disconnect GitHub"
                                        >
                                            {githubBusy ? <Loader2 size={16} className="animate-spin" /> : <Unplug size={16} />}
                                        </button>
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                        <Github size={17} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link href="/api/auth/github" className="button-secondary hidden lg:inline-flex">
                                        <Github size={15} />
                                        Connect GitHub
                                    </Link>
                                    <Link
                                        href="/api/auth/github"
                                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background/70 text-foreground lg:hidden"
                                        aria-label="Connect GitHub"
                                    >
                                        <Github size={17} />
                                    </Link>
                                </>
                            )
                        ) : null}

                        <ThemeToggle />

                        <button className="button-ghost h-11 w-11 rounded-2xl border border-border bg-background/70 p-0">
                            <Bell size={18} />
                        </button>

                        {!isHydrated ? (
                            <div className="skeleton hidden h-11 w-40 md:block" />
                        ) : isAuthenticated && user ? (
                            <div className="hidden items-center gap-3 rounded-2xl border border-border bg-background/76 px-3 py-2 md:flex">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                    <UserCircle2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-foreground">{user.name}</div>
                                    <div className="truncate text-xs text-muted">{user.email}</div>
                                </div>
                                <button onClick={logout} className="button-ghost h-9 w-9 rounded-2xl p-0">
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="hidden items-center gap-2 md:flex">
                                <button
                                    onClick={() => {
                                        setDialogMode("login")
                                        setIsDialogOpen(true)
                                    }}
                                    className="button-secondary"
                                >
                                    <LogIn size={15} />
                                    Login
                                </button>
                                <button
                                    onClick={() => {
                                        setDialogMode("register")
                                        setIsDialogOpen(true)
                                    }}
                                    className="button-primary"
                                >
                                    <UserPlus size={15} />
                                    Register
                                </button>
                            </div>
                        )}

                        {!isHydrated ? (
                            <div className="skeleton h-11 w-11 md:hidden" />
                        ) : isAuthenticated ? (
                            <button onClick={logout} className="button-secondary h-11 w-11 rounded-2xl p-0 md:hidden">
                                <span className="text-sm font-semibold">{profileLabel.slice(0, 1).toUpperCase()}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setDialogMode("login")
                                    setIsDialogOpen(true)
                                }}
                                className="button-secondary h-11 w-11 rounded-2xl p-0 md:hidden"
                            >
                                <LogIn size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <AuthDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} initialMode={dialogMode} />
        </>
    )
}
