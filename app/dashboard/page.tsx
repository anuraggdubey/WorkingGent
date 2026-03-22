"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, Bot, Github, Mail, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { useAgentContext } from "@/lib/AgentContext"
import EarningsAnalyticsPanel from "@/components/dashboard/EarningsAnalyticsPanel"
import Leaderboard from "@/components/dashboard/Leaderboard"

type PlatformStatus = {
    llm?: {
        configured: boolean
        available: boolean
        model: string
    }
    tools?: {
        searchConfigured: boolean
        emailConfigured: boolean
        github?: {
            configured: boolean
            connected: boolean
            login?: string
        }
    }
}

export default function Dashboard() {
    const { agents, chartData, balance, isHydrated } = useAgentContext()
    const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)

    useEffect(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => setPlatformStatus(data))
            .catch(() => setPlatformStatus(null))
    }, [])

    const tasksCompleted = useMemo(
        () => agents.reduce((acc, agent) => acc + agent.tasksCompleted, 0),
        [agents]
    )
    const readyAgents = useMemo(
        () => agents.filter((agent) => agent.status !== "running").length,
        [agents]
    )

    return (
        <div className="space-y-6 lg:space-y-7">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.45fr)_360px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Agent Platform</div>
                    <h1 className="page-title mt-3">A calmer control surface for tool-driven work.</h1>
                    <p className="page-copy mt-4">
                        Run coding, search, email, and GitHub workflows from one workspace with less filler and a cleaner scan path.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href="/agents" className="button-primary">
                            Open Workspace
                            <ArrowUpRight size={16} />
                        </Link>
                        <Link href="/activity" className="button-secondary">
                            Inspect Activity
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        <MetricTile label="Completed runs" value={String(tasksCompleted)} />
                        <MetricTile label="Operator score" value={balance.toFixed(0)} />
                        <MetricTile label="Live agents" value={String(agents.length)} />
                    </div>
                </div>

                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Runtime</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <StatusRow
                            icon={<Bot size={16} />}
                            title="LLM runtime"
                            value={platformStatus?.llm?.available ? "Available" : "Unavailable"}
                            detail={platformStatus?.llm?.model ?? "No model configured"}
                        />
                        <StatusRow
                            icon={<Search size={16} />}
                            title="Search tool"
                            value={platformStatus?.tools?.searchConfigured ? "Configured" : "Missing"}
                            detail="SerpAPI live retrieval"
                        />
                        <StatusRow
                            icon={<Mail size={16} />}
                            title="Email tool"
                            value={platformStatus?.tools?.emailConfigured ? "Configured" : "Missing"}
                            detail="SMTP delivery"
                        />
                        <StatusRow
                            icon={<Github size={16} />}
                            title="GitHub tool"
                            value={platformStatus?.tools?.github?.configured ? "Configured" : "Missing"}
                            detail={platformStatus?.tools?.github?.login ? `@${platformStatus.tools.github.login}` : "Repository access"}
                        />
                    </div>
                </div>
            </section>

            <section className="grid-bento xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="panel p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="eyebrow">Performance</div>
                            <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                                Output velocity and score trend
                            </h2>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--primary-soft)] p-3 text-primary">
                            <Sparkles size={18} />
                        </div>
                    </div>
                    <div className="mt-6 h-[320px] sm:h-[380px]">
                        <EarningsAnalyticsPanel
                            data={isHydrated ? chartData : []}
                            summary={{
                                totalScore: balance.toFixed(0),
                                completedRuns: String(tasksCompleted),
                                liveAgents: String(agents.length),
                                readyAgents: String(readyAgents),
                            }}
                        />
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-1">
                    <div className="panel p-5 sm:p-6">
                        <div className="eyebrow">Agents</div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {agents.map((agent) => (
                                <div key={agent.id} className="panel-subtle px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                                            <div className="mt-1 line-clamp-2 text-sm text-subtle">{agent.task}</div>
                                        </div>
                                        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${agent.status === "running" ? "bg-amber-500/12 text-amber-500" : "bg-emerald-500/12 text-emerald-500"}`}>
                                            {agent.status === "running" ? "Busy" : "Ready"}
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-background/70 px-3 py-3">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Runs</div>
                                            <div className="mt-2 text-xl font-semibold text-foreground">{agent.tasksCompleted}</div>
                                        </div>
                                        <div className="rounded-2xl bg-background/70 px-3 py-3">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Score</div>
                                            <div className="mt-2 text-xl font-semibold text-foreground">{agent.earnings.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Leaderboard agents={agents} />
                </div>
            </section>

            <section className="grid-bento lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Suggested next step</div>
                    <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                        Start in the unified workspace, not in setup screens.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-subtle">
                        The workspace now behaves like the product core. Pick an agent, describe the task in natural language, and review the result in the same view.
                    </p>
                    <Link href="/agents" className="button-primary mt-6 w-full">
                        Open Agent Workspace
                    </Link>
                </div>

                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Where to monitor</div>
                    <h2 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                        Use Activity for the live feed.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-subtle">
                        Execution logs, outputs, and the detailed event stream now stay inside Activity so the dashboard can stay focused on summary and navigation.
                    </p>
                    <Link href="/activity" className="button-secondary mt-6 w-full">
                        Open Activity
                    </Link>
                </div>
            </section>
        </div>
    )
}

function MetricTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="panel-subtle px-4 py-4">
            <div className="metric-label">{label}</div>
            <div className="metric-value mt-3">{value}</div>
        </div>
    )
}

function StatusRow({
    icon,
    title,
    value,
    detail,
}: {
    icon: React.ReactNode
    title: string
    value: string
    detail: string
}) {
    return (
        <div className="panel-subtle px-4 py-4">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 text-muted">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        <span className="text-xs font-medium text-muted">{value}</span>
                    </div>
                    <div className="mt-1 text-sm text-subtle">{detail}</div>
                </div>
            </div>
        </div>
    )
}
