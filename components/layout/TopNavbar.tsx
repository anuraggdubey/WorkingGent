"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Github, LogOut, Settings, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAuth } from "@/lib/AuthContext"
import { useHasMounted } from "@/lib/useHasMounted"

export default function TopNavbar() {
    const mounted = useHasMounted()
    const { user, isAuthenticated, isHydrated, login, logout } = useAuth()
    const pathname = usePathname()

    const canRenderClientState = mounted && isHydrated

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
            <div className="flex items-center gap-2">
                <ThemeToggle />

                {/* GitHub Authentication / Connection */}
                {!canRenderClientState ? (
                    <div className="h-8 w-24 rounded-lg bg-surface-elevated/40" />
                ) : isAuthenticated && user ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/60 px-2.5 py-1.5 text-xs text-foreground">
                        <Github size={13} className="text-muted" />
                        <span className="font-medium text-foreground">@{user.login}</span>
                        <button
                            onClick={() => void logout()}
                            className="ml-1 text-muted transition-colors hover:text-red-400"
                            title="Disconnect GitHub & Sign out"
                            aria-label="Disconnect GitHub"
                        >
                            <LogOut size={13} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => login(pathname)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-surface-elevated hover:border-foreground-soft/30 shadow-xs"
                    >
                        <Github size={13} />
                        <span>Connect GitHub</span>
                    </button>
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
