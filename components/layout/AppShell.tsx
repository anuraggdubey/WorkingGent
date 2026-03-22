"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import TopNavbar from "@/components/layout/TopNavbar"
import RouteRail from "@/components/layout/RouteRail"
import MobileDock from "@/components/layout/MobileDock"
import CommandPalette from "@/components/layout/CommandPalette"

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [commandOpen, setCommandOpen] = useState(false)
    const pathname = usePathname()

    if (pathname === "/") {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <TopNavbar onOpenCommand={() => setCommandOpen(true)} />
            <div className="fixed inset-x-0 top-0 z-40 hidden lg:block">
                <RouteRail />
            </div>

            <main className="page-shell">
                {children}
            </main>

            <MobileDock />
            <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
        </div>
    )
}
