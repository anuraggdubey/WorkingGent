import net from "net"
import puppeteer from "puppeteer"
import type { Page } from "puppeteer"
import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError, createLlmError } from "@/lib/agents/shared"

const MAX_STEPS = 8
const MAX_EXTRACTED_CHARS = 6000
const EXECUTION_TIMEOUT_MS = 25_000
const BLOCKED_DOMAINS = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "accounts.google.com",
    "bankofamerica.com",
    "paypal.com",
    "stripe.com",
])

const BROWSER_AUTOMATION_SYSTEM_PROMPT = `You are a browser automation planner.

Your job is to convert user requests into clear step-by-step browser actions.

RULES:
1. Break tasks into executable steps
2. Use simple, clear instructions
3. Focus on navigation and extraction
4. Do not execute actions yourself
5. Never invent credentials
6. Never output placeholder selectors, comments, notes, or parenthetical text like "replace with the actual selector"
7. If the user names a site but not a full URL, use the site's public homepage or a public search URL
8. If an exact selector is unknown, use broad safe selectors like h1, h2, h3, main, article, a
9. Keep plans short and safe

ALLOWED STEP COMMANDS:
- OPEN_URL | https://example.com
- WAIT_FOR_LOAD
- WAIT_FOR_SELECTOR | .selector
- CLICK | .selector
- TYPE | .selector | text to type
- EXTRACT_TEXT | .selector

OUTPUT FORMAT:

STEPS:
1. OPEN_URL | https://example.com
2. WAIT_FOR_LOAD
3. EXTRACT_TEXT | h1, h2

EXPECTED RESULT:
* Description of output`

type BrowserAction =
    | { type: "OPEN_URL"; url: string }
    | { type: "WAIT_FOR_LOAD" }
    | { type: "WAIT_FOR_SELECTOR"; selector: string }
    | { type: "CLICK"; selector: string }
    | { type: "TYPE"; selector: string; text: string }
    | { type: "EXTRACT_TEXT"; selector: string }

export type BrowserAutomationResult = {
    plan: string
    steps: string[]
    expectedResult: string
    results: string[]
    extractedText: string
    finalUrl: string
}

export async function runBrowserAutomation(task: string): Promise<BrowserAutomationResult> {
    let plan: string

    try {
        plan = await completeWithOpenRouter({
            system: BROWSER_AUTOMATION_SYSTEM_PROMPT,
            user: `Create a safe browser automation plan for this task:\n${task}`,
            maxTokens: 1200,
            temperature: 0.2,
        })
    } catch (error) {
        throw createLlmError(error, "Browser automation planning failed")
    }

    const parsed = parsePlan(plan)
    const execution = await executePlan(parsed.actions)

    return {
        plan,
        steps: parsed.steps,
        expectedResult: parsed.expectedResult,
        results: execution.results,
        extractedText: execution.extractedText,
        finalUrl: execution.finalUrl,
    }
}

function parsePlan(plan: string) {
    const lines = plan
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

    const stepLines = lines.filter((line) => /^\d+\.\s/.test(line))
    const expectedStart = lines.findIndex((line) => /^EXPECTED RESULT:/i.test(line))
    const expectedResult = expectedStart >= 0
        ? lines.slice(expectedStart + 1).join("\n").trim()
        : "Automation output based on the executed browser steps."

    if (stepLines.length === 0) {
        throw new AgentExecutionError("INVALID_LLM_OUTPUT", "Browser plan did not include executable steps.", 502)
    }

    const actions = stepLines.map((line) => parseAction(line))
    if (actions.length > MAX_STEPS) {
        throw new AgentExecutionError("PLAN_TOO_LONG", `Browser plans are limited to ${MAX_STEPS} steps.`, 400)
    }

    if (actions[0]?.type !== "OPEN_URL") {
        throw new AgentExecutionError("PLAN_MISSING_URL", "Browser plan must start with OPEN_URL.", 400)
    }

    return {
        steps: stepLines,
        actions,
        expectedResult,
    }
}

function parseAction(line: string): BrowserAction {
    const instruction = line.replace(/^\d+\.\s*/, "")
    const parts = instruction.split("|").map((part) => part.trim())
    const command = parts[0]?.toUpperCase()

    switch (command) {
        case "OPEN_URL":
            if (!parts[1]) throw invalidPlanStep(line)
            return { type: "OPEN_URL", url: parts[1] }
        case "WAIT_FOR_LOAD":
            return { type: "WAIT_FOR_LOAD" }
        case "WAIT_FOR_SELECTOR":
            if (!parts[1]) throw invalidPlanStep(line)
            return { type: "WAIT_FOR_SELECTOR", selector: normalizePlannedSelector(parts[1]) }
        case "CLICK":
            if (!parts[1]) throw invalidPlanStep(line)
            return { type: "CLICK", selector: normalizePlannedSelector(parts[1]) }
        case "TYPE":
            if (!parts[1] || !parts[2]) throw invalidPlanStep(line)
            return { type: "TYPE", selector: normalizePlannedSelector(parts[1]), text: parts.slice(2).join(" | ") }
        case "EXTRACT_TEXT":
            if (!parts[1]) throw invalidPlanStep(line)
            return { type: "EXTRACT_TEXT", selector: normalizePlannedSelector(parts[1]) }
        default:
            throw new AgentExecutionError("INVALID_PLAN_STEP", `Unsupported browser step: ${line}`, 400)
    }
}

function invalidPlanStep(line: string) {
    return new AgentExecutionError("INVALID_PLAN_STEP", `Malformed browser step: ${line}`, 400)
}

async function executePlan(actions: BrowserAction[]) {
    const browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
        defaultViewport: { width: 1280, height: 800 },
    })

    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(EXECUTION_TIMEOUT_MS)
    page.setDefaultTimeout(Math.min(EXECUTION_TIMEOUT_MS, 10_000))

    const results: string[] = []
    let extractedText = ""

    try {
        for (const action of actions) {
            switch (action.type) {
                case "OPEN_URL": {
                    const safeUrl = validateSafeUrl(action.url)
                    await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: EXECUTION_TIMEOUT_MS })
                    results.push(`Opened ${safeUrl}`)
                    break
                }
                case "WAIT_FOR_LOAD":
                    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8_000 }).catch(() => null)
                    results.push("Waited for page load")
                    break
                case "WAIT_FOR_SELECTOR":
                    try {
                        const selectorUsed = await waitForAnySelector(page, buildSelectorCandidates(page.url(), action.selector), 8_000)
                        results.push(`Located ${selectorUsed}`)
                    } catch (error) {
                        if (error instanceof AgentExecutionError && error.code === "SELECTOR_NOT_FOUND") {
                            results.push(`Skipped wait for ${sanitizeSelector(action.selector)} because it never appeared`)
                            break
                        }
                        throw error
                    }
                    break
                case "CLICK":
                    await clickFirstAvailableSelector(page, buildSelectorCandidates(page.url(), action.selector))
                    results.push(`Clicked ${sanitizeSelector(action.selector)}`)
                    break
                case "TYPE":
                    await waitForAnySelector(page, buildSelectorCandidates(page.url(), action.selector), 8_000)
                    await clickFirstAvailableSelector(page, buildSelectorCandidates(page.url(), action.selector), { clickCount: 3 })
                    await page.keyboard.press("Backspace")
                    await typeIntoFirstAvailableSelector(page, buildSelectorCandidates(page.url(), action.selector), action.text)
                    results.push(`Typed into ${sanitizeSelector(action.selector)}`)
                    break
                case "EXTRACT_TEXT": {
                    const { text, selectorUsed, usedFallback } = await extractText(page, action.selector)
                    const normalized = text.trim()
                    if (!normalized) {
                        throw new AgentExecutionError("EMPTY_EXTRACTION", `No text found for selector ${action.selector}.`, 404)
                    }

                    extractedText = normalized.slice(0, MAX_EXTRACTED_CHARS)
                    results.push(
                        usedFallback
                            ? `Extracted visible page text after ${sanitizeSelector(action.selector)} matched nothing`
                            : `Extracted text from ${selectorUsed}`
                    )
                    break
                }
            }
        }

        return {
            results,
            extractedText,
            finalUrl: page.url(),
        }
    } catch (error) {
        throw normalizeBrowserError(error)
    } finally {
        await page.close().catch(() => null)
        await browser.close().catch(() => null)
    }
}

function validateSafeUrl(input: string) {
    let url: URL

    try {
        url = new URL(input)
    } catch {
        throw new AgentExecutionError("INVALID_URL", `Invalid URL: ${input}`, 400)
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        throw new AgentExecutionError("UNSAFE_URL", "Only http and https URLs are allowed.", 400)
    }

    const hostname = url.hostname.toLowerCase()
    if (BLOCKED_DOMAINS.has(hostname)) {
        throw new AgentExecutionError("BLOCKED_DOMAIN", `Automation is blocked for ${hostname}.`, 403)
    }

    if (isPrivateHostname(hostname)) {
        throw new AgentExecutionError("BLOCKED_DOMAIN", `Automation is blocked for private host ${hostname}.`, 403)
    }

    return url.toString()
}

function isPrivateHostname(hostname: string) {
    if (hostname === "localhost" || hostname.endsWith(".local")) return true

    const ipVersion = net.isIP(hostname)
    if (ipVersion === 4) {
        return (
            hostname.startsWith("10.") ||
            hostname.startsWith("127.") ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("169.254.") ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
        )
    }

    if (ipVersion === 6) {
        return hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd")
    }

    return false
}

function sanitizeSelector(selector: string) {
    return selector
        .trim()
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .replace(/["']/g, "")
        .replace(/[;:,.]+$/, "")
        .replace(/\s+/g, " ")
        .trim()
}

function normalizePlannedSelector(selector: string) {
    const cleaned = sanitizeSelector(selector)

    if (!cleaned || isPlaceholderSelector(cleaned)) {
        return "main, article, h1, h2, h3, a"
    }

    return cleaned
}

function isPlaceholderSelector(selector: string) {
    const normalized = selector.toLowerCase()
    return (
        normalized.includes("replace with") ||
        normalized.includes("actual selector") ||
        normalized.includes("your selector") ||
        normalized.includes("selector for") ||
        normalized.includes("trending-selector") ||
        normalized.includes("placeholder")
    )
}

function buildSelectorCandidates(currentUrl: string, selector: string) {
    const cleaned = normalizePlannedSelector(selector)
    const candidates = new Set<string>([cleaned])

    try {
        const hostname = new URL(currentUrl).hostname.toLowerCase()
        if (hostname === "news.ycombinator.com") {
            if (cleaned === ".storylink" || /storylink|headline|title/i.test(cleaned)) {
                candidates.add(".titleline > a")
                candidates.add(".athing .titleline > a")
            }
        }

        if (/trending|headline|news|topic/i.test(cleaned)) {
            candidates.add("main h1, main h2, main h3")
            candidates.add("article h1, article h2, article h3")
            candidates.add("h1, h2, h3")
            candidates.add("main a")
            candidates.add("a")
        }
    } catch {
        // Ignore malformed current URL during early navigation.
    }

    return [...candidates].filter((candidate) => Boolean(candidate) && !isPlaceholderSelector(candidate))
}

async function waitForAnySelector(page: Page, selectors: string[], timeout: number) {
    let lastError: unknown

    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout })
            return selector
        } catch (error) {
            lastError = error
        }
    }

    throw new AgentExecutionError(
        "SELECTOR_NOT_FOUND",
        `Waiting for selector ${selectors[0]} failed.`,
        422,
        { selectors, cause: lastError instanceof Error ? lastError.message : String(lastError) }
    )
}

async function clickFirstAvailableSelector(
    page: Page,
    selectors: string[],
    options?: Parameters<Page["click"]>[1]
) {
    for (const selector of selectors) {
        const handle = await page.$(selector)
        if (handle) {
            await page.click(selector, options)
            return selector
        }
    }

    throw new AgentExecutionError("SELECTOR_NOT_FOUND", `Could not find clickable selector ${selectors[0]}.`, 422, { selectors })
}

async function typeIntoFirstAvailableSelector(page: Page, selectors: string[], text: string) {
    for (const selector of selectors) {
        const handle = await page.$(selector)
        if (handle) {
            await page.type(selector, text)
            return selector
        }
    }

    throw new AgentExecutionError("SELECTOR_NOT_FOUND", `Could not find input selector ${selectors[0]}.`, 422, { selectors })
}

async function extractText(page: Page, selector: string) {
    const selectors = buildSelectorCandidates(page.url(), selector)

    for (const candidate of selectors) {
        const content = await page.$$eval(candidate, (nodes) => {
            const skipTags = new Set(["NAV", "FOOTER", "HEADER", "ASIDE", "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "SVG"])
            const junk = new Set(["see more", "read more", "previous", "next", "loading", "advertisement", "subscribe", "sign in", "sign up", "log in", "menu", "close", "share", "copy", "copied"])

            return nodes
                .filter((node) => {
                    let el: Element | null = node
                    while (el) {
                        if (skipTags.has(el.tagName)) return false
                        el = el.parentElement
                    }
                    return true
                })
                .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
                .filter((t) => t.length >= 10 && !junk.has(t.toLowerCase()))
                .join("\n")
        }).catch(() => "")

        const cleaned = deduplicateLines(content)
        if (cleaned.trim()) {
            return { text: cleaned, selectorUsed: candidate, usedFallback: false }
        }
    }

    const fallbackText = await page.evaluate(() => {
        const skipTags = new Set(["NAV", "FOOTER", "HEADER", "ASIDE", "SCRIPT", "STYLE", "NOSCRIPT"])
        const junk = new Set(["see more", "read more", "previous", "next", "loading", "advertisement", "subscribe", "sign in", "sign up", "log in", "menu", "close", "share", "copy"])

        const nodes = Array.from(
            document.querySelectorAll("main h1, main h2, main h3, main p, article h1, article h2, article h3, article p, h1, h2, h3, p")
        )

        const seen = new Set<string>()
        const lines: string[] = []

        for (const node of nodes) {
            let skip = false
            let el: Element | null = node
            while (el) {
                if (skipTags.has(el.tagName)) { skip = true; break }
                el = el.parentElement
            }
            if (skip) continue

            const text = (node.textContent ?? "").replace(/\s+/g, " ").trim()
            if (!text || text.length < 10 || seen.has(text) || junk.has(text.toLowerCase())) continue
            seen.add(text)
            lines.push(text)
            if (lines.length >= 15) break
        }

        return lines.join("\n")
    })

    return { text: fallbackText, selectorUsed: selectors[0] ?? sanitizeSelector(selector), usedFallback: true }
}

function deduplicateLines(text: string) {
    const seen = new Set<string>()
    return text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => {
            if (!l || seen.has(l)) return false
            seen.add(l)
            return true
        })
        .join("\n")
}

function normalizeBrowserError(error: unknown) {
    if (error instanceof AgentExecutionError) {
        return error
    }

    if (error instanceof Error) {
        const message = error.message

        if (message.includes("ERR_NAME_NOT_RESOLVED")) {
            return new AgentExecutionError(
                "UNREACHABLE_URL",
                "The planned URL could not be resolved. Provide a full public URL that is reachable from this environment.",
                400
            )
        }

        if (message.includes("Waiting for selector")) {
            return new AgentExecutionError("SELECTOR_NOT_FOUND", message, 422)
        }

        if (message.includes("Navigation timeout")) {
            return new AgentExecutionError("NAVIGATION_TIMEOUT", message, 504)
        }
    }

    return new AgentExecutionError(
        "BROWSER_AUTOMATION_FAILED",
        error instanceof Error ? error.message : "Browser automation failed",
        500
    )
}
