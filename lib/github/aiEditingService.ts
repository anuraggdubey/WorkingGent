import path from "path"
import ts from "typescript"
import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError } from "@/lib/agents/shared"
import { DiffService } from "@/lib/github/diffService"
import { collectRepositoryFiles, readRepositoryFiles } from "@/lib/github/repositoryFiles"
import { resolveWorkspaceFilePath } from "@/lib/github/utils"
import { logger } from "@/lib/server/logger"
import type {
    AIEditPlanFile,
    AIEditPlanResult,
    AgentTaskRecord,
    RepositoryWorkspaceRecord,
} from "@/lib/github/types"

const AI_EDIT_SCOPE = "AIEditingService"
const MAX_TARGET_FILES = 4
const MAX_FILE_CONTENT = 50_000

type PlannedEdit = {
    filePath: string
    summary: string
    rationale: string
    updatedContent: string
}

function sanitizeCodeFence(value: string) {
    return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
}

function validateTextSyntax(filePath: string, content: string) {
    const extension = path.extname(filePath).toLowerCase()

    if (extension === ".json") {
        JSON.parse(content)
        return
    }

    if ([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"].includes(extension)) {
        const diagnostics = ts.transpileModule(content, {
            fileName: filePath,
            compilerOptions: {
                allowJs: true,
                jsx: ts.JsxEmit.ReactJSX,
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
            },
            reportDiagnostics: true,
            transformers: undefined,
        }).diagnostics ?? []
        if (diagnostics.length > 0) {
            const formatted = diagnostics
                .map((diagnostic: ts.Diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
                .join("; ")
            throw new AgentExecutionError("INVALID_EDIT_SYNTAX", `Generated edits contain invalid syntax in ${filePath}: ${formatted}`, 400)
        }
    }
}

async function chooseRelevantFiles(workspace: RepositoryWorkspaceRecord, prompt: string) {
    const files = await collectRepositoryFiles(workspace.localPath, {
        maxFiles: 120,
        maxFileBytes: 160_000,
    })

    const manifest = files.map((file) => file.relativePath)
    if (!manifest.length) {
        return []
    }

    try {
        const response = await completeWithOpenRouter({
            system: `You select repository files for a code change.
Return strict JSON with shape {"files":["path1","path2"]}.
Pick at most ${MAX_TARGET_FILES} files and only from the provided manifest.`,
            user: `Repository: ${workspace.repoFullName}
Change request: ${prompt}

Manifest:
${manifest.join("\n")}`,
            maxTokens: 300,
            temperature: 0.1,
        })

        const parsed = JSON.parse(sanitizeCodeFence(response)) as { files?: string[] }
        const selected = (parsed.files ?? [])
            .map((item) => String(item).trim())
            .filter((item) => manifest.includes(item))
            .slice(0, MAX_TARGET_FILES)

        return selected.length ? selected : manifest.slice(0, Math.min(2, manifest.length))
    } catch (error) {
        logger.warn(AI_EDIT_SCOPE, "AI file selection failed", {
            workspaceId: workspace.id,
            error: error instanceof Error ? error.message : String(error),
        })
        return manifest.slice(0, Math.min(2, manifest.length))
    }
}

export class AIEditingService {
    constructor(private readonly diffService = new DiffService()) {}

    async generatePlan(input: {
        workspace: RepositoryWorkspaceRecord
        task: AgentTaskRecord
        prompt: string
        filePaths?: string[]
    }): Promise<AIEditPlanResult> {
        const warnings: string[] = []
        const requestedFilePaths = (input.filePaths ?? [])
            .map((filePath) => filePath.trim())
            .filter(Boolean)
            .slice(0, MAX_TARGET_FILES)

        const filePaths = requestedFilePaths.length
            ? requestedFilePaths
            : await chooseRelevantFiles(input.workspace, input.prompt)

        if (!filePaths.length) {
            throw new AgentExecutionError("AI_EDIT_NO_FILES", "No repository files were available for AI editing.", 400)
        }

        const files = await readRepositoryFiles(input.workspace.localPath, filePaths, {
            maxFileBytes: MAX_FILE_CONTENT,
        })

        if (!files.length) {
            throw new AgentExecutionError("AI_EDIT_NO_READABLE_FILES", "The selected files could not be loaded for editing.", 400)
        }

        try {
            const response = await completeWithOpenRouter({
                system: `You are a careful software engineer preparing code edits.
Return strict JSON with shape:
{"edits":[{"filePath":"","summary":"","rationale":"","updatedContent":""}]}

Rules:
- Only edit the provided files.
- Return at most ${MAX_TARGET_FILES} edits.
- Preserve the repository's style and formatting.
- Make the smallest change that fully satisfies the request.
- Do not include markdown fences.`,
                user: `Repository: ${input.workspace.repoFullName}
Request: ${input.prompt}

Files:
${files.map((file) => `### ${file.relativePath}\n\`\`\`\n${file.content}\n\`\`\``).join("\n\n")}`,
                maxTokens: 4000,
                temperature: 0.2,
            })

            const parsed = JSON.parse(sanitizeCodeFence(response)) as { edits?: PlannedEdit[] }
            const candidateEdits = (parsed.edits ?? [])
                .filter((edit) => edit?.filePath && edit?.updatedContent)
                .map((edit) => ({
                    filePath: String(edit.filePath).trim(),
                    summary: String(edit.summary ?? "AI edit proposal").trim(),
                    rationale: String(edit.rationale ?? "Generated from repository request.").trim(),
                    updatedContent: String(edit.updatedContent),
                }))
                .filter((edit) => filePaths.includes(edit.filePath))

            if (!candidateEdits.length) {
                throw new AgentExecutionError("AI_EDIT_EMPTY", "AI editing did not return any valid file changes.", 502)
            }

            const planFiles: AIEditPlanFile[] = []

            for (const edit of candidateEdits) {
                validateTextSyntax(edit.filePath, edit.updatedContent)
                const target = resolveWorkspaceFilePath(input.workspace.localPath, edit.filePath)
                const preview = await this.diffService.previewEdit(target.resolved, target.normalized, edit.updatedContent)

                if (!preview.changed) {
                    warnings.push(`No material changes were generated for ${edit.filePath}.`)
                    continue
                }

                planFiles.push({
                    filePath: edit.filePath,
                    summary: edit.summary,
                    rationale: edit.rationale,
                    preview,
                })
            }

            if (!planFiles.length) {
                throw new AgentExecutionError("AI_EDIT_NO_DIFF", "AI editing did not produce any changed diffs to review.", 400)
            }

            return {
                task: input.task,
                files: planFiles,
                warnings,
            }
        } catch (error) {
            if (error instanceof AgentExecutionError) {
                throw error
            }

            logger.error(AI_EDIT_SCOPE, "AI edit plan generation failed", {
                workspaceId: input.workspace.id,
                error: error instanceof Error ? error.message : String(error),
            })
            throw new AgentExecutionError("AI_EDIT_FAILED", "Unable to generate an AI edit plan for this repository.", 502)
        }
    }
}
