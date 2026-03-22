import { executeTask } from "@/lib/agentExecutionEngine"

export async function runAgentTask(task: string) {
    return executeTask(task)
}
