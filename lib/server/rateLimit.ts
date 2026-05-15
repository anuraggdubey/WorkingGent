import { AgentExecutionError } from "@/lib/agents/shared"

type Bucket = {
    count: number
    resetAt: number
}

const buckets = new Map<string, Bucket>()

export function enforceRateLimit(key: string, maxRequests: number, windowMs: number) {
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return
    }

    if (bucket.count >= maxRequests) {
        throw new AgentExecutionError(
            "RATE_LIMITED",
            "Too many repository workspace requests. Please wait a moment and try again.",
            429
        )
    }

    bucket.count += 1
}
