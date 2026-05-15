import { createHash } from "crypto"
import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError } from "@/lib/agents/shared"
import { collectRepositoryFiles, readRepositoryFiles, type RepositoryTextFile } from "@/lib/github/repositoryFiles"
import { logger } from "@/lib/server/logger"
import type {
    AgentTaskRecord,
    RepositoryIssueCategory,
    RepositoryIssueRecord,
    RepositoryIssueScanResult,
    RepositoryIssueScanSummary,
    RepositoryIssueSeverity,
    RepositoryWorkspaceRecord,
} from "@/lib/github/types"

const ISSUE_SCOPE = "IssueDetectionService"
const MAX_AI_CONTEXT_CHARS = 42_000

type DraftIssue = {
    title: string
    summary: string
    severity: RepositoryIssueSeverity
    category: RepositoryIssueCategory
    recommendation: string
    filePath?: string
    line?: number
    evidence?: string
    source: "heuristic" | "ai"
}

function fingerprintForIssue(workspaceId: string, issue: DraftIssue) {
    return createHash("sha1")
        .update([
            workspaceId,
            issue.category,
            issue.filePath ?? "",
            String(issue.line ?? ""),
            issue.title.toLowerCase(),
        ].join("|"))
        .digest("hex")
}

function lineForMatch(content: string, index: number) {
    return content.slice(0, index).split("\n").length
}

function snippetAround(content: string, index: number, length: number) {
    const start = Math.max(0, index - 48)
    const end = Math.min(content.length, index + length + 48)
    return content.slice(start, end).trim()
}

function toIssueRecord(workspace: RepositoryWorkspaceRecord, task: AgentTaskRecord, issue: DraftIssue): RepositoryIssueRecord {
    const fingerprint = fingerprintForIssue(workspace.id, issue)
    const timestamp = new Date().toISOString()

    return {
        id: `${workspace.id}--${fingerprint}`,
        workspaceId: workspace.id,
        userId: workspace.userId,
        repoFullName: workspace.repoFullName,
        scanTaskId: task.id,
        title: issue.title,
        summary: issue.summary,
        severity: issue.severity,
        category: issue.category,
        status: "open",
        recommendation: issue.recommendation,
        filePath: issue.filePath,
        line: issue.line,
        evidence: issue.evidence,
        fingerprint,
        source: issue.source,
        createdAt: timestamp,
        updatedAt: timestamp,
    }
}

function dedupeIssues(issues: DraftIssue[]) {
    const seen = new Set<string>()
    return issues.filter((issue) => {
        const key = [
            issue.category,
            issue.filePath ?? "",
            String(issue.line ?? ""),
            issue.title.trim().toLowerCase(),
        ].join("|")

        if (seen.has(key)) {
            return false
        }

        seen.add(key)
        return true
    })
}

function detectSecrets(file: RepositoryTextFile): DraftIssue[] {
    const rules = [
        {
            pattern: /\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
            title: "Potential GitHub token committed",
            severity: "critical" as const,
            recommendation: "Remove the token, rotate it immediately, and load credentials from environment variables or a secret manager.",
        },
        {
            pattern: /\b(?:sk_live|sk_test|rk_live|rk_test)_[A-Za-z0-9]{16,}\b/g,
            title: "Potential Stripe credential exposed",
            severity: "critical" as const,
            recommendation: "Move payment credentials to environment storage and rotate the exposed key.",
        },
        {
            pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
            title: "Potential Google API key exposed",
            severity: "high" as const,
            recommendation: "Move the API key out of source control and restrict the replacement key by host or service.",
        },
        {
            pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
            title: "Potential AWS access key exposed",
            severity: "critical" as const,
            recommendation: "Rotate the AWS key, audit its use, and load credentials through IAM roles or environment secrets.",
        },
    ]

    const findings: DraftIssue[] = []
    for (const rule of rules) {
        for (const match of file.content.matchAll(rule.pattern)) {
            const index = match.index ?? 0
            findings.push({
                title: rule.title,
                summary: `A string matching a sensitive credential pattern was found in ${file.relativePath}.`,
                severity: rule.severity,
                category: "secret",
                recommendation: rule.recommendation,
                filePath: file.relativePath,
                line: lineForMatch(file.content, index),
                evidence: snippetAround(file.content, index, match[0].length),
                source: "heuristic",
            })
        }
    }

    return findings
}

function detectSecurityPatterns(file: RepositoryTextFile): DraftIssue[] {
    const rules = [
        {
            pattern: /\beval\s*\(/g,
            title: "Dynamic eval usage detected",
            summary: "Using eval can execute untrusted input and makes code harder to audit.",
            severity: "high" as const,
            category: "security" as const,
            recommendation: "Replace eval with structured parsing or a safer interpreter.",
        },
        {
            pattern: /\bnew Function\s*\(/g,
            title: "Dynamic Function constructor detected",
            summary: "Dynamic code generation increases remote code execution risk.",
            severity: "high" as const,
            category: "security" as const,
            recommendation: "Avoid runtime code generation and switch to static logic paths.",
        },
        {
            pattern: /dangerouslySetInnerHTML/g,
            title: "HTML injection sink detected",
            summary: "Direct HTML injection needs strong sanitization guarantees.",
            severity: "medium" as const,
            category: "security" as const,
            recommendation: "Sanitize the HTML source and document the trust boundary before rendering it.",
        },
        {
            pattern: /\b(child_process|exec|spawn)\b/g,
            title: "Shell execution capability detected",
            summary: "Process execution paths should be tightly constrained and validated.",
            severity: "medium" as const,
            category: "security" as const,
            recommendation: "Restrict commands to an allowlist, sanitize arguments, and isolate execution.",
        },
        {
            pattern: /http:\/\/[^\s"'`]+/g,
            title: "Plain HTTP endpoint detected",
            summary: "Non-TLS endpoints can expose credentials or application traffic in transit.",
            severity: "medium" as const,
            category: "security" as const,
            recommendation: "Prefer HTTPS endpoints or document why the traffic is safe on a trusted network.",
        },
    ]

    const findings: DraftIssue[] = []
    for (const rule of rules) {
        for (const match of file.content.matchAll(rule.pattern)) {
            const index = match.index ?? 0
            findings.push({
                title: rule.title,
                summary: rule.summary,
                severity: rule.severity,
                category: rule.category,
                recommendation: rule.recommendation,
                filePath: file.relativePath,
                line: lineForMatch(file.content, index),
                evidence: snippetAround(file.content, index, match[0].length),
                source: "heuristic",
            })
        }
    }

    return findings
}

function detectValidationGaps(file: RepositoryTextFile): DraftIssue[] {
    const isApiFile = file.relativePath.includes("/api/") || file.relativePath.includes("route.")
    if (!isApiFile) {
        return []
    }

    const bodyReadIndex = file.content.search(/(?:await\s+req\.json\s*\(|req\.body\b)/)
    if (bodyReadIndex === -1) {
        return []
    }

    const hasValidation = /(zod|yup|joi|class-validator|parse[A-Z]\w+\(|schema\.parse|safeParse)/.test(file.content)
    if (hasValidation) {
        return []
    }

    return [{
        title: "Request body read without obvious validation",
        summary: "This API handler appears to consume request input without a nearby validation layer.",
        severity: "medium",
        category: "validation",
        recommendation: "Validate request payloads with an explicit schema before using the data.",
        filePath: file.relativePath,
        line: lineForMatch(file.content, bodyReadIndex),
        evidence: snippetAround(file.content, bodyReadIndex, 40),
        source: "heuristic",
    }]
}

function detectDependencyRisks(files: RepositoryTextFile[]): DraftIssue[] {
    const packageJson = files.find((file) => file.relativePath === "package.json")
    if (!packageJson) {
        return []
    }

    try {
        const parsed = JSON.parse(packageJson.content) as {
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
        }

        const findings: DraftIssue[] = []
        for (const [name, version] of Object.entries({
            ...(parsed.dependencies ?? {}),
            ...(parsed.devDependencies ?? {}),
        })) {
            if (version === "*" || /latest/i.test(version)) {
                findings.push({
                    title: `Unpinned dependency range for ${name}`,
                    summary: `${name} uses a floating version (${version}), which can make builds hard to reproduce and widen upgrade risk.`,
                    severity: "medium",
                    category: "dependency",
                    recommendation: "Pin the dependency to a reviewed semver range and upgrade intentionally.",
                    filePath: packageJson.relativePath,
                    evidence: `"${name}": "${version}"`,
                    source: "heuristic",
                })
            }
        }

        return findings
    } catch {
        return []
    }
}

function detectEnvironmentConfig(files: RepositoryTextFile[]): DraftIssue[] {
    const envConsumers = files.filter((file) => /\bprocess\.env\.[A-Z0-9_]+\b/.test(file.content))
    if (!envConsumers.length) {
        return []
    }

    const hasEnvTemplate = files.some((file) => file.relativePath === ".env.example" || file.relativePath.endsWith("/.env.example"))
    if (hasEnvTemplate) {
        return []
    }

    return [{
        title: "Environment variables are used without a committed example file",
        summary: "The repository reads environment variables but does not expose a safe `.env.example` template for setup.",
        severity: "low",
        category: "configuration",
        recommendation: "Add a `.env.example` file that documents required variables without exposing secrets.",
        filePath: envConsumers[0]?.relativePath,
        source: "heuristic",
    }]
}

async function detectAiFindings(workspace: RepositoryWorkspaceRecord, files: RepositoryTextFile[], heuristicIssues: DraftIssue[]) {
    const contextualFiles: string[] = []
    let totalChars = 0

    for (const file of files) {
        const snippet = `### ${file.relativePath}\n\`\`\`\n${file.content}\n\`\`\``
        if (totalChars + snippet.length > MAX_AI_CONTEXT_CHARS) {
            break
        }

        contextualFiles.push(snippet)
        totalChars += snippet.length
    }

    if (!contextualFiles.length) {
        return []
    }

    try {
        const response = await completeWithOpenRouter({
            system: `You are a repository issue scanner.
Return strict JSON with shape:
{"issues":[{"title":"","summary":"","severity":"critical|high|medium|low|info","category":"security|dependency|architecture|duplicate-logic|dead-code|validation|performance|configuration|ai-review","recommendation":"","filePath":"","line":0,"evidence":""}]}

Rules:
- Return at most 5 issues.
- Do not repeat the supplied heuristic findings.
- Only include issues that are grounded in the provided file snippets.
- Prefer architecture, performance, dead code, duplication, and validation gaps.`,
            user: `Repository: ${workspace.repoFullName}
Heuristic findings already detected:
${heuristicIssues.map((issue) => `- ${issue.category}: ${issue.title} (${issue.filePath ?? "repo"})`).join("\n") || "- None"}

Repository snippets:
${contextualFiles.join("\n\n")}`,
            maxTokens: 1400,
            temperature: 0.2,
        })

        const parsed = JSON.parse(response) as {
            issues?: Array<{
                title?: string
                summary?: string
                severity?: RepositoryIssueSeverity
                category?: RepositoryIssueCategory
                recommendation?: string
                filePath?: string
                line?: number
                evidence?: string
            }>
        }

        return (parsed.issues ?? [])
            .filter((issue) => issue.title && issue.summary && issue.recommendation)
            .map((issue) => ({
                title: issue.title!.trim(),
                summary: issue.summary!.trim(),
                severity: issue.severity ?? "medium",
                category: issue.category ?? "ai-review",
                recommendation: issue.recommendation!.trim(),
                filePath: issue.filePath?.trim() || undefined,
                line: typeof issue.line === "number" && Number.isFinite(issue.line) ? issue.line : undefined,
                evidence: issue.evidence?.trim() || undefined,
                source: "ai" as const,
            }))
    } catch (error) {
        logger.warn(ISSUE_SCOPE, "AI issue review failed", {
            workspaceId: workspace.id,
            error: error instanceof Error ? error.message : String(error),
        })
        return []
    }
}

function buildSummary(findings: RepositoryIssueRecord[], scannedFiles: number): RepositoryIssueScanSummary {
    const bySeverity: RepositoryIssueScanSummary["bySeverity"] = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
    }

    const byCategory: RepositoryIssueScanSummary["byCategory"] = {}

    for (const finding of findings) {
        bySeverity[finding.severity] += 1
        byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1
    }

    return {
        total: findings.length,
        bySeverity,
        byCategory,
        scannedFiles,
        generatedAt: new Date().toISOString(),
    }
}

export class IssueDetectionService {
    async scanWorkspace(workspace: RepositoryWorkspaceRecord, task: AgentTaskRecord): Promise<RepositoryIssueScanResult> {
        try {
            const fileEntries = await collectRepositoryFiles(workspace.localPath, {
                maxFiles: 140,
                maxFileBytes: 180_000,
            })
            const files = await readRepositoryFiles(
                workspace.localPath,
                fileEntries.map((file) => file.relativePath),
                { maxFileBytes: 180_000 }
            )

            const heuristicFindings = dedupeIssues([
                ...files.flatMap((file) => detectSecrets(file)),
                ...files.flatMap((file) => detectSecurityPatterns(file)),
                ...files.flatMap((file) => detectValidationGaps(file)),
                ...detectDependencyRisks(files),
                ...detectEnvironmentConfig(files),
            ])

            const aiFindings = dedupeIssues(await detectAiFindings(workspace, files, heuristicFindings))
            const findings = dedupeIssues([...heuristicFindings, ...aiFindings]).map((issue) =>
                toIssueRecord(workspace, task, issue)
            )

            return {
                task,
                findings,
                summary: buildSummary(findings, files.length),
            }
        } catch (error) {
            logger.error(ISSUE_SCOPE, "Workspace scan failed", {
                workspaceId: workspace.id,
                error: error instanceof Error ? error.message : String(error),
            })
            throw new AgentExecutionError("ISSUE_SCAN_FAILED", "Unable to scan the repository workspace for issues.", 500)
        }
    }
}
