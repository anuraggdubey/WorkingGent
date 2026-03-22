import { Activity, CheckCircle, Server, TrendingUp } from "lucide-react"

export default function SystemOverviewPanel({
    agentsCount,
    totalEarned,
    tasksCompleted,
}: {
    agentsCount: number
    totalEarned: number
    tasksCompleted: number
}) {
    const throughput = agentsCount > 0 ? (tasksCompleted / agentsCount).toFixed(1) : "0.0"

    return (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                title="Platform Agents"
                value={String(agentsCount)}
                detail="Coding, search, email, and GitHub"
                icon={<Server className="text-primary" size={20} />}
            />
            <StatCard
                title="Completed Runs"
                value={String(tasksCompleted)}
                detail="Successful executions recorded in the workspace"
                icon={<CheckCircle className="text-emerald-500" size={20} />}
            />
            <StatCard
                title="Operator Score"
                value={totalEarned.toFixed(0)}
                detail="Accumulated from completed agent runs"
                icon={<TrendingUp className="text-primary" size={20} />}
            />
            <StatCard
                title="Avg Work / Agent"
                value={throughput}
                detail="Average completed tasks per live platform agent"
                icon={<Activity className="text-amber-500" size={20} />}
            />
        </div>
    )
}

function StatCard({
    title,
    value,
    detail,
    icon,
}: {
    title: string
    value: string
    detail: string
    icon: React.ReactNode
}) {
    return (
        <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground">
                {icon}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                {title}
            </div>
            <div className="mt-2 text-3xl font-heading font-bold tracking-tight text-foreground">
                {value}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500">{detail}</div>
        </div>
    )
}
