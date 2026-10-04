"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Github, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useHasMounted } from "@/lib/useHasMounted"

export default function SignUpPage() {
    const { user, isAuthenticated, isHydrated, login } = useAuth()
    const mounted = useHasMounted()
    const isReady = mounted && isHydrated

    return (
        <main className="flex min-h-screen min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex justify-start">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs text-foreground-soft transition-colors hover:text-foreground"
                    >
                        <ArrowLeft size={14} />
                        Back to Home
                    </Link>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-7 shadow-xl shadow-black/5">
                    {/* Header */}
                    <div className="mb-6 flex flex-col items-center text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated text-foreground shadow-inner ring-1 ring-border">
                            <Github size={28} />
                        </div>
                        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                            Connect your GitHub
                        </h1>
                        <p className="mt-2 text-xs leading-relaxed text-foreground-soft">
                            Join WorkingGent with one click. Your GitHub account enables code collaboration, repository generation, and direct branch pushes.
                        </p>
                    </div>

                    {/* Action */}
                    {isReady && isAuthenticated && user ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border/80 bg-surface-elevated p-3.5 text-center">
                                <p className="text-xs text-foreground-soft">Already connected as</p>
                                <p className="mt-0.5 text-sm font-semibold text-foreground">@{user.login}</p>
                            </div>
                            <Link
                                href="/agents"
                                className="button-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
                            >
                                <span>Go to Workspace</span>
                                <ArrowRight size={15} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => login("/agents")}
                                className="button-primary flex w-full items-center justify-center gap-2.5 py-2.5 text-sm font-medium shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                            >
                                <Github size={16} />
                                <span>Continue with GitHub</span>
                            </button>

                            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/50 p-3 text-[11px] text-foreground-soft">
                                <Sparkles size={14} className="shrink-0 text-primary" />
                                <span>Quick and easy. No registration form or passwords required.</span>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-6 text-center text-xs text-muted">
                    WorkingGent AI Swarm &copy; {new Date().getFullYear()}
                </p>
            </div>
        </main>
    )
}
