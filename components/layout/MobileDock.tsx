"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, LayoutDashboard, Settings, Sparkles } from "lucide-react"

const ITEMS = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/agents", label: "Workspace", icon: Sparkles },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
]

export default function MobileDock() {
    const pathname = usePathname()

    return (
        <div className="fixed inset-x-4 bottom-4 z-50 lg:hidden">
            <div className="panel-strong flex items-center justify-between px-2 py-2">
                {ITEMS.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                                active ? "bg-[color:var(--primary-soft)] text-foreground" : "text-muted"
                            }`}
                        >
                            <Icon size={18} />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
