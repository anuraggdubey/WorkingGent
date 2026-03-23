"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Activity, Github, Loader2, LogOut, Settings, Sparkles, Unplug } from "lucide-react"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAuth } from "@/lib/AuthContext"
import { useHasMounted } from "@/lib/useHasMounted"

type PlatformStatus = {
    tools?: {
        github?: {
            configured: boolean
            connected: boolean
            login?: string
        }
    }
}

export default function TopNavbar() {
    const mounted = useHasMounted()
    const { user, isAuthenticated, logout } = useAuth()
    const pathname = usePathname()
    const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)
    const [githubBusy, setGithubBusy] = useState(false)

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
            // noop
        } finally {
            setGithubBusy(false)
        }
    }

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:h-14 sm:px-6">
            {/* Left */}
            <div className="flex items-center gap-5">
                <Link href="/agents" className="text-sm font-semibold tracking-tight text-foreground">
                    WorkingGent
                </Link>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-1 sm:flex">
                    <NavLink href="/agents" label="Workspace" icon={<Sparkles size={14} />} active={pathname === "/agents"} />
                    <NavLink href="/activity" label="Activity" icon={<Activity size={14} />} active={pathname === "/activity"} />
                    <NavLink href="/settings" label="Settings" icon={<Settings size={14} />} active={pathname === "/settings"} />
                </nav>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* GitHub (desktop only) — only render after mount */}
                {mounted && github?.configured && github.connected ? (
                    <div className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs sm:flex">
                        <Github size={13} className="text-muted" />
                        <span className="text-foreground-soft">@{github.login ?? "connected"}</span>
                        <button
                            onClick={() => void handleGitHubDisconnect()}
                            disabled={githubBusy}
                            className="ml-1 text-muted hover:text-foreground"
                            aria-label="Disconnect GitHub"
                        >
                            {githubBusy ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
                        </button>
                    </div>
                ) : mounted && github?.configured && !github.connected ? (
                    <Link href="/api/auth/github" className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground-soft hover:text-foreground sm:inline-flex">
                        <Github size={13} />
                        Connect
                    </Link>
                ) : null}

                <ThemeToggle />

                {/* Auth buttons — only render after mount to avoid hydration mismatch */}
                {!mounted ? (
                    <div className="h-8 w-8 rounded-lg sm:w-20" />
                ) : isAuthenticated && user ? (
                    <div className="flex items-center gap-1.5">
                        <span className="hidden text-xs text-foreground-soft md:inline">{user.name}</span>
                        <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-soft hover:bg-surface-elevated hover:text-foreground sm:h-8 sm:w-8" aria-label="Logout">
                            <LogOut size={15} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <SignInButton mode="modal">
                            <button className="button-ghost text-xs">Login</button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="button-primary text-xs">Register</button>
                        </SignUpButton>
                    </div>
                )}
            </div>
        </header>
    )
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                    ? "bg-primary-soft text-foreground"
                    : "text-foreground-soft hover:text-foreground"
            }`}
        >
            {icon}
            {label}
        </Link>
    )
}
