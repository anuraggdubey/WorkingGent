"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
    AtSign,
    AlertCircle,
    Braces,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Chrome,
    Code2,
    Copy,
    Download,
    Eye,
    ExternalLink,
    FileCode,
    FileText,
    FileType,
    Github,
    Globe,
    Layers,
    Loader2,
    Mail,
    PanelRightOpen,
    PanelRightClose,
    PenLine,
    Play,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    Upload,
    X,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useAgentContext } from "@/lib/AgentContext"

const GitHubAgent = dynamic(() => import("@/components/agents/GitHubAgent"), {
    ssr: false,
    loading: () => (
        <div className="p-6">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton mt-4 h-24" />
            <div className="skeleton mt-4 h-72" />
        </div>
    ),
})

type AgentId = "coding" | "websearch" | "email" | "github" | "document" | "browser"
type RunState = "idle" | "running" | "done" | "error"
type EmailSendState = "idle" | "sending" | "sent" | "error"

type AgentDef = {
    id: AgentId
    label: string
    icon: React.ElementType
    description: string
    placeholder: string
}

type AgentStep = {
    step: number
    title: string
    detail: string
    status: "pending" | "running" | "done"
}

type GeneratedFiles = { html: string; css: string; js: string }

type SearchResult = {
    query: string
    result: string
    sources: Array<{ title: string; snippet: string; link: string }>
    hasLiveData: boolean
}

type GeneratedEmail = {
    subject: string
    body: string
}

type DocumentResult = {
    fileName: string
    fileType: string
    analysis: string
    truncated: boolean
}

type BrowserAutomationResult = {
    steps: string[]
    expectedResult: string
    results: string[]
    extractedText: string
    finalUrl: string
}

const AGENTS: AgentDef[] = [
    {
        id: "coding",
        label: "Coding",
        icon: Code2,
        description: "Generate projects, save files to disk, preview them, and package downloads.",
        placeholder: "Build a launch page for a boutique product studio with smooth sections and a signup CTA.",
    },
    {
        id: "websearch",
        label: "Web Search",
        icon: Search,
        description: "Fetch live results first, then summarize only what was retrieved.",
        placeholder: "Summarize the latest AI developer tooling news and list the original sources.",
    },
    {
        id: "email",
        label: "Email",
        icon: Mail,
        description: "Draft email content first, then send only after explicit approval.",
        placeholder: "Describe the email you want to send.",
    },
    {
        id: "github",
        label: "GitHub",
        icon: Github,
        description: "Connect a GitHub account, select a repository, then analyze real code.",
        placeholder: "Review the auth architecture and suggest the fastest fixes.",
    },
    {
        id: "document",
        label: "Document",
        icon: FileText,
        description: "Upload PDFs, spreadsheets, CSVs, JSON, or text files and get summaries, insights, and answers.",
        placeholder: "Ask a question about the uploaded file.",
    },
    {
        id: "browser",
        label: "Browser",
        icon: Chrome,
        description: "Plan safe browser actions and use Puppeteer to navigate websites, click, type, and extract live content.",
        placeholder: "Open https://example.com and extract the main hero text.",
    },
]

const CODING_STEPS: Omit<AgentStep, "status">[] = [
    { step: 1, title: "Parse request", detail: "Understand the product surface and scope." },
    { step: 2, title: "Plan files", detail: "Split the response into HTML, CSS, and JavaScript." },
    { step: 3, title: "Generate code", detail: "Produce implementation-ready output." },
    { step: 4, title: "Write files", detail: "Persist the project through backend file tools." },
    { step: 5, title: "Preview project", detail: "Expose the generated build in preview mode." },
]

const SEARCH_STEPS: Omit<AgentStep, "status">[] = [
    { step: 1, title: "Interpret query", detail: "Clarify what the user is trying to learn." },
    { step: 2, title: "Fetch results", detail: "Retrieve live evidence through SerpAPI." },
    { step: 3, title: "Normalize sources", detail: "Extract titles, snippets, and links." },
    { step: 4, title: "Summarize findings", detail: "Synthesize the fetched data only." },
    { step: 5, title: "Return answer", detail: "Present the summary with sources." },
]

const EMAIL_STEPS: Omit<AgentStep, "status">[] = [
    { step: 1, title: "Read context", detail: "Capture the recipient, tone, and intent." },
    { step: 2, title: "Draft message", detail: "Compose a clear and usable email." },
    { step: 3, title: "Polish subject", detail: "Refine tone and subject line." },
    { step: 4, title: "Await approval", detail: "Keep delivery blocked until you approve." },
]

const DOCUMENT_STEPS: Omit<AgentStep, "status">[] = [
    { step: 1, title: "Read file", detail: "Validate the uploaded document and detect its type." },
    { step: 2, title: "Parse content", detail: "Extract text or structured rows through backend parsers." },
    { step: 3, title: "Normalize data", detail: "Convert the document into clean structured analysis context." },
    { step: 4, title: "Analyze content", detail: "Send only processed content to the model for insights." },
]

const BROWSER_STEPS: Omit<AgentStep, "status">[] = [
    { step: 1, title: "Plan steps", detail: "Translate the request into safe browser automation commands." },
    { step: 2, title: "Open site", detail: "Launch a browser session and navigate to the requested page." },
    { step: 3, title: "Run actions", detail: "Execute the planned click, type, wait, or extraction steps." },
    { step: 4, title: "Return result", detail: "Package extracted content and execution notes for review." },
]

function getErrorMessage(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback
    if (message.includes("429 Provider returned error")) {
        return "OpenRouter is rate-limiting the upstream model right now. Add credits or switch to a paid-capable model if this persists."
    }
    return message
}

/* ── Bottom Sheet Component ── */
function BottomSheet({
    open,
    onClose,
    children,
}: {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}) {
    const [visible, setVisible] = useState(false)
    const [closing, setClosing] = useState(false)

    useEffect(() => {
        if (open) {
            setVisible(true)
            setClosing(false)
        } else if (visible && !closing) {
            setClosing(true)
            setTimeout(() => {
                setVisible(false)
                setClosing(false)
            }, 250)
        }
    }, [open])

    const handleClose = () => {
        setClosing(true)
        setTimeout(() => {
            setVisible(false)
            setClosing(false)
            onClose()
        }, 250)
    }

    if (!visible) return null

    return (
        <>
            <div
                className={`bottom-sheet-backdrop ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`}
                onClick={handleClose}
            />
            <div className={`bottom-sheet ${closing ? "animate-slide-down" : "animate-slide-up"}`}>
                <div className="bottom-sheet-handle" />
                {children}
            </div>
        </>
    )
}

/* ── Collapsible Section ── */
function Collapsible({
    title,
    children,
    defaultOpen = false,
}: {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="collapsible-header w-full text-left"
            >
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{title}</span>
                {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
            </button>
            <div
                className="collapsible-content"
                style={{
                    maxHeight: open ? "2000px" : "0px",
                    opacity: open ? 1 : 0,
                }}
            >
                {children}
            </div>
        </div>
    )
}

export default function AgentsPage() {
    const { startAgentRun, completeAgentRun, failAgentRun, logAgentEvent } = useAgentContext()
    const [selectedAgent, setSelectedAgent] = useState<AgentDef>(AGENTS[0])
    const [runState, setRunState] = useState<RunState>("idle")
    const [error, setError] = useState<string | null>(null)
    const [steps, setSteps] = useState<AgentStep[]>([])
    const [rightPanelOpen, setRightPanelOpen] = useState(false)
    const [agentSheetOpen, setAgentSheetOpen] = useState(false)

    const [prompt, setPrompt] = useState("")
    const [codingLanguage, setCodingLanguage] = useState("html-css-js")
    const [files, setFiles] = useState<GeneratedFiles | null>(null)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"html" | "css" | "js" | "preview">("preview")
    const [copied, setCopied] = useState<string | null>(null)
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
    const [emailTo, setEmailTo] = useState("")
    const [emailSubject, setEmailSubject] = useState("")
    const [emailContext, setEmailContext] = useState("")
    const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null)
    const [emailSendState, setEmailSendState] = useState<EmailSendState>("idle")
    const [emailSentMsg, setEmailSentMsg] = useState("")
    const [documentFile, setDocumentFile] = useState<File | null>(null)
    const [documentQuestion, setDocumentQuestion] = useState("")
    const [documentResult, setDocumentResult] = useState<DocumentResult | null>(null)
    const [browserResult, setBrowserResult] = useState<BrowserAutomationResult | null>(null)
    const [singleFile, setSingleFile] = useState<{ code: string; filename: string; language: string } | null>(null)

    const selectAgent = (agent: AgentDef) => {
        setSelectedAgent(agent)
        setRunState("idle")
        setError(null)
        setPrompt("")
        setFiles(null)
        setProjectId(null)
        setSearchResult(null)
        setGeneratedEmail(null)
        setEmailSendState("idle")
        setEmailSentMsg("")
        setDocumentFile(null)
        setDocumentQuestion("")
        setDocumentResult(null)
        setBrowserResult(null)
        setSteps([])
        setRightPanelOpen(false)
        setAgentSheetOpen(false)
    }

    const initSteps = (template: Omit<AgentStep, "status">[]) =>
        template.map((step) => ({ ...step, status: "pending" as const }))

    const setStepStatus = (index: number, status: AgentStep["status"]) => {
        setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, status } : step)))
    }

    const runAgent = async () => {
        if (runState === "running") return
        if (selectedAgent.id === "coding" && prompt.trim()) await runCodingAgent()
        if (selectedAgent.id === "websearch" && prompt.trim()) await runWebSearchAgent()
        if (selectedAgent.id === "email" && emailTo.trim() && emailContext.trim()) await runEmailAgent()
        if (selectedAgent.id === "document" && documentFile) await runDocumentAgent()
        if (selectedAgent.id === "browser" && prompt.trim()) await runBrowserAgent()
    }

    /* ── Agent runners (unchanged backend logic) ── */

    const runCodingAgent = async () => {
        setRunState("running")
        setError(null)
        setFiles(null)
        setProjectId(null)
        setSingleFile(null)
        setSteps(initSteps(CODING_STEPS))
        setRightPanelOpen(true)
        startAgentRun("coding", `Building project from prompt: ${prompt}`)

        ;[0, 1, 2].forEach((index) => {
            setTimeout(() => {
                setSteps((prev) =>
                    prev.map((step, idx) => {
                        if (idx === index) return { ...step, status: "running" }
                        if (idx === index - 1) return { ...step, status: "done" }
                        return step
                    })
                )
            }, index * 1000)
        })

        try {
            const response = await fetch("/api/run-coding-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, language: codingLanguage }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Coding agent failed")

            setStepStatus(2, "done")
            setStepStatus(3, "running")
            await delay(400)
            setStepStatus(3, "done")
            setStepStatus(4, "running")
            await delay(350)
            setStepStatus(4, "done")
            setFiles(data.files ?? null)
            setSingleFile(data.singleFile ?? null)
            setProjectId(data.projectId)
            setActiveTab("preview")
            setRunState("done")
            completeAgentRun("coding", `Generated project ${data.projectId} and prepared a live preview.`)
        } catch (err: unknown) {
            failAgentRun("coding", getErrorMessage(err, "Coding agent failed"))
            setError(getErrorMessage(err, "Coding agent failed"))
            setRunState("error")
        }
    }

    const runWebSearchAgent = async () => {
        setRunState("running")
        setError(null)
        setSearchResult(null)
        setSteps(initSteps(SEARCH_STEPS))
        startAgentRun("websearch", `Running live search for: ${prompt}`)

        for (let index = 0; index <= 2; index += 1) {
            if (index > 0) setStepStatus(index - 1, "done")
            setStepStatus(index, "running")
            if (index < 2) await delay(600)
        }

        try {
            const response = await fetch("/api/web-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: prompt }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Search failed")

            setStepStatus(2, "done")
            setStepStatus(3, "running")
            await delay(300)
            setStepStatus(3, "done")
            setStepStatus(4, "running")
            await delay(240)
            setStepStatus(4, "done")
            setSearchResult(data)
            setRunState("done")
            completeAgentRun("websearch", `Summarized live search results for "${prompt}".`)
        } catch (err: unknown) {
            failAgentRun("websearch", getErrorMessage(err, "Search failed"))
            setError(getErrorMessage(err, "Search failed"))
            setRunState("error")
        }
    }

    const runEmailAgent = async () => {
        setRunState("running")
        setError(null)
        setGeneratedEmail(null)
        setEmailSendState("idle")
        setEmailSentMsg("")
        setSteps(initSteps(EMAIL_STEPS))
        startAgentRun("email", `Drafting email for ${emailTo}`)

        setStepStatus(0, "running")
        await delay(550)
        setStepStatus(0, "done")
        setStepStatus(1, "running")

        try {
            const response = await fetch("/api/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientEmail: emailTo, subject: emailSubject, context: emailContext }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Email generation failed")

            setStepStatus(1, "done")
            setStepStatus(2, "running")
            await delay(350)
            setStepStatus(2, "done")
            setStepStatus(3, "running")
            await delay(220)
            setStepStatus(3, "done")
            setGeneratedEmail({ subject: data.subject, body: data.body })
            setRunState("done")
            completeAgentRun("email", `Generated draft email for ${emailTo}.`, 1)
        } catch (err: unknown) {
            failAgentRun("email", getErrorMessage(err, "Email generation failed"))
            setError(getErrorMessage(err, "Email generation failed"))
            setRunState("error")
        }
    }

    const sendEmail = async () => {
        if (!generatedEmail || emailSendState === "sending") return
        setEmailSendState("sending")
        setEmailSentMsg("")

        try {
            const response = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: emailTo,
                    subject: generatedEmail.subject,
                    htmlBody: generatedEmail.body,
                    textBody: generatedEmail.body,
                    approved: true,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Send failed")
            setEmailSendState("sent")
            setEmailSentMsg(data.message ?? `Email sent to ${emailTo}.`)
            logAgentEvent("email", `Sent approved email to ${emailTo}.`, {
                status: "success",
                type: "execution",
                reward: 1,
            })
        } catch (err: unknown) {
            setEmailSendState("error")
            setEmailSentMsg(getErrorMessage(err, "Send failed"))
            logAgentEvent("email", getErrorMessage(err, "Send failed"), {
                status: "error",
                type: "execution",
            })
        }
    }

    const runDocumentAgent = async () => {
        if (!documentFile) return

        setRunState("running")
        setError(null)
        setDocumentResult(null)
        setSteps(initSteps(DOCUMENT_STEPS))
        startAgentRun("document", `Analyzing ${documentFile.name}`)

        setStepStatus(0, "running")
        await delay(350)
        setStepStatus(0, "done")
        setStepStatus(1, "running")

        try {
            const formData = new FormData()
            formData.append("file", documentFile)
            formData.append("question", documentQuestion)

            const response = await fetch("/api/analyze-document", {
                method: "POST",
                body: formData,
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Document analysis failed")

            setStepStatus(1, "done")
            setStepStatus(2, "running")
            await delay(220)
            setStepStatus(2, "done")
            setStepStatus(3, "running")
            await delay(280)
            setStepStatus(3, "done")
            setDocumentResult({
                fileName: data.fileName,
                fileType: data.fileType,
                analysis: data.analysis,
                truncated: Boolean(data.truncated),
            })
            setRunState("done")
            completeAgentRun("document", `Analyzed document ${data.fileName}.`, 3)
        } catch (err: unknown) {
            failAgentRun("document", getErrorMessage(err, "Document analysis failed"))
            setError(getErrorMessage(err, "Document analysis failed"))
            setRunState("error")
        }
    }

    const runBrowserAgent = async () => {
        setRunState("running")
        setError(null)
        setBrowserResult(null)
        setSteps(initSteps(BROWSER_STEPS))
        startAgentRun("browser", `Running browser automation for: ${prompt}`)

        setStepStatus(0, "running")
        await delay(320)

        try {
            const response = await fetch("/api/browser-automation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task: prompt }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Browser automation failed")

            setStepStatus(0, "done")
            setStepStatus(1, "running")
            await delay(260)
            setStepStatus(1, "done")
            setStepStatus(2, "running")
            await delay(260)
            setStepStatus(2, "done")
            setStepStatus(3, "running")
            await delay(240)
            setStepStatus(3, "done")
            setBrowserResult({
                steps: data.steps ?? [],
                expectedResult: data.expectedResult ?? "",
                results: data.results ?? [],
                extractedText: data.extractedText ?? "",
                finalUrl: data.finalUrl ?? "",
            })
            setRunState("done")
            completeAgentRun("browser", `Completed browser automation for "${prompt}".`, 4)
        } catch (err: unknown) {
            failAgentRun("browser", getErrorMessage(err, "Browser automation failed"))
            setError(getErrorMessage(err, "Browser automation failed"))
            setRunState("error")
        }
    }

    const canRunEmail = emailTo.trim() && emailContext.trim()
    const canRunDocument = Boolean(documentFile)
    const canRun =
        selectedAgent.id === "email"
            ? canRunEmail
            : selectedAgent.id === "github"
                ? false
                : selectedAgent.id === "document"
                    ? canRunDocument
                    : prompt.trim()
    const fileContent = (tab: "html" | "css" | "js") =>
        !files ? "" : tab === "html" ? files.html : tab === "css" ? files.css : files.js

    const hasOutput = runState !== "idle" || selectedAgent.id === "github"
    const SelectedIcon = selectedAgent.icon

    return (
        <div className="flex h-[calc(100vh-3rem)] h-[calc(100dvh-3rem)] overflow-hidden sm:h-[calc(100vh-3.5rem)] sm:h-[calc(100dvh-3.5rem)]">
            {/* ── LEFT SIDEBAR (desktop only) ── */}
            <aside className="hidden w-52 shrink-0 border-r border-border lg:block">
                <div className="p-3">
                    <div className="px-2 py-2 text-[10px] font-medium uppercase tracking-wider text-muted">Agents</div>
                    <nav className="mt-1 space-y-0.5">
                        {AGENTS.map((agent) => {
                            const Icon = agent.icon
                            const isActive = selectedAgent.id === agent.id
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => selectAgent(agent)}
                                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                                        isActive
                                            ? "bg-primary-soft text-foreground font-medium"
                                            : "text-foreground-soft hover:bg-surface-elevated hover:text-foreground"
                                    }`}
                                >
                                    <Icon size={15} className={isActive ? "text-primary" : ""} />
                                    {agent.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </aside>

            {/* ── CENTER PANEL ── */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
                        {/* ── Agent Selector (mobile: tap to open bottom sheet) ── */}
                        <button
                            onClick={() => setAgentSheetOpen(true)}
                            className="mb-4 flex w-full items-center justify-between rounded-lg bg-surface-elevated px-3.5 py-3 text-left transition-colors active:bg-surface-elevated/80 lg:hidden"
                        >
                            <div className="flex items-center gap-2.5">
                                <SelectedIcon size={16} className="text-primary" />
                                <span className="text-sm font-medium text-foreground">{selectedAgent.label}</span>
                            </div>
                            <Layers size={14} className="text-muted" />
                        </button>

                        {/* ── Command Input Area ── */}
                        {selectedAgent.id === "github" ? (
                            <div className="rounded-lg border border-border bg-surface p-4">
                                <div className="text-sm font-medium text-foreground">GitHub workflow</div>
                                <p className="mt-1 text-xs text-foreground-soft">
                                    Connect GitHub, choose a repository, index it, then prompt against the real codebase below.
                                </p>
                            </div>
                        ) : selectedAgent.id === "email" ? (
                            <div className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="input-shell flex flex-1 items-center gap-2 px-3 py-3">
                                        <AtSign size={14} className="shrink-0 text-muted" />
                                        <input
                                            type="email"
                                            value={emailTo}
                                            onChange={(e) => setEmailTo(e.target.value)}
                                            placeholder="recipient@example.com"
                                            disabled={runState === "running"}
                                            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted sm:text-sm"
                                        />
                                    </div>
                                    <div className="input-shell flex flex-1 items-center px-3 py-3">
                                        <input
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            placeholder="Subject (optional)"
                                            disabled={runState === "running"}
                                            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="input-shell px-3 py-3">
                                    <textarea
                                        value={emailContext}
                                        onChange={(e) => setEmailContext(e.target.value)}
                                        placeholder="Describe the goal, tone, and details..."
                                        disabled={runState === "running"}
                                        rows={3}
                                        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted sm:text-sm"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <RunButton runState={runState} canRun={!!canRunEmail} onClick={runAgent} agent="email" />
                                </div>
                            </div>
                        ) : selectedAgent.id === "document" ? (
                            <div className="space-y-3">
                                <label className="input-shell flex cursor-pointer items-center gap-3 px-3.5 py-3.5">
                                    <Upload size={18} className="shrink-0 text-muted" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[15px] text-foreground sm:text-sm">
                                            {documentFile ? documentFile.name : "Upload a document"}
                                        </div>
                                        {!documentFile && (
                                            <div className="text-xs text-muted">PDF, Excel, CSV, JSON, TXT</div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv,.json,.txt"
                                        onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                                        disabled={runState === "running"}
                                        className="hidden"
                                    />
                                </label>
                                <div className="flex gap-3">
                                    <div className="input-shell flex flex-1 items-center px-3 py-3">
                                        <input
                                            value={documentQuestion}
                                            onChange={(e) => setDocumentQuestion(e.target.value)}
                                            placeholder={selectedAgent.placeholder}
                                            disabled={runState === "running"}
                                            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted sm:text-sm"
                                        />
                                    </div>
                                    <RunButton runState={runState} canRun={!!canRunDocument} onClick={runAgent} agent="document" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedAgent.id === "coding" && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-muted whitespace-nowrap">Language</label>
                                        <select
                                            value={codingLanguage}
                                            onChange={(e) => setCodingLanguage(e.target.value)}
                                            disabled={runState === "running"}
                                            className="input-shell w-full rounded-lg px-3 py-2.5 text-[13px] text-foreground sm:w-auto sm:text-xs"
                                            style={{ minHeight: 40 }}
                                        >
                                            <option value="html-css-js">HTML / CSS / JS</option>
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript (Node)</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="react">React (JSX)</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="go">Go</option>
                                            <option value="rust">Rust</option>
                                            <option value="swift">Swift</option>
                                            <option value="ruby">Ruby</option>
                                            <option value="php">PHP</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="input-shell flex flex-1 items-center gap-2 px-3.5 py-3">
                                        <input
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && void runAgent()}
                                            placeholder={selectedAgent.placeholder}
                                            disabled={runState === "running"}
                                            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted sm:text-sm"
                                        />
                                    </div>
                                    <RunButton runState={runState} canRun={!!canRun} onClick={runAgent} agent={selectedAgent.id} />
                                </div>
                            </div>
                        )}

                        {/* ── Output Area ── */}
                        <div className="mt-6">
                            {selectedAgent.id === "github" && <GitHubAgent />}

                            {selectedAgent.id !== "github" && runState === "idle" && (
                                <div className="animate-fade-in py-16 text-center sm:py-20">
                                    <SelectedIcon size={28} className="mx-auto text-muted sm:size-[24px]" />
                                    <p className="mt-3 text-[15px] text-muted sm:text-sm">{selectedAgent.label} is ready</p>
                                    <p className="mt-1 text-xs text-muted">Enter a task above to begin</p>
                                </div>
                            )}

                            {/* Steps stream */}
                            {steps.length > 0 && selectedAgent.id !== "github" && (
                                <div className="animate-fade-in space-y-1">
                                    {steps.map((step) => (
                                        <div key={step.step} className="flex items-center gap-3 rounded-lg px-2 py-2 sm:gap-2.5 sm:py-1.5">
                                            <div className="shrink-0">
                                                {step.status === "done" ? (
                                                    <CheckCircle2 size={16} className="text-success sm:size-[14px]" />
                                                ) : step.status === "running" ? (
                                                    <Loader2 size={16} className="animate-spin text-primary sm:size-[14px]" />
                                                ) : (
                                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[9px] text-muted sm:h-3.5 sm:w-3.5">
                                                        {step.step}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[13px] sm:text-xs ${step.status === "pending" ? "text-muted" : "text-foreground"}`}>
                                                {step.title}
                                            </span>
                                            {step.status !== "pending" && (
                                                <span className="hidden text-xs text-foreground-soft sm:inline">— {step.detail}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && <ErrorBox message={error} onRetry={() => { setRunState("idle"); setError(null) }} />}

                            {/* Coding output */}
                            {selectedAgent.id === "coding" && runState === "done" && files && (
                                <div className="animate-fade-in mt-4 overflow-hidden rounded-lg border border-border">
                                    <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2">
                                        {([
                                            { id: "preview", label: "Preview", icon: Eye },
                                            { id: "html", label: "HTML", icon: FileCode },
                                            { id: "css", label: "CSS", icon: FileType },
                                            { id: "js", label: "JS", icon: Braces },
                                        ] as const).map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                                    activeTab === tab.id ? "bg-primary-soft text-foreground" : "text-muted hover:text-foreground"
                                                }`}
                                                style={{ minHeight: 36 }}
                                            >
                                                <tab.icon size={12} />
                                                {tab.label}
                                            </button>
                                        ))}
                                        {activeTab !== "preview" && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(fileContent(activeTab as "html" | "css" | "js"))
                                                    setCopied(activeTab)
                                                    setTimeout(() => setCopied(null), 1800)
                                                }}
                                                className="ml-auto p-2 text-xs text-muted hover:text-foreground"
                                                style={{ minHeight: 36, minWidth: 36 }}
                                            >
                                                {copied === activeTab ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    {activeTab === "preview" ? (
                                        projectId ? (
                                            <iframe
                                                src={`/api/preview/${projectId}`}
                                                className="h-[60vh] w-full border-0 sm:h-[500px]"
                                                sandbox="allow-scripts allow-same-origin"
                                                title="Preview"
                                            />
                                        ) : (
                                            <div className="flex h-[60vh] items-center justify-center sm:h-[500px]">
                                                <div className="skeleton h-6 w-32" />
                                            </div>
                                        )
                                    ) : (
                                        <div className="h-[60vh] overflow-auto bg-[#0d1117] p-4 text-xs text-gray-300 sm:h-[500px]">
                                            <pre className="whitespace-pre-wrap">{fileContent(activeTab as "html" | "css" | "js")}</pre>
                                        </div>
                                    )}
                                    {projectId && (
                                        <div className="border-t border-border px-3 py-2">
                                            <a href={`/api/download/${projectId}`} download className="button-secondary text-xs">
                                                <Download size={14} />
                                                Download
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Single-file coding output (non-HTML languages) */}
                            {selectedAgent.id === "coding" && runState === "done" && singleFile && (
                                <div className="animate-fade-in mt-4 overflow-hidden rounded-lg border border-border">
                                    {/* Header bar — matches the HTML/CSS/JS tab bar style */}
                                    <div className="flex items-center justify-between border-b border-border bg-surface px-3.5 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1.5">
                                                <Eye size={12} className="text-primary" />
                                                <span className="text-xs font-medium text-foreground">Preview</span>
                                            </div>
                                            <span className="text-xs text-muted">·</span>
                                            <span className="text-xs font-medium text-foreground">{singleFile.filename}</span>
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                                {singleFile.language}
                                            </span>
                                            <span className="hidden text-[10px] text-muted sm:inline">
                                                {singleFile.code.split("\n").length} lines
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(singleFile.code)
                                                    setCopied("single")
                                                    setTimeout(() => setCopied(null), 1800)
                                                }}
                                                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-surface-elevated hover:text-foreground"
                                                style={{ minHeight: 36 }}
                                            >
                                                {copied === "single" ? <Check size={13} /> : <Copy size={13} />}
                                                <span className="hidden sm:inline">{copied === "single" ? "Copied" : "Copy"}</span>
                                            </button>
                                            {projectId && (
                                                <a
                                                    href={`/api/download/${projectId}`}
                                                    download
                                                    className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-surface-elevated hover:text-foreground"
                                                    style={{ minHeight: 36 }}
                                                >
                                                    <Download size={13} />
                                                    <span className="hidden sm:inline">Download</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    {/* Code display — same height as the HTML preview iframe */}
                                    <div className="h-[60vh] overflow-auto bg-[#0d1117] p-4 sm:h-[500px]">
                                        <pre className="text-[13px] leading-relaxed text-gray-300 sm:text-xs"><code>{singleFile.code}</code></pre>
                                    </div>
                                </div>
                            )}

                            {/* Web search output */}
                            {selectedAgent.id === "websearch" && searchResult && (
                                <div className="animate-fade-in mt-4 space-y-4">
                                    <div className="flex items-center gap-2 text-xs text-muted">
                                        <Globe size={13} />
                                        Results for: {searchResult.query}
                                    </div>
                                    <div className="prose prose-sm max-w-none text-[15px] leading-relaxed sm:text-sm dark:prose-invert">
                                        <ReactMarkdown components={mdComponents}>{searchResult.result}</ReactMarkdown>
                                    </div>
                                    {searchResult.sources.length > 0 && (
                                        <Collapsible title="Sources" defaultOpen={true}>
                                            <div className="space-y-1">
                                                {searchResult.sources.map((source) => (
                                                    <a
                                                        key={source.link}
                                                        href={source.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-start justify-between gap-3 rounded-lg px-2 py-3 text-xs hover:bg-surface-elevated sm:py-2"
                                                        style={{ minHeight: 44 }}
                                                    >
                                                        <div>
                                                            <div className="font-medium text-foreground">{source.title}</div>
                                                            <div className="mt-0.5 text-foreground-soft">{source.snippet}</div>
                                                        </div>
                                                        <ExternalLink size={11} className="mt-0.5 shrink-0 text-muted" />
                                                    </a>
                                                ))}
                                            </div>
                                        </Collapsible>
                                    )}
                                </div>
                            )}
                            {selectedAgent.id === "websearch" && runState === "running" && !searchResult && (
                                <LoadingState text="Fetching sources..." />
                            )}

                            {/* Email output */}
                            {selectedAgent.id === "email" && generatedEmail && (
                                <div className="animate-fade-in mt-4 space-y-3">
                                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:gap-3">
                                        <div><span className="text-muted">To:</span> <span className="text-foreground">{emailTo}</span></div>
                                        <div><span className="text-muted">Subject:</span> <span className="text-foreground">{generatedEmail.subject}</span></div>
                                    </div>
                                    <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-[15px] leading-relaxed text-foreground sm:text-sm">
                                        {generatedEmail.body}
                                    </div>
                                    {emailSendState === "sent" && (
                                        <div className="text-xs text-success">{emailSentMsg}</div>
                                    )}
                                    {emailSendState === "error" && <ErrorBox message={emailSentMsg} />}
                                    {emailSendState !== "sent" && (
                                        <div className="flex gap-2">
                                            <button onClick={sendEmail} disabled={emailSendState === "sending"} className="button-primary text-xs">
                                                {emailSendState === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                Approve & Send
                                            </button>
                                            <button onClick={runEmailAgent} className="button-secondary text-xs">
                                                <RefreshCw size={14} />
                                                Regenerate
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedAgent.id === "email" && runState === "running" && !generatedEmail && (
                                <LoadingState text="Drafting email..." />
                            )}

                            {/* Document output */}
                            {selectedAgent.id === "document" && documentResult && (
                                <div className="animate-fade-in mt-4 space-y-3">
                                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
                                        <div><span className="text-muted">File:</span> <span className="text-foreground">{documentResult.fileName}</span></div>
                                        <div><span className="text-muted">Type:</span> <span className="text-foreground uppercase">{documentResult.fileType}</span></div>
                                    </div>
                                    {documentResult.truncated && (
                                        <div className="text-xs text-warning">Content was trimmed for analysis.</div>
                                    )}
                                    <div className="prose prose-sm max-w-none text-[15px] leading-relaxed sm:text-sm dark:prose-invert">
                                        <ReactMarkdown components={mdComponents}>{documentResult.analysis}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            {selectedAgent.id === "document" && runState === "running" && !documentResult && (
                                <LoadingState text="Analyzing document..." />
                            )}

                            {/* Browser output */}
                            {selectedAgent.id === "browser" && browserResult && (
                                <div className="animate-fade-in mt-4 space-y-4">
                                    {/* URL Bar */}
                                    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3">
                                        <Globe size={14} className="shrink-0 text-primary" />
                                        <a
                                            href={browserResult.finalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground hover:underline sm:text-xs"
                                        >
                                            {browserResult.finalUrl}
                                        </a>
                                        <ExternalLink size={12} className="shrink-0 text-muted" />
                                    </div>

                                    {/* Automation Plan */}
                                    {browserResult.steps.length > 0 && (
                                        <div className="rounded-lg border border-border">
                                            <div className="border-b border-border px-3.5 py-2.5">
                                                <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Automation Plan</div>
                                            </div>
                                            <div className="divide-y divide-border">
                                                {browserResult.steps.map((step, i) => {
                                                    const stepText = step.replace(/^\d+\.\s*/, "")
                                                    return (
                                                        <div key={i} className="flex items-start gap-3 px-3.5 py-2.5">
                                                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[13px] leading-relaxed text-foreground sm:text-xs">{stepText}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Execution Log */}
                                    {browserResult.results.length > 0 && (
                                        <div className="rounded-lg border border-border">
                                            <div className="border-b border-border px-3.5 py-2.5">
                                                <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Execution Log</div>
                                            </div>
                                            <div className="divide-y divide-border">
                                                {browserResult.results.map((r, i) => (
                                                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                                                        <CheckCircle2 size={13} className="shrink-0 text-success" />
                                                        <span className="text-[13px] text-foreground-soft sm:text-xs">{r}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extracted Content */}
                                    <div className="rounded-lg border border-border">
                                        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Extracted Content</div>
                                            {browserResult.extractedText && (
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(browserResult.extractedText)
                                                        setCopied("browser")
                                                        setTimeout(() => setCopied(null), 1800)
                                                    }}
                                                    className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                                                    style={{ minHeight: 32, minWidth: 32 }}
                                                >
                                                    {copied === "browser" ? <Check size={12} /> : <Copy size={12} />}
                                                    <span className="hidden sm:inline">{copied === "browser" ? "Copied" : "Copy"}</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto px-3.5 py-3 sm:max-h-[400px]">
                                            {browserResult.extractedText ? (
                                                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground sm:text-sm">
                                                    {browserResult.extractedText}
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center text-[13px] text-muted sm:text-xs">No text extracted</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedAgent.id === "browser" && runState === "running" && !browserResult && (
                                <LoadingState text="Running browser..." />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL — desktop only, collapsible ── */}
            {hasOutput && (
                <aside className={`hidden shrink-0 border-l border-border transition-all lg:block ${rightPanelOpen ? "w-72" : "w-0 overflow-hidden"}`}>
                    <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Details</span>
                            <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="text-muted hover:text-foreground" style={{ minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {rightPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                            </button>
                        </div>
                        {rightPanelOpen && (
                            <div className="flex-1 overflow-y-auto p-3">
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Agent</div>
                                        <div className="mt-1 text-sm font-medium text-foreground">{selectedAgent.label}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Status</div>
                                        <div className={`mt-1 text-sm font-medium ${
                                            runState === "running" ? "text-primary"
                                            : runState === "done" ? "text-success"
                                            : runState === "error" ? "text-error"
                                            : "text-muted"
                                        }`}>
                                            {runState === "running" ? "Running..." : runState === "done" ? "Complete" : runState === "error" ? "Failed" : "Idle"}
                                        </div>
                                    </div>
                                    {steps.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Log</div>
                                            <div className="mt-1 space-y-1">
                                                {steps.map((step) => (
                                                    <div key={step.step} className="flex items-center gap-1.5 text-xs">
                                                        {step.status === "done" ? (
                                                            <CheckCircle2 size={10} className="text-success" />
                                                        ) : step.status === "running" ? (
                                                            <Loader2 size={10} className="animate-spin text-primary" />
                                                        ) : (
                                                            <div className="h-2.5 w-2.5 rounded-full border border-border" />
                                                        )}
                                                        <span className={step.status === "pending" ? "text-muted" : "text-foreground-soft"}>
                                                            {step.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            )}

            {/* ── Bottom Sheet: Agent Selector (mobile) ── */}
            <BottomSheet open={agentSheetOpen} onClose={() => setAgentSheetOpen(false)}>
                <div className="px-4 pb-4 pt-2">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Select Agent</div>
                    <nav className="space-y-1">
                        {AGENTS.map((agent) => {
                            const Icon = agent.icon
                            const isActive = selectedAgent.id === agent.id
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => selectAgent(agent)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-left transition-colors ${
                                        isActive
                                            ? "bg-primary-soft text-foreground"
                                            : "text-foreground-soft active:bg-surface-elevated"
                                    }`}
                                    style={{ minHeight: 52 }}
                                >
                                    <Icon size={18} className={isActive ? "text-primary" : "text-muted"} />
                                    <div>
                                        <div className="text-[15px] font-medium">{agent.label}</div>
                                        <div className="mt-0.5 text-xs text-muted">{agent.description}</div>
                                    </div>
                                    {isActive && <CheckCircle2 size={16} className="ml-auto text-primary" />}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </BottomSheet>
        </div>
    )
}

/* ── Subcomponents ── */

function RunButton({
    runState,
    canRun,
    onClick,
    agent,
}: {
    runState: RunState
    canRun: boolean
    onClick: () => void
    agent: AgentId
}) {
    const labels: Record<AgentId, [React.ReactNode, React.ReactNode]> = {
        coding: [<><Play size={15} /> <span className="hidden sm:inline">Run</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Building</span></>],
        websearch: [<><Search size={15} /> <span className="hidden sm:inline">Search</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Searching</span></>],
        email: [<><PenLine size={15} /> <span className="hidden sm:inline">Draft</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Drafting</span></>],
        github: [<><Github size={15} /> <span className="hidden sm:inline">Open</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Loading</span></>],
        document: [<><FileText size={15} /> <span className="hidden sm:inline">Analyze</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Analyzing</span></>],
        browser: [<><Chrome size={15} /> <span className="hidden sm:inline">Run</span></>, <><Loader2 size={15} className="animate-spin" /> <span className="hidden sm:inline">Running</span></>],
    }

    const [idleLabel, runningLabel] = labels[agent]

    return (
        <button
            onClick={onClick}
            disabled={!canRun || runState === "running"}
            className="button-primary shrink-0 disabled:opacity-40"
            style={{ minWidth: 48 }}
        >
            {runState === "running" ? runningLabel : idleLabel}
        </button>
    )
}

function LoadingState({ text }: { text: string }) {
    return (
        <div className="animate-fade-in mt-6 space-y-3">
            <div className="flex items-center gap-2 text-[13px] text-muted sm:text-xs">
                <Loader2 size={14} className="animate-spin" />
                {text}
            </div>
            <div className="space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-4 w-5/6" />
            </div>
        </div>
    )
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="animate-fade-in mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-3">
            <div className="flex items-start gap-2 text-[13px] text-red-500 sm:text-xs">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{message}</span>
            </div>
            {onRetry && (
                <button onClick={onRetry} className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-red-500 active:opacity-70" style={{ minHeight: 44 }}>
                    <RotateCcw size={13} />
                    Try again
                </button>
            )}
        </div>
    )
}

const mdComponents: Components = {
    h2: ({ children }) => <h2 className="mt-4 border-b border-border pb-1 text-sm font-semibold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mb-2 text-[15px] leading-relaxed text-foreground-soft sm:text-sm">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 space-y-1">{children}</ul>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-[15px] text-foreground-soft sm:text-sm">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
            <span>{children}</span>
        </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
