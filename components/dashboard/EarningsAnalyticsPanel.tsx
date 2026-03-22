"use client"

import { useEffect, useState } from "react"
import { XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts"
import type { ChartDataPoint } from "@/lib/AgentContext"

type Summary = {
    totalScore: string
    completedRuns: string
    liveAgents: string
    readyAgents: string
}

export default function EarningsAnalyticsPanel({
    data,
    summary,
}: {
    data: ChartDataPoint[]
    summary: Summary
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div className="relative z-10 h-full min-h-[320px]">
            {!mounted ? (
                <div className="h-full animate-pulse rounded-2xl border border-border bg-background/40" />
            ) : data.length === 0 ? (
                <div className="flex h-full flex-col justify-between rounded-[24px] border border-border bg-background/45 p-5">
                    <div>
                        <div className="text-sm font-semibold text-foreground">Performance overview</div>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-subtle">
                            No trend history yet. Run an agent and the dashboard will start plotting score movement here.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <SummaryTile label="Total score" value={summary.totalScore} />
                        <SummaryTile label="Completed runs" value={summary.completedRuns} />
                        <SummaryTile label="Live agents" value={summary.liveAgents} />
                        <SummaryTile label="Ready agents" value={summary.readyAgents} />
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} strokeWidth={1} />
                        <XAxis 
                            dataKey="time" 
                            stroke="#94A3B8" 
                            fontSize={10} 
                            tick={{fontWeight: '600', fontSize: '10px'}}
                            tickLine={false} 
                            axisLine={false} 
                            dy={10} 
                        />
                        <YAxis 
                            stroke="#94A3B8" 
                            fontSize={10} 
                            tick={{fontWeight: '600', fontSize: '10px'}}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}`} 
                            dx={-10}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'var(--surface)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '12px',
                                color: 'var(--foreground)',
                                fontWeight: '600',
                                padding: '12px',
                                fontSize: '12px',
                                boxShadow: 'var(--soft-shadow-lg)'
                            }}
                            cursor={{ stroke: 'var(--primary)', strokeWidth: 2, strokeDasharray: '4 4' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="earnings" 
                            stroke="var(--primary)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorEarnings)" 
                            animationDuration={1000}
                            activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[20px] border border-border bg-background/75 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{label}</div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
        </div>
    )
}
