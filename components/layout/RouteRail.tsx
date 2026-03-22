"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, LayoutDashboard, Settings, Sparkles, Zap } from "lucide-react"

const ITEMS = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, blurb: "Platform snapshot" },
    { href: "/agents", label: "Workspace", icon: Sparkles, blurb: "Run agent tasks" },
    { href: "/activity", label: "Activity", icon: Activity, blurb: "Review recent work" },
    { href: "/analytics", label: "Analytics", icon: BarChart3, blurb: "Track performance" },
    { href: "/automation", label: "Automation", icon: Zap, blurb: "Execution readiness" },
    { href: "/settings", label: "Settings", icon: Settings, blurb: "Runtime and tools" },
]

export default function RouteRail() {
    const pathname = usePathname()
    const currentItem = ITEMS.find((item) => item.href === pathname) ?? ITEMS[0]

    return (
        <div className="panel mx-auto mt-4 hidden max-w-[1240px] items-center justify-between gap-4 px-3 py-3 lg:flex">
            <div className="route-rail-current min-w-[220px]">
                <div className="eyebrow">Current section</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{currentItem.label}</div>
                <div className="text-xs text-muted">{currentItem.blurb}</div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-1 overflow-x-auto">
                {ITEMS.map((item, index) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-pill ${active ? "nav-pill-active" : ""}`}
                        >
                            <span className="nav-pill-index">{index + 1}</span>
                            <Icon size={16} />
                            {item.label}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
