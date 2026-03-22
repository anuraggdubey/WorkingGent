"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
    Activity,
    ArrowRight,
    BarChart3,
    LayoutDashboard,
    Moon,
    Settings,
    Sparkles,
    SunMedium,
    X,
    Zap,
} from "lucide-react"
import { useTheme } from "next-themes"

const ROUTES = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Navigate" },
    { href: "/agents", label: "Workspace", icon: Sparkles, group: "Navigate" },
    { href: "/activity", label: "Activity", icon: Activity, group: "Navigate" },
    { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Navigate" },
    { href: "/automation", label: "Automation", icon: Zap, group: "Navigate" },
    { href: "/settings", label: "Settings", icon: Settings, group: "Navigate" },
]

export default function CommandPalette({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { setTheme } = useTheme()

    const routeCommands = useMemo(
        () =>
            ROUTES.map((route, index) => ({
            id: route.href,
            label: route.label,
            icon: route.icon,
            detail: `${index + 1}. ${route.label} section`,
            run: () => router.push(route.href),
            })),
        [router]
    )

    const themeCommands = useMemo(
        () => [
            {
                id: "theme-dark",
                label: "Switch to dark mode",
                icon: Moon,
                run: () => setTheme("dark"),
            },
            {
                id: "theme-light",
                label: "Switch to light mode",
                icon: SunMedium,
                run: () => setTheme("light"),
            },
        ],
        [setTheme]
    )

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/44 px-4 py-20 backdrop-blur-sm" onClick={onClose}>
            <div className="panel-strong w-full max-w-3xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <div className="eyebrow">Navigation menu</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">Jump to any section</div>
                    </div>
                    <button onClick={onClose} className="button-ghost h-10 w-10 rounded-2xl p-0">
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_320px]">
                        <div>
                            <div className="eyebrow px-1">Sections</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {routeCommands.map((command) => {
                                        const Icon = command.icon
                                        const isActive = command.id === pathname

                                        return (
                                            <button
                                                key={command.id}
                                                onClick={() => {
                                                    command.run()
                                                    onClose()
                                                }}
                                                className={`panel-subtle flex min-h-[136px] flex-col items-start justify-between px-5 py-5 text-left transition-all ${
                                                    isActive ? "ring-2 ring-[color:var(--ring)]" : "hover:border-[color:var(--border-strong)]"
                                                }`}
                                            >
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-primary">
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-base font-semibold text-foreground">{command.label}</div>
                                                    <div className="mt-1 text-sm text-subtle">{command.detail}</div>
                                                </div>
                                                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted">
                                                    {isActive ? "Current section" : "Open section"}
                                                    <ArrowRight size={15} />
                                                </div>
                                            </button>
                                        )
                                    })}
                            </div>
                        </div>

                        <div>
                            <div className="eyebrow px-1">Quick actions</div>
                            <div className="mt-3 space-y-3">
                                {themeCommands.map((command) => {
                                        const Icon = command.icon

                                        return (
                                            <button
                                                key={command.id}
                                                onClick={() => {
                                                    command.run()
                                                    onClose()
                                                }}
                                                className="panel-subtle flex w-full items-center justify-between px-4 py-4 text-left transition-all hover:border-[color:var(--border-strong)]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 text-primary">
                                                        <Icon size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-foreground">{command.label}</div>
                                                        <div className="text-xs text-muted">Appearance</div>
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-muted" />
                                            </button>
                                        )
                                    })}

                                <div className="panel p-5">
                                    <div className="eyebrow">Current page</div>
                                    <div className="mt-3 text-xl font-semibold text-foreground">
                                        {ROUTES.find((route) => route.href === pathname)?.label ?? "Workspace"}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-subtle">
                                        Use this menu to move between sections without scrolling around to find navigation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
