type LogLevel = "info" | "warn" | "error"

function write(level: LogLevel, scope: string, message: string, metadata?: Record<string, unknown>) {
    const payload = {
        level,
        scope,
        message,
        metadata,
        timestamp: new Date().toISOString(),
    }

    if (level === "error") {
        console.error(JSON.stringify(payload))
        return
    }

    if (level === "warn") {
        console.warn(JSON.stringify(payload))
        return
    }

    console.info(JSON.stringify(payload))
}

export const logger = {
    info: (scope: string, message: string, metadata?: Record<string, unknown>) =>
        write("info", scope, message, metadata),
    warn: (scope: string, message: string, metadata?: Record<string, unknown>) =>
        write("warn", scope, message, metadata),
    error: (scope: string, message: string, metadata?: Record<string, unknown>) =>
        write("error", scope, message, metadata),
}
