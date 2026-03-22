import { cookies } from "next/headers"
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto"

const GITHUB_SESSION_COOKIE = "workinggent_github_session"
const GITHUB_OAUTH_STATE_COOKIE = "workinggent_github_oauth_state"
const LEGACY_GITHUB_SESSION_COOKIE = "agentforge_github_session"
const LEGACY_GITHUB_OAUTH_STATE_COOKIE = "agentforge_github_oauth_state"
const SESSION_TTL_SECONDS = 60 * 60 * 8

type GitHubSessionPayload = {
    accessToken: string
}

function getSessionSecret() {
    const secret = process.env.GITHUB_SESSION_SECRET ?? process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY

    if (!secret) {
        throw new Error("GITHUB_SESSION_SECRET is not configured")
    }

    return createHash("sha256").update(secret).digest()
}

function encrypt(text: string) {
    const iv = randomBytes(12)
    const key = getSessionSecret()
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

function decrypt(value: string) {
    const payload = Buffer.from(value, "base64url")
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    const decipher = createDecipheriv("aes-256-gcm", getSessionSecret(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

export function getGitHubOAuthConfig() {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const appUrl = process.env.APP_URL ?? "http://localhost:3001"
    const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL ?? `${appUrl}/api/auth/github/callback`

    return {
        clientId,
        clientSecret,
        appUrl,
        callbackUrl,
        configured: Boolean(clientId && clientSecret),
    }
}

export async function saveGitHubSession(accessToken: string) {
    const store = await cookies()
    const payload: GitHubSessionPayload = { accessToken }
    store.set(GITHUB_SESSION_COOKIE, encrypt(JSON.stringify(payload)), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    })
}

export async function clearGitHubSession() {
    const store = await cookies()
    for (const cookieName of [GITHUB_SESSION_COOKIE, LEGACY_GITHUB_SESSION_COOKIE]) {
        store.set(cookieName, "", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            expires: new Date(0),
        })
    }
}

export async function readGitHubSession() {
    const store = await cookies()
    const raw = store.get(GITHUB_SESSION_COOKIE)?.value ?? store.get(LEGACY_GITHUB_SESSION_COOKIE)?.value
    if (!raw) return null

    try {
        const parsed = JSON.parse(decrypt(raw)) as GitHubSessionPayload
        if (!parsed.accessToken) return null
        return parsed
    } catch {
        await clearGitHubSession()
        return null
    }
}

export async function storeOAuthState(state: string) {
    const store = await cookies()
    store.set(GITHUB_OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 600,
    })
}

export async function consumeOAuthState(expected: string) {
    const store = await cookies()
    const actual =
        store.get(GITHUB_OAUTH_STATE_COOKIE)?.value ??
        store.get(LEGACY_GITHUB_OAUTH_STATE_COOKIE)?.value

    for (const cookieName of [GITHUB_OAUTH_STATE_COOKIE, LEGACY_GITHUB_OAUTH_STATE_COOKIE]) {
        store.set(cookieName, "", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            expires: new Date(0),
        })
    }

    if (!actual) return false

    const actualBuffer = Buffer.from(actual)
    const expectedBuffer = Buffer.from(expected)

    if (actualBuffer.length !== expectedBuffer.length) return false

    return timingSafeEqual(actualBuffer, expectedBuffer)
}
