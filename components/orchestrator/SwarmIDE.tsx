"use client"

import React, { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Braces,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Chrome,
    Code2,
    Copy,
    Download,
    ExternalLink,
    FileCode,
    FileText,
    FileType,
    GitBranch,
    GitCommit,
    Github,
    Globe,
    Layers,
    Loader2,
    Lock,
    Mail,
    Maximize2,
    Minimize2,
    PanelRightClose,
    PanelRightOpen,
    Play,
    RefreshCw,
    Send,
    SlidersHorizontal,
    Sparkles,
    Terminal,
    Unlock,
    X,
} from "lucide-react"
import type {
    SwarmPlan,
    SwarmExecutionDeliverables,
} from "@/lib/agents/orchestratorService"
import { useAuth } from "@/lib/AuthContext"

const MonacoCodeEditor = dynamic(() => import("@/components/agents/MonacoCodeEditor"), {
    ssr: false,
    loading: () => <div className="skeleton h-80 w-full rounded-lg" />,
})

type ChatMessage = {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    plan?: SwarmPlan
    timestamp: string
}

type SwarmViewTab = "coding" | "document" | "websearch" | "browser" | "github" | "email"

const QUICK_INSPIRATION_PROMPTS = [
    {
        title: "FinTech Crypto & Stock Tracker",
        prompt: "Build a real-time crypto & stock analytics dashboard with live interactive charts, market stats, and currency toggle.",
        icon: "⚡",
    },
    {
        title: "AI SaaS Landing Page & Pitch",
        prompt: "Create an ultra-premium landing page for an AI agent platform with hero gradients, feature bento grid, pricing, and investor pitch summary.",
        icon: "🚀",
    },
    {
        title: "Minimalist E-Commerce Store",
        prompt: "Build an elegant boutique fashion e-commerce storefront with product catalog, filter tabs, interactive cart drawer, and checkout summary.",
        icon: "🛍️",
    },
    {
        title: "Developer Documentation Portal",
        prompt: "Create an interactive developer documentation hub with sidebar navigation, search bar, code block copy, and API playground.",
        icon: "📚",
    },
]

export default function SwarmIDE() {
    const { user } = useAuth()

    // ── Flow State ──
    const [swarmState, setSwarmState] = useState<
        "idle" | "planning" | "ready_for_approval" | "executing" | "completed"
    >("idle")

    // Chat and consultation state
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputValue, setInputValue] = useState("")
    const [activePlan, setActivePlan] = useState<SwarmPlan | null>(null)
    const [deliverables, setDeliverables] = useState<SwarmExecutionDeliverables | null>(null)
    const [executionError, setExecutionError] = useState<string | null>(null)

    // Optional user inputs
    const [investorEmails, setInvestorEmails] = useState<string>("")
    const [githubRepoName, setGithubRepoName] = useState<string>("")
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

    // GitHub Connection Status
    const [githubStatus, setGithubStatus] = useState<{
        configured: boolean
        connected: boolean
        login?: string
    }>({ configured: false, connected: false })

    // Lovable-style "Push to GitHub" Modal State
    const [isPushModalOpen, setIsPushModalOpen] = useState(false)
    const [pushRepoName, setPushRepoName] = useState("")
    const [pushDescription, setPushDescription] = useState("")
    const [pushIsPrivate, setPushIsPrivate] = useState(false)
    const [pushCommitMessage, setPushCommitMessage] = useState("feat: publish project via WorkingGent")
    const [isPushingToGitHub, setIsPushingToGitHub] = useState(false)
    const [pushSuccessResult, setPushSuccessResult] = useState<{
        repoUrl: string
        repoFullName: string
        commitSha: string
        branch: string
        filesPushed: string[]
        message: string
    } | null>(null)
    const [pushError, setPushError] = useState<string | null>(null)

    // IDE State
    const [activeTab, setActiveTab] = useState<SwarmViewTab>("coding")
    const [codeSubTab, setCodeSubTab] = useState<"preview" | "code">("preview")
    const [selectedCodeFile, setSelectedCodeFile] = useState<"html" | "css" | "js">("html")
    const [isCopied, setIsCopied] = useState<string | null>(null)
    const [isCopilotOpen, setIsCopilotOpen] = useState(true)
    const [iframeKey, setIframeKey] = useState(0)

    const chatEndRef = useRef<HTMLDivElement>(null)

    // Fetch GitHub status on mount
    useEffect(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => {
                if (data?.tools?.github) {
                    setGithubStatus(data.tools.github)
                }
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, swarmState])

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setIsCopied(id)
        setTimeout(() => setIsCopied(null), 1800)
    }

    // ── Send Consultation Message ──
    const handleSendMessage = async (customPrompt?: string) => {
        const text = (customPrompt || inputValue).trim()
        if (!text) return

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }

        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInputValue("")
        setSwarmState("planning")
        setExecutionError(null)

        try {
            const parsedEmails = investorEmails
                .split(",")
                .map((e) => e.trim())
                .filter((e) => e.includes("@"))

            const res = await fetch("/api/orchestrator/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
                    investorEmails: parsedEmails.length ? parsedEmails : undefined,
                    githubRepoName: githubRepoName.trim() || undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to reach Orchestrator")

            const assistantMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: "assistant",
                content: data.message || "I have analyzed your request.",
                plan: data.plan || undefined,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }

            setMessages((prev) => [...prev, assistantMsg])

            if (data.plan) {
                setActivePlan(data.plan)
                setSwarmState("ready_for_approval")
            } else {
                setSwarmState("idle")
            }
        } catch (err) {
            setExecutionError(err instanceof Error ? err.message : "Failed to brainstorm with Orchestrator")
            setSwarmState("idle")
        }
    }

    // ── Execute Swarm (TRIGGERED ONLY UPON USER APPROVAL) ──
    const handleProceedApproval = async () => {
        if (!activePlan) return

        setSwarmState("executing")
        setExecutionError(null)

        const parsedEmails = [
            ...investorEmails.split(",").map((e) => e.trim()).filter((e) => e.includes("@")),
            ...(activePlan.agents?.email?.recipients || []),
            user?.email || "",
        ].filter((e): e is string => Boolean(e && e.includes("@")))

        setMessages((prev) => [
            ...prev,
            {
                id: `msg-${Date.now()}`,
                role: "system",
                content: "🚀 Approval confirmed. Launching all 6 agents in parallel simultaneous execution...",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
        ])

        try {
            const res = await fetch("/api/orchestrator/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: activePlan,
                    investorEmails: parsedEmails,
                    userEmail: user?.email || undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Swarm execution failed")

            setDeliverables(data.deliverables)
            setSwarmState("completed")

            // Add completion message with a prompt to push to GitHub
            setMessages((prev) => [
                ...prev,
                {
                    id: `msg-${Date.now() + 1}`,
                    role: "assistant",
                    content: `🎉 Mission complete! All 6 agents have finished their parallel tasks for "${activePlan.projectTitle}". Your live app and full documentation are ready.\n\n🐙 **Ready to push to GitHub?** You can push directly to your connected GitHub account with one click!`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
            ])
        } catch (err) {
            setExecutionError(err instanceof Error ? err.message : "Error executing multi-agent swarm")
            setSwarmState("ready_for_approval")
        }
    }

    // ── Lovable-Style Manual Push to GitHub ──
    const handleManualPushToGitHub = async () => {
        setIsPushingToGitHub(true)
        setPushError(null)

        try {
            const targetRepo =
                pushRepoName.trim() ||
                activePlan?.agents?.github?.repoName ||
                activePlan?.projectTitle?.toLowerCase().replace(/[^a-z0-9]/g, "-") ||
                `workinggent-${Date.now()}`

            const res = await fetch("/api/github/push-project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: deliverables?.coding?.data?.projectId,
                    repoName: targetRepo,
                    description: pushDescription || activePlan?.projectSummary || "Created with WorkingGent AI Agent Swarm",
                    isPrivate: pushIsPrivate,
                    commitMessage: pushCommitMessage || "feat: publish project via WorkingGent",
                    files: deliverables?.coding?.data?.files
                        ? [
                              { path: "index.html", content: deliverables.coding.data.files.html },
                              { path: "style.css", content: deliverables.coding.data.files.css },
                              { path: "script.js", content: deliverables.coding.data.files.js },
                              {
                                  path: "README.md",
                                  content: `# ${activePlan?.projectTitle || targetRepo}\n\n${activePlan?.projectSummary || ""}\n\nCreated and published with WorkingGent AI Agent Swarm.\n\n## System Architecture & Specifications\n${deliverables.document?.data?.textContent || ""}`,
                              },
                              {
                                  path: "docs/ARCHITECTURE.md",
                                  content: `# System Architecture\n\n${deliverables.document?.data?.textContent || ""}`,
                              },
                          ]
                        : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                if (data.needsAuth) {
                    throw new Error("GitHub account not connected. Click 'Connect GitHub' below.")
                }
                throw new Error(data.error || "GitHub push failed")
            }

            setPushSuccessResult(data)

            // Update deliverables so the GitHub tab displays the freshly created/pushed repo
            setDeliverables((prev) =>
                prev
                    ? {
                          ...prev,
                          github: {
                              agentId: "github",
                              agentName: "GitHub Agent",
                              status: "completed",
                              summary: `Pushed ${data.filesPushed?.length || 5} files to ${data.repoFullName}`,
                              data: {
                                  success: true,
                                  repoUrl: data.repoUrl,
                                  repoFullName: data.repoFullName,
                                  commitSha: data.commitSha,
                                  branch: data.branch,
                                  filesPushed: data.filesPushed || [],
                                  message: data.message,
                              },
                          },
                      }
                    : null
            )
        } catch (err: unknown) {
            setPushError(err instanceof Error ? err.message : "GitHub push failed")
        } finally {
            setIsPushingToGitHub(false)
        }
    }

    const openPushModal = () => {
        const suggestedName =
            activePlan?.agents?.github?.repoName ||
            activePlan?.projectTitle?.toLowerCase().replace(/[^a-z0-9]/g, "-") ||
            `project-${Date.now()}`
        setPushRepoName(suggestedName)
        setPushDescription(activePlan?.projectSummary || "Created with WorkingGent")
        setPushSuccessResult(null)
        setPushError(null)
        setIsPushModalOpen(true)
    }

    const handleResetAll = () => {
        setSwarmState("idle")
        setMessages([])
        setActivePlan(null)
        setDeliverables(null)
        setExecutionError(null)
        setInputValue("")
        setPushSuccessResult(null)
    }

    const currentCode = () => {
        if (!deliverables?.coding?.data?.files) return ""
        const files = deliverables.coding.data.files
        return selectedCodeFile === "html" ? files.html : selectedCodeFile === "css" ? files.css : files.js
    }

    // ── RENDER ──
    return (
        <div className="relative flex h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-background">
            {/* ═══════════════════════════════════════════════════════════════
                MODE A: WELCOME / CONSULTATION / APPROVAL CANVAS
                ═══════════════════════════════════════════════════════════════ */}
            {swarmState !== "executing" && swarmState !== "completed" ? (
                <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
                    {/* Top Header / Status */}
                    <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Sparkles size={18} />
                            </span>
                            <div>
                                <h1 className="text-base font-semibold text-foreground">
                                    WorkingGent Multi-Agent Swarm
                                </h1>
                                <p className="text-xs text-foreground-soft">
                                    6 specialized agents working together simultaneously on your project
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Connected GitHub Badge if logged in */}
                            {githubStatus.connected && githubStatus.login && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-soft">
                                    <Github size={13} className="text-foreground" />
                                    <span>@{githubStatus.login}</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowAdvancedSettings((prev) => !prev)}
                                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-soft transition-colors hover:bg-surface-elevated hover:text-foreground"
                            >
                                <SlidersHorizontal size={13} />
                                <span>Preferences</span>
                                {showAdvancedSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                        </div>
                    </div>

                    {/* Advanced Settings Drawer */}
                    {showAdvancedSettings && (
                        <div className="animate-fade-in my-3 grid gap-3 rounded-xl border border-border bg-surface p-3.5 text-xs sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block font-medium text-foreground">
                                    ✉️ Investor / Notification Emails
                                </label>
                                <input
                                    type="text"
                                    placeholder="investor@example.com, founder@example.com"
                                    value={investorEmails}
                                    onChange={(e) => setInvestorEmails(e.target.value)}
                                    className="input-shell w-full px-3 py-2 text-xs text-foreground placeholder:text-muted"
                                />
                                <span className="mt-1 block text-[11px] text-muted">
                                    Email Agent will dispatch the executive brief to these addresses.
                                </span>
                            </div>
                            <div>
                                <label className="mb-1 block font-medium text-foreground">
                                    🐙 Target GitHub Repository
                                </label>
                                <input
                                    type="text"
                                    placeholder="my-awesome-project"
                                    value={githubRepoName}
                                    onChange={(e) => setGithubRepoName(e.target.value)}
                                    className="input-shell w-full px-3 py-2 text-xs text-foreground placeholder:text-muted"
                                />
                                <span className="mt-1 block text-[11px] text-muted">
                                    GitHub Agent will stage and push code + docs to this repo.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto py-4">
                        {messages.length === 0 ? (
                            /* Initial Welcome Hero */
                            <div className="animate-fade-in flex flex-col items-center justify-center py-8 text-center sm:py-12">
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                                    <Bot size={13} />
                                    <span>Lead Master Orchestrator Active</span>
                                </div>

                                <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                    What do you want to build today?
                                </h2>
                                <p className="mt-3 max-w-lg text-sm leading-relaxed text-foreground-soft">
                                    Describe your idea or product. Our 6 specialized agents will brainstorm with you, research the web, write the code, author complete documentation, test the app, and push everything to GitHub.
                                </p>

                                {/* Quick Inspiration Pills */}
                                <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {QUICK_INSPIRATION_PROMPTS.map((item) => (
                                        <button
                                            key={item.title}
                                            type="button"
                                            onClick={() => handleSendMessage(item.prompt)}
                                            className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary/40 hover:bg-surface-elevated hover:shadow-sm"
                                        >
                                            <span className="text-xl">{item.icon}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-semibold text-foreground group-hover:text-primary">
                                                    {item.title}
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                                                    {item.prompt}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Conversational Message Stream */
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role !== "user" && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Bot size={15} />
                                            </div>
                                        )}

                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                                msg.role === "user"
                                                    ? "bg-primary text-white"
                                                    : msg.role === "system"
                                                      ? "border border-primary/20 bg-primary/5 text-primary"
                                                      : "border border-border bg-surface text-foreground"
                                            }`}
                                        >
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>

                                            {/* Proposed Plan Card if attached */}
                                            {msg.plan && (
                                                <div className="mt-4 overflow-hidden rounded-xl border border-primary/30 bg-background/50 p-4 shadow-sm">
                                                    <div className="flex items-center justify-between border-b border-border pb-3">
                                                        <div>
                                                            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                                                Proposed Swarm Action Plan
                                                            </div>
                                                            <div className="mt-0.5 text-base font-semibold text-foreground">
                                                                {msg.plan.projectTitle}
                                                            </div>
                                                        </div>
                                                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                                                            6 Agents Primed
                                                        </span>
                                                    </div>

                                                    <p className="mt-2 text-xs leading-relaxed text-foreground-soft">
                                                        {msg.plan.projectSummary}
                                                    </p>

                                                    {/* The 6-Agent Execution Breakdown */}
                                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <Globe size={13} className="text-blue-500" />
                                                                <span className="text-xs">Web Search Agent</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                {msg.plan.agents.websearch.query}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <Code2 size={13} className="text-amber-500" />
                                                                <span className="text-xs">Coding Agent</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                Generates full HTML/CSS/JS application with live preview
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <FileText size={13} className="text-emerald-500" />
                                                                <span className="text-xs">Document Agent</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                Authors complete architecture specs & PRD
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <Chrome size={13} className="text-violet-500" />
                                                                <span className="text-xs">Browser Automation</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                Tests live UI buttons, elements, and responsiveness
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <Github size={13} className="text-gray-400" />
                                                                <span className="text-xs">GitHub Agent</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                Pushes code + docs to repo ({msg.plan.agents.github.repoName})
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-surface p-2.5">
                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                <Mail size={13} className="text-rose-500" />
                                                                <span className="text-xs">Email Agent</span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-muted">
                                                                Dispatches executive briefing to investor / team emails
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* ═══════════════════════════════════════════════════════════════
                                                        THE HUMAN APPROVAL GATE: MUST APPROVE BEFORE EXECUTION
                                                        ═══════════════════════════════════════════════════════════════ */}
                                                    <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle size={16} className="text-primary" />
                                                            <span className="text-xs font-semibold text-foreground">
                                                                {msg.plan.approvalQuestion || "All 6 agents are primed. Should I proceed?"}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-foreground-soft">
                                                            No code or actions will be triggered until you approve this plan.
                                                        </p>

                                                        <div className="mt-3 flex items-center gap-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={handleProceedApproval}
                                                                className="button-primary min-h-10 text-xs shadow-md shadow-primary/20"
                                                            >
                                                                <Play size={14} className="fill-current" />
                                                                <span>Proceed & Launch All 6 Agents</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setInputValue("I want to tweak this plan: ")
                                                                }}
                                                                className="button-secondary min-h-10 text-xs"
                                                            >
                                                                Revise / Adjust Plan
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-1 text-right text-[10px] text-muted">
                                                {msg.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {swarmState === "planning" && (
                                    <div className="flex items-center gap-2 text-xs text-muted">
                                        <Loader2 size={14} className="animate-spin text-primary" />
                                        <span>Orchestrator is analyzing and formulating multi-agent plan...</span>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>
                        )}

                        {executionError && (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{executionError}</span>
                            </div>
                        )}
                    </div>

                    {/* Chat Prompt Input Bar */}
                    <div className="shrink-0 pt-2">
                        <div className="input-shell flex items-end gap-2 p-2">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage()
                                    }
                                }}
                                placeholder="Describe what you want to build or tell the agents how to adjust..."
                                rows={2}
                                className="w-full resize-none bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => handleSendMessage()}
                                disabled={!inputValue.trim() || swarmState === "planning"}
                                className="button-primary h-9 w-9 shrink-0 rounded-lg p-0 disabled:opacity-40"
                                aria-label="Send to Orchestrator"
                            >
                                {swarmState === "planning" ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <ArrowRight size={15} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* ═══════════════════════════════════════════════════════════════
                   MODE B: 6-AGENT PARALLEL IDE WORKSPACE (EXECUTING OR COMPLETED)
                   ═══════════════════════════════════════════════════════════════ */
                <div className="flex h-full w-full flex-col overflow-hidden">
                    {/* ── TOP HEADER / SWARM STATUS STRIP ── */}
                    <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2 sm:px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <Sparkles size={14} />
                                </span>
                                <div>
                                    <div className="text-xs font-semibold text-foreground">
                                        {activePlan?.projectTitle || "Swarm Project Workspace"}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                        {swarmState === "executing" ? (
                                            <>
                                                <span className="relative flex h-2 w-2">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                                </span>
                                                <span className="text-primary font-medium">
                                                    6 Agents Running in Parallel...
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={11} className="text-emerald-500" />
                                                <span className="text-emerald-500 font-medium">
                                                    All 6 Agents Completed
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Action Buttons (with Lovable-style "Push to GitHub" button) */}
                        <div className="flex items-center gap-2">
                            {deliverables?.coding?.data?.projectId && (
                                <a
                                    href={`/api/preview/${deliverables.coding.data.projectId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="button-secondary min-h-8 px-2.5 py-1 text-xs"
                                >
                                    <ExternalLink size={12} />
                                    <span className="hidden sm:inline">Live Preview</span>
                                </a>
                            )}

                            {deliverables?.coding?.data?.projectId && (
                                <a
                                    href={`/api/download/${deliverables.coding.data.projectId}`}
                                    download
                                    className="button-secondary min-h-8 px-2.5 py-1 text-xs"
                                >
                                    <Download size={12} />
                                    <span className="hidden sm:inline">Download ZIP</span>
                                </a>
                            )}

                            {/* ── LOVABLE-STYLE "PUSH TO GITHUB" BUTTON ── */}
                            <button
                                type="button"
                                onClick={openPushModal}
                                className="button-primary min-h-8 px-3 py-1 text-xs gap-1.5 shadow-sm shadow-primary/20"
                            >
                                <Github size={13} />
                                <span>Push to GitHub</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="button-ghost min-h-8 px-2 text-xs"
                                title="Start New Swarm Project"
                            >
                                <RefreshCw size={13} />
                                <span className="hidden sm:inline">New Project</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsCopilotOpen((prev) => !prev)}
                                className="button-ghost min-h-8 px-2 text-xs"
                                title={isCopilotOpen ? "Collapse Copilot" : "Expand Copilot"}
                            >
                                {isCopilotOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                            </button>
                        </div>
                    </header>

                    {/* ── PARALLEL 6-AGENT LIVE STATUS RIBBON ── */}
                    <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface-elevated/40 p-2 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                            {
                                id: "websearch" as SwarmViewTab,
                                label: "Web Search",
                                icon: Globe,
                                color: "text-blue-500",
                                status: deliverables?.websearch?.status || (swarmState === "executing" ? "running" : "completed"),
                                summary: deliverables?.websearch?.summary || "Researching live benchmarks...",
                            },
                            {
                                id: "coding" as SwarmViewTab,
                                label: "Coding Agent",
                                icon: Code2,
                                color: "text-amber-500",
                                status: deliverables?.coding?.status || (swarmState === "executing" ? "running" : "completed"),
                                summary: deliverables?.coding?.summary || "Writing code & serving preview...",
                            },
                            {
                                id: "document" as SwarmViewTab,
                                label: "Document Agent",
                                icon: FileText,
                                color: "text-emerald-500",
                                status: deliverables?.document?.status || (swarmState === "executing" ? "running" : "completed"),
                                summary: deliverables?.document?.summary || "Authoring technical PRD...",
                            },
                            {
                                id: "browser" as SwarmViewTab,
                                label: "Browser Test",
                                icon: Chrome,
                                color: "text-violet-500",
                                status: deliverables?.browser?.status || (swarmState === "executing" ? "pending" : "completed"),
                                summary: deliverables?.browser?.summary || "Testing UI responsiveness...",
                            },
                            {
                                id: "github" as SwarmViewTab,
                                label: "GitHub Sync",
                                icon: Github,
                                color: "text-gray-400",
                                status: deliverables?.github?.status || (swarmState === "executing" ? "pending" : "completed"),
                                summary: deliverables?.github?.summary || "Pushing code & docs to repo...",
                            },
                            {
                                id: "email" as SwarmViewTab,
                                label: "Email Agent",
                                icon: Mail,
                                color: "text-rose-500",
                                status: deliverables?.email?.status || (swarmState === "executing" ? "pending" : "completed"),
                                summary: deliverables?.email?.summary || "Dispatching brief to investors...",
                            },
                        ].map((agent) => {
                            const Icon = agent.icon
                            const isCurrent = activeTab === agent.id
                            return (
                                <button
                                    key={agent.id}
                                    type="button"
                                    onClick={() => setActiveTab(agent.id)}
                                    className={`flex items-start gap-2.5 rounded-lg border p-2 text-left transition-all ${
                                        isCurrent
                                            ? "border-primary/50 bg-surface shadow-xs"
                                            : "border-border/60 bg-surface/50 hover:bg-surface hover:border-border"
                                    }`}
                                >
                                    <Icon size={15} className={`mt-0.5 shrink-0 ${agent.color}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="truncate text-xs font-semibold text-foreground">
                                                {agent.label}
                                            </span>
                                            {agent.status === "running" ? (
                                                <Loader2 size={11} className="animate-spin text-primary" />
                                            ) : agent.status === "completed" ? (
                                                <CheckCircle2 size={11} className="text-emerald-500" />
                                            ) : (
                                                <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-[10px] text-muted">
                                            {agent.summary}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* ── MAIN IDE WORKSPACE & COPILOT SPLIT ── */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* ── CENTER WORKSPACE CANVAS (TABS) ── */}
                        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
                            {/* TAB 1: CODING AGENT (LIVE PREVIEW & MONACO CODE) */}
                            {activeTab === "coding" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setCodeSubTab("preview")}
                                                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                                                    codeSubTab === "preview"
                                                        ? "bg-surface text-foreground shadow-xs"
                                                        : "text-muted hover:text-foreground"
                                                }`}
                                            >
                                                Live App Preview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCodeSubTab("code")}
                                                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                                                    codeSubTab === "code"
                                                        ? "bg-surface text-foreground shadow-xs"
                                                        : "text-muted hover:text-foreground"
                                                }`}
                                            >
                                                Monaco Code Editor
                                            </button>
                                        </div>

                                        {codeSubTab === "preview" ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={openPushModal}
                                                    className="flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-xs text-foreground font-medium hover:bg-surface"
                                                >
                                                    <Github size={12} />
                                                    <span>Push to GitHub</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIframeKey((k) => k + 1)}
                                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-elevated hover:text-foreground"
                                                    title="Reload Preview Frame"
                                                >
                                                    <RefreshCw size={12} />
                                                    <span>Reload</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {(["html", "css", "js"] as const).map((fileKey) => (
                                                    <button
                                                        key={fileKey}
                                                        type="button"
                                                        onClick={() => setSelectedCodeFile(fileKey)}
                                                        className={`rounded-md px-2.5 py-1 text-xs uppercase font-medium ${
                                                            selectedCodeFile === fileKey
                                                                ? "bg-primary/10 text-primary font-semibold"
                                                                : "text-muted hover:text-foreground"
                                                        }`}
                                                    >
                                                        {fileKey}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(currentCode(), "code")}
                                                    className="ml-2 flex items-center gap-1 text-xs text-muted hover:text-foreground"
                                                >
                                                    {isCopied === "code" ? (
                                                        <Check size={12} className="text-emerald-500" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                    <span>{isCopied === "code" ? "Copied" : "Copy"}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-hidden">
                                        {codeSubTab === "preview" ? (
                                            deliverables?.coding?.data?.projectId ? (
                                                <iframe
                                                    key={iframeKey}
                                                    src={`/api/preview/${deliverables.coding.data.projectId}`}
                                                    className="h-full w-full border-0 bg-white"
                                                    title="Live Preview"
                                                    sandbox="allow-scripts allow-same-origin"
                                                />
                                            ) : (
                                                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted">
                                                    <Loader2 size={24} className="animate-spin text-primary" />
                                                    <p className="mt-2 text-sm font-medium text-foreground">
                                                        Coding Agent is generating application files...
                                                    </p>
                                                    <p className="text-xs text-muted">
                                                        Preview will activate automatically when ready.
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="h-full p-2">
                                                <MonacoCodeEditor
                                                    value={currentCode()}
                                                    onChange={() => {}}
                                                    language={
                                                        selectedCodeFile === "html"
                                                            ? "html"
                                                            : selectedCodeFile === "css"
                                                              ? "css"
                                                              : "javascript"
                                                    }
                                                    height={700}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: DOCUMENT AGENT (PRD & SPECS) */}
                            {activeTab === "document" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-emerald-500" />
                                            <span className="text-xs font-semibold text-foreground">
                                                {deliverables?.document?.data?.title || "Project Documentation & PRD"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {deliverables?.document?.data && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            deliverables.document?.data?.textContent || "",
                                                            "doc"
                                                        )
                                                    }
                                                    className="button-secondary min-h-8 px-2.5 py-1 text-xs"
                                                >
                                                    {isCopied === "doc" ? <Check size={12} /> : <Copy size={12} />}
                                                    <span>{isCopied === "doc" ? "Copied" : "Copy Markdown"}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {deliverables?.document?.data ? (
                                            <div className="mx-auto max-w-3xl space-y-4">
                                                <div className="rounded-xl border border-border bg-surface p-4">
                                                    <h2 className="text-xl font-bold text-foreground">
                                                        {deliverables.document.data.title}
                                                    </h2>
                                                    <p className="mt-1 text-xs leading-relaxed text-foreground-soft">
                                                        {deliverables.document.data.summary}
                                                    </p>
                                                </div>

                                                <div className="prose prose-sm max-w-none rounded-xl border border-border bg-surface p-6 dark:prose-invert">
                                                    <ReactMarkdown>
                                                        {deliverables.document.data.textContent}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                                                <Loader2 size={24} className="animate-spin text-primary" />
                                                <p className="mt-2 text-sm text-foreground">
                                                    Document Agent is authoring system specifications...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: WEB SEARCH AGENT (INTELLIGENCE DOSSIER) */}
                            {activeTab === "websearch" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Globe size={14} className="text-blue-500" />
                                            <span className="text-xs font-semibold text-foreground">
                                                Live Web Research & Benchmarking
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {deliverables?.websearch?.data ? (
                                            <div className="mx-auto max-w-3xl space-y-5">
                                                <div className="rounded-xl border border-border bg-surface p-4">
                                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                        Targeted Search Query
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium text-foreground">
                                                        {deliverables.websearch.data.query}
                                                    </div>
                                                </div>

                                                <div className="prose prose-sm max-w-none rounded-xl border border-border bg-surface p-6 dark:prose-invert">
                                                    <ReactMarkdown>
                                                        {deliverables.websearch.data.result}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Citations & Sources */}
                                                {deliverables.websearch.data.sources?.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                            Sources & Citations
                                                        </h3>
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            {deliverables.websearch.data.sources.map((s, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={s.link}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="group rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-elevated"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs font-medium text-foreground group-hover:text-primary">
                                                                        <span className="truncate">{s.title}</span>
                                                                        <ExternalLink size={11} className="shrink-0 text-muted" />
                                                                    </div>
                                                                    <p className="mt-1 line-clamp-2 text-[11px] text-muted">
                                                                        {s.snippet}
                                                                    </p>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                                                <Loader2 size={24} className="animate-spin text-primary" />
                                                <p className="mt-2 text-sm text-foreground">
                                                    Web Search Agent is fetching live data and market evidence...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: BROWSER AUTOMATION AGENT (TESTING & DOM INSPECTION) */}
                            {activeTab === "browser" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Chrome size={14} className="text-violet-500" />
                                            <span className="text-xs font-semibold text-foreground">
                                                Automated Browser Verification (Puppeteer)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {deliverables?.browser?.data ? (
                                            <div className="mx-auto max-w-3xl space-y-4">
                                                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-500">
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <CheckCircle2 size={16} />
                                                        <span>Browser Automated UI Test: Passed</span>
                                                    </div>
                                                    <span className="text-[11px] text-foreground-soft">
                                                        Target: {deliverables.browser.data.finalUrl}
                                                    </span>
                                                </div>

                                                <div className="rounded-xl border border-border bg-surface p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                        Executed Action Sequence
                                                    </div>
                                                    <div className="mt-2 space-y-1.5 font-mono text-xs">
                                                        {deliverables.browser.data.results.map((res, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-foreground-soft">
                                                                <Check size={12} className="text-emerald-500" />
                                                                <span>{res}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-border bg-surface p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                        Verified Visible UI Elements & Content
                                                    </div>
                                                    <div className="mt-2 max-h-60 overflow-y-auto rounded-lg bg-surface-elevated p-3 font-mono text-xs leading-relaxed text-foreground-soft">
                                                        <pre className="whitespace-pre-wrap">
                                                            {deliverables.browser.data.extractedText || "Page rendered successfully."}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                                                <Loader2 size={24} className="animate-spin text-primary" />
                                                <p className="mt-2 text-sm text-foreground">
                                                    Browser Automation Agent is spinning up headless Chromium to verify UI...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 5: GITHUB AGENT (LOVABLE-STYLE PUBLISHING HUB) */}
                            {activeTab === "github" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Github size={14} className="text-foreground" />
                                            <span className="text-xs font-semibold text-foreground">
                                                GitHub Repository & Publishing Hub
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={openPushModal}
                                            className="button-primary min-h-8 px-2.5 py-1 text-xs gap-1.5"
                                        >
                                            <Github size={12} />
                                            <span>Push to GitHub</span>
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="mx-auto max-w-3xl space-y-5">
                                            {/* Account Connection Status Card */}
                                            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-foreground">
                                                        <Github size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-semibold text-foreground">
                                                            {githubStatus.connected && githubStatus.login
                                                                ? `Connected as @${githubStatus.login}`
                                                                : "GitHub Account"}
                                                        </div>
                                                        <p className="text-[11px] text-muted">
                                                            {githubStatus.connected
                                                                ? "Repositories will be created under your GitHub account."
                                                                : "Connect your GitHub account to publish projects directly to your profile."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!githubStatus.connected && (
                                                    <a
                                                        href="/api/auth/github"
                                                        className="button-primary min-h-8 text-xs"
                                                    >
                                                        Connect GitHub
                                                    </a>
                                                )}
                                            </div>

                                            {/* Live Pushed Repository Card if available */}
                                            {deliverables?.github?.data && (
                                                <div className="rounded-xl border border-emerald-500/30 bg-surface p-5 shadow-xs">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                                                                <CheckCircle2 size={12} />
                                                                <span>Repository Published</span>
                                                            </div>
                                                            <h3 className="mt-2 text-base font-semibold text-foreground">
                                                                {deliverables.github.data.repoFullName}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs text-muted">
                                                                {deliverables.github.data.message}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={openPushModal}
                                                                className="button-secondary min-h-8 text-xs"
                                                            >
                                                                Push New Commit
                                                            </button>
                                                            <a
                                                                href={deliverables.github.data.repoUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="button-primary min-h-8 text-xs"
                                                            >
                                                                <ExternalLink size={12} />
                                                                <span>Open on GitHub</span>
                                                            </a>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                                        <div className="flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1 text-foreground-soft font-mono">
                                                            <GitBranch size={12} />
                                                            <span>Branch: {deliverables.github.data.branch}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1 text-foreground-soft font-mono">
                                                            <GitCommit size={12} />
                                                            <span>Commit: {deliverables.github.data.commitSha.slice(0, 10)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 border-t border-border pt-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                            Pushed Code & Documentation Files
                                                        </div>
                                                        <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-xs">
                                                            {deliverables.github.data.filesPushed.map((f, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-foreground-soft">
                                                                    <FileCode size={13} className="text-primary" />
                                                                    <span className="truncate">{f}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lovable-style Ready-To-Push Card (when not pushed or wanting to push) */}
                                            <div className="rounded-xl border border-border bg-surface p-5">
                                                <div className="flex items-center justify-between border-b border-border pb-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">
                                                            Publish Project to GitHub
                                                        </h3>
                                                        <p className="text-xs text-muted">
                                                            Automatically create a repository and push all files (code, styles, scripts, PRD documentation).
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-3.5">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-foreground">
                                                            Repository Name
                                                        </label>
                                                        <div className="input-shell flex items-center px-3 py-2 text-xs">
                                                            <span className="text-muted mr-1">
                                                                {githubStatus.login ? `${githubStatus.login}/` : "github.com/"}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={pushRepoName || activePlan?.agents?.github?.repoName || ""}
                                                                onChange={(e) => setPushRepoName(e.target.value)}
                                                                placeholder="my-awesome-project"
                                                                className="w-full bg-transparent text-foreground placeholder:text-muted focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <label className="text-xs font-medium text-foreground">
                                                            Visibility:
                                                        </label>
                                                        <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPushIsPrivate(false)}
                                                                className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-colors ${
                                                                    !pushIsPrivate
                                                                        ? "bg-surface text-foreground shadow-xs"
                                                                        : "text-muted hover:text-foreground"
                                                                }`}
                                                            >
                                                                <Globe size={12} />
                                                                <span>Public</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPushIsPrivate(true)}
                                                                className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-colors ${
                                                                    pushIsPrivate
                                                                        ? "bg-surface text-foreground shadow-xs"
                                                                        : "text-muted hover:text-foreground"
                                                                }`}
                                                            >
                                                                <Lock size={12} />
                                                                <span>Private</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleManualPushToGitHub}
                                                            disabled={isPushingToGitHub}
                                                            className="button-primary w-full text-xs shadow-md shadow-primary/20"
                                                        >
                                                            {isPushingToGitHub ? (
                                                                <>
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                    <span>Creating Repository & Pushing Files...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Github size={14} />
                                                                    <span>Push to GitHub (Create & Commit)</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {pushError && (
                                                        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                                                            <AlertCircle size={14} className="shrink-0" />
                                                            <span>{pushError}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 6: EMAIL AGENT (INVESTOR & STAKEHOLDER UPDATE) */}
                            {activeTab === "email" && (
                                <div className="flex h-full flex-col overflow-hidden">
                                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-rose-500" />
                                            <span className="text-xs font-semibold text-foreground">
                                                Executive Project Brief & Investor Update
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {deliverables?.email?.data ? (
                                            <div className="mx-auto max-w-3xl space-y-4">
                                                <div className="rounded-xl border border-border bg-surface p-4">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold text-foreground">
                                                            Status: {deliverables.email.data.message}
                                                        </span>
                                                        <span className="text-muted">
                                                            Recipients: {deliverables.email.data.recipients.join(", ") || "None specified"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-border bg-surface p-6">
                                                    <div className="border-b border-border pb-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                            Subject Line
                                                        </div>
                                                        <div className="mt-0.5 text-base font-semibold text-foreground">
                                                            {deliverables.email.data.subject}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground-soft">
                                                        {deliverables.email.data.body}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                                                <Loader2 size={24} className="animate-spin text-primary" />
                                                <p className="mt-2 text-sm text-foreground">
                                                    Email Agent is compiling the executive project brief...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT COPILOT PANEL (COLLAPSIBLE CONVERSATION) ── */}
                        {isCopilotOpen && (
                            <aside className="hidden w-80 shrink-0 border-l border-border bg-surface/70 lg:flex lg:flex-col">
                                <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Bot size={14} className="text-primary" />
                                        <span className="text-xs font-semibold text-foreground">
                                            Swarm Co-pilot
                                        </span>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                                        Active
                                    </span>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
                                    {messages.map((m) => (
                                        <div
                                            key={m.id}
                                            className={`rounded-xl p-2.5 ${
                                                m.role === "user"
                                                    ? "bg-primary text-white ml-4"
                                                    : m.role === "system"
                                                      ? "bg-primary/5 text-primary border border-primary/20"
                                                      : "bg-surface-elevated text-foreground mr-4 border border-border"
                                            }`}
                                        >
                                            <div className="text-[10px] font-semibold opacity-70 mb-1">
                                                {m.role === "user" ? "You" : m.role === "system" ? "System" : "Orchestrator"}
                                            </div>
                                            <div className="leading-relaxed">
                                                {m.content}
                                            </div>

                                            {/* Direct action button in Copilot for GitHub push */}
                                            {m.role === "assistant" && m.content.includes("push to GitHub") && (
                                                <button
                                                    type="button"
                                                    onClick={openPushModal}
                                                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-surface-elevated"
                                                >
                                                    <Github size={13} />
                                                    <span>Push to GitHub</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Follow-up input in Copilot */}
                                <div className="border-t border-border p-2.5">
                                    <div className="input-shell flex items-center gap-1.5 p-1.5">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            placeholder="Ask co-pilot to tweak code or docs..."
                                            className="w-full bg-transparent px-2 text-xs text-foreground placeholder:text-muted focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage()}
                                            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white"
                                        >
                                            <ArrowRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                LOVABLE-STYLE "PUSH TO GITHUB" FLOATING MODAL DIALOG
                ═══════════════════════════════════════════════════════════════ */}
            {isPushModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
                    onClick={() => !isPushingToGitHub && setIsPushModalOpen(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Github size={18} className="text-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Push to GitHub
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isPushingToGitHub && setIsPushModalOpen(false)}
                                className="text-muted hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {pushSuccessResult ? (
                            /* Success State */
                            <div className="mt-4 space-y-4">
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                                    <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                                    <h4 className="mt-2 text-sm font-semibold text-foreground">
                                        Successfully Published to GitHub!
                                    </h4>
                                    <p className="mt-1 text-xs text-muted">
                                        Your repository has been created and code files pushed.
                                    </p>
                                    <div className="mt-3 font-mono text-xs font-medium text-emerald-500">
                                        {pushSuccessResult.repoFullName}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={pushSuccessResult.repoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="button-primary flex-1 text-xs"
                                    >
                                        <ExternalLink size={14} />
                                        <span>Open on GitHub</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setIsPushModalOpen(false)}
                                        className="button-secondary text-xs"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Input Form */
                            <div className="mt-4 space-y-4 text-xs">
                                {/* Connected GitHub status */}
                                {githubStatus.connected && githubStatus.login ? (
                                    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Github size={14} />
                                            <span className="font-semibold text-foreground">
                                                @{githubStatus.login}
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Connected
                                        </span>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold text-amber-500">
                                                    Connect GitHub Account
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-foreground-soft">
                                                    Connect your account to push directly to your profile.
                                                </p>
                                            </div>
                                            <a
                                                href="/api/auth/github"
                                                className="button-primary min-h-7 px-2.5 py-1 text-[11px]"
                                            >
                                                Connect
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block font-medium text-foreground">
                                        Repository Name
                                    </label>
                                    <input
                                        type="text"
                                        value={pushRepoName}
                                        onChange={(e) => setPushRepoName(e.target.value)}
                                        placeholder="my-project-name"
                                        className="input-shell w-full px-3 py-2 text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-medium text-foreground">
                                        Description (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={pushDescription}
                                        onChange={(e) => setPushDescription(e.target.value)}
                                        placeholder="Created with WorkingGent"
                                        className="input-shell w-full px-3 py-2 text-foreground"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground">Visibility</span>
                                    <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setPushIsPrivate(false)}
                                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                                                !pushIsPrivate
                                                    ? "bg-surface text-foreground shadow-xs"
                                                    : "text-muted hover:text-foreground"
                                            }`}
                                        >
                                            <Globe size={11} />
                                            <span>Public</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPushIsPrivate(true)}
                                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                                                pushIsPrivate
                                                    ? "bg-surface text-foreground shadow-xs"
                                                    : "text-muted hover:text-foreground"
                                            }`}
                                        >
                                            <Lock size={11} />
                                            <span>Private</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block font-medium text-foreground">
                                        Commit Message
                                    </label>
                                    <input
                                        type="text"
                                        value={pushCommitMessage}
                                        onChange={(e) => setPushCommitMessage(e.target.value)}
                                        className="input-shell w-full px-3 py-2 text-foreground"
                                    />
                                </div>

                                {pushError && (
                                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-red-500">
                                        {pushError}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleManualPushToGitHub}
                                        disabled={isPushingToGitHub}
                                        className="button-primary w-full text-xs shadow-md shadow-primary/20"
                                    >
                                        {isPushingToGitHub ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>Publishing to GitHub...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Github size={14} />
                                                <span>Create Repository & Push</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
