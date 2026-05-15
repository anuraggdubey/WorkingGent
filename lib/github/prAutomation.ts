import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import type { PullRequestDraftContent } from "@/lib/github/types"

function buildFallbackDraft(input: {
    repoFullName: string
    headBranch: string
    baseBranch: string
    filesChanged: string[]
    summary: string
    issueReferences: string[]
}) {
    const title = input.headBranch.includes("/")
        ? input.headBranch.replace("/", ": ")
        : `Update ${input.repoFullName}`

    const summaryText = input.summary || `This PR updates ${input.filesChanged.length} file(s) in ${input.repoFullName}.`
    const filesText = input.filesChanged.length
        ? input.filesChanged.map((file) => `- \`${file}\``).join("\n")
        : "- No changed files detected"
    const issueText = input.issueReferences.length
        ? input.issueReferences.map((issue) => `- ${issue}`).join("\n")
        : "- None attached"

    const body = [
        "## Summary",
        summaryText,
        "",
        "## Files Changed",
        filesText,
        "",
        "## Risk Analysis",
        "- Review the branch diff before merge.",
        "- Confirm the changed files match the intended scope.",
        "",
        "## Testing Instructions",
        "- Run the relevant test suite for the modified area.",
        "- Validate the changed workflow manually before merging.",
        "",
        "## Issue References",
        issueText,
    ].join("\n")

    return {
        title,
        body,
        summary: summaryText,
        filesChanged: input.filesChanged,
        riskAnalysis: [
            "Review the branch diff before merge.",
            "Confirm the changed files match the intended scope.",
        ],
        testingInstructions: [
            "Run the relevant test suite for the modified area.",
            "Validate the changed workflow manually before merging.",
        ],
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
    } satisfies PullRequestDraftContent
}

export async function generatePullRequestDraft(input: {
    repoFullName: string
    headBranch: string
    baseBranch: string
    filesChanged: string[]
    diffSnippet: string
    commitMessages: string[]
    summary?: string
    issueReferences?: string[]
}) {
    const fallback = buildFallbackDraft({
        repoFullName: input.repoFullName,
        headBranch: input.headBranch,
        baseBranch: input.baseBranch,
        filesChanged: input.filesChanged,
        summary: input.summary?.trim() ?? "",
        issueReferences: input.issueReferences ?? [],
    })

    try {
        const response = await completeWithOpenRouter({
            system: `You write production pull request drafts. Return valid JSON with keys:
title, summary, filesChanged, riskAnalysis, testingInstructions, body.
The body must contain markdown sections:
## Summary
## Files Changed
## Risk Analysis
## Testing Instructions
## Issue References`,
            user: `Repository: ${input.repoFullName}
Head branch: ${input.headBranch}
Base branch: ${input.baseBranch}
Changed files: ${input.filesChanged.join(", ") || "None"}
Commit messages: ${input.commitMessages.join(" | ") || "None"}
Issue references: ${(input.issueReferences ?? []).join(", ") || "None"}
Optional summary from user: ${input.summary ?? "None"}

Diff snippet:
${input.diffSnippet.slice(0, 12000)}`,
            maxTokens: 1200,
            temperature: 0.2,
        })

        const parsed = JSON.parse(response) as Partial<PullRequestDraftContent> & { body?: string; title?: string; summary?: string }
        if (!parsed.title || !parsed.body) {
            return fallback
        }

        return {
            title: parsed.title,
            body: parsed.body,
            summary: parsed.summary ?? fallback.summary,
            filesChanged: Array.isArray(parsed.filesChanged) && parsed.filesChanged.length ? parsed.filesChanged.map(String) : fallback.filesChanged,
            riskAnalysis: Array.isArray(parsed.riskAnalysis) && parsed.riskAnalysis.length ? parsed.riskAnalysis.map(String) : fallback.riskAnalysis,
            testingInstructions: Array.isArray(parsed.testingInstructions) && parsed.testingInstructions.length ? parsed.testingInstructions.map(String) : fallback.testingInstructions,
            baseBranch: input.baseBranch,
            headBranch: input.headBranch,
        } satisfies PullRequestDraftContent
    } catch {
        return fallback
    }
}
