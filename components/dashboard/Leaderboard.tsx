import { Agent } from "@/types/agent"

export default function Leaderboard({ agents }: { agents: Agent[] }) {
    const sortedAgents = [...agents].sort((a, b) => b.tasksCompleted - a.tasksCompleted || b.earnings - a.earnings)
    const topThree = sortedAgents.slice(0, 3)
    const remaining = sortedAgents.slice(3)

    return (
        <div className="panel p-5 sm:p-6">
            <div className="eyebrow">Leaderboard</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {topThree.map((agent, index) => (
                    <div
                        key={agent.id}
                        className={`panel-subtle px-4 py-5 ${
                            index === 0 ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : ""
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                                Rank {index + 1}
                            </div>
                            <div className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground">
                                {agent.status === "running" ? "Busy" : "Ready"}
                            </div>
                        </div>
                        <div className="mt-5 text-lg font-semibold text-foreground">{agent.name}</div>
                        <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                            {agent.earnings.toFixed(0)} pts
                        </div>
                        <div className="mt-2 text-sm text-subtle">{agent.tasksCompleted} completed runs</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                {remaining.map((agent, index) => (
                    <div key={agent.id} className="panel-subtle px-4 py-4">
                        <div className="grid items-center gap-3 sm:grid-cols-[56px_minmax(0,1fr)_auto_auto]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-sm font-semibold text-foreground">
                                {index + 4}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                                <div className="mt-1 text-sm text-subtle">{agent.tasksCompleted} completed runs</div>
                            </div>
                            <div className="text-sm font-semibold text-foreground">{agent.earnings.toFixed(0)} pts</div>
                            <div className="text-xs font-medium text-muted">{agent.status === "running" ? "Busy" : "Ready"}</div>
                        </div>
                    </div>
                ))}
                {sortedAgents.length === 0 && (
                    <div className="panel-subtle px-4 py-5 text-sm text-subtle">No agents available yet.</div>
                )}
                {sortedAgents.length <= 3 && sortedAgents.length > 0 && (
                    <div className="panel-subtle px-4 py-4 text-sm text-subtle">
                        Rankings will expand automatically as more agent activity comes in.
                    </div>
                )}
            </div>
        </div>
    )
}
