export type WorkspaceSyncStatus = "idle" | "cloning" | "ready" | "syncing" | "error" | "deleted"

export interface RepositoryWorkspaceRecord {
    id: string
    userId: string
    owner: string
    repo: string
    repoFullName: string
    repositoryNodeId?: string | null
    defaultBranch: string
    currentBranch: string
    localPath: string
    cloneUrl: string
    visibility: "public" | "private"
    syncStatus: WorkspaceSyncStatus
    lastCommitSha?: string | null
    lastPulledAt?: string | null
    createdAt: string
    updatedAt: string
}

export interface CloneWorkspaceInput {
    userId: string
    accessToken: string
    owner: string
    repo: string
}

export interface CreateBranchInput {
    userId: string
    workspaceId: string
    branchName: string
    fromBranch?: string
}

export interface GitRepositoryStatus {
    currentBranch: string
    trackingBranch: string | null
    ahead: number
    behind: number
    isClean: boolean
    changedFiles: Array<{
        path: string
        indexStatus: string
        workingTreeStatus: string
    }>
}

export interface CreateCommitInput {
    repositoryPath: string
    message: string
    authorName?: string
    authorEmail?: string
    files?: string[]
}

export interface PushChangesInput {
    repositoryPath: string
    branchName: string
    remote?: string
    setUpstream?: boolean
}

export interface PullRequestDraft {
    owner: string
    repo: string
    title: string
    body: string
    head: string
    base: string
}

export interface WorkspaceFileContent {
    filePath: string
    content: string
    hash: string
    size: number
}

export interface FileDiffPreview {
    filePath: string
    originalHash: string
    changed: boolean
    unifiedDiff: string
    originalContent: string
    proposedContent: string
    isNewFile?: boolean
}

export interface CommitRecord {
    id: string
    workspaceId: string
    userId: string
    repoFullName: string
    branchName: string
    message: string
    sha: string
    createdAt: string
}

export interface PullRequestRecord {
    id: string
    workspaceId: string
    userId: string
    repoFullName: string
    title: string
    body: string
    url: string
    number: number
    head: string
    base: string
    createdAt: string
}

export interface PullRequestAutomationInput {
    userId: string
    workspaceId: string
    accessToken: string
    baseBranch?: string
    title?: string
    summary?: string
    issueReferences?: string[]
}

export interface PullRequestDraftContent {
    title: string
    body: string
    summary: string
    filesChanged: string[]
    riskAnalysis: string[]
    testingInstructions: string[]
    baseBranch: string
    headBranch: string
}

export type RepositoryIssueSeverity = "critical" | "high" | "medium" | "low" | "info"

export type RepositoryIssueCategory =
    | "security"
    | "secret"
    | "dependency"
    | "architecture"
    | "duplicate-logic"
    | "dead-code"
    | "validation"
    | "performance"
    | "configuration"
    | "ai-review"

export interface RepositoryIssueRecord {
    id: string
    workspaceId: string
    userId: string
    repoFullName: string
    scanTaskId: string
    title: string
    summary: string
    severity: RepositoryIssueSeverity
    category: RepositoryIssueCategory
    status: "open" | "dismissed"
    recommendation: string
    filePath?: string
    line?: number
    evidence?: string
    fingerprint: string
    source: "heuristic" | "ai"
    createdAt: string
    updatedAt: string
}

export type AgentTaskType = "issue_scan" | "ai_edit_plan" | "patch_apply"
export type AgentTaskStatus = "pending" | "running" | "completed" | "failed" | "approved"

export interface AgentTaskRecord {
    id: string
    workspaceId: string
    userId: string
    repoFullName: string
    taskType: AgentTaskType
    status: AgentTaskStatus
    inputSummary: string
    resultSummary?: string
    metadata?: Record<string, unknown>
    errorMessage?: string
    createdAt: string
    updatedAt: string
}

export interface RepositoryIssueScanSummary {
    total: number
    bySeverity: Record<RepositoryIssueSeverity, number>
    byCategory: Partial<Record<RepositoryIssueCategory, number>>
    scannedFiles: number
    generatedAt: string
}

export interface RepositoryIssueScanResult {
    task: AgentTaskRecord
    findings: RepositoryIssueRecord[]
    summary: RepositoryIssueScanSummary
}

export interface AIEditPlanFile {
    filePath: string
    summary: string
    rationale: string
    preview: FileDiffPreview
}

export interface AIEditPlanResult {
    task: AgentTaskRecord
    files: AIEditPlanFile[]
    warnings: string[]
}
