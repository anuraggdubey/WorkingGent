"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import {
    AtSign,
    AlertCircle,
    Braces,
    Check,
    CheckCircle2,
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
    Loader2,
    Mail,
    PenLine,
    Play,
    RefreshCw,
    Search,
    Send,
    Upload,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useAgentContext } from "@/lib/AgentContext"

const GitHubAgent = dynamic(() => import("@/components/agents/GitHubAgent"), {
    ssr: false,
    loading: () => (
        <div className="panel p-6">
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
        label: "Coding Agent",
        icon: Code2,
        description: "Generate projects, save files to disk, preview them, and package downloads.",
        placeholder: "Build a launch page for a boutique product studio with smooth sections and a signup CTA.",
    },
    {
        id: "websearch",
        label: "Web Search Agent",
        icon: Search,
        description: "Fetch live results first, then summarize only what was retrieved.",
        placeholder: "Summarize the latest AI developer tooling news and list the original sources.",
    },
    {
        id: "email",
        label: "Email Agent",
        icon: Mail,
        description: "Draft email content first, then send only after explicit approval.",
        placeholder: "Describe the email you want to send.",
    },
    {
        id: "github",
        label: "GitHub Agent",
        icon: Github,
        description: "Connect a GitHub account, select a repository, then analyze real code.",
        placeholder: "Review the auth architecture and suggest the fastest fixes.",
    },
    {
        id: "document",
        label: "Document Agent",
        icon: FileText,
        description: "Upload PDFs, spreadsheets, CSVs, JSON, or text files and get summaries, insights, and answers.",
        placeholder: "Ask a question about the uploaded file.",
    },
    {
        id: "browser",
        label: "Browser Automation Agent",
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

const EXAMPLES = {
    coding: [
        "Build a pricing page for a premium developer tool",
        "Create a portfolio site with a bold hero and project case studies",
        "Make a minimal todo app with categories and filters",
    ],
    websearch: [
        "Summarize the latest model releases for coding assistants",
        "What changed recently in the AI browser market?",
        "Find current news about developer productivity tools",
    ],
    email: [
        "Follow up after a design interview and share continued interest",
        "Request a project kickoff meeting with a client",
        "Write a concise weekly project status update",
    ],
    document: [
        "Summarize this report and list the biggest takeaways",
        "What risks or anomalies are visible in this spreadsheet?",
        "Extract the key metrics and explain what they mean",
    ],
    browser: [
        "Open https://news.ycombinator.com and extract the first 10 headlines",
        "Open https://example.com and capture the main hero text",
        "Open https://vercel.com/pricing and extract the plan names",
    ],
} as const

function getErrorMessage(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback
    if (message.includes("429 Provider returned error")) {
        return "OpenRouter is rate-limiting the upstream model right now. Add credits or switch to a paid-capable model if this persists."
    }
    return message
}

export default function AgentsPage() {
    const { startAgentRun, completeAgentRun, failAgentRun, logAgentEvent } = useAgentContext()
    const [selectedAgent, setSelectedAgent] = useState<AgentDef>(AGENTS[0])
    const [runState, setRunState] = useState<RunState>("idle")
    const [error, setError] = useState<string | null>(null)
    const [steps, setSteps] = useState<AgentStep[]>([])

    const [prompt, setPrompt] = useState("")
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

    const runCodingAgent = async () => {
        setRunState("running")
        setError(null)
        setFiles(null)
        setProjectId(null)
        setSteps(initSteps(CODING_STEPS))
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
                body: JSON.stringify({ prompt }),
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
            setFiles(data.files)
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

    return (
        <div className="space-y-6">
            <section className="grid-bento lg:grid-cols-[minmax(0,1.2fr)_360px]">
                <div className="panel-strong p-6 sm:p-8">
                    <div className="eyebrow">Workspace</div>
                    <h1 className="page-title mt-3">One command surface, six live agents.</h1>
                    <p className="page-copy mt-4">
                        Pick an agent, enter the task, and review results in the same place without hopping through extra setup panels.
                    </p>
                </div>
                <div className="panel p-5 sm:p-6">
                    <div className="eyebrow">Selected flow</div>
                    <div className="mt-4 text-2xl font-heading font-semibold tracking-[-0.04em] text-foreground">
                        {selectedAgent.label}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-subtle">{selectedAgent.description}</p>
                </div>
            </section>

            <section className="panel-strong p-4 sm:p-5">
                <div className="eyebrow">Command card</div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {AGENTS.map((agent) => (
                        <button
                            key={agent.id}
                            onClick={() => selectAgent(agent)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                                selectedAgent.id === agent.id
                                    ? "bg-[color:var(--primary-soft)] text-foreground"
                                    : "bg-background/72 text-subtle hover:text-foreground"
                            }`}
                        >
                            <agent.icon size={16} />
                            {agent.label}
                        </button>
                    ))}
                </div>

                <div className={`mt-5 grid gap-4 ${
                    selectedAgent.id === "email"
                        ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                        : selectedAgent.id === "document"
                            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                            : "lg:grid-cols-[minmax(0,1fr)_auto]"
                }`}>
                    {selectedAgent.id === "email" ? (
                        <>
                            <div className="input-shell px-4 py-4">
                                <label className="eyebrow block">Recipient</label>
                                <div className="mt-3 flex items-center gap-3">
                                    <AtSign size={16} className="text-muted" />
                                    <input
                                        type="email"
                                        value={emailTo}
                                        onChange={(event) => setEmailTo(event.target.value)}
                                        placeholder="someone@example.com"
                                        disabled={runState === "running"}
                                        className="w-full bg-transparent text-base text-foreground placeholder:text-muted"
                                    />
                                </div>
                            </div>
                            <div className="input-shell px-4 py-4">
                                <label className="eyebrow block">Subject</label>
                                <input
                                    value={emailSubject}
                                    onChange={(event) => setEmailSubject(event.target.value)}
                                    placeholder="Optional subject line"
                                    disabled={runState === "running"}
                                    className="mt-3 w-full bg-transparent text-base text-foreground placeholder:text-muted"
                                />
                            </div>
                            <RunButton runState={runState} canRun={!!canRunEmail} onClick={runAgent} agent="email" />
                        </>
                    ) : selectedAgent.id === "document" ? (
                        <>
                            <label className="input-shell flex cursor-pointer items-center gap-4 px-5 py-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                                    <Upload size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-foreground">
                                        {documentFile ? documentFile.name : "Upload a document"}
                                    </div>
                                    <div className="mt-1 text-sm text-subtle">
                                        PDF, Excel, CSV, JSON, and TXT are supported.
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf,.xlsx,.xls,.csv,.json,.txt"
                                    onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                                    disabled={runState === "running"}
                                    className="hidden"
                                />
                            </label>
                            <div className="input-shell px-4 py-4">
                                <label className="eyebrow block">Question</label>
                                <input
                                    value={documentQuestion}
                                    onChange={(event) => setDocumentQuestion(event.target.value)}
                                    placeholder={selectedAgent.placeholder}
                                    disabled={runState === "running"}
                                    className="mt-3 w-full bg-transparent text-base text-foreground placeholder:text-muted"
                                />
                            </div>
                            <RunButton runState={runState} canRun={!!canRunDocument} onClick={runAgent} agent="document" />
                        </>
                    ) : selectedAgent.id === "github" ? (
                        <div className="panel-subtle col-span-full px-5 py-5">
                            <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">GitHub workflow</div>
                            <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
                                Connect GitHub manually, choose a repository, index it, then prompt against the real codebase in the dedicated analysis panel below.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {["Connect account", "Select repository", "Index repository", "Run prompt"].map((item) => (
                                    <span key={item} className="rounded-full bg-background/70 px-3 py-2 text-sm text-subtle">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : selectedAgent.id === "browser" ? (
                        <>
                            <div className="input-shell flex items-center gap-4 px-5 py-4">
                                <selectedAgent.icon size={18} className="text-primary" />
                                <input
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && void runAgent()}
                                    placeholder={selectedAgent.placeholder}
                                    disabled={runState === "running"}
                                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted"
                                />
                            </div>
                            <RunButton runState={runState} canRun={!!canRun} onClick={runAgent} agent={selectedAgent.id} />
                        </>
                    ) : (
                        <>
                            <div className="input-shell flex items-center gap-4 px-5 py-4">
                                <selectedAgent.icon size={18} className="text-primary" />
                                <input
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && void runAgent()}
                                    placeholder={selectedAgent.placeholder}
                                    disabled={runState === "running"}
                                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted"
                                />
                            </div>
                            <RunButton runState={runState} canRun={!!canRun} onClick={runAgent} agent={selectedAgent.id} />
                        </>
                    )}
                </div>
            </section>

            {selectedAgent.id === "email" && (
                <section className="panel p-5 sm:p-6">
                    <div className="eyebrow">Email context</div>
                    <textarea
                        value={emailContext}
                        onChange={(event) => setEmailContext(event.target.value)}
                        placeholder="Describe the goal, tone, and details the email should include."
                        disabled={runState === "running"}
                        rows={4}
                        className="mt-4 w-full rounded-[24px] border border-border bg-background/70 px-4 py-4 text-base text-foreground placeholder:text-muted"
                    />
                </section>
            )}

            <div className={`transition-all duration-300 ${runState === "idle" && selectedAgent.id !== "github" ? "pointer-events-none translate-y-3 opacity-0" : "opacity-100"}`}>
                {selectedAgent.id === "coding" && (
                    <div className="grid-bento xl:grid-cols-[320px_minmax(0,1fr)]">
                        <StepsPanel steps={steps} runState={runState} error={error}>
                            {runState === "done" && projectId && (
                                <a href={`/api/download/${projectId}`} download className="button-secondary mt-5 w-full">
                                    <Download size={16} />
                                    Download project
                                </a>
                            )}
                        </StepsPanel>

                        <div className="panel overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                {([
                                    { id: "preview", label: "Preview", icon: Eye },
                                    { id: "html", label: "index.html", icon: FileCode },
                                    { id: "css", label: "style.css", icon: FileType },
                                    { id: "js", label: "script.js", icon: Braces },
                                ] as const).map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all ${
                                            activeTab === tab.id ? "bg-[color:var(--primary-soft)] text-foreground" : "text-subtle"
                                        }`}
                                    >
                                        <tab.icon size={15} />
                                        {tab.label}
                                    </button>
                                ))}
                                {activeTab !== "preview" && files && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(fileContent(activeTab as "html" | "css" | "js"))
                                            setCopied(activeTab)
                                            setTimeout(() => setCopied(null), 1800)
                                        }}
                                        className="button-ghost ml-auto"
                                    >
                                        {copied === activeTab ? <Check size={14} /> : <Copy size={14} />}
                                        {copied === activeTab ? "Copied" : "Copy"}
                                    </button>
                                )}
                            </div>
                            <div className="min-h-[500px]">
                                {activeTab === "preview" ? (
                                    runState === "done" && projectId ? (
                                        <iframe
                                            src={`/api/preview/${projectId}`}
                                            className="h-[620px] w-full border-0"
                                            sandbox="allow-scripts allow-same-origin"
                                            title="Preview"
                                        />
                                    ) : (
                                        <CenteredMsg loading={runState === "running"} title="Generated preview appears here." />
                                    )
                                ) : (
                                    <div className="h-[620px] overflow-auto bg-[#0d1117] p-6 text-sm text-gray-300">
                                        {files ? <pre className="whitespace-pre-wrap">{fileContent(activeTab as "html" | "css" | "js")}</pre> : "Run the coding agent to generate files."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedAgent.id === "websearch" && (
                    <div className="grid-bento xl:grid-cols-[320px_minmax(0,1fr)]">
                        <StepsPanel steps={steps} runState={runState} error={error} />
                        <div className="panel p-5 sm:p-6">
                            <div className="eyebrow">Live search result</div>
                            {runState === "running" && !searchResult && <CenteredMsg loading title="Fetching sources and preparing summary." />}
                            {runState === "error" && error && <ErrorBox message={error} />}
                            {searchResult && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-sm text-subtle">
                                        <Globe size={16} className="text-primary" />
                                        Results for {searchResult.query}
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown components={mdComponents}>{searchResult.result}</ReactMarkdown>
                                    </div>
                                    <div className="space-y-3">
                                        {searchResult.sources.map((source) => (
                                            <a
                                                key={source.link}
                                                href={source.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="panel-subtle block px-4 py-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-foreground">{source.title}</div>
                                                        <div className="mt-2 text-sm leading-7 text-subtle">{source.snippet}</div>
                                                    </div>
                                                    <ExternalLink size={14} className="mt-1 text-muted" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {selectedAgent.id === "document" && (
                    <div className="grid-bento xl:grid-cols-[320px_minmax(0,1fr)]">
                        <StepsPanel steps={steps} runState={runState} error={error}>
                            {documentFile && (
                                <div className="panel-subtle mt-5 px-4 py-4">
                                    <div className="eyebrow">Uploaded file</div>
                                    <div className="mt-3 text-sm font-medium text-foreground">{documentFile.name}</div>
                                </div>
                            )}
                        </StepsPanel>
                        <div className="panel p-5 sm:p-6">
                            {runState === "running" && !documentResult && <CenteredMsg loading title="Parsing the document and preparing analysis." />}
                            {documentResult && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">File</div>
                                            <div className="mt-3 text-sm font-medium text-foreground">{documentResult.fileName}</div>
                                        </div>
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">Detected type</div>
                                            <div className="mt-3 text-sm font-medium uppercase text-foreground">{documentResult.fileType}</div>
                                        </div>
                                    </div>
                                    {documentResult.truncated && (
                                        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-600 dark:text-amber-300">
                                            Large file detected. Content was trimmed before analysis so the response stays focused.
                                        </div>
                                    )}
                                    <div className="panel-subtle px-5 py-5">
                                        <div className="eyebrow">Analysis</div>
                                        <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
                                            <ReactMarkdown components={mdComponents}>{documentResult.analysis}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {runState === "error" && error && <ErrorBox message={error} />}
                        </div>
                    </div>
                )}

                {selectedAgent.id === "browser" && (
                    <div className="grid-bento xl:grid-cols-[320px_minmax(0,1fr)]">
                        <StepsPanel steps={steps} runState={runState} error={error} />
                        <div className="panel p-5 sm:p-6">
                            <div className="eyebrow">Browser result</div>
                            {runState === "running" && !browserResult && <CenteredMsg loading title="Planning steps and running Puppeteer." />}
                            {runState === "error" && error && <ErrorBox message={error} />}
                            {browserResult && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">Final URL</div>
                                            <div className="mt-3 break-all text-sm font-medium text-foreground">{browserResult.finalUrl}</div>
                                        </div>
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">Expected result</div>
                                            <div className="mt-3 text-sm font-medium text-foreground">{browserResult.expectedResult}</div>
                                        </div>
                                    </div>

                                    <div className="panel-subtle px-5 py-5">
                                        <div className="eyebrow">Planned steps</div>
                                        <div className="mt-4 space-y-2">
                                            {browserResult.steps.map((step) => (
                                                <div key={step} className="text-sm leading-6 text-foreground">{step}</div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="panel-subtle px-5 py-5">
                                        <div className="eyebrow">Execution log</div>
                                        <div className="mt-4 space-y-2">
                                            {browserResult.results.map((result) => (
                                                <div key={result} className="text-sm leading-6 text-subtle">{result}</div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="panel-subtle px-5 py-5">
                                        <div className="eyebrow">Extracted data</div>
                                        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">
                                            {browserResult.extractedText || "No text was extracted."}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {selectedAgent.id === "github" && <GitHubAgent />}
                {selectedAgent.id === "email" && (
                    <div className="grid-bento xl:grid-cols-[320px_minmax(0,1fr)]">
                        <StepsPanel steps={steps} runState={runState} error={error} />
                        <div className="panel p-5 sm:p-6">
                            {runState === "running" && !generatedEmail && <CenteredMsg loading title="Drafting the email." />}
                            {generatedEmail && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">To</div>
                                            <div className="mt-3 text-sm font-medium text-foreground">{emailTo}</div>
                                        </div>
                                        <div className="panel-subtle px-4 py-4">
                                            <div className="eyebrow">Subject</div>
                                            <div className="mt-3 text-sm font-medium text-foreground">{generatedEmail.subject}</div>
                                        </div>
                                    </div>
                                    <div className="panel-subtle px-5 py-5">
                                        <div className="eyebrow">Draft</div>
                                        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">
                                            {generatedEmail.body}
                                        </div>
                                    </div>
                                    {emailSendState === "sent" && (
                                        <div className="rounded-[24px] bg-emerald-500/10 px-4 py-4 text-sm text-success">{emailSentMsg}</div>
                                    )}
                                    {emailSendState === "error" && <ErrorBox message={emailSentMsg} />}
                                    {emailSendState !== "sent" && (
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <button onClick={sendEmail} disabled={emailSendState === "sending"} className="button-primary flex-1">
                                                {emailSendState === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                Approve and send
                                            </button>
                                            <button onClick={runEmailAgent} className="button-secondary">
                                                <RefreshCw size={16} />
                                                Regenerate
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {runState === "error" && error && <ErrorBox message={error} />}
                        </div>
                    </div>
                )}
            </div>

            {runState === "idle" && selectedAgent.id !== "github" && (
                <section className="panel p-6 text-center sm:p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[color:var(--primary-soft)] text-primary">
                        <selectedAgent.icon size={28} />
                    </div>
                    <h2 className="mt-5 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
                        {selectedAgent.label} is ready
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-subtle">
                        Use the command card above to describe the task in natural language. The workspace adapts to the selected agent instead of sending you through separate setup screens.
                    </p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {EXAMPLES[selectedAgent.id as "coding" | "websearch" | "email" | "document" | "browser"].map((example) => (
                            <button
                                key={example}
                                onClick={() => (
                                    selectedAgent.id === "email"
                                        ? setEmailContext(example)
                                        : selectedAgent.id === "document"
                                            ? setDocumentQuestion(example)
                                            : setPrompt(example)
                                )}
                                className="panel-subtle px-4 py-3 text-left text-sm text-subtle transition-colors hover:text-foreground"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

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
        coding: [<><Play size={16} /> Run</>, <><Loader2 size={16} className="animate-spin" /> Building</>],
        websearch: [<><Search size={16} /> Search</>, <><Loader2 size={16} className="animate-spin" /> Searching</>],
        email: [<><PenLine size={16} /> Draft</>, <><Loader2 size={16} className="animate-spin" /> Drafting</>],
        github: [<><Github size={16} /> Open</>, <><Loader2 size={16} className="animate-spin" /> Loading</>],
        document: [<><FileText size={16} /> Analyze</>, <><Loader2 size={16} className="animate-spin" /> Analyzing</>],
        browser: [<><Chrome size={16} /> Run</>, <><Loader2 size={16} className="animate-spin" /> Running</>],
    }

    const [idleLabel, runningLabel] = labels[agent]

    return (
        <button onClick={onClick} disabled={!canRun || runState === "running"} className="button-primary min-h-[56px] min-w-[140px] disabled:opacity-50">
            {runState === "running" ? runningLabel : idleLabel}
        </button>
    )
}

function StepsPanel({
    steps,
    runState,
    error,
    children,
}: {
    steps: AgentStep[]
    runState: RunState
    error: string | null
    children?: React.ReactNode
}) {
    return (
        <div className="panel p-5 sm:p-6">
            <div className="eyebrow">Execution log</div>
            <div className="mt-5 space-y-3">
                {steps.map((step) => (
                    <div key={step.step} className="panel-subtle px-4 py-4">
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${
                                step.status === "done"
                                    ? "bg-[color:var(--primary-soft)] text-primary"
                                    : step.status === "running"
                                        ? "bg-[color:var(--primary-soft)] text-primary"
                                        : "bg-background/70 text-muted"
                            }`}>
                                {step.status === "done" ? <CheckCircle2 size={16} /> : step.status === "running" ? <Loader2 size={16} className="animate-spin" /> : <span className="text-xs font-semibold">{step.step}</span>}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-foreground">{step.title}</div>
                                {step.status !== "pending" && <div className="mt-1 text-sm leading-7 text-subtle">{step.detail}</div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {runState === "error" && error && <ErrorBox message={error} />}
            {children}
        </div>
    )
}

function CenteredMsg({ title, loading = false }: { title: string; loading?: boolean }) {
    return (
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 text-center">
            {loading ? <div className="skeleton h-14 w-14 rounded-full" /> : <div className="h-14 w-14 rounded-full bg-[color:var(--primary-soft)]" />}
            <p className="text-sm font-medium text-subtle">{title}</p>
        </div>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="mt-5 rounded-[24px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm leading-7 text-red-400">
            <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-1 shrink-0" />
                <span>{message}</span>
            </div>
        </div>
    )
}

const mdComponents: Components = {
    h2: ({ children }) => <h2 className="mt-6 border-b border-border pb-2 text-lg font-semibold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 text-base font-semibold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mb-3 text-sm leading-7 text-subtle">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-sm text-subtle">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{children}</span>
        </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
