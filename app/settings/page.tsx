"use client"

import { useEffect, useState } from "react"
import { Bot, CheckCircle2, Github, LogOut, Mail, Search, Settings, Shield, UserCircle2 } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

type PlatformStatus = {
    llm?: {
        configured: boolean
        available: boolean
        model: string
        isFreeTier?: boolean
        usageWeekly?: number
    }
    tools?: {
        searchConfigured: boolean
        emailConfigured: boolean
        github?: {
            configured: boolean
            connected: boolean
            login?: string
            name?: string
        }
    }
    auth?: {
        mode: string
    }
}

export default function SettingsPage() {
    const { isAuthenticated, user, logout } = useAuth()
    const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)

    useEffect(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => setPlatformStatus(data))
            .catch(() => setPlatformStatus(null))
    }, [])

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.25fr)_340px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Settings</div>
                    <h1 className="page-title mt-3">Configuration that reads like product, not admin chrome.</h1>
                    <p className="page-copy mt-4">
                        Authentication, runtime status, and integrations stay in one simpler view so new users can understand the setup quickly.
                    </p>
                </div>
                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Profile</div>
                    {isAuthenticated && user ? (
                        <div className="mt-5 space-y-4">
                            <div className="panel-subtle px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                        <UserCircle2 size={22} />
                                    </div>
                                    <div>
                                        <div className="text-base font-semibold text-foreground">{user.name}</div>
                                        <div className="text-sm text-subtle">{user.email}</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={logout} className="button-secondary w-full">
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="mt-5 panel-subtle px-4 py-4 text-sm leading-7 text-subtle">
                            No active session yet. Use the auth controls in the top bar to sign in or register.
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card title="Auth mode" icon={<Shield size={18} />} rows={[
                    ["Provider", platformStatus?.auth?.mode ?? "local"],
                    ["Session", isAuthenticated ? "Active" : "Inactive"],
                ]} />
                <Card title="LLM runtime" icon={<Bot size={18} />} rows={[
                    ["Configured", platformStatus?.llm?.configured ? "Yes" : "No"],
                    ["Available", platformStatus?.llm?.available ? "Yes" : "No"],
                    ["Model", platformStatus?.llm?.model ?? "Unknown"],
                    ["Tier", platformStatus?.llm?.isFreeTier ? "Free" : "Paid / standard"],
                ]} />
                <Card title="Usage" icon={<Settings size={18} />} rows={[
                    ["Weekly usage", String(platformStatus?.llm?.usageWeekly ?? 0)],
                    ["Available agents", "6"],
                    ["Connected tools", `${Number(Boolean(platformStatus?.tools?.searchConfigured)) + Number(Boolean(platformStatus?.tools?.emailConfigured)) + Number(Boolean(platformStatus?.tools?.github?.configured))}`],
                ]} />
            </section>

            <section className="panel p-5 sm:p-6">
                <div className="eyebrow">Integrations</div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <IntegrationCard icon={<Search size={17} />} title="Search" detail="SerpAPI retrieval for live evidence-backed answers." active={Boolean(platformStatus?.tools?.searchConfigured)} />
                    <IntegrationCard icon={<Mail size={17} />} title="Email" detail="SMTP delivery with explicit approval before send." active={Boolean(platformStatus?.tools?.emailConfigured)} />
                    <IntegrationCard icon={<Github size={17} />} title="GitHub" detail={platformStatus?.tools?.github?.login ? `Connected as @${platformStatus.tools.github.login}` : "Repository access via GitHub REST API."} active={Boolean(platformStatus?.tools?.github?.configured)} />
                </div>
            </section>
        </div>
    )
}

function Card({
    title,
    icon,
    rows,
}: {
    title: string
    icon: React.ReactNode
    rows: Array<[string, string]>
}) {
    return (
        <div className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                    {icon}
                </div>
                <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</div>
            </div>
            <div className="mt-5 space-y-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="panel-subtle flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-subtle">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function IntegrationCard({
    icon,
    title,
    detail,
    active,
}: {
    icon: React.ReactNode
    title: string
    detail: string
    active: boolean
}) {
    return (
        <div className="panel-subtle px-5 py-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-primary">
                    {icon}
                </div>
                {active && <CheckCircle2 size={16} className="text-success" />}
            </div>
            <div className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</div>
            <p className="mt-3 text-sm leading-7 text-subtle">{detail}</p>
        </div>
    )
}
