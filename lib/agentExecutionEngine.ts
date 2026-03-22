import { runCodingAgent } from "@/lib/agents/codingAgentService"
import { runWebSearchAgent } from "@/lib/agents/webSearchAgentService"
import { completeWithOpenRouter } from "@/lib/llm/openrouter"

export type ExecutionAction = "llm_only" | "search_tool" | "email_tool" | "github_tool" | "file_tool"

export function classifyTask(task: string) {
    const normalized = task.toLowerCase()

    if (/(latest|news|search|look up|find on the web|current|today)/.test(normalized)) {
        return { requiresExternalAction: true, action: "search_tool" as ExecutionAction }
    }

    if (/(email|send mail|message to)/.test(normalized)) {
        return { requiresExternalAction: true, action: "email_tool" as ExecutionAction }
    }

    if (/(github|repository|repo|readme|package\.json)/.test(normalized)) {
        return { requiresExternalAction: true, action: "github_tool" as ExecutionAction }
    }

    if (/(build|create|generate|landing page|website|app)/.test(normalized)) {
        return { requiresExternalAction: true, action: "file_tool" as ExecutionAction }
    }

    return { requiresExternalAction: false, action: "llm_only" as ExecutionAction }
}

export async function executeTask(task: string) {
    const classification = classifyTask(task)

    if (!classification.requiresExternalAction) {
        const result = await completeWithOpenRouter({
            system: "You are a reasoning-only assistant. Do not claim to perform external actions. Answer using only reasoning, planning, generation, or summarization.",
            user: task,
            maxTokens: 1000,
            temperature: 0.4,
        })

        return {
            status: "completed",
            mode: "llm_only",
            result,
        }
    }

    if (classification.action === "search_tool") {
        const result = await runWebSearchAgent(task)
        return {
            status: "completed",
            mode: classification.action,
            result: result.result,
        }
    }

    if (classification.action === "file_tool") {
        const result = await runCodingAgent(task)
        return {
            status: "completed",
            mode: classification.action,
            result: `Created ${result.projectId} and prepared preview at ${result.preview.previewUrl}`,
        }
    }

    return {
        status: "blocked",
        mode: classification.action,
        result: "This task requires a dedicated tool workflow and user-supplied credentials or approval.",
    }
}
