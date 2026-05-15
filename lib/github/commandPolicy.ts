import { AgentExecutionError } from "@/lib/agents/shared"
import type {
    WorkspaceCommandPolicy,
    WorkspaceCommandRequest,
} from "@/lib/github/types"

const TOKEN_PATTERN = /^[A-Za-z0-9_./:@=,+-]+$/
const BLOCKED_TOKENS = new Set([
    "&&",
    "||",
    ";",
    "|",
    ">",
    ">>",
    "<",
    "<<",
    "`",
    "$(",
    "${",
    "rm",
    "sudo",
    "chmod",
    "powershell",
    "bash",
    "sh",
    "cmd",
    "pwsh",
])

export const COMMAND_POLICIES: WorkspaceCommandPolicy[] = [
    {
        command: "npm",
        description: "Run vetted npm workflows such as build, lint, and test.",
        examples: ["npm run lint", "npm run build", "npm test"],
    },
    {
        command: "pnpm",
        description: "Run vetted pnpm workflows such as build, lint, and test.",
        examples: ["pnpm lint", "pnpm build", "pnpm test"],
    },
    {
        command: "yarn",
        description: "Run vetted yarn workflows such as build, lint, and test.",
        examples: ["yarn lint", "yarn build", "yarn test"],
    },
    {
        command: "node",
        description: "Run a project-local Node script file inside the sandbox.",
        examples: ["node scripts/check.js", "node tools/validate.mjs"],
    },
    {
        command: "jest",
        description: "Run Jest test suites inside the sandbox.",
        examples: ["jest", "jest src/auth.test.ts"],
    },
    {
        command: "eslint",
        description: "Run ESLint checks for repository files.",
        examples: ["eslint .", "eslint src/app/page.tsx"],
    },
    {
        command: "prettier",
        description: "Check or format files in the sandbox.",
        examples: ["prettier --check .", "prettier --write src/app/page.tsx"],
    },
    {
        command: "tsc",
        description: "Run the TypeScript compiler in no-emit mode or project mode.",
        examples: ["tsc --noEmit", "tsc -p tsconfig.json --noEmit"],
    },
    {
        command: "next",
        description: "Run a production Next.js build inside the sandbox.",
        examples: ["next build"],
    },
]

function assertSafeToken(token: string) {
    if (!token.trim()) {
        throw new AgentExecutionError("INVALID_COMMAND", "Command arguments cannot be empty.", 400)
    }

    if (!TOKEN_PATTERN.test(token) || [...BLOCKED_TOKENS].some((blocked) => token.includes(blocked))) {
        throw new AgentExecutionError("INVALID_COMMAND", `Blocked command token: ${token}`, 400)
    }
}

function validatePackageManagerCommand(command: "npm" | "pnpm" | "yarn", args: string[]) {
    const normalized = args.map((arg) => arg.trim())
    normalized.forEach(assertSafeToken)

    const joined = normalized.join(" ")

    if (command === "npm") {
        const allowed = [
            joined === "test",
            /^run\s+(lint|build|test|test:[A-Za-z0-9:_-]+)$/.test(joined),
        ]

        if (!allowed.some(Boolean)) {
            throw new AgentExecutionError("INVALID_COMMAND", "Only npm test and npm run {lint|build|test...} are allowed.", 400)
        }
    } else {
        const allowed = /^(lint|build|test(?::[A-Za-z0-9:_-]+)?)(\s+.*)?$/.test(joined)
        if (!allowed) {
            throw new AgentExecutionError("INVALID_COMMAND", `Only ${command} lint/build/test workflows are allowed.`, 400)
        }
    }

    return normalized
}

function validateNodeCommand(args: string[]) {
    if (!args.length) {
        throw new AgentExecutionError("INVALID_COMMAND", "node requires a project-local script path.", 400)
    }

    const [scriptPath, ...rest] = args.map((arg) => arg.trim())
    ;[scriptPath, ...rest].forEach(assertSafeToken)

    if (scriptPath.startsWith("-") || scriptPath.includes("..") || scriptPath.startsWith("/")) {
        throw new AgentExecutionError("INVALID_COMMAND", "node can only execute relative project script files.", 400)
    }

    return [scriptPath, ...rest]
}

function validateScopedToolArgs(args: string[]) {
    const normalized = args.map((arg) => arg.trim())
    normalized.forEach(assertSafeToken)
    return normalized
}

function validateNextCommand(args: string[]) {
    const normalized = args.map((arg) => arg.trim())
    normalized.forEach(assertSafeToken)

    if (normalized.join(" ") !== "build") {
        throw new AgentExecutionError("INVALID_COMMAND", "Only `next build` is allowed.", 400)
    }

    return normalized
}

export function validateWorkspaceCommand(request: WorkspaceCommandRequest): WorkspaceCommandRequest {
    const command = request.command
    const args = request.args ?? []

    let validatedArgs: string[]

    switch (command) {
        case "npm":
        case "pnpm":
        case "yarn":
            validatedArgs = validatePackageManagerCommand(command, args)
            break
        case "node":
            validatedArgs = validateNodeCommand(args)
            break
        case "jest":
        case "eslint":
        case "prettier":
        case "tsc":
            validatedArgs = validateScopedToolArgs(args)
            break
        case "next":
            validatedArgs = validateNextCommand(args)
            break
        default:
            throw new AgentExecutionError("INVALID_COMMAND", `Unsupported workspace command: ${String(command)}`, 400)
    }

    return {
        workspaceId: request.workspaceId.trim(),
        command,
        args: validatedArgs,
    }
}
