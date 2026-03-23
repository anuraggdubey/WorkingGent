"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    AlertCircle,
    BookOpenText,
    CheckCircle2,
    Clock,
    FolderGit2,
    Github,
    Loader2,
    RefreshCw,
    Send,
    Sparkles,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useAgentContext } from "@/lib/AgentContext"

type Repo = {
    id: number
    name: string
    fullName: string
    description: string
    language: string
    stars: number
    isPrivate: boolean
    defaultBranch: string
}

type GHUser = { login: string; name: string; avatarUrl: string }

type PlatformStatus = {
    tools?: {
        github?: {
            configured: boolean
            connected: boolean
            login?: string
            name?: string
        }
    }
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export default function GitHubAgent() {
    const searchParams = useSearchParams()
    const { startAgentRun, completeAgentRun, failAgentRun, logAgentEvent } = useAgentContext()
    const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)
    const [ghUser, setGhUser] = useState<GHUser | null>(null)
    const [repos, setRepos] = useState<Repo[]>([])
    const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
    const [repoContext, setRepoContext] = useState("")
    const [repoFiles, setRepoFiles] = useState<string[]>([])
    const [prompt, setPrompt] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [indexing, setIndexing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refreshPlatformStatus = useCallback(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => setPlatformStatus(data))
            .catch(() => setPlatformStatus(null))
    }, [])

    useEffect(() => {
        void refreshPlatformStatus()
    }, [refreshPlatformStatus])

    const loadGitHubConnection = useCallback(async () => {
        setConnecting(true)
        setError(null)

        try {
            const res = await fetch("/api/connect-github")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to connect GitHub")

            setGhUser(data.user)
            setRepos(data.repos)
            await refreshPlatformStatus()
            logAgentEvent(
                "github",
                `Connected GitHub account ${data.user?.login ?? "session"} and loaded ${data.repos?.length ?? 0} repositories.`,
                { status: "success" }
            )
        } catch (err) {
            const message = getErrorMessage(err, "Failed to connect GitHub")
            if (!message.toLowerCase().includes("not connected")) {
                setError(message)
                failAgentRun("github", message)
            }
        } finally {
            setConnecting(false)
        }
    }, [failAgentRun, logAgentEvent, refreshPlatformStatus])

    useEffect(() => {
        const githubError = searchParams.get("github_error")
        const githubConnected = searchParams.get("github_connected")

        if (githubError) {
            setError(githubError)
            return
        }

        if (githubConnected === "1") {
            void loadGitHubConnection()
            return
        }

        void loadGitHubConnection()
    }, [loadGitHubConnection, searchParams])

    const beginOAuth = useCallback(() => {
        setConnecting(true)
        window.location.href = "/api/auth/github"
    }, [])

    const disconnect = useCallback(async () => {
        setConnecting(true)
        setError(null)

        try {
            const res = await fetch("/api/auth/github/callback", { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to disconnect GitHub")
            setGhUser(null)
            setRepos([])
            setSelectedRepo(null)
            setRepoContext("")
            setRepoFiles([])
            setPrompt("")
            setResult("")
            await refreshPlatformStatus()
        } catch (err) {
            const message = getErrorMessage(err, "Failed to disconnect GitHub")
            setError(message)
        } finally {
            setConnecting(false)
        }
    }, [refreshPlatformStatus])

    const loadRepo = async () => {
        if (!selectedRepo) return

        setIndexing(true)
        setError(null)
        setResult("")
        startAgentRun("github", `Indexing ${selectedRepo.fullName}`)

        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const res = await fetch("/api/fetch-repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to index repository")

            setRepoContext(data.context)
            setRepoFiles(data.files)
            completeAgentRun(
                "github",
                `Indexed ${selectedRepo.fullName} and loaded ${data.files?.length ?? 0} repository files.`,
                2
            )
        } catch (err) {
            const message = getErrorMessage(err, "Failed to index repository")
            setError(message)
            failAgentRun("github", message)
        } finally {
            setIndexing(false)
        }
    }

    const runPrompt = async () => {
        if (!selectedRepo || !repoContext || !prompt.trim()) return

        setLoading(true)
        setError(null)
        startAgentRun("github", `Analyzing ${selectedRepo.fullName}: ${prompt}`)

        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const res = await fetch("/api/ask-repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    question: prompt,
                    context: repoContext,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "GitHub agent failed")
            setResult(data.answer)
            completeAgentRun("github", `Completed repository prompt for ${selectedRepo.fullName}.`, 5)
        } catch (err) {
            const message = getErrorMessage(err, "GitHub agent failed")
            setError(message)
            failAgentRun("github", message)
        } finally {
            setLoading(false)
        }
    }

    const runFullReview = async () => {
        if (!selectedRepo || !repoContext) return

        setLoading(true)
        setError(null)
        startAgentRun("github", `Running full repository review for ${selectedRepo.fullName}`)

        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const res = await fetch("/api/analyze-repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo, context: repoContext }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Repository analysis failed")
            setResult(data.analysis)
            completeAgentRun("github", `Completed full review for ${selectedRepo.fullName}.`, 6)
        } catch (err) {
            const message = getErrorMessage(err, "Repository analysis failed")
            setError(message)
            failAgentRun("github", message)
        } finally {
            setLoading(false)
        }
    }

    const isReadyForPrompt = Boolean(selectedRepo && repoContext)
    const hasWorkspaceConnection = Boolean(platformStatus?.tools?.github?.configured)

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 sm:p-4">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <div className="min-w-0 text-[13px] leading-relaxed text-red-600 dark:text-red-400 sm:text-sm">{error}</div>
                </div>
            )}

            {/* Readiness checklist — always visible at top */}
            <div className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Setup Progress</div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                    <StatusCell label="GitHub" ready={Boolean(ghUser)} />
                    <StatusCell label="Repository" ready={Boolean(selectedRepo)} />
                    <StatusCell label="Indexed" ready={Boolean(repoContext)} />
                    <StatusCell label="Ready" ready={isReadyForPrompt} />
                </div>
            </div>

            {/* Two-column on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr] sm:gap-5">

                {/* Step 1 — Connect GitHub */}
                <div className="rounded-lg border border-border bg-surface">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                        <Github size={14} className="text-primary" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Step 1 — Connect GitHub</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {!hasWorkspaceConnection && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300 sm:text-sm">
                                GitHub OAuth is not configured. Add the client ID, secret, and callback URL in the server environment first.
                            </div>
                        )}

                        {!ghUser && hasWorkspaceConnection && (
                            <>
                                <p className="text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                    Connect with GitHub OAuth to load your repositories.
                                </p>
                                <button
                                    onClick={beginOAuth}
                                    disabled={connecting}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    style={{ minHeight: 44 }}
                                >
                                    {connecting ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                                    Connect with GitHub
                                </button>
                            </>
                        )}

                        {ghUser && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                                        <Github size={16} className="text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-foreground">{ghUser.name || ghUser.login}</div>
                                        <div className="text-xs text-muted">@{ghUser.login} · {repos.length} repos</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => void disconnect()}
                                    disabled={connecting}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                    style={{ minHeight: 44 }}
                                >
                                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    Disconnect
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2 — Select & Index Repository */}
                <div className="rounded-lg border border-border bg-surface">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                        <FolderGit2 size={14} className="text-primary" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Step 2 — Select Repository</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <select
                            value={selectedRepo?.fullName ?? ""}
                            onChange={(event) => {
                                const repo = repos.find((entry) => entry.fullName === event.target.value) ?? null
                                setSelectedRepo(repo)
                                setRepoContext("")
                                setRepoFiles([])
                                setResult("")
                                setPrompt("")
                            }}
                            disabled={repos.length === 0}
                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            style={{ minHeight: 44 }}
                        >
                            <option value="">Choose a repository</option>
                            {repos.map((repo) => (
                                <option key={repo.id} value={repo.fullName}>
                                    {repo.fullName}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => void loadRepo()}
                            disabled={!selectedRepo || indexing}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                            style={{ minHeight: 44 }}
                        >
                            {indexing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-primary" />}
                            Index Repository
                        </button>

                        {selectedRepo && (
                            <div className="rounded-lg border border-border bg-background p-3">
                                <div className="text-sm font-medium text-foreground">{selectedRepo.fullName}</div>
                                {selectedRepo.description && (
                                    <div className="mt-1 text-[13px] leading-relaxed text-foreground-soft sm:text-xs">{selectedRepo.description}</div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedRepo.language && (
                                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                            {selectedRepo.language}
                                        </span>
                                    )}
                                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
                                        ★ {selectedRepo.stars}
                                    </span>
                                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
                                        {selectedRepo.defaultBranch}
                                    </span>
                                </div>
                                {repoFiles.length > 0 && (
                                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                                        ✓ {repoFiles.length} files indexed
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Step 3 — Prompt */}
            <div className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                        <BookOpenText size={14} className="text-primary" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Step 3 — Ask the Agent</span>
                    </div>
                    <button
                        onClick={() => void runFullReview()}
                        disabled={!isReadyForPrompt || loading}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-soft transition-colors hover:bg-surface-elevated disabled:opacity-40"
                        style={{ minHeight: 36 }}
                    >
                        Full Review
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {!isReadyForPrompt && !result && !loading && (
                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 sm:p-6">
                            <Github size={20} className="shrink-0 text-muted" />
                            <div>
                                <div className="text-sm font-semibold text-foreground">GitHub-first workflow</div>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground-soft sm:text-xs">
                                    Connect GitHub, select a repository, and index it. Then the prompt becomes active.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder={
                                isReadyForPrompt
                                    ? "e.g. Explain the auth flow, identify risks, and suggest fixes."
                                    : "Connect GitHub and index a repository first."
                            }
                            rows={4}
                            disabled={!isReadyForPrompt || loading}
                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[15px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:text-sm"
                        />
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => void runPrompt()}
                                disabled={!prompt.trim() || !isReadyForPrompt || loading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                                style={{ minHeight: 44 }}
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Run Agent
                            </button>
                            <button
                                onClick={() => {
                                    setPrompt("")
                                    setResult("")
                                    setError(null)
                                }}
                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-elevated"
                                style={{ minHeight: 44 }}
                            >
                                <RefreshCw size={14} />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5">
                            <Loader2 size={15} className="animate-spin text-primary" />
                            <span className="text-[13px] text-foreground-soft sm:text-sm">Analyzing repository...</span>
                        </div>
                    )}

                    {result && (
                        <div className="rounded-lg border border-border bg-background p-4">
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown components={mdComponents}>{result}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Indexed files — collapsible on mobile */}
            {repoFiles.length > 0 && (
                <details className="rounded-lg border border-border bg-surface">
                    <summary className="cursor-pointer px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted select-none" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
                        Indexed Files ({repoFiles.length})
                    </summary>
                    <div className="max-h-[300px] overflow-y-auto border-t border-border p-3 space-y-1">
                        {repoFiles.map((file) => (
                            <div
                                key={file}
                                className="truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground-soft"
                            >
                                {file}
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}

function StatusCell({ label, ready }: { label: string; ready: boolean }) {
    return (
        <div className="flex items-center gap-2 bg-surface px-3.5 py-3 sm:px-4">
            {ready ? (
                <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
            ) : (
                <Clock size={14} className="shrink-0 text-muted" />
            )}
            <span className={`text-xs font-medium ${ready ? "text-foreground" : "text-muted"}`}>{label}</span>
        </div>
    )
}

const mdComponents: Components = {
    h2: ({ children }) => <h2 className="mt-6 border-b border-border pb-2 text-base font-bold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 text-sm font-bold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mb-3 text-[13px] leading-relaxed text-foreground-soft sm:text-sm">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-[13px] text-foreground-soft sm:text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{children}</span>
        </li>
    ),
    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
    code: ({ children }) => <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">{children}</code>,
    pre: ({ children }) => <pre className="mt-2 overflow-auto rounded-lg bg-[#0d1117] p-3.5 text-xs text-gray-300">{children}</pre>,
}
