import fs from "fs/promises"
import path from "path"
import { resolveWorkspaceFilePath } from "@/lib/github/utils"

const IGNORED_DIRECTORIES = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
])

const TEXT_FILE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".mdx",
    ".yml",
    ".yaml",
    ".env",
    ".example",
    ".txt",
    ".css",
    ".scss",
    ".html",
    ".xml",
    ".sh",
    ".py",
    ".go",
    ".rb",
    ".java",
])

const TEXT_FILE_NAMES = new Set([
    "dockerfile",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "tsconfig.json",
    "next.config.js",
    "next.config.ts",
    ".env.example",
])

export interface RepositoryFileEntry {
    relativePath: string
    absolutePath: string
    size: number
}

export interface RepositoryTextFile extends RepositoryFileEntry {
    content: string
}

function isTextFile(fileName: string) {
    const lower = fileName.toLowerCase()
    if (TEXT_FILE_NAMES.has(lower)) {
        return true
    }

    return TEXT_FILE_EXTENSIONS.has(path.extname(lower))
}

export async function collectRepositoryFiles(
    workspacePath: string,
    options?: {
        maxFiles?: number
        maxFileBytes?: number
    }
): Promise<RepositoryFileEntry[]> {
    const maxFiles = options?.maxFiles ?? 200
    const maxFileBytes = options?.maxFileBytes ?? 250_000
    const files: RepositoryFileEntry[] = []

    async function walk(currentPath: string, relativeDir = ""): Promise<void> {
        if (files.length >= maxFiles) {
            return
        }

        const entries = await fs.readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
            if (files.length >= maxFiles) {
                return
            }

            const nextRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
            const nextAbsolutePath = path.join(currentPath, entry.name)

            if (entry.isDirectory()) {
                if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) {
                    continue
                }

                await walk(nextAbsolutePath, nextRelativePath)
                continue
            }

            if (!entry.isFile() || !isTextFile(entry.name)) {
                continue
            }

            const stat = await fs.stat(nextAbsolutePath)
            if (stat.size > maxFileBytes) {
                continue
            }

            files.push({
                relativePath: nextRelativePath.replace(/\\/g, "/"),
                absolutePath: nextAbsolutePath,
                size: stat.size,
            })
        }
    }

    await walk(workspacePath)
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export async function readRepositoryFiles(
    workspacePath: string,
    relativePaths: string[],
    options?: {
        maxFileBytes?: number
    }
): Promise<RepositoryTextFile[]> {
    const maxFileBytes = options?.maxFileBytes ?? 250_000
    const files: RepositoryTextFile[] = []

    for (const relativePath of relativePaths) {
        const target = resolveWorkspaceFilePath(workspacePath, relativePath)
        const buffer = await fs.readFile(target.resolved)

        if (buffer.byteLength > maxFileBytes) {
            continue
        }

        files.push({
            relativePath: target.normalized,
            absolutePath: target.resolved,
            size: buffer.byteLength,
            content: buffer.toString("utf-8"),
        })
    }

    return files
}
