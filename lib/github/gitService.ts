import fs from "fs/promises"
import path from "path"
import simpleGit, { type SimpleGitOptions } from "simple-git"
import { AgentExecutionError } from "@/lib/agents/shared"
import { createOctokit } from "@/lib/github/octokit"
import { logger } from "@/lib/server/logger"
import type {
    CreateCommitInput,
    GitRepositoryStatus,
    PullRequestDraft,
    PushChangesInput,
} from "@/lib/github/types"
import { sanitizeRemoteUrlForLogs, validateBranchName } from "@/lib/github/utils"

const GIT_SCOPE = "GitService"

function gitClient(baseDir?: string) {
    const options: Partial<SimpleGitOptions> = {
        baseDir,
        binary: "git",
        maxConcurrentProcesses: 4,
        trimmed: true,
    }

    return simpleGit(options)
}

async function ensureDirectory(directory: string) {
    await fs.mkdir(path.dirname(directory), { recursive: true })
}

export class GitService {
    async cloneRepository(input: {
        remoteUrl: string
        directory: string
        branch: string
    }) {
        try {
            await ensureDirectory(input.directory)
            const git = gitClient()
            logger.info(GIT_SCOPE, "Cloning repository", {
                directory: input.directory,
                branch: input.branch,
                remoteUrl: sanitizeRemoteUrlForLogs(input.remoteUrl),
            })

            await git.clone(input.remoteUrl, input.directory, [
                "--branch",
                input.branch,
                "--single-branch",
            ])
        } catch (error) {
            logger.error(GIT_SCOPE, "Clone failed", { directory: input.directory, error: error instanceof Error ? error.message : String(error) })
            throw new AgentExecutionError("GIT_CLONE_FAILED", "Unable to clone repository.", 502)
        }
    }

    async pullRepository(input: { repositoryPath: string; branch: string }) {
        try {
            const git = gitClient(input.repositoryPath)
            await git.fetch("origin", input.branch)
            await git.pull("origin", input.branch, { "--ff-only": null })
        } catch (error) {
            logger.error(GIT_SCOPE, "Pull failed", { repositoryPath: input.repositoryPath, error: error instanceof Error ? error.message : String(error) })
            throw new AgentExecutionError("GIT_PULL_FAILED", "Unable to pull the latest repository changes.", 502)
        }
    }

    async createBranch(input: { repositoryPath: string; branchName: string; fromBranch: string }) {
        const branchName = validateBranchName(input.branchName)

        try {
            const git = gitClient(input.repositoryPath)
            await git.checkout(input.fromBranch)
            await git.pull("origin", input.fromBranch, { "--ff-only": null })
            await git.checkoutLocalBranch(branchName)
            return branchName
        } catch (error) {
            logger.error(GIT_SCOPE, "Create branch failed", {
                repositoryPath: input.repositoryPath,
                branchName,
                fromBranch: input.fromBranch,
                error: error instanceof Error ? error.message : String(error),
            })
            throw new AgentExecutionError("GIT_BRANCH_FAILED", "Unable to create the requested branch.", 502)
        }
    }

    async checkoutBranch(input: { repositoryPath: string; branchName: string }) {
        try {
            const git = gitClient(input.repositoryPath)
            await git.checkout(input.branchName)
        } catch (error) {
            throw new AgentExecutionError("GIT_CHECKOUT_FAILED", "Unable to switch branches.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async commitChanges(input: CreateCommitInput) {
        try {
            const git = gitClient(input.repositoryPath)

            if (input.files?.length) {
                await git.add(input.files)
            } else {
                await git.add(".")
            }

            const result = await git.commit(input.message, undefined, input.authorName && input.authorEmail
                ? { "--author": `${input.authorName} <${input.authorEmail}>` }
                : undefined)

            return result.commit
        } catch (error) {
            throw new AgentExecutionError("GIT_COMMIT_FAILED", "Unable to commit repository changes.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async pushChanges(input: PushChangesInput) {
        try {
            const git = gitClient(input.repositoryPath)
            await git.push(input.remote ?? "origin", input.branchName, input.setUpstream ? { "--set-upstream": null } : {})
        } catch (error) {
            throw new AgentExecutionError("GIT_PUSH_FAILED", "Unable to push repository changes.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async forkRepository(input: { accessToken: string; owner: string; repo: string }) {
        try {
            const octokit = createOctokit(input.accessToken)
            const response = await octokit.request("POST /repos/{owner}/{repo}/forks", {
                owner: input.owner,
                repo: input.repo,
            })

            return response.data
        } catch (error) {
            throw new AgentExecutionError("GITHUB_FORK_FAILED", "Unable to fork repository.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async createPullRequest(input: { accessToken: string; draft: PullRequestDraft }) {
        try {
            const octokit = createOctokit(input.accessToken)
            const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
                owner: input.draft.owner,
                repo: input.draft.repo,
                title: input.draft.title,
                body: input.draft.body,
                head: input.draft.head,
                base: input.draft.base,
            })

            return response.data
        } catch (error) {
            throw new AgentExecutionError("GITHUB_PR_FAILED", "Unable to create pull request.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async getRepositoryStatus(repositoryPath: string): Promise<GitRepositoryStatus> {
        try {
            const git = gitClient(repositoryPath)
            const status = await git.status()

            return {
                currentBranch: status.current ?? "",
                trackingBranch: status.tracking ?? null,
                ahead: status.ahead,
                behind: status.behind,
                isClean: status.isClean(),
                changedFiles: status.files.map((file) => ({
                    path: file.path,
                    indexStatus: file.index,
                    workingTreeStatus: file.working_dir,
                })),
            }
        } catch (error) {
            throw new AgentExecutionError("GIT_STATUS_FAILED", "Unable to read repository status.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async getRepositoryDiff(repositoryPath: string, filePath?: string) {
        try {
            const git = gitClient(repositoryPath)
            return await git.diff(filePath ? ["--", filePath] : [])
        } catch (error) {
            throw new AgentExecutionError("GIT_DIFF_FAILED", "Unable to generate repository diff.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async restorePath(repositoryPath: string, filePath: string) {
        try {
            const git = gitClient(repositoryPath)
            await git.raw(["restore", "--source=HEAD", "--staged", "--worktree", "--", filePath])
        } catch (error) {
            throw new AgentExecutionError("GIT_RESTORE_FAILED", "Unable to rollback repository file changes.", 502, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async removeUntrackedPath(repositoryPath: string, filePath: string) {
        const absolutePath = path.join(repositoryPath, filePath)
        await fs.rm(absolutePath, { force: true })
    }

    async fileExistsInHead(repositoryPath: string, filePath: string) {
        try {
            const git = gitClient(repositoryPath)
            await git.raw(["ls-files", "--error-unmatch", filePath])
            return true
        } catch {
            return false
        }
    }

    async getRecentCommitMessages(repositoryPath: string, maxCount = 10) {
        try {
            const git = gitClient(repositoryPath)
            const log = await git.log({ maxCount })
            return log.all.map((entry) => entry.message)
        } catch {
            return []
        }
    }

    async getHeadSha(repositoryPath: string) {
        try {
            const git = gitClient(repositoryPath)
            return await git.revparse(["HEAD"])
        } catch {
            return null
        }
    }
}
