import path from "path"
import { AgentExecutionError } from "@/lib/agents/shared"

const BRANCH_NAME_PATTERN = /^(feat|fix|chore|refactor|docs|test|perf|build|ci|hotfix)\/[a-z0-9._-]+(?:-[a-z0-9._-]+)*$/

export function slugifySegment(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "workspace"
}

export function toWorkspaceId(owner: string, repo: string) {
    return `${slugifySegment(owner)}--${slugifySegment(repo)}`
}

export function getWorkspaceRoot() {
    return path.resolve(process.cwd(), "workspaces")
}

export function resolveWorkspacePath(userId: string, workspaceId: string) {
    const root = getWorkspaceRoot()
    const resolved = path.resolve(root, slugifySegment(userId), slugifySegment(workspaceId))

    if (!resolved.startsWith(root)) {
        throw new AgentExecutionError("INVALID_PATH", "Workspace path is invalid.", 400)
    }

    return resolved
}

export function resolveWorkspaceFilePath(workspacePath: string, relativeFilePath: string) {
    const normalized = relativeFilePath.replace(/\\/g, "/").trim().replace(/^\/+/, "")

    if (!normalized) {
        throw new AgentExecutionError("INVALID_PATH", "A repository file path is required.", 400)
    }

    const blockedSegments = [".git/", "../", "/..", "node_modules/"]
    if (blockedSegments.some((segment) => normalized.includes(segment))) {
        throw new AgentExecutionError("INVALID_PATH", "The requested repository file path is not allowed.", 400)
    }

    const resolved = path.resolve(workspacePath, normalized)
    if (!resolved.startsWith(workspacePath)) {
        throw new AgentExecutionError("INVALID_PATH", "The requested repository file path is invalid.", 400)
    }

    return {
        normalized,
        resolved,
    }
}

export function validateBranchName(branchName: string) {
    const normalized = branchName.trim()

    if (!BRANCH_NAME_PATTERN.test(normalized)) {
        throw new AgentExecutionError(
            "INVALID_BRANCH_NAME",
            "Branch names must look like feat/my-change or fix/auth-bug.",
            400
        )
    }

    if (normalized.includes("..") || normalized.endsWith(".lock") || normalized.includes("@{")) {
        throw new AgentExecutionError("INVALID_BRANCH_NAME", "Branch name contains blocked git syntax.", 400)
    }

    return normalized
}

export function sanitizeRemoteUrlForLogs(remoteUrl: string) {
    return remoteUrl.replace(/x-access-token:[^@]+@/i, "x-access-token:***@")
}
