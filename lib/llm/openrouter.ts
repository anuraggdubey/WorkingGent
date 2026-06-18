import OpenAI from "openai"
import { AgentExecutionError, createLlmError } from "@/lib/agents/shared"

const GROQ_BASE_URL = "https://api.groq.com/openai/v1"
const DEFAULT_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"
const FALLBACK_MODELS = [
    DEFAULT_MODEL,
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]

function getApiKey() {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        throw new Error("Groq API key is not configured. Set GROQ_API_KEY in your .env.local file.")
    }

    return apiKey
}

export function getGroqClient() {
    return new OpenAI({
        apiKey: getApiKey(),
        baseURL: GROQ_BASE_URL,
    })
}

/** @deprecated Use getGroqClient() instead */
export const getOpenRouterClient = getGroqClient

export async function completeWithOpenRouter(options: {
    system: string
    user: string
    model?: string
    maxTokens?: number
    temperature?: number
}) {
    return completeWithOpenRouterMessages({
        system: options.system,
        user: options.user,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
    })
}

export async function completeWithOpenRouterMessages(options: {
    system: string
    user: string | Array<OpenAI.Chat.Completions.ChatCompletionContentPart>
    model?: string
    maxTokens?: number
    temperature?: number
}) {
    const client = getGroqClient()
    const models = options.model ? [options.model] : FALLBACK_MODELS
    let lastError: unknown

    for (const model of models) {
        try {
            const completion = await client.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: options.system },
                    { role: "user", content: options.user },
                ],
                max_tokens: options.maxTokens ?? 1500,
                temperature: options.temperature ?? 0.4,
            })

            const content = completion.choices[0]?.message?.content?.trim()
            if (!content) {
                throw new AgentExecutionError("LLM_EMPTY", "LLM returned an empty response", 502)
            }

            return content
        } catch (error) {
            lastError = error
            if (!isRetryableProviderError(error) || model === models[models.length - 1]) {
                break
            }
        }
    }

    throw createLlmError(
        lastError,
        "Groq request failed after exhausting fallback models"
    )
}

export { DEFAULT_MODEL }

function isRetryableProviderError(error: unknown) {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()
    return (
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("provider returned error")
    )
}
