"use client"

import { useSyncExternalStore } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3 } from "lucide-react"
import { useAgentContext } from "@/lib/AgentContext"

export default function AnalyticsPage() {
    const { chartData, agents, balance } = useAgentContext()
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    )

    const totalRuns = agents.reduce((acc, agent) => acc + agent.tasksCompleted, 0)
    const contributionData = agents.map((agent, index) => ({
        name: agent.name.replace(" Agent", ""),
        value: Math.max(agent.earnings, 1),
        color: ["#7c87ff", "#36b794", "#d5a456", "#ef7d95"][index % 4],
    }))
    const executionData = agents.map((agent) => ({
        name: agent.name.replace(" Agent", ""),
        completed: agent.tasksCompleted,
        score: agent.earnings,
    }))

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.25fr)_340px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Analytics</div>
                    <h1 className="page-title mt-3">Less dashboard noise, more signal.</h1>
                    <p className="page-copy mt-4">
                        Performance views now sit inside a calmer analytics surface with wider spacing, clearer hierarchy, and fewer visual interruptions.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    <StatCard label="Total score" value={balance.toFixed(0)} suffix="pts" />
                    <StatCard label="Execution runs" value={String(totalRuns)} suffix="runs" />
                    <StatCard label="Active agents" value={String(agents.length)} suffix="live" />
                </div>
            </section>

            <section className="grid-bento xl:grid-cols-[minmax(0,1.4fr)_360px]">
                <div className="panel p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="eyebrow">Score trend</div>
                            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">Cumulative platform output</h2>
                        </div>
                        <BarChart3 className="text-muted" size={18} />
                    </div>
                    <div className="mt-6 h-[340px]">
                        {mounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.32} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                                    <XAxis dataKey="time" stroke="var(--muted)" tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--surface-elevated)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "20px",
                                            color: "var(--foreground)",
                                        }}
                                    />
                                    <Area type="monotone" dataKey="earnings" stroke="var(--primary)" strokeWidth={3} fill="url(#analyticsArea)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="skeleton h-full" />
                        )}
                    </div>
                </div>

                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Contribution</div>
                    <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">Agent mix</h2>
                    <div className="mt-6 h-[320px]">
                        {mounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={contributionData} dataKey="value" innerRadius={72} outerRadius={110} stroke="none" paddingAngle={4}>
                                        {contributionData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--surface-elevated)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "20px",
                                            color: "var(--foreground)",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="skeleton h-full" />
                        )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {contributionData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2 text-sm text-subtle">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="panel p-5 sm:p-6">
                <div className="eyebrow">Execution quality</div>
                <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">Completed work by agent</h2>
                <div className="mt-6 h-[320px]">
                    {mounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={executionData}>
                                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                                <XAxis dataKey="name" stroke="var(--muted)" tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--surface-elevated)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "20px",
                                        color: "var(--foreground)",
                                    }}
                                />
                                <Bar dataKey="completed" fill="var(--primary)" radius={[10, 10, 0, 0]} />
                                <Bar dataKey="score" fill="var(--success)" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="skeleton h-full" />
                    )}
                </div>
            </section>
        </div>
    )
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix: string }) {
    return (
        <div className="panel p-5">
            <div className="metric-label">{label}</div>
            <div className="mt-3 flex items-end gap-2">
                <div className="metric-value">{value}</div>
                <div className="pb-2 text-sm text-muted">{suffix}</div>
            </div>
        </div>
    )
}
