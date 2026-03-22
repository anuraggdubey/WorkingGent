"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Code2, Activity, BarChart2, Zap, Settings, X } from "lucide-react"

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname()

    return (
        <>
            <div
                className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
                    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[86vw] max-w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:w-64 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                } lg:translate-x-0`}
            >
                <div className="flex items-center justify-between border-b border-border p-6">
                    <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all group-hover:scale-105">
                            WG
                        </div>
                        <span className="text-xl font-heading font-bold tracking-tighter text-foreground">
                            Working<span className="text-primary">Gent</span>
                        </span>
                    </Link>

                    <button onClick={onClose} className="rounded-xl border border-border p-2 text-gray-400 lg:hidden">
                        <X size={16} />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-4 text-sm font-medium">
                    <div className="mb-4 mt-2 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 opacity-80">
                        System Menu
                    </div>
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === "/dashboard"} onClick={onClose} />
                    <NavItem href="/agents" icon={<Code2 size={18} />} label="Agent Workspace" active={pathname === "/agents"} onClick={onClose} />
                    <NavItem href="/activity" icon={<Activity size={18} />} label="Activity" active={pathname === "/activity"} onClick={onClose} />
                    <NavItem href="/analytics" icon={<BarChart2 size={18} />} label="Analytics" active={pathname === "/analytics"} onClick={onClose} />

                    <div className="mb-4 mt-8 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 opacity-80">
                        Operations
                    </div>
                    <NavItem href="/automation" icon={<Zap size={18} />} label="Automation" active={pathname === "/automation"} onClick={onClose} />
                    <NavItem href="/settings" icon={<Settings size={18} />} label="Settings" active={pathname === "/settings"} onClick={onClose} />
                </nav>

                <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 px-4 py-3">
                        <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-success">
                            Web App Active
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}

function NavItem({
    href,
    icon,
    label,
    active = false,
    onClick,
}: {
    href: string
    icon: React.ReactNode
    label: string
    active?: boolean
    onClick: () => void
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                active
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-gray-500 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
            }`}
        >
            {icon}
            {label}
        </Link>
    )
}
