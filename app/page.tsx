"use client"

import Link from "next/link"
import {
    ArrowRight,
    Bot,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronRight,
    FileText,
    Github,
    Globe,
    Mail,
    ShieldCheck,
    Sparkles,
    Wand2,
} from "lucide-react"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { useAuth } from "@/lib/AuthContext"

const AGENTS = [
    {
        title: "Coding Agent",
        icon: Wand2,
        body: "Turns ideas into project files, previews, and polished front-end output with a faster path from prompt to result.",
    },
    {
        title: "Web Search Agent",
        icon: Globe,
        body: "Collects live information from the web and condenses it into answers built for speed, clarity, and decision-making.",
    },
    {
        title: "Email Agent",
        icon: Mail,
        body: "Drafts refined outbound messages in a review-friendly flow so communication stays controlled and professional.",
    },
    {
        title: "GitHub Agent",
        icon: Github,
        body: "Connects to real repositories and helps inspect code structure, implementation details, and repository context.",
    },
    {
        title: "Document Agent",
        icon: FileText,
        body: "Analyzes PDFs, spreadsheets, CSVs, JSON, and text files so raw material becomes summaries, answers, and insight.",
    },
    {
        title: "Browser Automation Agent",
        icon: Bot,
        body: "Performs controlled browser actions on live websites and returns the useful output from those sessions.",
    },
]

const OUTCOMES = [
    "One mature workspace for coding, research, outreach, repositories, and documents",
    "Focused task routing through specialized agents instead of one generic assistant",
    "Professional UI built to feel product-ready, not experimental",
]

const PILLARS = [
    {
        title: "Calm by design",
        copy: "WorkingGent keeps attention on the work itself by reducing visual clutter and hiding unnecessary infrastructure detail from the main experience.",
    },
    {
        title: "Professional presentation",
        copy: "The product language, spacing, and structure are designed to feel mature enough for real-world use with teams, clients, and serious workflows.",
    },
    {
        title: "Operational flexibility",
        copy: "Different kinds of work can live inside one system because each workflow is handled by a dedicated agent with its own role in the product.",
    },
]

export default function Home() {
    const { isAuthenticated, isHydrated } = useAuth()

    return (
        <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-10%] top-[-8%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,_rgba(85,104,255,0.18),_transparent_66%)] blur-3xl" />
                <div className="absolute right-[-12%] top-[10%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(15,159,125,0.16),_transparent_68%)] blur-3xl" />
                <div className="absolute bottom-[18%] left-[30%] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(185,134,53,0.12),_transparent_70%)] blur-3xl" />
            </div>

            <header className="relative z-10 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 rounded-[30px] border border-border bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-xl sm:px-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_78%,white_22%))] text-white shadow-[0_16px_34px_rgba(85,104,255,0.28)]">
                            <BriefcaseBusiness size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold tracking-[-0.03em] text-foreground">WorkingGent</div>
                            <div className="text-xs text-muted">Professional multi-agent workspace</div>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-2 lg:flex">
                        <a href="#agents" className="nav-pill">Agents</a>
                        <a href="#principles" className="nav-pill">Principles</a>
                        <a href="#access" className="nav-pill">Access</a>
                    </nav>

                    <div className="flex items-center gap-2">
                        {!isHydrated ? null : !isAuthenticated ? (
                            <>
                            <SignInButton mode="modal">
                                <button className="button-secondary">Login</button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="button-primary">Register</button>
                            </SignUpButton>
                            </>
                        ) : (
                            <Link href="/dashboard" className="button-primary">
                                Open Workspace
                                <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_470px] lg:gap-6">
                    <div className="panel-strong relative overflow-hidden p-7 sm:p-10 lg:min-h-[720px]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--primary)_70%,white_30%),color-mix(in_srgb,var(--success)_74%,white_26%))]" />

                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/62 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                            <Sparkles size={14} className="text-primary" />
                            Advanced agent operating surface
                        </div>

                        <h1 className="mt-6 max-w-4xl font-heading text-5xl font-semibold tracking-[-0.075em] text-foreground sm:text-6xl lg:text-[5.3rem] lg:leading-[0.94]">
                            A more mature front door for serious AI-assisted work.
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-8 text-subtle sm:text-lg">
                            WorkingGent combines specialized agents, refined presentation, and a composed workspace so users can move through complex digital tasks in one professional environment.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            {!isHydrated ? null : !isAuthenticated ? (
                                <>
                                <SignUpButton mode="modal">
                                    <button className="button-primary min-w-[180px]">
                                        Register
                                        <ArrowRight size={16} />
                                    </button>
                                </SignUpButton>
                                <SignInButton mode="modal">
                                    <button className="button-secondary min-w-[160px]">Login</button>
                                </SignInButton>
                                </>
                            ) : (
                                <>
                                <Link href="/dashboard" className="button-primary min-w-[180px]">
                                    Enter Dashboard
                                    <ArrowRight size={16} />
                                </Link>
                                <Link href="/agents" className="button-secondary min-w-[160px]">
                                    Open Agents
                                </Link>
                                </>
                            )}
                        </div>

                        <div className="mt-10 grid gap-3 sm:grid-cols-3">
                            {OUTCOMES.map((item) => (
                                <div key={item} className="rounded-[24px] border border-border bg-background/62 px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 size={18} className="mt-0.5 text-success" />
                                        <p className="text-sm leading-7 text-foreground-soft">{item}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 grid gap-4 sm:grid-cols-3">
                            <LandingStat value="6" label="Specialized agents" />
                            <LandingStat value="1" label="Unified platform" />
                            <LandingStat value="Live" label="GitHub repo access" />
                        </div>
                    </div>

                    <div className="grid gap-5">
                        <div className="panel p-6 sm:p-7">
                            <div className="eyebrow">Product Snapshot</div>
                            <div className="mt-4 space-y-4">
                                {[
                                    ["Positioning", "Professional multi-agent workspace"],
                                    ["Tone", "Mature, polished, and execution-focused"],
                                    ["Audience", "Operators, builders, and product-led teams"],
                                    ["Access model", "Platform auth with separate GitHub connection"],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-start justify-between gap-4 border-b border-border/70 pb-4 last:border-b-0 last:pb-0">
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</div>
                                        <div className="max-w-[230px] text-right text-sm leading-6 text-foreground">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="panel-strong p-6 sm:p-7">
                            <div className="eyebrow">Operating Rhythm</div>
                            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground">
                                Ask. Route. Review. Continue.
                            </h2>
                            <div className="mt-6 space-y-3">
                                {[
                                    "Describe the task in natural language.",
                                    "Select or route to the right agent.",
                                    "Review output inside the same product surface.",
                                    "Take the next action without leaving the workspace.",
                                ].map((step, index) => (
                                    <div key={step} className="flex items-center gap-3 rounded-[22px] border border-border bg-background/58 px-4 py-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-sm font-semibold text-primary">
                                            0{index + 1}
                                        </div>
                                        <div className="text-sm leading-7 text-foreground">{step}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="agents" className="panel p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="eyebrow">Agent System</div>
                            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                                Specialized agents inside one composed product.
                            </h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-7 text-subtle">
                            WorkingGent feels unified because it organizes different workflows under one experience while still respecting that coding, search, email, documents, browser tasks, and repository work need different capabilities.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {AGENTS.map((agent) => {
                            const Icon = agent.icon
                            return (
                                <div key={agent.title} className="group relative overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-elevated)_90%,transparent),color-mix(in_srgb,var(--panel)_94%,transparent))] p-5 shadow-[var(--shadow-sm)] transition-transform duration-200 hover:-translate-y-1">
                                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,_rgba(85,104,255,0.12),_transparent_70%)]" />
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">{agent.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-subtle">{agent.body}</p>
                                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground-soft">
                                        Ready inside the workspace
                                        <ChevronRight size={15} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                <section id="principles" className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="panel-strong p-6 sm:p-8">
                        <div className="eyebrow">Principles</div>
                        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground">
                            Designed to look credible and work with intent.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-subtle">
                            This is not a toy wrapper around models. It is a product-minded surface built to make agent workflows feel dependable, deliberate, and ready for real use.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {PILLARS.map((item) => (
                            <div key={item.title} className="panel p-5 sm:p-6">
                                <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">{item.title}</div>
                                <p className="mt-3 text-sm leading-7 text-subtle">{item.copy}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="access" className="panel-strong overflow-hidden p-6 sm:p-8 lg:p-10">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
                        <div>
                            <div className="eyebrow">Access</div>
                            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                                Enter through a refined landing experience, then continue into the workspace.
                            </h2>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-subtle">
                                Platform access is handled through WorkingGent authentication, while GitHub connection stays separate for repository work. That keeps the product flow cleaner without removing power where it matters.
                            </p>
                        </div>

                        <div className="rounded-[30px] border border-border bg-background/70 p-4 sm:p-5">
                            <div className="rounded-[24px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-elevated)_88%,transparent),color-mix(in_srgb,var(--panel)_94%,transparent))] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">Secure workspace access</div>
                                        <div className="text-xs text-muted">Register or sign in to continue</div>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3">
                                    {!isHydrated ? null : !isAuthenticated ? (
                                        <>
                                        <SignUpButton mode="modal">
                                            <button className="button-primary w-full">Register</button>
                                        </SignUpButton>
                                        <SignInButton mode="modal">
                                            <button className="button-secondary w-full">Login</button>
                                        </SignInButton>
                                        </>
                                    ) : (
                                        <>
                                        <Link href="/dashboard" className="button-primary w-full">
                                            Go To Dashboard
                                            <ArrowRight size={16} />
                                        </Link>
                                        <Link href="/agents" className="button-secondary w-full">
                                            Open Agent Workspace
                                        </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

function LandingStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-[24px] border border-border bg-background/62 px-4 py-4">
            <div className="font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground">{value}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">{label}</div>
        </div>
    )
}
