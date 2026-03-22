"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    AlertCircle,
    BookOpenText,
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-5">
                <section className="rounded-[28px] border border-border bg-surface shadow-sm">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
                            <Github size={15} className="text-primary" />
                            Step 1 · Connect GitHub
                        </h2>
                    </div>

                    <div className="space-y-4 p-5">
                        {!hasWorkspaceConnection && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                                GitHub OAuth is not configured yet. Add the GitHub client ID, client secret, and callback URL in the server environment first.
                            </div>
                        )}

                        {!ghUser && hasWorkspaceConnection && (
                            <>
                                <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed text-gray-500">
                                    Connect with GitHub OAuth to let each user load their own repositories in this browser session.
                                </div>

                                <button
                                    onClick={beginOAuth}
                                    disabled={connecting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {connecting ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
                                    Connect with GitHub
                                </button>
                            </>
                        )}

                        {ghUser && (
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                    Connected Account
                                </div>
                                <div className="mt-2 text-base font-semibold text-foreground">
                                    {ghUser.name || ghUser.login}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">@{ghUser.login}</div>
                                <div className="mt-3 text-xs text-gray-500">
                                    {repos.length} repositories available for selection
                                </div>
                                <button
                                    onClick={() => void disconnect()}
                                    disabled={connecting}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-foreground transition-all hover:border-primary/40 disabled:opacity-50"
                                >
                                    {connecting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    Disconnect GitHub
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-[28px] border border-border bg-surface shadow-sm">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
                            <FolderGit2 size={15} className="text-primary" />
                            Step 2 · Select Repository
                        </h2>
                    </div>

                    <div className="space-y-4 p-5">
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
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 font-bold text-foreground transition-all hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {indexing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-primary" />}
                            Index Repository
                        </button>

                        {selectedRepo && (
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="text-sm font-semibold text-foreground">{selectedRepo.fullName}</div>
                                <div className="mt-2 text-xs leading-relaxed text-gray-500">
                                    {selectedRepo.description || "No repository description provided."}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedRepo.language && (
                                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                            {selectedRepo.language}
                                        </span>
                                    )}
                                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                                        {selectedRepo.stars} stars
                                    </span>
                                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                                        {selectedRepo.defaultBranch}
                                    </span>
                                </div>
                                {repoFiles.length > 0 && (
                                    <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                                        {repoFiles.length} files indexed and ready for prompting
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </aside>

            <section className="rounded-[32px] border border-border bg-surface shadow-sm">
                <div className="border-b border-border px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
                                <BookOpenText size={15} className="text-primary" />
                                Step 3 · Ask the GitHub Agent
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                The prompt box stays locked until GitHub is connected and the selected repository has been indexed.
                            </p>
                        </div>
                        <button
                            onClick={() => void runFullReview()}
                            disabled={!isReadyForPrompt || loading}
                            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-foreground transition-all hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Full Review
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-border bg-background p-4">
                            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                Prompt
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                placeholder={
                                    isReadyForPrompt
                                        ? "Example: explain the auth flow, identify the main architectural risks, and suggest the fastest fixes."
                                        : "Connect GitHub and index a repository first."
                                }
                                rows={7}
                                disabled={!isReadyForPrompt || loading}
                                className="mt-3 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            />
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => void runPrompt()}
                                    disabled={!prompt.trim() || !isReadyForPrompt || loading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Run GitHub Agent
                                </button>
                                <button
                                    onClick={() => {
                                        setPrompt("")
                                        setResult("")
                                        setError(null)
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 font-bold text-foreground transition-all hover:border-primary/40"
                                >
                                    <RefreshCw size={16} />
                                    Clear
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                                <div className="text-sm leading-relaxed text-red-500">{error}</div>
                            </div>
                        )}

                        {!result && !loading && (
                            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-6 py-10 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                                    <Github size={24} />
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-foreground">
                                    GitHub-first workflow
                                </h3>
                                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                                    First connect GitHub. Then select and index a repository. Only after that does the prompt box become active.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-gray-500">
                                <Loader2 size={16} className="animate-spin text-primary" />
                                GitHub agent is reading the indexed repository context and preparing a response...
                            </div>
                        )}

                        {result && (
                            <div className="rounded-2xl border border-border bg-background p-5">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown components={mdComponents}>{result}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-background p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                Readiness
                            </div>
                            <div className="mt-3 space-y-3">
                                <StatusRow label="GitHub connected" ready={Boolean(ghUser)} />
                                <StatusRow label="Repository selected" ready={Boolean(selectedRepo)} />
                                <StatusRow label="Repository indexed" ready={Boolean(repoContext)} />
                                <StatusRow label="Prompt unlocked" ready={isReadyForPrompt} />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                Indexed Files
                            </div>
                            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
                                {repoFiles.length === 0 ? (
                                    <div className="text-sm leading-relaxed text-gray-500">
                                        Once indexed, the agent will list the README, package metadata, and source files it can reason over.
                                    </div>
                                ) : (
                                    repoFiles.map((file) => (
                                        <div
                                            key={file}
                                            className="truncate rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-gray-500"
                                        >
                                            {file}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    ready
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-500/10 text-slate-500"
                }`}
            >
                {ready ? "Ready" : "Pending"}
            </span>
        </div>
    )
}

const mdComponents: Components = {
    h2: ({ children }) => <h2 className="mt-6 border-b border-border pb-2 text-base font-bold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 text-sm font-bold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{children}</span>
        </li>
    ),
    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
    code: ({ children }) => <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">{children}</code>,
    pre: ({ children }) => <pre className="mt-2 overflow-auto rounded-xl bg-[#0d1117] p-4 text-xs text-gray-300">{children}</pre>,
}
