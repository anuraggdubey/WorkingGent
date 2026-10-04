"use client"

import Link from "next/link"
import { ArrowRight, Code2, Chrome, FileText, Github, Globe, Mail } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useHasMounted } from "@/lib/useHasMounted"

const AGENTS = [
    { label: "Coding", icon: Code2 },
    { label: "Web Search", icon: Globe },
    { label: "Email", icon: Mail },
    { label: "GitHub", icon: Github },
    { label: "Document", icon: FileText },
    { label: "Browser", icon: Chrome },
]

export default function Home() {
    const { user, isAuthenticated, isHydrated, login } = useAuth()
    const mounted = useHasMounted()
    const canRenderClientState = mounted && isHydrated

    return (
        <div className="flex min-h-screen min-h-dvh flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 sm:px-8">
                <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
                    WorkingGent
                </Link>
                <div className="flex items-center gap-2">
                    {!canRenderClientState ? (
                        <div className="h-9 w-28" />
                    ) : !isAuthenticated ? (
                        <button
                            onClick={() => login("/agents")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-surface-elevated hover:border-foreground-soft/30 shadow-xs"
                            style={{ minHeight: 36 }}
                        >
                            <Github size={14} />
                            <span>Connect GitHub</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="hidden text-xs text-foreground-soft sm:inline">
                                @{user?.login}
                            </span>
                            <Link href="/agents" className="button-primary text-xs">
                                <span>Open Workspace</span>
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Hero */}
            <main className="flex flex-1 flex-col items-center justify-center px-5 pb-20 sm:px-6 sm:pb-24">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-elevated/80 px-3 py-1 text-xs text-foreground-soft backdrop-blur-xs">
                        <Github size={13} className="text-primary" />
                        <span>Connected GitHub Agent Swarm</span>
                    </div>

                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                        A quieter workspace for AI&#8209;assisted work.
                    </h1>
                    <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-foreground-soft sm:text-base">
                        Six specialized agents working together. Connect your GitHub account once to code, build, and publish repos seamlessly.
                    </p>

                    <div className="mt-8 flex justify-center gap-3">
                        {!canRenderClientState ? (
                            <div className="h-11 w-40" />
                        ) : !isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => login("/agents")}
                                    className="button-primary flex items-center gap-2 px-5 py-2.5 text-sm shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                                >
                                    <Github size={16} />
                                    <span>Connect with GitHub</span>
                                    <ArrowRight size={14} />
                                </button>
                                <Link href="/agents" className="button-secondary text-sm">
                                    Explore Agents
                                </Link>
                            </>
                        ) : (
                            <Link href="/agents" className="button-primary flex items-center gap-2 px-5 py-2.5 text-sm shadow-md shadow-primary/20">
                                <span>Open Workspace</span>
                                <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Minimal agent list */}
                <div className="mt-12 flex flex-wrap justify-center gap-2 sm:mt-16 sm:gap-3">
                    {AGENTS.map((agent) => {
                        const Icon = agent.icon
                        return (
                            <div key={agent.label} className="flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-2.5 text-xs text-foreground-soft ring-1 ring-border/50" style={{ minHeight: 40 }}>
                                <Icon size={14} className="text-muted" />
                                {agent.label}
                            </div>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}
