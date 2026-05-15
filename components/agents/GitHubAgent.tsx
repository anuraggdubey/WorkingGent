"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    AlertCircle, BookOpenText, CheckCircle2, Clock,
    FolderGit2, Github, Globe, Loader2, RefreshCw, Send, Sparkles,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useAgentContext } from "@/lib/AgentContext"

type Repo = { id: number; name: string; fullName: string; description: string; language: string; stars: number; isPrivate: boolean; defaultBranch: string }
type GHUser = { login: string; name: string; avatarUrl: string }
type PlatformStatus = { tools?: { github?: { configured: boolean; connected: boolean; login?: string; name?: string } } }
type Mode = "any" | "oauth"
type Workspace = {
    id: string
    repoFullName: string
    localPath: string
    currentBranch: string
    defaultBranch: string
    syncStatus: "idle" | "cloning" | "ready" | "syncing" | "error" | "deleted"
    visibility: "public" | "private"
    lastPulledAt?: string | null
}
type WorkspaceStatus = {
    currentBranch: string
    trackingBranch: string | null
    ahead: number
    behind: number
    isClean: boolean
    changedFiles: Array<{ path: string; indexStatus: string; workingTreeStatus: string }>
}
type WorkspaceFile = {
    filePath: string
    content: string
    hash: string
    size: number
}
type DiffPreview = {
    filePath: string
    originalHash: string
    changed: boolean
    unifiedDiff: string
    originalContent: string
    proposedContent: string
}
type CommitRecord = {
    id: string
    branchName: string
    message: string
    sha: string
    createdAt: string
}
type PullRequestRecord = {
    id: string
    title: string
    url: string
    number: number
    base: string
    head: string
    createdAt: string
}
type RepositoryIssue = {
    id: string
    title: string
    summary: string
    severity: "critical" | "high" | "medium" | "low" | "info"
    category: string
    recommendation: string
    filePath?: string
    line?: number
    evidence?: string
    source: "heuristic" | "ai"
}
type AgentTask = {
    id: string
    taskType: "issue_scan" | "ai_edit_plan" | "patch_apply"
    status: "pending" | "running" | "completed" | "failed" | "approved"
    inputSummary: string
    resultSummary?: string
    errorMessage?: string
    updatedAt: string
}
type AIPlanFile = {
    filePath: string
    summary: string
    rationale: string
    preview: DiffPreview
}
type AIEditPlan = {
    task: AgentTask
    files: AIPlanFile[]
    warnings: string[]
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export default function GitHubAgent() {
    const searchParams = useSearchParams()
    const { startAgentRun, completeAgentRun, failAgentRun, logAgentEvent } = useAgentContext()

    const [mode, setMode] = useState<Mode>("any")
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
    const [workspaceLoading, setWorkspaceLoading] = useState(false)
    const [branchLoading, setBranchLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus | null>(null)
    const [workspaceCommits, setWorkspaceCommits] = useState<CommitRecord[]>([])
    const [workspacePullRequests, setWorkspacePullRequests] = useState<PullRequestRecord[]>([])
    const [workspaceIssues, setWorkspaceIssues] = useState<RepositoryIssue[]>([])
    const [workspaceTasks, setWorkspaceTasks] = useState<AgentTask[]>([])
    const [branchName, setBranchName] = useState("")
    const [activeFilePath, setActiveFilePath] = useState("")
    const [activeFile, setActiveFile] = useState<WorkspaceFile | null>(null)
    const [editorContent, setEditorContent] = useState("")
    const [diffPreview, setDiffPreview] = useState<DiffPreview | null>(null)
    const [fileLoading, setFileLoading] = useState(false)
    const [diffLoading, setDiffLoading] = useState(false)
    const [applyLoading, setApplyLoading] = useState(false)
    const [commitMessage, setCommitMessage] = useState("")
    const [commitLoading, setCommitLoading] = useState(false)
    const [pushLoading, setPushLoading] = useState(false)
    const [prLoading, setPrLoading] = useState(false)
    const [prTitle, setPrTitle] = useState("")
    const [prSummary, setPrSummary] = useState("")
    const [prBaseBranch, setPrBaseBranch] = useState("")
    const [issueScanLoading, setIssueScanLoading] = useState(false)
    const [aiPlanLoading, setAiPlanLoading] = useState(false)
    const [aiApplyLoading, setAiApplyLoading] = useState(false)
    const [aiEditPrompt, setAiEditPrompt] = useState("")
    const [aiEditFilePaths, setAiEditFilePaths] = useState("")
    const [aiEditPlan, setAiEditPlan] = useState<AIEditPlan | null>(null)

    // "Analyze Any Repo" state
    const [repoUrl, setRepoUrl] = useState("")

    const refreshPlatformStatus = useCallback(() => {
        fetch("/api/platform-status")
            .then((res) => res.json())
            .then((data) => setPlatformStatus(data))
            .catch(() => setPlatformStatus(null))
    }, [])

    useEffect(() => { void refreshPlatformStatus() }, [refreshPlatformStatus])

    // --- OAuth helpers ---
    const loadGitHubConnection = useCallback(async () => {
        setConnecting(true); setError(null)
        try {
            const res = await fetch("/api/connect-github")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to connect GitHub")
            setGhUser(data.user); setRepos(data.repos)
            await refreshPlatformStatus()
            logAgentEvent("github", `Connected GitHub account ${data.user?.login ?? "session"} and loaded ${data.repos?.length ?? 0} repositories.`, { status: "success" })
        } catch (err) {
            const message = getErrorMessage(err, "Failed to connect GitHub")
            if (!message.toLowerCase().includes("not connected")) { setError(message); failAgentRun("github", message) }
        } finally { setConnecting(false) }
    }, [failAgentRun, logAgentEvent, refreshPlatformStatus])

    const loadWorkspaces = useCallback(async () => {
        setWorkspaceLoading(true)
        try {
            const res = await fetch("/api/github/workspaces")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to load workspaces")
            setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : [])
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load workspaces"))
        } finally {
            setWorkspaceLoading(false)
        }
    }, [])

    const loadWorkspaceStatus = useCallback(async (workspaceId: string) => {
        setWorkspaceLoading(true)
        try {
            const res = await fetch(`/api/github/workspaces/${workspaceId}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to load workspace status")
            setWorkspace(data.workspace ?? null)
            setWorkspaceStatus(data.status ?? null)
            setWorkspaceCommits(Array.isArray(data.commits) ? data.commits : [])
            setWorkspacePullRequests(Array.isArray(data.pullRequests) ? data.pullRequests : [])
            setWorkspaceIssues(Array.isArray(data.issues) ? data.issues : [])
            setWorkspaceTasks(Array.isArray(data.tasks) ? data.tasks : [])
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load workspace status"))
        } finally {
            setWorkspaceLoading(false)
        }
    }, [])

    useEffect(() => {
        const githubError = searchParams.get("github_error")
        const githubConnected = searchParams.get("github_connected")
        if (githubError) { setError(githubError); return }
        if (githubConnected === "1") { setMode("oauth"); void loadGitHubConnection(); return }
        void loadGitHubConnection()
    }, [loadGitHubConnection, searchParams])

    useEffect(() => {
        if (mode === "oauth" && ghUser) {
            void loadWorkspaces()
        }
    }, [ghUser, loadWorkspaces, mode])

    useEffect(() => {
        if (!selectedRepo) {
            setWorkspace(null)
            setWorkspaceStatus(null)
            setWorkspaceCommits([])
            setWorkspacePullRequests([])
            setWorkspaceIssues([])
            setWorkspaceTasks([])
            setActiveFile(null)
            setActiveFilePath("")
            setEditorContent("")
            setDiffPreview(null)
            setAiEditPlan(null)
            return
        }

        const nextWorkspace = workspaces.find((item) => item.repoFullName === selectedRepo.fullName) ?? null
        setWorkspace(nextWorkspace)
        setWorkspaceStatus(null)
        if (nextWorkspace) {
            void loadWorkspaceStatus(nextWorkspace.id)
        }
    }, [loadWorkspaceStatus, selectedRepo, workspaces])

    const beginOAuth = useCallback(() => { setConnecting(true); window.location.href = "/api/auth/github" }, [])

    const disconnect = useCallback(async () => {
        setConnecting(true); setError(null)
        try {
            const res = await fetch("/api/auth/github/callback", { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to disconnect GitHub")
            setGhUser(null); setRepos([]); setSelectedRepo(null); setRepoContext(""); setRepoFiles([]); setPrompt(""); setResult(""); setWorkspaces([]); setWorkspace(null); setWorkspaceStatus(null)
            await refreshPlatformStatus()
        } catch (err) { setError(getErrorMessage(err, "Failed to disconnect GitHub")) }
        finally { setConnecting(false) }
    }, [refreshPlatformStatus])

    const cloneWorkspace = async () => {
        if (!selectedRepo) return
        setWorkspaceLoading(true); setError(null)
        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const res = await fetch("/api/github/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to clone repository")
            await loadWorkspaces()
            if (data.workspace?.id) {
                await loadWorkspaceStatus(data.workspace.id)
            }
        } catch (err) {
            setError(getErrorMessage(err, "Failed to clone repository"))
        } finally {
            setWorkspaceLoading(false)
        }
    }

    const refreshWorkspace = async () => {
        if (!workspace) return
        setWorkspaceLoading(true); setError(null)
        try {
            const res = await fetch(`/api/github/workspaces/${workspace.id}/refresh`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to refresh workspace")
            await loadWorkspaces()
            await loadWorkspaceStatus(data.workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to refresh workspace"))
        } finally {
            setWorkspaceLoading(false)
        }
    }

    const createBranch = async () => {
        if (!workspace || !branchName.trim()) return
        setBranchLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/branches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    branchName: branchName.trim(),
                    fromBranch: workspace.currentBranch,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to create branch")
            setBranchName("")
            await loadWorkspaces()
            await loadWorkspaceStatus(data.workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to create branch"))
        } finally {
            setBranchLoading(false)
        }
    }

    const loadWorkspaceFile = async (filePath = activeFilePath) => {
        if (!workspace || !filePath.trim()) return
        setFileLoading(true); setError(null)
        try {
            const params = new URLSearchParams({ workspaceId: workspace.id, filePath: filePath.trim() })
            const res = await fetch(`/api/github/files?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to load workspace file")
            setActiveFile(data.file ?? null)
            setActiveFilePath(data.file?.filePath ?? filePath.trim())
            setEditorContent(data.file?.content ?? "")
            setDiffPreview(null)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load workspace file"))
        } finally {
            setFileLoading(false)
        }
    }

    const previewWorkspaceDiff = async () => {
        if (!workspace || !activeFilePath.trim()) return
        setDiffLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/diff/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    filePath: activeFilePath.trim(),
                    proposedContent: editorContent,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to generate diff preview")
            setDiffPreview(data.preview ?? null)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to generate diff preview"))
        } finally {
            setDiffLoading(false)
        }
    }

    const applyWorkspaceDiff = async () => {
        if (!workspace || !diffPreview) return
        setApplyLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/diff/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    filePath: diffPreview.filePath,
                    proposedContent: editorContent,
                    expectedOriginalHash: diffPreview.originalHash,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to apply diff")
            setActiveFile(data.file ?? null)
            setEditorContent(data.file?.content ?? editorContent)
            setDiffPreview(null)
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to apply diff"))
        } finally {
            setApplyLoading(false)
        }
    }

    const rollbackWorkspaceFile = async () => {
        if (!workspace || !activeFilePath.trim()) return
        setApplyLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/diff/rollback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    filePath: activeFilePath.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to rollback file")
            setActiveFile(data.file ?? null)
            setEditorContent(data.file?.content ?? "")
            setDiffPreview(null)
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to rollback file"))
        } finally {
            setApplyLoading(false)
        }
    }

    const commitWorkspaceChanges = async () => {
        if (!workspace || !commitMessage.trim()) return
        setCommitLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/commits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    message: commitMessage.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to commit changes")
            setCommitMessage("")
            await loadWorkspaceStatus(data.workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to commit changes"))
        } finally {
            setCommitLoading(false)
        }
    }

    const pushWorkspaceChanges = async () => {
        if (!workspace) return
        setPushLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: workspace.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to push changes")
            await loadWorkspaceStatus(data.workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to push changes"))
        } finally {
            setPushLoading(false)
        }
    }

    const createPullRequest = async () => {
        if (!workspace) return
        setPrLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/pull-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    baseBranch: prBaseBranch.trim() || workspace.defaultBranch,
                    title: prTitle.trim() || undefined,
                    summary: prSummary.trim() || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to create pull request")
            setPrTitle(data.draft?.title ?? "")
            setPrSummary(data.draft?.summary ?? "")
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to create pull request"))
        } finally {
            setPrLoading(false)
        }
    }

    const runIssueScan = async () => {
        if (!workspace) return
        setIssueScanLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/issues/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: workspace.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to scan repository issues")
            setWorkspaceIssues(Array.isArray(data.findings) ? data.findings : [])
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to scan repository issues"))
        } finally {
            setIssueScanLoading(false)
        }
    }

    const generateAIEditPlan = async () => {
        if (!workspace || !aiEditPrompt.trim()) return
        setAiPlanLoading(true); setError(null)
        try {
            const filePaths = aiEditFilePaths
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)

            const res = await fetch("/api/github/ai-edits/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    prompt: aiEditPrompt.trim(),
                    filePaths,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to generate AI edit plan")
            setAiEditPlan(data)
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to generate AI edit plan"))
        } finally {
            setAiPlanLoading(false)
        }
    }

    const applyAIEditPlan = async () => {
        if (!workspace || !aiEditPlan?.task?.id) return
        setAiApplyLoading(true); setError(null)
        try {
            const res = await fetch("/api/github/ai-edits/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    taskId: aiEditPlan.task.id,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to apply AI edit plan")
            setAiEditPlan(null)
            await loadWorkspaceStatus(workspace.id)
        } catch (err) {
            setError(getErrorMessage(err, "Failed to apply AI edit plan"))
        } finally {
            setAiApplyLoading(false)
        }
    }

    // --- Parse repo URL ---
    function parseRepoUrl(input: string): { owner: string; repo: string } | null {
        const trimmed = input.trim().replace(/\/+$/, "").replace(/\.git$/, "")
        const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/)
        if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] }
        const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
        if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] }
        return null
    }

    // --- "Analyze Any Repo" indexing (uses server-side PAT) ---
    const indexAnyRepo = async () => {
        const parsed = parseRepoUrl(repoUrl)
        if (!parsed) { setError("Enter a valid repo (e.g. owner/repo or https://github.com/owner/repo)"); return }

        setIndexing(true); setError(null); setResult(""); setRepoContext(""); setRepoFiles([])
        startAgentRun("github", `Indexing ${parsed.owner}/${parsed.repo}`)

        try {
            const res = await fetch("/api/fetch-repo-pat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to index repository")

            setRepoContext(data.context)
            setRepoFiles(data.files)
            setSelectedRepo({
                id: 0, name: parsed.repo, fullName: `${parsed.owner}/${parsed.repo}`,
                description: "", language: "", stars: 0, isPrivate: false, defaultBranch: "main",
            })
            completeAgentRun("github", `Indexed ${parsed.owner}/${parsed.repo} — ${data.files?.length ?? 0} files.`, 2)
        } catch (err) {
            const message = getErrorMessage(err, "Failed to index repository")
            setError(message); failAgentRun("github", message)
        } finally { setIndexing(false) }
    }

    // --- OAuth repo indexing ---
    const loadRepo = async () => {
        if (!selectedRepo) return
        setIndexing(true); setError(null); setResult("")
        startAgentRun("github", `Indexing ${selectedRepo.fullName}`)
        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const res = await fetch("/api/fetch-repo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner, repo }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to index repository")
            setRepoContext(data.context); setRepoFiles(data.files)
            completeAgentRun("github", `Indexed ${selectedRepo.fullName} — ${data.files?.length ?? 0} files.`, 2)
        } catch (err) {
            const message = getErrorMessage(err, "Failed to index repository")
            setError(message); failAgentRun("github", message)
        } finally { setIndexing(false) }
    }

    // --- Shared prompt & review ---
    const runPrompt = async () => {
        if (!selectedRepo || !repoContext || !prompt.trim()) return
        setLoading(true); setError(null)
        startAgentRun("github", `Analyzing ${selectedRepo.fullName}: ${prompt}`)
        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const endpoint = mode === "any" ? "/api/ask-repo-pat" : "/api/ask-repo"
            const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner, repo, question: prompt, context: repoContext }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "GitHub agent failed")
            setResult(data.answer)
            completeAgentRun("github", `Completed repository prompt for ${selectedRepo.fullName}.`, 5)
        } catch (err) {
            const message = getErrorMessage(err, "GitHub agent failed")
            setError(message); failAgentRun("github", message)
        } finally { setLoading(false) }
    }

    const runFullReview = async () => {
        if (!selectedRepo || !repoContext) return
        setLoading(true); setError(null)
        startAgentRun("github", `Running full review for ${selectedRepo.fullName}`)
        try {
            const [owner, repo] = selectedRepo.fullName.split("/")
            const endpoint = mode === "any" ? "/api/analyze-repo-pat" : "/api/analyze-repo"
            const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner, repo, context: repoContext }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Repository analysis failed")
            setResult(data.analysis)
            completeAgentRun("github", `Completed full review for ${selectedRepo.fullName}.`, 6)
        } catch (err) {
            const message = getErrorMessage(err, "Repository analysis failed")
            setError(message); failAgentRun("github", message)
        } finally { setLoading(false) }
    }

    const resetAll = () => { setError(null); setRepoContext(""); setRepoFiles([]); setResult(""); setPrompt(""); setSelectedRepo(null) }
    const switchMode = (m: Mode) => { setMode(m); resetAll() }
    const isReadyForPrompt = Boolean(selectedRepo && repoContext)
    const hasWorkspaceConnection = Boolean(platformStatus?.tools?.github?.configured)

    return (
        <div className="space-y-4 sm:space-y-5">
            {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 sm:p-4">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <div className="min-w-0 text-[13px] leading-relaxed text-red-600 dark:text-red-400 sm:text-sm">{error}</div>
                </div>
            )}

            {/* Mode Tabs */}
            <div className="rounded-lg border border-border bg-surface">
                <div className="flex border-b border-border">
                    <button onClick={() => switchMode("any")}
                        className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${mode === "any" ? "border-b-2 border-primary text-primary bg-primary/5" : "text-muted hover:text-foreground hover:bg-surface-elevated"}`}>
                        <Globe size={15} /> Analyze Any Repo
                    </button>
                    <button onClick={() => switchMode("oauth")}
                        className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${mode === "oauth" ? "border-b-2 border-primary text-primary bg-primary/5" : "text-muted hover:text-foreground hover:bg-surface-elevated"}`}>
                        <Github size={15} /> Connect GitHub
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {mode === "any" ? (
                        <div className="space-y-3">
                            <p className="text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                Enter any public GitHub repository URL or <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">owner/repo</code> to index and analyze it instantly.
                            </p>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-3">
                                <FolderGit2 size={14} className="shrink-0 text-muted" />
                                <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="owner/repo or https://github.com/owner/repo" disabled={indexing}
                                    onKeyDown={(e) => { if (e.key === "Enter") void indexAnyRepo() }}
                                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50" />
                            </div>
                            <button onClick={() => void indexAnyRepo()} disabled={!repoUrl.trim() || indexing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50" style={{ minHeight: 44 }}>
                                {indexing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                {indexing ? "Indexing Repository..." : "Index & Analyze"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {!hasWorkspaceConnection && (
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[13px] leading-relaxed text-amber-700 dark:text-amber-300 sm:text-sm">
                                    GitHub OAuth is not configured. Add the client ID, secret, and callback URL in the server environment first.
                                </div>
                            )}
                            {!ghUser && hasWorkspaceConnection && (
                                <>
                                    <p className="text-[13px] leading-relaxed text-foreground-soft sm:text-sm">Connect with GitHub OAuth to load your repositories.</p>
                                    <button onClick={beginOAuth} disabled={connecting}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50" style={{ minHeight: 44 }}>
                                        {connecting ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                                        Connect with GitHub
                                    </button>
                                </>
                            )}
                            {ghUser && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft"><Github size={16} className="text-primary" /></div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-foreground">{ghUser.name || ghUser.login}</div>
                                            <div className="text-xs text-muted">@{ghUser.login} · {repos.length} repos</div>
                                        </div>
                                    </div>
                                    <select value={selectedRepo?.fullName ?? ""} onChange={(e) => { const repo = repos.find((r) => r.fullName === e.target.value) ?? null; setSelectedRepo(repo); setRepoContext(""); setRepoFiles([]); setResult(""); setPrompt("") }}
                                        disabled={repos.length === 0}
                                        className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" style={{ minHeight: 44 }}>
                                        <option value="">Choose a repository</option>
                                        {repos.map((repo) => <option key={repo.id} value={repo.fullName}>{repo.fullName}</option>)}
                                    </select>
                                    <button onClick={() => void loadRepo()} disabled={!selectedRepo || indexing}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50" style={{ minHeight: 44 }}>
                                        {indexing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-primary" />}
                                        Index Repository
                                    </button>
                                    <button onClick={() => void disconnect()} disabled={connecting}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-elevated disabled:opacity-50" style={{ minHeight: 44 }}>
                                        {connecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Setup Progress */}
            <div className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Setup Progress</div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border">
                    <StatusCell label="Repository" ready={Boolean(selectedRepo)} />
                    <StatusCell label="Indexed" ready={Boolean(repoContext)} />
                    <StatusCell label="Ready" ready={isReadyForPrompt} />
                </div>
            </div>

            {/* Indexed repo info */}
            {selectedRepo && repoContext && (
                <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                        <FolderGit2 size={14} className="text-primary" />
                        <div className="text-sm font-medium text-foreground">{selectedRepo.fullName}</div>
                    </div>
                    {repoFiles.length > 0 && (
                        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">✓ {repoFiles.length} files indexed</div>
                    )}
                </div>
            )}

            {mode === "oauth" && selectedRepo && (
                <div className="rounded-lg border border-border bg-surface">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div className="flex items-center gap-2">
                            <FolderGit2 size={14} className="text-primary" />
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Git Workspace</span>
                        </div>
                        <button
                            onClick={() => void loadWorkspaces()}
                            disabled={workspaceLoading}
                            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-soft transition-colors hover:bg-surface-elevated disabled:opacity-40"
                            style={{ minHeight: 36 }}
                        >
                            {workspaceLoading ? "Loading..." : "Reload"}
                        </button>
                    </div>
                    <div className="space-y-4 p-4">
                        {!workspace ? (
                            <div className="space-y-3">
                                <p className="text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                    Clone this repository into an isolated server workspace to unlock local Git operations.
                                </p>
                                <button
                                    onClick={() => void cloneWorkspace()}
                                    disabled={workspaceLoading}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    style={{ minHeight: 44 }}
                                >
                                    {workspaceLoading ? <Loader2 size={15} className="animate-spin" /> : <FolderGit2 size={15} />}
                                    {workspaceLoading ? "Cloning Workspace..." : "Clone Workspace"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InfoCard label="Branch" value={workspace.currentBranch} />
                                    <InfoCard label="Status" value={workspace.syncStatus} />
                                    <InfoCard label="Tracked Files" value={`${workspaceStatus?.changedFiles.length ?? 0}`} />
                                    <InfoCard label="Working Tree" value={workspaceStatus?.isClean ? "Clean" : "Modified"} />
                                </div>

                                <div className="rounded-lg border border-border bg-background p-3.5">
                                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Local Path</div>
                                    <div className="mt-1 break-all font-mono text-xs text-foreground-soft">{workspace.localPath}</div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => void refreshWorkspace()}
                                        disabled={workspaceLoading}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                        style={{ minHeight: 44 }}
                                    >
                                        {workspaceLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                        Refresh Workspace
                                    </button>
                                    <button
                                        onClick={() => void pushWorkspaceChanges()}
                                        disabled={pushLoading}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                        style={{ minHeight: 44 }}
                                    >
                                        {pushLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Push Branch
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Create Feature Branch</div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            value={branchName}
                                            onChange={(e) => setBranchName(e.target.value)}
                                            placeholder="feat/payment-flow"
                                            disabled={branchLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => void createBranch()}
                                            disabled={!branchName.trim() || branchLoading}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                            style={{ minHeight: 44 }}
                                        >
                                            {branchLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            Create Branch
                                        </button>
                                    </div>
                                    <p className="text-[12px] leading-relaxed text-muted sm:text-xs">Use prefixes like `feat/`, `fix/`, or `refactor/`.</p>
                                </div>

                                {workspaceStatus && workspaceStatus.changedFiles.length > 0 && (
                                    <div className="rounded-lg border border-border bg-background">
                                        <div className="border-b border-border px-4 py-3">
                                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Changed Files</div>
                                        </div>
                                        <div className="max-h-[220px] overflow-y-auto p-3 space-y-2">
                                            {workspaceStatus.changedFiles.map((file) => (
                                                <div key={file.path} className="rounded-md border border-border px-3 py-2">
                                                    <div className="truncate font-mono text-xs text-foreground-soft">{file.path}</div>
                                                    <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                                                        Index {file.indexStatus || "clean"} · Worktree {file.workingTreeStatus || "clean"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Issue Detection</div>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void runIssueScan()}
                                                disabled={issueScanLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {issueScanLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                                                Scan Repository
                                            </button>
                                            <div className="rounded-lg border border-border px-3 py-3 text-xs text-muted">
                                                {workspaceIssues.length} finding(s) tracked
                                            </div>
                                        </div>

                                        {workspaceIssues.length > 0 ? (
                                            <div className="space-y-2">
                                                {workspaceIssues.map((issue) => (
                                                    <div key={issue.id} className="rounded-md border border-border px-3 py-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClassName(issue.severity)}`}>
                                                                {issue.severity}
                                                            </span>
                                                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                                                {issue.category}
                                                            </span>
                                                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                                                {issue.source}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-sm font-medium text-foreground">{issue.title}</div>
                                                        <div className="mt-1 text-[13px] leading-relaxed text-foreground-soft">{issue.summary}</div>
                                                        {(issue.filePath || issue.line) && (
                                                            <div className="mt-2 font-mono text-[11px] text-muted">
                                                                {issue.filePath ?? "repository"}{issue.line ? `:${issue.line}` : ""}
                                                            </div>
                                                        )}
                                                        {issue.evidence && (
                                                            <pre className="mt-2 overflow-auto rounded-lg bg-[#0d1117] p-3 text-[11px] leading-relaxed text-gray-300">{issue.evidence}</pre>
                                                        )}
                                                        <div className="mt-2 text-[12px] leading-relaxed text-muted sm:text-xs">{issue.recommendation}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border p-4 text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                                Run a scan to surface security, validation, dependency, and architecture findings for this workspace.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">AI Edit Planner</div>
                                    </div>
                                    <div className="space-y-4 p-4">
                                        <textarea
                                            value={aiEditPrompt}
                                            onChange={(e) => setAiEditPrompt(e.target.value)}
                                            rows={4}
                                            placeholder="Describe the code change you want. The agent will generate diffs first and wait for approval."
                                            disabled={aiPlanLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <input
                                            value={aiEditFilePaths}
                                            onChange={(e) => setAiEditFilePaths(e.target.value)}
                                            placeholder="Optional file paths, comma separated"
                                            disabled={aiPlanLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void generateAIEditPlan()}
                                                disabled={!aiEditPrompt.trim() || aiPlanLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {aiPlanLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                Generate AI Diff Plan
                                            </button>
                                            <button
                                                onClick={() => void applyAIEditPlan()}
                                                disabled={!aiEditPlan?.files.length || aiApplyLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {aiApplyLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                Approve And Apply
                                            </button>
                                        </div>

                                        {aiEditPlan?.warnings?.length ? (
                                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-300 sm:text-xs">
                                                {aiEditPlan.warnings.join(" ")}
                                            </div>
                                        ) : null}

                                        {aiEditPlan?.files?.length ? (
                                            <div className="space-y-3">
                                                {aiEditPlan.files.map((file) => (
                                                    <div key={file.filePath} className="rounded-lg border border-border p-3">
                                                        <div className="font-mono text-xs text-foreground-soft">{file.filePath}</div>
                                                        <div className="mt-2 text-sm font-medium text-foreground">{file.summary}</div>
                                                        <div className="mt-1 text-[13px] leading-relaxed text-foreground-soft">{file.rationale}</div>
                                                        <pre className="mt-3 max-h-[280px] overflow-auto rounded-lg bg-[#0d1117] p-3 text-[11px] leading-relaxed text-gray-300">{file.preview.unifiedDiff}</pre>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border p-4 text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                                This planner reads targeted workspace files, proposes minimal edits, validates syntax, and waits for explicit approval before writing anything.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Diff Editor</div>
                                    </div>
                                    <div className="space-y-4 p-4">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                value={activeFilePath}
                                                onChange={(e) => setActiveFilePath(e.target.value)}
                                                placeholder="src/app/example.ts"
                                                disabled={fileLoading}
                                                className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                            />
                                            <button
                                                onClick={() => void loadWorkspaceFile()}
                                                disabled={!activeFilePath.trim() || fileLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {fileLoading ? <Loader2 size={14} className="animate-spin" /> : <FolderGit2 size={14} />}
                                                Load File
                                            </button>
                                        </div>

                                        <textarea
                                            value={editorContent}
                                            onChange={(e) => setEditorContent(e.target.value)}
                                            rows={14}
                                            placeholder="Load a repository file to preview and edit it safely."
                                            className="w-full rounded-lg border border-border bg-[#0d1117] px-3.5 py-3 font-mono text-xs text-gray-200 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void previewWorkspaceDiff()}
                                                disabled={!workspace || !activeFilePath.trim() || diffLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {diffLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                Generate Diff
                                            </button>
                                            <button
                                                onClick={() => void applyWorkspaceDiff()}
                                                disabled={!diffPreview?.changed || applyLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {applyLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                Apply Changes
                                            </button>
                                            <button
                                                onClick={() => void rollbackWorkspaceFile()}
                                                disabled={!activeFilePath.trim() || applyLoading}
                                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                                                style={{ minHeight: 44 }}
                                            >
                                                {applyLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                Rollback File
                                            </button>
                                        </div>

                                        {activeFile && (
                                            <div className="text-[12px] leading-relaxed text-muted sm:text-xs">
                                                Loaded <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">{activeFile.filePath}</code> · {activeFile.size} bytes
                                            </div>
                                        )}

                                        {diffPreview && (
                                            <div className="rounded-lg border border-border bg-[#0d1117] p-3">
                                                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Diff Preview</div>
                                                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-gray-300">{diffPreview.unifiedDiff}</pre>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Agent Tasks</div>
                                    </div>
                                    <div className="space-y-2 p-4">
                                        {workspaceTasks.length > 0 ? workspaceTasks.map((task) => (
                                            <div key={task.id} className="rounded-md border border-border px-3 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                                        {task.taskType.replaceAll("_", " ")}
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${taskStatusClassName(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-foreground">{task.inputSummary}</div>
                                                {task.resultSummary && (
                                                    <div className="mt-1 text-[13px] leading-relaxed text-foreground-soft">{task.resultSummary}</div>
                                                )}
                                                {task.errorMessage && (
                                                    <div className="mt-1 text-[13px] leading-relaxed text-red-500">{task.errorMessage}</div>
                                                )}
                                                <div className="mt-2 text-[11px] uppercase tracking-wide text-muted">{new Date(task.updatedAt).toLocaleString()}</div>
                                            </div>
                                        )) : (
                                            <div className="rounded-lg border border-dashed border-border p-4 text-[13px] leading-relaxed text-foreground-soft sm:text-sm">
                                                Task history will appear here for scans, AI edit plans, and patch applications.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Commit Changes</div>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <input
                                            value={commitMessage}
                                            onChange={(e) => setCommitMessage(e.target.value)}
                                            placeholder="feat: add safer workspace diff flow"
                                            disabled={commitLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => void commitWorkspaceChanges()}
                                            disabled={!commitMessage.trim() || commitLoading}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                            style={{ minHeight: 44 }}
                                        >
                                            {commitLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            Commit Changes
                                        </button>

                                        {workspaceCommits.length > 0 && (
                                            <div className="space-y-2">
                                                {workspaceCommits.map((commit) => (
                                                    <div key={commit.id} className="rounded-md border border-border px-3 py-2">
                                                        <div className="text-sm font-medium text-foreground">{commit.message}</div>
                                                        <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                                                            {commit.branchName} · {commit.sha.slice(0, 7)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background">
                                    <div className="border-b border-border px-4 py-3">
                                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Open Pull Request</div>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <input
                                            value={prBaseBranch}
                                            onChange={(e) => setPrBaseBranch(e.target.value)}
                                            placeholder={workspace.defaultBranch}
                                            disabled={prLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <input
                                            value={prTitle}
                                            onChange={(e) => setPrTitle(e.target.value)}
                                            placeholder="Optional PR title override"
                                            disabled={prLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <textarea
                                            value={prSummary}
                                            onChange={(e) => setPrSummary(e.target.value)}
                                            rows={4}
                                            placeholder="Optional summary to guide PR generation."
                                            disabled={prLoading}
                                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => void createPullRequest()}
                                            disabled={prLoading}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                            style={{ minHeight: 44 }}
                                        >
                                            {prLoading ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
                                            Create Pull Request
                                        </button>

                                        {workspacePullRequests.length > 0 && (
                                            <div className="space-y-2">
                                                {workspacePullRequests.map((pullRequest) => (
                                                    <a
                                                        key={pullRequest.id}
                                                        href={pullRequest.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block rounded-md border border-border px-3 py-2 transition-colors hover:bg-surface-elevated"
                                                    >
                                                        <div className="text-sm font-medium text-foreground">{pullRequest.title}</div>
                                                        <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                                                            #{pullRequest.number} · {pullRequest.head} → {pullRequest.base}
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prompt Section */}
            <div className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                        <BookOpenText size={14} className="text-primary" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Ask the Agent</span>
                    </div>
                    <button onClick={() => void runFullReview()} disabled={!isReadyForPrompt || loading}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-soft transition-colors hover:bg-surface-elevated disabled:opacity-40" style={{ minHeight: 36 }}>
                        Full Review
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    {!isReadyForPrompt && !result && !loading && (
                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 sm:p-6">
                            <Github size={20} className="shrink-0 text-muted" />
                            <div>
                                <div className="text-sm font-semibold text-foreground">{mode === "any" ? "Analyze any repository" : "GitHub-first workflow"}</div>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground-soft sm:text-xs">
                                    {mode === "any"
                                        ? "Enter a repository URL above and index it to unlock the prompt."
                                        : "Connect GitHub, select a repository, and index it. Then the prompt becomes active."}
                                </p>
                            </div>
                        </div>
                    )}
                    <div>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                            placeholder={isReadyForPrompt ? "e.g. Explain the auth flow, identify risks, and suggest fixes." : "Index a repository first."}
                            rows={4} disabled={!isReadyForPrompt || loading}
                            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[15px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:text-sm" />
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => void runPrompt()} disabled={!prompt.trim() || !isReadyForPrompt || loading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none" style={{ minHeight: 44 }}>
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Run Agent
                            </button>
                            <button onClick={() => { setPrompt(""); setResult(""); setError(null) }}
                                className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-elevated" style={{ minHeight: 44 }}>
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

            {/* Indexed files */}
            {repoFiles.length > 0 && (
                <details className="rounded-lg border border-border bg-surface">
                    <summary className="cursor-pointer px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted select-none" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
                        Indexed Files ({repoFiles.length})
                    </summary>
                    <div className="max-h-[300px] overflow-y-auto border-t border-border p-3 space-y-1">
                        {repoFiles.map((file) => (
                            <div key={file} className="truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground-soft">{file}</div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-background p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
        </div>
    )
}

function StatusCell({ label, ready }: { label: string; ready: boolean }) {
    return (
        <div className="flex items-center gap-2 bg-surface px-3.5 py-3 sm:px-4">
            {ready ? <CheckCircle2 size={14} className="shrink-0 text-emerald-500" /> : <Clock size={14} className="shrink-0 text-muted" />}
            <span className={`text-xs font-medium ${ready ? "text-foreground" : "text-muted"}`}>{label}</span>
        </div>
    )
}

function severityClassName(severity: RepositoryIssue["severity"]) {
    if (severity === "critical") return "bg-red-500/15 text-red-500"
    if (severity === "high") return "bg-orange-500/15 text-orange-500"
    if (severity === "medium") return "bg-amber-500/15 text-amber-600 dark:text-amber-300"
    if (severity === "low") return "bg-blue-500/15 text-blue-500"
    return "bg-emerald-500/15 text-emerald-500"
}

function taskStatusClassName(status: AgentTask["status"]) {
    if (status === "failed") return "bg-red-500/15 text-red-500"
    if (status === "running") return "bg-amber-500/15 text-amber-600 dark:text-amber-300"
    if (status === "approved") return "bg-blue-500/15 text-blue-500"
    if (status === "completed") return "bg-emerald-500/15 text-emerald-500"
    return "bg-surface-elevated text-muted"
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
