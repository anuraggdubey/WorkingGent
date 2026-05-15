import fs from "fs/promises"
import { AgentExecutionError } from "@/lib/agents/shared"
import { AIEditingService } from "@/lib/github/aiEditingService"
import { ChangeStore } from "@/lib/github/changeStore"
import { DiffService } from "@/lib/github/diffService"
import { createOctokit } from "@/lib/github/octokit"
import { GitService } from "@/lib/github/gitService"
import { IssueDetectionService } from "@/lib/github/issueDetectionService"
import { IssueStore } from "@/lib/github/issueStore"
import { generatePullRequestDraft } from "@/lib/github/prAutomation"
import { TaskStore } from "@/lib/github/taskStore"
import { WorkspaceStore } from "@/lib/github/workspaceStore"
import type {
    AgentTaskRecord,
    AIEditPlanResult,
    CloneWorkspaceInput,
    CreateBranchInput,
    PullRequestAutomationInput,
    RepositoryWorkspaceRecord,
} from "@/lib/github/types"
import { getWorkspaceRoot, resolveWorkspaceFilePath, resolveWorkspacePath, slugifySegment, toWorkspaceId } from "@/lib/github/utils"
import { logger } from "@/lib/server/logger"

const WORKSPACE_SCOPE = "WorkspaceManager"

export class WorkspaceManager {
    constructor(
        private readonly store = new WorkspaceStore(),
        private readonly gitService = new GitService(),
        private readonly diffService = new DiffService(),
        private readonly changeStore = new ChangeStore(),
        private readonly issueStore = new IssueStore(),
        private readonly taskStore = new TaskStore(),
        private readonly issueDetectionService = new IssueDetectionService(),
        private readonly aiEditingService = new AIEditingService()
    ) {}

    private async createTask(input: {
        workspace: RepositoryWorkspaceRecord
        taskType: AgentTaskRecord["taskType"]
        status: AgentTaskRecord["status"]
        inputSummary: string
        metadata?: Record<string, unknown>
        resultSummary?: string
        errorMessage?: string
    }) {
        const timestamp = new Date().toISOString()
        const id = `${input.workspace.id}--${input.taskType}--${Date.now()}`

        return this.taskStore.save({
            id,
            workspaceId: input.workspace.id,
            userId: input.workspace.userId,
            repoFullName: input.workspace.repoFullName,
            taskType: input.taskType,
            status: input.status,
            inputSummary: input.inputSummary,
            metadata: input.metadata,
            resultSummary: input.resultSummary,
            errorMessage: input.errorMessage,
            createdAt: timestamp,
            updatedAt: timestamp,
        })
    }

    private async updateTask(task: AgentTaskRecord, updates: Partial<AgentTaskRecord>) {
        return this.taskStore.save({
            ...task,
            ...updates,
            updatedAt: new Date().toISOString(),
        })
    }

    async listWorkspaces(userId: string) {
        return this.store.listByUser(userId)
    }

    async getWorkspaceForUser(userId: string, workspaceId: string) {
        const workspace = await this.store.getById(workspaceId)

        if (!workspace || workspace.userId !== userId) {
            throw new AgentExecutionError("WORKSPACE_NOT_FOUND", "Repository workspace not found.", 404)
        }

        return workspace
    }

    async cloneWorkspace(input: CloneWorkspaceInput) {
        const repoWorkspaceId = toWorkspaceId(input.owner, input.repo)
        const workspaceId = `${slugifySegment(input.userId)}--${repoWorkspaceId}`
        const existing = await this.store.getById(workspaceId)

        if (existing && existing.userId === input.userId) {
            return {
                workspace: await this.refreshWorkspace(input.userId, workspaceId),
                reused: true,
            }
        }

        const octokit = createOctokit(input.accessToken)
        const repository = await octokit.request("GET /repos/{owner}/{repo}", {
            owner: input.owner,
            repo: input.repo,
        }).then((response) => response.data).catch((error: unknown) => {
            logger.error(WORKSPACE_SCOPE, "Repository validation failed", {
                owner: input.owner,
                repo: input.repo,
                error: error instanceof Error ? error.message : String(error),
            })
            throw new AgentExecutionError("REPO_ACCESS_DENIED", "Unable to validate access to this repository.", 403)
        })

        const localPath = resolveWorkspacePath(input.userId, repoWorkspaceId)
        const timestamp = new Date().toISOString()
        const cloneUrl = repository.clone_url
        const remoteUrl = repository.private
            ? cloneUrl.replace("https://", `https://x-access-token:${input.accessToken}@`)
            : cloneUrl

        const record: RepositoryWorkspaceRecord = {
            id: workspaceId,
            userId: input.userId,
            owner: repository.owner.login,
            repo: repository.name,
            repoFullName: repository.full_name,
            repositoryNodeId: repository.node_id ?? null,
            defaultBranch: repository.default_branch,
            currentBranch: repository.default_branch,
            localPath,
            cloneUrl,
            visibility: repository.private ? "private" : "public",
            syncStatus: "cloning",
            lastCommitSha: null,
            lastPulledAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        }

        await this.store.save(record)

        try {
            await fs.mkdir(getWorkspaceRoot(), { recursive: true })
            await this.gitService.cloneRepository({
                remoteUrl,
                directory: localPath,
                branch: repository.default_branch,
            })

            const headSha = await this.gitService.getHeadSha(localPath)
            const readyRecord: RepositoryWorkspaceRecord = {
                ...record,
                lastCommitSha: headSha,
                lastPulledAt: new Date().toISOString(),
                syncStatus: "ready",
                updatedAt: new Date().toISOString(),
            }

            await this.store.save(readyRecord)
            return { workspace: readyRecord, reused: false }
        } catch (error) {
            await this.store.save({
                ...record,
                syncStatus: "error",
                updatedAt: new Date().toISOString(),
            })
            throw error
        }
    }

    async refreshWorkspace(userId: string, workspaceId: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        await this.store.save({
            ...workspace,
            syncStatus: "syncing",
            updatedAt: new Date().toISOString(),
        })

        await this.gitService.checkoutBranch({
            repositoryPath: workspace.localPath,
            branchName: workspace.currentBranch,
        })
        await this.gitService.pullRepository({
            repositoryPath: workspace.localPath,
            branch: workspace.currentBranch,
        })

        const headSha = await this.gitService.getHeadSha(workspace.localPath)
        const refreshed: RepositoryWorkspaceRecord = {
            ...workspace,
            syncStatus: "ready",
            lastCommitSha: headSha,
            lastPulledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        await this.store.save(refreshed)
        return refreshed
    }

    async deleteWorkspace(userId: string, workspaceId: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const root = getWorkspaceRoot()

        if (!workspace.localPath.startsWith(root)) {
            throw new AgentExecutionError("INVALID_PATH", "Workspace path is outside the managed workspace root.", 400)
        }

        await fs.rm(workspace.localPath, { recursive: true, force: true })
        await this.store.delete(workspace.id)
    }

    async createBranch(input: CreateBranchInput) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        const fromBranch = input.fromBranch?.trim() || workspace.currentBranch || workspace.defaultBranch

        const branchName = await this.gitService.createBranch({
            repositoryPath: workspace.localPath,
            branchName: input.branchName,
            fromBranch,
        })

        const updated: RepositoryWorkspaceRecord = {
            ...workspace,
            currentBranch: branchName,
            updatedAt: new Date().toISOString(),
        }
        await this.store.save(updated)

        return updated
    }

    async getWorkspaceStatus(userId: string, workspaceId: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const status = await this.gitService.getRepositoryStatus(workspace.localPath)
        const commits = await this.changeStore.listCommitsByWorkspace(workspaceId, 8)
        const pullRequests = await this.changeStore.listPullRequestsByWorkspace(workspaceId, 8)
        const issues = await this.issueStore.listByWorkspace(workspaceId, 20)
        const tasks = await this.taskStore.listByWorkspace(workspaceId, 12)

        const updated: RepositoryWorkspaceRecord = {
            ...workspace,
            currentBranch: status.currentBranch,
            updatedAt: new Date().toISOString(),
        }
        await this.store.save(updated)

        return {
            workspace: updated,
            status,
            commits,
            pullRequests,
            issues,
            tasks,
        }
    }

    async readWorkspaceFile(userId: string, workspaceId: string, filePath: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const target = resolveWorkspaceFilePath(workspace.localPath, filePath)
        return this.diffService.readFile(target.resolved, target.normalized)
    }

    async previewFileEdit(userId: string, workspaceId: string, filePath: string, proposedContent: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const target = resolveWorkspaceFilePath(workspace.localPath, filePath)
        return this.diffService.previewEdit(target.resolved, target.normalized, proposedContent)
    }

    async applyFileEdit(userId: string, workspaceId: string, filePath: string, proposedContent: string, expectedOriginalHash: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const target = resolveWorkspaceFilePath(workspace.localPath, filePath)
        return this.diffService.applyEdit(target.resolved, target.normalized, expectedOriginalHash, proposedContent)
    }

    async rollbackFileEdit(userId: string, workspaceId: string, filePath: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const target = resolveWorkspaceFilePath(workspace.localPath, filePath)
        const existsInHead = await this.gitService.fileExistsInHead(workspace.localPath, target.normalized)

        if (existsInHead) {
            await this.gitService.restorePath(workspace.localPath, target.normalized)
        } else {
            await this.gitService.removeUntrackedPath(workspace.localPath, target.normalized)
        }

        return this.readWorkspaceFile(userId, workspaceId, filePath).catch(() => null)
    }

    async commitWorkspaceChanges(input: {
        userId: string
        workspaceId: string
        message: string
    }) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        const sha = await this.gitService.commitChanges({
            repositoryPath: workspace.localPath,
            message: input.message.trim(),
            authorName: "WorkingGent",
            authorEmail: "noreply@workinggent.local",
        })

        const record = await this.changeStore.saveCommit({
            id: `${workspace.id}--${sha}`,
            workspaceId: workspace.id,
            userId: input.userId,
            repoFullName: workspace.repoFullName,
            branchName: workspace.currentBranch,
            message: input.message.trim(),
            sha,
            createdAt: new Date().toISOString(),
        })

        const updated: RepositoryWorkspaceRecord = {
            ...workspace,
            lastCommitSha: sha,
            updatedAt: new Date().toISOString(),
        }
        await this.store.save(updated)

        return {
            workspace: updated,
            commit: record,
        }
    }

    async pushWorkspaceChanges(input: {
        userId: string
        workspaceId: string
    }) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        await this.gitService.pushChanges({
            repositoryPath: workspace.localPath,
            branchName: workspace.currentBranch,
            setUpstream: true,
        })

        return this.getWorkspaceStatus(input.userId, workspace.id)
    }

    async createPullRequest(input: PullRequestAutomationInput) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        const status = await this.gitService.getRepositoryStatus(workspace.localPath)
        const filesChanged = status.changedFiles.map((file) => file.path)
        const diffSnippet = await this.gitService.getRepositoryDiff(workspace.localPath)
        const commitMessages = await this.gitService.getRecentCommitMessages(workspace.localPath, 8)
        const baseBranch = input.baseBranch?.trim() || workspace.defaultBranch

        const generatedDraft = await generatePullRequestDraft({
            repoFullName: workspace.repoFullName,
            headBranch: workspace.currentBranch,
            baseBranch,
            filesChanged,
            diffSnippet,
            commitMessages,
            summary: input.summary,
            issueReferences: input.issueReferences,
        })

        const title = input.title?.trim() || generatedDraft.title
        const response = await this.gitService.createPullRequest({
            accessToken: input.accessToken,
            draft: {
                owner: workspace.owner,
                repo: workspace.repo,
                title,
                body: generatedDraft.body,
                head: workspace.currentBranch,
                base: baseBranch,
            },
        })

        const record = await this.changeStore.savePullRequest({
            id: `${workspace.id}--pr-${response.number}`,
            workspaceId: workspace.id,
            userId: input.userId,
            repoFullName: workspace.repoFullName,
            title: response.title,
            body: response.body ?? generatedDraft.body,
            url: response.html_url,
            number: response.number,
            head: workspace.currentBranch,
            base: baseBranch,
            createdAt: new Date().toISOString(),
        })

        return {
            draft: generatedDraft,
            pullRequest: record,
        }
    }

    async scanWorkspaceIssues(userId: string, workspaceId: string) {
        const workspace = await this.getWorkspaceForUser(userId, workspaceId)
        const runningTask = await this.createTask({
            workspace,
            taskType: "issue_scan",
            status: "running",
            inputSummary: "Scan repository workspace for security, architecture, and validation issues.",
        })

        try {
            const result = await this.issueDetectionService.scanWorkspace(workspace, runningTask)
            await this.issueStore.replaceForWorkspace(workspace.id, result.findings)

            const completedTask = await this.updateTask(runningTask, {
                status: "completed",
                resultSummary: `Detected ${result.summary.total} issue(s) across ${result.summary.scannedFiles} scanned file(s).`,
                metadata: {
                    summary: result.summary,
                },
            })

            return {
                ...result,
                task: completedTask,
            }
        } catch (error) {
            await this.updateTask(runningTask, {
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "Issue scan failed.",
            })
            throw error
        }
    }

    async generateAIEditPlan(input: {
        userId: string
        workspaceId: string
        prompt: string
        filePaths?: string[]
    }) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        const runningTask = await this.createTask({
            workspace,
            taskType: "ai_edit_plan",
            status: "running",
            inputSummary: input.prompt.trim(),
            metadata: {
                filePaths: input.filePaths ?? [],
            },
        })

        try {
            const plan = await this.aiEditingService.generatePlan({
                workspace,
                task: runningTask,
                prompt: input.prompt.trim(),
                filePaths: input.filePaths,
            })

            const completedTask = await this.updateTask(runningTask, {
                status: "approved",
                resultSummary: `Prepared ${plan.files.length} file edit preview(s) for review.`,
                metadata: {
                    prompt: input.prompt.trim(),
                    warnings: plan.warnings,
                    files: plan.files.map((file) => ({
                        filePath: file.filePath,
                        summary: file.summary,
                        rationale: file.rationale,
                        preview: file.preview,
                    })),
                },
            })

            return {
                ...plan,
                task: completedTask,
            } satisfies AIEditPlanResult
        } catch (error) {
            await this.updateTask(runningTask, {
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "AI edit plan failed.",
            })
            throw error
        }
    }

    async applyAIEditPlan(input: {
        userId: string
        workspaceId: string
        taskId: string
        filePaths?: string[]
    }) {
        const workspace = await this.getWorkspaceForUser(input.userId, input.workspaceId)
        const task = await this.taskStore.getById(input.taskId)

        if (!task || task.userId !== input.userId || task.workspaceId !== workspace.id || task.taskType !== "ai_edit_plan") {
            throw new AgentExecutionError("TASK_NOT_FOUND", "AI edit plan not found.", 404)
        }

        if (task.status !== "approved") {
            throw new AgentExecutionError("TASK_NOT_APPROVED", "This AI edit plan is no longer waiting for approval.", 409)
        }

        const storedFiles = Array.isArray(task.metadata?.files) ? task.metadata?.files as Array<{
            filePath: string
            preview: {
                originalHash: string
                proposedContent: string
            }
        }> : []

        const selectedPaths = new Set((input.filePaths?.length ? input.filePaths : storedFiles.map((file) => file.filePath)).map((file) => file.trim()))
        const filesToApply = storedFiles.filter((file) => selectedPaths.has(file.filePath))

        if (!filesToApply.length) {
            throw new AgentExecutionError("AI_EDIT_EMPTY_SELECTION", "No AI-generated files were selected for application.", 400)
        }

        const applyingTask = await this.createTask({
            workspace,
            taskType: "patch_apply",
            status: "running",
            inputSummary: `Apply AI edit plan ${task.id}.`,
            metadata: {
                sourceTaskId: task.id,
                filePaths: filesToApply.map((file) => file.filePath),
            },
        })

        try {
            const appliedFiles = await this.diffService.applyEditBatch(filesToApply.map((file) => {
                const target = resolveWorkspaceFilePath(workspace.localPath, file.filePath)
                return {
                    filePath: target.resolved,
                    relativePath: target.normalized,
                    expectedOriginalHash: file.preview.originalHash,
                    proposedContent: file.preview.proposedContent,
                }
            }))

            await this.updateTask(task, {
                status: "completed",
                resultSummary: `Applied ${appliedFiles.length} AI-generated file edit(s).`,
            })

            const completedApplyTask = await this.updateTask(applyingTask, {
                status: "completed",
                resultSummary: `Applied ${appliedFiles.length} AI-generated file edit(s).`,
                metadata: {
                    sourceTaskId: task.id,
                    filePaths: appliedFiles.map((file) => file.filePath),
                },
            })

            return {
                files: appliedFiles,
                task: completedApplyTask,
            }
        } catch (error) {
            await this.updateTask(applyingTask, {
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "Patch application failed.",
            })
            throw error
        }
    }
}
