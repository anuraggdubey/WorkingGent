"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, Filter, Search } from "lucide-react"
import { useAgentContext } from "@/lib/AgentContext"

export default function ActivityPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const { activities, agents } = useAgentContext()

    const filteredEvents = useMemo(() => {
        return activities.filter((event) => {
            const matchesSearch =
                event.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.message.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesType = typeFilter === "all" || event.type === typeFilter
            return matchesSearch && matchesType
        })
    }, [activities, searchTerm, typeFilter])

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Activity feed</div>
                    <h1 className="page-title mt-3">Operational history, shaped for reading.</h1>
                    <p className="page-copy mt-4">
                        Review recent executions, see which agent did the work, and filter the stream without digging through extra dashboard clutter.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {agents.map((agent) => (
                        <div key={agent.id} className="panel p-5">
                            <div className="metric-label">{agent.name}</div>
                            <div className="metric-value mt-3">{agent.tasksCompleted}</div>
                            <div className="mt-2 text-sm text-subtle">completed runs</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid-bento lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Filters</div>
                    <div className="mt-5 space-y-4">
                        <div className="input-shell flex items-center gap-3 px-4 py-3">
                            <Search size={16} className="text-muted" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search work, prompts, repos"
                                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            {["all", "execution", "system", "transfer"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                                        typeFilter === type ? "bg-[color:var(--primary-soft)] text-foreground" : "panel-subtle text-subtle"
                                    }`}
                                >
                                    <span className="capitalize">{type === "all" ? "All events" : type}</span>
                                    <ArrowUpRight size={14} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="panel p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="eyebrow">Timeline</div>
                            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                                Filtered execution stream
                            </h2>
                        </div>
                        <Filter className="text-muted" size={18} />
                    </div>

                    <div className="mt-6 space-y-4">
                        {filteredEvents.length === 0 ? (
                            <div className="panel-subtle flex min-h-[320px] flex-col items-center justify-center text-center">
                                <p className="text-base font-semibold text-foreground">No matching activity</p>
                                <p className="mt-2 max-w-md text-sm leading-7 text-subtle">
                                    Clear the filter or run one of the available agents to generate a new execution history.
                                </p>
                            </div>
                        ) : (
                            filteredEvents.map((event) => (
                                <article key={event.id} className="panel-subtle px-4 py-4 sm:px-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={pillClass(event.type)}>{event.type}</span>
                                                <span className="text-sm font-semibold text-foreground">{event.agent}</span>
                                                <span className={pillClass(event.status)}>{event.status}</span>
                                            </div>
                                            <p className="mt-3 text-sm leading-7 text-subtle">{event.message}</p>
                                        </div>
                                        <div className="shrink-0 text-left lg:text-right">
                                            <div className="text-xs font-medium text-muted">{event.time}</div>
                                            {event.reward !== null && (
                                                <div className="mt-2 text-sm font-semibold text-success">+{event.reward} pts</div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}

function pillClass(_value?: string) {
    return "rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium capitalize text-muted"
}
