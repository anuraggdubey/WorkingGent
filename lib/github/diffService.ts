import { createHash } from "crypto"
import fs from "fs/promises"
import path from "path"
import { createTwoFilesPatch } from "diff"
import { AgentExecutionError } from "@/lib/agents/shared"
import type { FileDiffPreview, WorkspaceFileContent } from "@/lib/github/types"
import { logger } from "@/lib/server/logger"

const DIFF_SCOPE = "DiffService"
const MAX_FILE_BYTES = 512_000

function hashContent(content: string) {
    return createHash("sha256").update(content).digest("hex")
}

async function ensureParentDirectory(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function readExistingFile(filePath: string, relativePath: string) {
    try {
        const buffer = await fs.readFile(filePath)
        if (buffer.byteLength > MAX_FILE_BYTES) {
            throw new AgentExecutionError("FILE_TOO_LARGE", "File is too large for interactive editing.", 400)
        }

        const content = buffer.toString("utf-8")
        return {
            exists: true,
            filePath: relativePath,
            content,
            hash: hashContent(content),
            size: buffer.byteLength,
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
            return {
                exists: false,
                filePath: relativePath,
                content: "",
                hash: hashContent(""),
                size: 0,
            }
        }

        throw error
    }
}

export class DiffService {
    async readFile(filePath: string, relativePath: string): Promise<WorkspaceFileContent> {
        try {
            const current = await readExistingFile(filePath, relativePath)
            if (!current.exists) {
                throw new AgentExecutionError("FILE_NOT_FOUND", "Workspace file not found.", 404)
            }

            return {
                filePath: relativePath,
                content: current.content,
                hash: current.hash,
                size: current.size,
            }
        } catch (error) {
            if (error instanceof AgentExecutionError) {
                throw error
            }

            logger.error(DIFF_SCOPE, "Failed to read workspace file", {
                filePath: relativePath,
                error: error instanceof Error ? error.message : String(error),
            })
            throw new AgentExecutionError("FILE_READ_FAILED", "Unable to read workspace file.", 500)
        }
    }

    async previewEdit(filePath: string, relativePath: string, proposedContent: string): Promise<FileDiffPreview> {
        const current = await readExistingFile(filePath, relativePath)
        const unifiedDiff = createTwoFilesPatch(
            relativePath,
            relativePath,
            current.content,
            proposedContent,
            current.exists ? "current" : "new",
            "proposed",
            { context: 3 }
        )

        return {
            filePath: relativePath,
            originalHash: current.hash,
            changed: current.content !== proposedContent,
            unifiedDiff,
            originalContent: current.content,
            proposedContent,
            isNewFile: !current.exists,
        }
    }

    async applyEdit(filePath: string, relativePath: string, expectedOriginalHash: string, proposedContent: string) {
        const current = await readExistingFile(filePath, relativePath)

        if (current.hash !== expectedOriginalHash) {
            throw new AgentExecutionError(
                "STALE_FILE",
                "The file changed since the diff preview was generated. Refresh the file and retry.",
                409
            )
        }

        await ensureParentDirectory(filePath)
        await fs.writeFile(filePath, proposedContent, "utf-8")
        return this.readFile(filePath, relativePath)
    }

    async applyEditBatch(edits: Array<{
        filePath: string
        relativePath: string
        expectedOriginalHash: string
        proposedContent: string
    }>) {
        const backups: Array<{
            filePath: string
            existed: boolean
            content: string
        }> = []
        const applied: WorkspaceFileContent[] = []

        try {
            for (const edit of edits) {
                const current = await readExistingFile(edit.filePath, edit.relativePath)

                if (current.hash !== edit.expectedOriginalHash) {
                    throw new AgentExecutionError(
                        "STALE_FILE",
                        `The file ${edit.relativePath} changed since the preview was generated. Refresh and retry.`,
                        409
                    )
                }

                backups.push({
                    filePath: edit.filePath,
                    existed: current.exists,
                    content: current.content,
                })

                await ensureParentDirectory(edit.filePath)
                await fs.writeFile(edit.filePath, edit.proposedContent, "utf-8")
                applied.push(await this.readFile(edit.filePath, edit.relativePath))
            }

            return applied
        } catch (error) {
            for (const backup of backups.reverse()) {
                if (!backup.existed) {
                    await fs.rm(backup.filePath, { force: true })
                    continue
                }

                await ensureParentDirectory(backup.filePath)
                await fs.writeFile(backup.filePath, backup.content, "utf-8")
            }

            throw error
        }
    }
}
