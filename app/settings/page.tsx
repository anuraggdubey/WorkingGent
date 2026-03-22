"use client"

import { LogOut, Shield, UserCircle2 } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

export default function SettingsPage() {
    const { isAuthenticated, user, logout } = useAuth()

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.25fr)_340px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Settings</div>
                    <h1 className="page-title mt-3">A quieter settings surface for everyday use.</h1>
                    <p className="page-copy mt-4">
                        This area stays focused on your account and workspace comfort, not the underlying stack powering the agents.
                    </p>
                </div>
                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Profile</div>
                    {isAuthenticated && user ? (
                        <div className="mt-5 space-y-4">
                            <div className="panel-subtle px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                        <UserCircle2 size={22} />
                                    </div>
                                    <div>
                                        <div className="text-base font-semibold text-foreground">{user.name}</div>
                                        <div className="text-sm text-subtle">{user.email}</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={logout} className="button-secondary w-full">
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="mt-5 panel-subtle px-4 py-4 text-sm leading-7 text-subtle">
                            No active session yet. Use the top bar to sign in or register.
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="panel p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                            <Shield size={18} />
                        </div>
                        <div>
                            <div className="eyebrow">Privacy</div>
                            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                                Product-facing by default
                            </h2>
                        </div>
                    </div>
                    <div className="mt-6 panel-subtle p-5">
                        <p className="text-sm leading-7 text-subtle">
                            WorkingGent keeps infrastructure details out of the main interface so people can focus on the work itself instead of the implementation underneath.
                        </p>
                    </div>
                </div>

                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Workspace guidance</div>
                    <div className="mt-5 grid gap-3">
                        {[
                            "Use the agent workspace for requests, outputs, and follow-up actions.",
                            "Use Activity to review runs and execution history.",
                            "Use Settings only for your account session and general workspace comfort.",
                        ].map((item) => (
                            <div key={item} className="panel-subtle px-4 py-4 text-sm leading-7 text-subtle">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
