"use client"

import { ArrowRight, Sparkles, Workflow } from "lucide-react"
import { useAgentContext } from "@/lib/AgentContext"

export default function AutomationPage() {
    const { activities, agents } = useAgentContext()

    const executionCount = activities.filter((activity) => activity.type === "execution").length
    const failureCount = activities.filter((activity) => activity.status === "error").length
    const activeAgents = agents.filter((agent) => agent.status === "running").length

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.3fr)_360px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Automation</div>
                    <h1 className="page-title mt-3">Readiness before orchestration.</h1>
                    <p className="page-copy mt-4">
                        This page stays focused on the real state today instead of filling the screen with placeholder theory cards.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <MetricCard title="Execution runs" value={String(executionCount)} />
                    <MetricCard title="Active agents" value={String(activeAgents)} />
                    <MetricCard title="Failures logged" value={String(failureCount)} />
                    <MetricCard title="Mode" value={activeAgents > 0 ? "Live" : "Standby"} />
                </div>
            </section>

            <section className="grid-bento xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
                <div className="panel p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                            <Workflow size={18} />
                        </div>
                        <div>
                            <div className="eyebrow">Current state</div>
                            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                                No live rules are running yet
                            </h2>
                        </div>
                    </div>

                    <div className="mt-6 panel-subtle p-5">
                        <p className="text-sm leading-7 text-subtle">
                            The old placeholder scheduler and fake automation graphs are gone. This surface now reflects live execution only, until a real automation engine is ready.
                        </p>
                    </div>
                </div>

                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Next important pieces</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[
                            "Scheduled runs tied to real backend triggers",
                            "Approval chains for outbound actions like email delivery",
                            "Rule conditions derived from real activity logs and tool events",
                            "Operator alerts for failed or blocked automations",
                        ].map((item) => (
                            <div key={item} className="panel-subtle flex items-start gap-3 px-4 py-4">
                                <ArrowRight size={16} className="mt-0.5 text-primary" />
                                <p className="text-sm leading-7 text-subtle">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InsightCard icon={<Sparkles size={18} />} title="Tool-first" body="Real-world actions should stay inside backend tools." />
                <InsightCard icon={<Workflow size={18} />} title="Approval-aware" body="Sensitive actions should remain reviewable before they run." />
                <MetricCard title="Ready today" value={activeAgents > 0 ? "Live runs" : "Monitoring"} />
            </section>
        </div>
    )
}

function MetricCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="panel p-5">
            <div className="metric-label">{title}</div>
            <div className="metric-value mt-3">{value}</div>
        </div>
    )
}

function InsightCard({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode
    title: string
    body: string
}) {
    return (
        <div className="panel-subtle px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-primary">
                {icon}
            </div>
            <div className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</div>
            <p className="mt-3 text-sm leading-6 text-subtle">{body}</p>
        </div>
    )
}
