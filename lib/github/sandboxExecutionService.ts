import { spawn } from "child_process"
import { AgentExecutionError } from "@/lib/agents/shared"
import { validateWorkspaceCommand } from "@/lib/github/commandPolicy"
import type {
    AgentTaskRecord,
    RepositoryWorkspaceRecord,
    SandboxExecutionPreview,
    SandboxExecutionResult,
    WorkspaceCommandRequest,
} from "@/lib/github/types"
import { logger } from "@/lib/server/logger"

const SANDBOX_SCOPE = "SandboxExecutionService"
const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_CPU_LIMIT = 1.5
const DEFAULT_MEMORY_MB = 1024
const DEFAULT_DOCKER_IMAGE = process.env.WORKSPACE_SANDBOX_IMAGE ?? "node:20-bookworm-slim"

function shellQuote(arg: string) {
    if (/^[A-Za-z0-9_./:@=,+-]+$/.test(arg)) {
        return arg
    }

    return `'${arg.replace(/'/g, `'\\''`)}'`
}

export class SandboxExecutionService {
    async buildPreview(workspace: RepositoryWorkspaceRecord, request: WorkspaceCommandRequest): Promise<SandboxExecutionPreview> {
        const validated = validateWorkspaceCommand(request)
        const commandLine = [validated.command, ...validated.args].map(shellQuote).join(" ")
        const dockerArgs = this.getDockerArgs(workspace, validated)
        const dockerCommandLine = ["docker", ...dockerArgs].map(shellQuote).join(" ")

        return {
            workspaceId: workspace.id,
            command: validated.command,
            args: validated.args,
            dockerImage: DEFAULT_DOCKER_IMAGE,
            workingDirectory: "/workspace",
            timeoutMs: DEFAULT_TIMEOUT_MS,
            cpuLimit: DEFAULT_CPU_LIMIT,
            memoryLimitMb: DEFAULT_MEMORY_MB,
            commandLine,
            dockerCommandLine,
        }
    }

    async run(workspace: RepositoryWorkspaceRecord, task: AgentTaskRecord, request: WorkspaceCommandRequest): Promise<SandboxExecutionResult> {
        const preview = await this.buildPreview(workspace, request)
        const dockerArgs = this.getDockerArgs(workspace, request)
        const startedAt = new Date().toISOString()
        const startTime = Date.now()

        logger.info(SANDBOX_SCOPE, "Running sandboxed workspace command", {
            workspaceId: workspace.id,
            taskId: task.id,
            command: preview.command,
            args: preview.args,
        })

        const result = await this.spawnDocker(dockerArgs)
        const completedAt = new Date().toISOString()

        return {
            task,
            preview,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            durationMs: Date.now() - startTime,
            startedAt,
            completedAt,
            timedOut: result.timedOut,
        }
    }

    private getDockerArgs(workspace: RepositoryWorkspaceRecord, request: WorkspaceCommandRequest) {
        const validated = validateWorkspaceCommand(request)

        return [
            "run",
            "--rm",
            "--network",
            "none",
            "--cpus",
            String(DEFAULT_CPU_LIMIT),
            "--memory",
            `${DEFAULT_MEMORY_MB}m`,
            "--pids-limit",
            "256",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--workdir",
            "/workspace",
            "--mount",
            `type=bind,source=${workspace.localPath},target=/workspace`,
            "--tmpfs",
            "/tmp:size=128m,exec,nosuid,nodev",
            DEFAULT_DOCKER_IMAGE,
            validated.command,
            ...validated.args,
        ]
    }

    private spawnDocker(args: string[]) {
        return new Promise<{
            exitCode: number
            stdout: string
            stderr: string
            timedOut: boolean
        }>((resolve, reject) => {
            const child = spawn("docker", args, {
                shell: false,
                windowsHide: true,
            })

            let stdout = ""
            let stderr = ""
            let timedOut = false
            let settled = false

            const timeout = setTimeout(() => {
                timedOut = true
                child.kill("SIGKILL")
            }, DEFAULT_TIMEOUT_MS)

            child.stdout.on("data", (chunk) => {
                stdout += chunk.toString()
            })

            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString()
            })

            child.on("error", (error) => {
                clearTimeout(timeout)
                if (settled) return
                settled = true
                reject(new AgentExecutionError(
                    "SANDBOX_UNAVAILABLE",
                    "Docker is unavailable for repository sandbox execution.",
                    503,
                    { error: error.message }
                ))
            })

            child.on("close", (code) => {
                clearTimeout(timeout)
                if (settled) return
                settled = true

                if (timedOut) {
                    reject(new AgentExecutionError(
                        "SANDBOX_TIMEOUT",
                        "Sandbox command exceeded the execution timeout.",
                        408,
                        { stdout, stderr }
                    ))
                    return
                }

                resolve({
                    exitCode: code ?? 1,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    timedOut: false,
                })
            })
        })
    }
}
