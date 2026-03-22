import { ActivityLog } from "@/lib/AgentContext"

export default function LiveActivityTerminal({ activities }: { activities: ActivityLog[] }) {
    return (
        <div className="p-5 sm:p-6">
            {activities.length === 0 ? (
                <div className="panel-subtle flex min-h-[260px] flex-col items-center justify-center text-center">
                    <p className="text-base font-semibold text-foreground">No live work yet</p>
                    <p className="mt-2 max-w-md text-sm leading-7 text-subtle">
                        Run a workflow from the workspace and the latest execution trail will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.slice(0, 10).map((activity) => (
                        <article key={activity.id} className="panel-subtle px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium capitalize text-muted">
                                            {activity.type}
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">{activity.agent}</span>
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-subtle">{activity.message}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-medium text-muted">{activity.time}</div>
                                    {activity.reward !== null && (
                                        <div className="mt-2 text-sm font-semibold text-success">+{activity.reward} pts</div>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
