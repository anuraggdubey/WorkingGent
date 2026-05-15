import { NextResponse } from "next/server"
import { AgentExecutionError } from "@/lib/agents/shared"
import type { AllowedWorkspaceCommand } from "@/lib/github/types"

const ALLOWED_WORKSPACE_COMMANDS = new Set<AllowedWorkspaceCommand>([
    "npm",
    "pnpm",
    "yarn",
    "node",
    "jest",
    "eslint",
    "prettier",
    "tsc",
    "next",
])

export function parseCloneWorkspaceBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const owner = typeof payload.owner === "string" ? payload.owner.trim() : ""
    const repo = typeof payload.repo === "string" ? payload.repo.trim() : ""

    if (!owner || !repo) {
        throw new AgentExecutionError("INVALID_REQUEST", "Repository owner and repo are required.", 400)
    }

    return { owner, repo }
}

export function parseCreateBranchBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const branchName = typeof payload.branchName === "string" ? payload.branchName.trim() : ""
    const fromBranch = typeof payload.fromBranch === "string" ? payload.fromBranch.trim() : undefined

    if (!workspaceId || !branchName) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and branchName are required.", 400)
    }

    return { workspaceId, branchName, fromBranch }
}

export function parseWorkspaceFileQuery(url: string) {
    const params = new URL(url).searchParams
    const workspaceId = params.get("workspaceId")?.trim() ?? ""
    const filePath = params.get("filePath")?.trim() ?? ""

    if (!workspaceId || !filePath) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and filePath are required.", 400)
    }

    return { workspaceId, filePath }
}

export function parseDiffPreviewBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const filePath = typeof payload.filePath === "string" ? payload.filePath.trim() : ""
    const proposedContent = typeof payload.proposedContent === "string" ? payload.proposedContent : ""

    if (!workspaceId || !filePath) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and filePath are required.", 400)
    }

    return { workspaceId, filePath, proposedContent }
}

export function parseDiffApplyBody(body: unknown) {
    const payload = parseDiffPreviewBody(body)
    const expectedOriginalHash = typeof (body as Record<string, unknown>).expectedOriginalHash === "string"
        ? ((body as Record<string, unknown>).expectedOriginalHash as string).trim()
        : ""

    if (!expectedOriginalHash) {
        throw new AgentExecutionError("INVALID_REQUEST", "expectedOriginalHash is required.", 400)
    }

    return {
        ...payload,
        expectedOriginalHash,
    }
}

export function parseCommitBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const message = typeof payload.message === "string" ? payload.message.trim() : ""

    if (!workspaceId || !message) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and message are required.", 400)
    }

    return { workspaceId, message }
}

export function parsePushBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""

    if (!workspaceId) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId is required.", 400)
    }

    return { workspaceId }
}

export function parsePullRequestBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const baseBranch = typeof payload.baseBranch === "string" ? payload.baseBranch.trim() : undefined
    const title = typeof payload.title === "string" ? payload.title.trim() : undefined
    const summary = typeof payload.summary === "string" ? payload.summary.trim() : undefined
    const issueReferences = Array.isArray(payload.issueReferences) ? payload.issueReferences.map(String) : undefined

    if (!workspaceId) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId is required.", 400)
    }

    return { workspaceId, baseBranch, title, summary, issueReferences }
}

export function parseIssueScanBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""

    if (!workspaceId) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId is required.", 400)
    }

    return { workspaceId }
}

export function parseAIEditPlanBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : ""
    const filePaths = Array.isArray(payload.filePaths) ? payload.filePaths.map(String).map((item) => item.trim()).filter(Boolean) : undefined

    if (!workspaceId || !prompt) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and prompt are required.", 400)
    }

    return { workspaceId, prompt, filePaths }
}

export function parseAIEditApplyBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const taskId = typeof payload.taskId === "string" ? payload.taskId.trim() : ""
    const filePaths = Array.isArray(payload.filePaths) ? payload.filePaths.map(String).map((item) => item.trim()).filter(Boolean) : undefined

    if (!workspaceId || !taskId) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and taskId are required.", 400)
    }

    return { workspaceId, taskId, filePaths }
}

export function parseWorkspaceCommandBody(body: unknown) {
    if (!body || typeof body !== "object") {
        throw new AgentExecutionError("INVALID_REQUEST", "Request body is required.", 400)
    }

    const payload = body as Record<string, unknown>
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : ""
    const command = typeof payload.command === "string" ? payload.command.trim() : ""
    const args = Array.isArray(payload.args) ? payload.args.map(String) : []

    if (!workspaceId || !command) {
        throw new AgentExecutionError("INVALID_REQUEST", "workspaceId and command are required.", 400)
    }

    if (!ALLOWED_WORKSPACE_COMMANDS.has(command as AllowedWorkspaceCommand)) {
        throw new AgentExecutionError("INVALID_REQUEST", "Unsupported workspace command.", 400)
    }

    return { workspaceId, command: command as AllowedWorkspaceCommand, args }
}

export function errorResponse(error: unknown) {
    if (error instanceof AgentExecutionError) {
        return NextResponse.json(
            { error: error.message, code: error.code, details: error.details },
            { status: error.status }
        )
    }

    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unexpected server error" },
        { status: 500 }
    )
}
