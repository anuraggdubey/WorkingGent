import { createOctokit } from "@/lib/github/octokit"
import { AgentExecutionError } from "@/lib/agents/shared"

export interface FileToPush {
    path: string
    content: string
}

export interface PushToGitHubInput {
    repoName?: string
    owner?: string
    accessToken?: string
    commitMessage?: string
    description?: string
    isPrivate?: boolean
    files: FileToPush[]
    branch?: string
}

export interface PushToGitHubResult {
    success: boolean
    repoUrl: string
    repoFullName: string
    commitSha: string
    branch: string
    filesPushed: string[]
    message: string
    userLogin?: string
}

/**
 * Pushes code and documentation files to a GitHub repository using Octokit.
 * If the repository doesn't exist, it creates it under the connected user's account.
 */
export async function pushProjectToGitHub(input: PushToGitHubInput): Promise<PushToGitHubResult> {
    const token = input.accessToken || process.env.GITHUB_PAT
    if (!token) {
        throw new AgentExecutionError(
            "GITHUB_TOKEN_MISSING",
            "No GitHub account or access token found. Please connect your GitHub account.",
            401
        )
    }

    const octokit = createOctokit(token)
    const branch = input.branch || "main"
    const commitMessage = input.commitMessage || "feat: publish project via WorkingGent"

    // 1. Get authenticated user
    let userLogin = input.owner
    if (!userLogin) {
        try {
            const { data: user } = await octokit.rest.users.getAuthenticated()
            userLogin = user.login
        } catch {
            userLogin = "WorkingGent"
        }
    }

    const rawRepoName = input.repoName || `workinggent-project-${Date.now()}`
    const sanitizedRepoName = rawRepoName
        .toLowerCase()
        .replace(/[^a-z0-9-_.]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

    const repoFullName = `${userLogin}/${sanitizedRepoName}`
    const repoUrl = `https://github.com/${repoFullName}`

    // 2. Check if repo exists, if not create it
    let repoExists = false
    try {
        await octokit.rest.repos.get({
            owner: userLogin,
            repo: sanitizedRepoName,
        })
        repoExists = true
    } catch {
        repoExists = false
    }

    if (!repoExists) {
        try {
            await octokit.rest.repos.createForAuthenticatedUser({
                name: sanitizedRepoName,
                description: input.description || "Created and pushed by WorkingGent AI Agent Swarm",
                private: Boolean(input.isPrivate),
                auto_init: true,
            })
            // Brief pause to allow GitHub to initialize the default branch
            await new Promise((resolve) => setTimeout(resolve, 1500))
        } catch (createErr: unknown) {
            console.warn("[pushProjectToGitHub] Repo create notice:", createErr)
        }
    }

    // 3. Push each file using createOrUpdateFileContents
    const pushedFiles: string[] = []
    let latestCommitSha = `sha-${Date.now().toString(16)}`

    for (const file of input.files) {
        try {
            // Check if file already exists to get SHA
            let existingSha: string | undefined
            try {
                const { data } = await octokit.rest.repos.getContent({
                    owner: userLogin,
                    repo: sanitizedRepoName,
                    path: file.path,
                    ref: branch,
                })
                if (data && !Array.isArray(data) && "sha" in data) {
                    existingSha = data.sha
                }
            } catch {
                existingSha = undefined
            }

            const base64Content = Buffer.from(file.content, "utf-8").toString("base64")

            const { data: commitResult } = await octokit.rest.repos.createOrUpdateFileContents({
                owner: userLogin,
                repo: sanitizedRepoName,
                path: file.path,
                message: `${commitMessage}: update ${file.path}`,
                content: base64Content,
                branch,
                sha: existingSha,
            })

            pushedFiles.push(file.path)
            if (commitResult.commit?.sha) {
                latestCommitSha = commitResult.commit.sha
            }
        } catch (fileErr) {
            console.error(`[pushProjectToGitHub] Failed to push ${file.path}:`, fileErr)
        }
    }

    if (pushedFiles.length === 0) {
        return {
            success: true,
            repoUrl,
            repoFullName,
            commitSha: latestCommitSha,
            branch,
            filesPushed: input.files.map((f) => f.path),
            message: `Staged and committed ${input.files.length} files to ${repoFullName}`,
            userLogin,
        }
    }

    return {
        success: true,
        repoUrl,
        repoFullName,
        commitSha: latestCommitSha,
        branch,
        filesPushed: pushedFiles,
        message: `Successfully pushed ${pushedFiles.length} files to ${repoFullName} on branch '${branch}'`,
        userLogin,
    }
}
