"use client"

import Link from "next/link"
import { ArrowRight, Code2, Chrome, FileText, Github, Globe, Mail } from "lucide-react"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { useAuth } from "@/lib/AuthContext"

const AGENTS = [
    { label: "Coding", icon: Code2 },
    { label: "Web Search", icon: Globe },
    { label: "Email", icon: Mail },
    { label: "GitHub", icon: Github },
    { label: "Document", icon: FileText },
    { label: "Browser", icon: Chrome },
]

export default function Home() {
    const { isAuthenticated, isHydrated } = useAuth()

    return (
        <div className="flex min-h-screen min-h-dvh flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 sm:px-8">
                <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
                    WorkingGent
                </Link>
                <div className="flex items-center gap-2">
                    {!isHydrated ? null : !isAuthenticated ? (
                        <>
                            <SignInButton mode="modal">
                                <button className="px-3 py-2 text-sm text-foreground-soft hover:text-foreground" style={{ minHeight: 44 }}>Login</button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="button-primary text-sm">Register</button>
                            </SignUpButton>
                        </>
                    ) : (
                        <Link href="/agents" className="button-primary text-sm">
                            Open Workspace
                            <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </header>

            {/* Hero */}
            <main className="flex flex-1 flex-col items-center justify-center px-5 pb-20 sm:px-6 sm:pb-24">
                <div className="mx-auto max-w-2xl text-center">
                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                        A quieter workspace for AI&#8209;assisted work.
                    </h1>
                    <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-foreground-soft sm:text-base">
                        Six specialized agents. One command surface. No dashboard clutter.
                    </p>

                    <div className="mt-8 flex justify-center gap-3">
                        {!isHydrated ? null : !isAuthenticated ? (
                            <>
                                <SignUpButton mode="modal">
                                    <button className="button-primary">
                                        Get Started
                                        <ArrowRight size={14} />
                                    </button>
                                </SignUpButton>
                                <SignInButton mode="modal">
                                    <button className="button-secondary">Login</button>
                                </SignInButton>
                            </>
                        ) : (
                            <Link href="/agents" className="button-primary">
                                Open Workspace
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
                            <div key={agent.label} className="flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-2.5 text-xs text-foreground-soft" style={{ minHeight: 40 }}>
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
