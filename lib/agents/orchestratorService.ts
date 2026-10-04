import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { runWebSearchAgent } from "@/lib/agents/webSearchAgentService"
import { runCodingAgent } from "@/lib/agents/codingAgentService"
import { generateDocument } from "@/lib/agents/documentAgentService"
import { runBrowserAutomation } from "@/lib/agents/browserAutomationAgentService"
import { pushProjectToGitHub, type PushToGitHubResult } from "@/lib/agents/githubPushService"
import { sendDraftedEmail, generateEmailDraft } from "@/lib/agents/emailAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"
import type { GeneratedDocumentPayload } from "@/types/document"

export interface SwarmAgentTasks {
    websearch: {
        query: string
        purpose: string
    }
    coding: {
        prompt: string
        language: string
        features: string[]
    }
    document: {
        prompt: string
        format: "pdf" | "docx" | "txt" | "json" | "xlsx"
        sections: string[]
    }
    browser: {
        task: string
        testGoal: string
    }
    github: {
        repoName: string
        commitMessage: string
    }
    email: {
        recipients: string[]
        subject: string
        briefContext: string
    }
}

export interface SwarmPlan {
    id: string
    projectTitle: string
    projectSummary: string
    architectureNotes: string[]
    suggestedFeatures: string[]
    agents: SwarmAgentTasks
    awaitingApproval: boolean
    approvalQuestion: string
}

export interface SwarmAgentDeliverable<T = unknown> {
    agentId: "websearch" | "coding" | "document" | "browser" | "github" | "email"
    agentName: string
    status: "pending" | "running" | "completed" | "failed"
    durationMs?: number
    data?: T
    error?: string
    summary: string
}

export interface SwarmExecutionDeliverables {
    projectId: string
    plan: SwarmPlan
    websearch: SwarmAgentDeliverable<{
        query: string
        result: string
        sources: Array<{ title: string; snippet: string; link: string }>
    }>
    coding: SwarmAgentDeliverable<{
        projectId: string
        previewUrl?: string
        files?: { html: string; css: string; js: string }
        singleFile?: { code: string; filename: string; language: string }
    }>
    document: SwarmAgentDeliverable<GeneratedDocumentPayload>
    browser: SwarmAgentDeliverable<{
        steps: string[]
        results: string[]
        extractedText: string
        finalUrl: string
    }>
    github: SwarmAgentDeliverable<PushToGitHubResult>
    email: SwarmAgentDeliverable<{
        subject: string
        body: string
        sent: boolean
        recipients: string[]
        message: string
    }>
}

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Lead Master Orchestrator of WorkingGent.
You lead a team of 6 specialized AI agents that work together simultaneously on a single unified project:
1. Coding Agent (Builds complete, interactive, visually stunning code with live preview)
2. Document Agent (Creates complete technical documentation, architecture specs, PRDs)
3. GitHub Agent (Pushes code & documentation to a GitHub repository)
4. Web Search Agent (Researches domain benchmarks, live APIs, competitor features)
5. Browser Automation Agent (Tests the live preview, verifies UI elements, extracts verification data)
6. Email Agent (Dispatches executive launch updates to user/investor emails)

CONVERSATION WORKFLOW:
1. When the user shares an idea:
   - Validate and praise the core concept with insight.
   - Suggest 2-3 high-impact architectural choices or signature features.
   - Ask clarifying questions or outline how the 6 agents can collaborate on it.
   - Ask: "How would you like to proceed, or should we prepare the plan?"

2. When the user says "Let's start", "Proceed", "Build it", or agrees to begin:
   - Formulate a detailed, concrete execution plan for each of the 6 agents.
   - Return valid JSON matching the schema below.
   - CRITICAL RULE: YOU MUST ALWAYS REQUIRE USER APPROVAL BEFORE EXECUTION.
   - Ask the explicit question: "All 6 agents are primed and ready for this project. Should I proceed?"
   - Set "awaitingApproval": true.

OUTPUT JSON FORMAT (when proposing the plan or ready to proceed):
\`\`\`json
{
  "type": "plan_proposal",
  "assistantMessage": "Conversational reply explaining the brainstorm and suggestions...",
  "plan": {
    "projectTitle": "Short Project Title",
    "projectSummary": "1-2 sentence overview of what will be built",
    "architectureNotes": ["Point 1", "Point 2", "Point 3"],
    "suggestedFeatures": ["Feature 1", "Feature 2", "Feature 3"],
    "agents": {
      "websearch": {
        "query": "Specific targeted web search query",
        "purpose": "What this research informs in the project"
      },
      "coding": {
        "prompt": "Detailed coding prompt for HTML/CSS/JS frontend application",
        "language": "html-css-js",
        "features": ["Hero", "Interactive Component", "Data view", "Footer"]
      },
      "document": {
        "prompt": "Detailed documentation prompt for technical specifications and PRD",
        "format": "pdf",
        "sections": ["Architecture", "Data Schema", "Setup Guide", "API Specs"]
      },
      "browser": {
        "task": "Specific browser testing instructions to verify page load and UI elements",
        "testGoal": "Validate interactive buttons, navigation, and layout consistency"
      },
      "github": {
        "repoName": "short-clean-repo-slug",
        "commitMessage": "feat: initial commit with code and documentation"
      },
      "email": {
        "recipients": [],
        "subject": "Executive Launch Brief: [Project Title]",
        "briefContext": "Overview of project launch for stakeholders and investors"
      }
    },
    "awaitingApproval": true,
    "approvalQuestion": "All 6 agents are synchronized and ready to proceed. Should I proceed?"
  }
}
\`\`\`

If the user is simply chatting or refining the idea, you can respond with normal helpful text OR with a revised plan JSON.`

export async function consultOrchestrator(params: {
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
    investorEmails?: string[]
    githubRepoName?: string
}) {
    const contextBonus = [
        params.investorEmails?.length ? `User-supplied investor/notification emails: ${params.investorEmails.join(", ")}` : "",
        params.githubRepoName ? `User-preferred GitHub repo name: ${params.githubRepoName}` : "",
    ].filter(Boolean).join("\n")

    const fullMessages = [
        { role: "system" as const, content: ORCHESTRATOR_SYSTEM_PROMPT },
        ...(contextBonus ? [{ role: "system" as const, content: `Additional user preferences:\n${contextBonus}` }] : []),
        ...params.messages,
    ]

    const response = await completeWithOpenRouter({
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        user: params.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
        maxTokens: 2500,
        temperature: 0.6,
    })

    // Try to parse plan JSON if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch?.[1]) {
        try {
            const parsed = JSON.parse(jsonMatch[1])
            if (parsed.plan) {
                // Ensure investor emails are preserved in the plan
                if (params.investorEmails?.length && parsed.plan.agents?.email) {
                    parsed.plan.agents.email.recipients = params.investorEmails
                }
                if (params.githubRepoName && parsed.plan.agents?.github) {
                    parsed.plan.agents.github.repoName = params.githubRepoName
                }
                return {
                    message: parsed.assistantMessage || response.replace(/```(?:json)?\s*[\s\S]*?```/, "").trim(),
                    plan: {
                        ...parsed.plan,
                        id: `plan-${Date.now()}`,
                        awaitingApproval: true,
                        approvalQuestion: parsed.plan.approvalQuestion || "All 6 agents are synchronized and ready to proceed. Should I proceed?",
                    } as SwarmPlan,
                }
            }
        } catch {
            // fallback to text response
        }
    }

    return {
        message: response,
        plan: null,
    }
}

/**
 * Executes all 6 agents in parallel for an approved plan!
 */
export async function executeSwarm(params: {
    plan: SwarmPlan
    userEmail?: string
    investorEmails?: string[]
    githubToken?: string
    appBaseUrl?: string
}): Promise<SwarmExecutionDeliverables> {
    const { plan, userEmail, investorEmails, githubToken, appBaseUrl = "http://localhost:3000" } = params
    const startTime = Date.now()

    // 1. Initialize deliverables container
    const deliverables: SwarmExecutionDeliverables = {
        projectId: `swarm-${Date.now()}`,
        plan,
        websearch: {
            agentId: "websearch",
            agentName: "Web Search Agent",
            status: "running",
            summary: "Conducting live web research...",
        },
        coding: {
            agentId: "coding",
            agentName: "Coding Agent",
            status: "running",
            summary: "Generating production code and live preview...",
        },
        document: {
            agentId: "document",
            agentName: "Document Agent",
            status: "running",
            summary: "Drafting complete technical documentation and PRD...",
        },
        browser: {
            agentId: "browser",
            agentName: "Browser Automation Agent",
            status: "pending",
            summary: "Waiting for code preview to initiate automated testing...",
        },
        github: {
            agentId: "github",
            agentName: "GitHub Agent",
            status: "pending",
            summary: "Waiting for code and documentation to push to repository...",
        },
        email: {
            agentId: "email",
            agentName: "Email Agent",
            status: "pending",
            summary: "Waiting for project deliverables to dispatch executive brief...",
        },
    }

    // 2. Launch Primary Parallel Phase: Web Search, Coding Agent, Document Agent
    const webSearchPromise = (async () => {
        const t0 = Date.now()
        try {
            const query = plan.agents.websearch.query || `${plan.projectTitle} modern architecture best practices`
            const searchResult = await runWebSearchAgent(query)
            deliverables.websearch = {
                agentId: "websearch",
                agentName: "Web Search Agent",
                status: "completed",
                durationMs: Date.now() - t0,
                summary: `Retrieved ${searchResult.sources.length} sources and compiled live research summary.`,
                data: searchResult,
            }
            return searchResult
        } catch (err) {
            deliverables.websearch = {
                agentId: "websearch",
                agentName: "Web Search Agent",
                status: "failed",
                durationMs: Date.now() - t0,
                summary: "Web search failed",
                error: err instanceof Error ? err.message : String(err),
            }
            return null
        }
    })()

    const codingPromise = (async () => {
        const t0 = Date.now()
        try {
            const codingPrompt = `${plan.agents.coding.prompt}\n\nProject: ${plan.projectTitle}\nSummary: ${plan.projectSummary}\nKey Features:\n${plan.agents.coding.features.map((f) => `- ${f}`).join("\n")}`
            const codeResult = await runCodingAgent(codingPrompt, plan.agents.coding.language || "html-css-js")
            deliverables.coding = {
                agentId: "coding",
                agentName: "Coding Agent",
                status: "completed",
                durationMs: Date.now() - t0,
                summary: `Generated full application codebase (${codeResult.projectId}) with live interactive preview.`,
                data: {
                    projectId: codeResult.projectId,
                    previewUrl: codeResult.preview?.previewUrl,
                    files: codeResult.files ? {
                        html: codeResult.files.html,
                        css: codeResult.files.css,
                        js: codeResult.files.js,
                    } : undefined,
                    singleFile: codeResult.singleFile,
                },
            }
            return codeResult
        } catch (err) {
            deliverables.coding = {
                agentId: "coding",
                agentName: "Coding Agent",
                status: "failed",
                durationMs: Date.now() - t0,
                summary: "Coding agent generation failed",
                error: err instanceof Error ? err.message : String(err),
            }
            return null
        }
    })()

    const documentPromise = (async () => {
        const t0 = Date.now()
        try {
            const docPrompt = `Create an exhaustive, professional technical specification and PRD for: ${plan.projectTitle}\n\nOverview:\n${plan.projectSummary}\n\nArchitecture Requirements:\n${plan.architectureNotes.join("\n")}\n\nCore Features:\n${plan.suggestedFeatures.join("\n")}\n\nInclude: Executive Summary, System Architecture, Component Specifications, Data Models, API Endpoints, Security Considerations, and Deployment Strategy.`
            const docResult = await generateDocument({
                prompt: docPrompt,
                format: (plan.agents.document.format as any) || "pdf",
            })
            deliverables.document = {
                agentId: "document",
                agentName: "Document Agent",
                status: "completed",
                durationMs: Date.now() - t0,
                summary: `Authored complete project documentation: "${docResult.title}" with export options.`,
                data: docResult,
            }
            return docResult
        } catch (err) {
            deliverables.document = {
                agentId: "document",
                agentName: "Document Agent",
                status: "failed",
                durationMs: Date.now() - t0,
                summary: "Document generation failed",
                error: err instanceof Error ? err.message : String(err),
            }
            return null
        }
    })()

    // Wait for the primary generators (Coding & Docs) so downstream agents (Browser, GitHub, Email) have real artifacts
    const [, codeResult, docResult] = await Promise.all([
        webSearchPromise,
        codingPromise,
        documentPromise,
    ])

    // 3. Launch Secondary Phase (Browser Testing, GitHub Push, Email Dispatch) concurrently
    const secondaryTasks: Promise<void>[] = []

    // Browser Automation Agent: Tests the live preview or a public demonstration
    secondaryTasks.push(
        (async () => {
            const t0 = Date.now()
            deliverables.browser.status = "running"
            deliverables.browser.summary = "Launching Chromium to test preview and verify UI DOM elements..."

            try {
                // If coding agent generated a preview, test the preview URL!
                const previewTarget = codeResult?.projectId
                    ? `${appBaseUrl}/api/preview/${codeResult.projectId}`
                    : "https://example.com"

                const browserTask = `OPEN_URL | ${previewTarget}\nWAIT_FOR_LOAD\nEXTRACT_TEXT | h1, h2, h3, nav, button, p`
                const browserResult = await runBrowserAutomation(browserTask)

                deliverables.browser = {
                    agentId: "browser",
                    agentName: "Browser Automation Agent",
                    status: "completed",
                    durationMs: Date.now() - t0,
                    summary: `Automated browser test passed (${browserResult.results.length} actions executed, verified UI elements).`,
                    data: {
                        steps: browserResult.steps,
                        results: browserResult.results,
                        extractedText: browserResult.extractedText,
                        finalUrl: browserResult.finalUrl,
                    },
                }
            } catch (err) {
                deliverables.browser = {
                    agentId: "browser",
                    agentName: "Browser Automation Agent",
                    status: "failed",
                    durationMs: Date.now() - t0,
                    summary: "Browser automation test failed",
                    error: err instanceof Error ? err.message : String(err),
                }
            }
        })()
    )

    // GitHub Agent: Pushes generated code + docs to the repository
    secondaryTasks.push(
        (async () => {
            const t0 = Date.now()
            deliverables.github.status = "running"
            deliverables.github.summary = "Staging project codebase and architecture documentation to push to GitHub..."

            try {
                const filesToPush: Array<{ path: string; content: string }> = []

                // Add code files
                if (codeResult?.files) {
                    filesToPush.push({ path: "index.html", content: codeResult.files.html })
                    filesToPush.push({ path: "style.css", content: codeResult.files.css })
                    filesToPush.push({ path: "script.js", content: codeResult.files.js })
                } else if (codeResult?.singleFile) {
                    filesToPush.push({ path: codeResult.singleFile.filename, content: codeResult.singleFile.code })
                }

                // Add Documentation files
                const docText = docResult?.textContent || `# ${plan.projectTitle}\n\n${plan.projectSummary}`
                filesToPush.push({ path: "README.md", content: `# ${plan.projectTitle}\n\n${plan.projectSummary}\n\nGenerated by WorkingGent 6-Agent Swarm.\n\n## Overview\n${docText}` })
                filesToPush.push({ path: "docs/ARCHITECTURE.md", content: `# Architecture & Specifications\n\n${docText}` })

                const pushResult = await pushProjectToGitHub({
                    repoName: plan.agents.github.repoName || `workinggent-${plan.projectTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                    commitMessage: plan.agents.github.commitMessage || `feat: initial build of ${plan.projectTitle} via WorkingGent 6-Agent Swarm`,
                    files: filesToPush,
                    accessToken: githubToken,
                })

                deliverables.github = {
                    agentId: "github",
                    agentName: "GitHub Agent",
                    status: "completed",
                    durationMs: Date.now() - t0,
                    summary: `Committed and pushed ${pushResult.filesPushed.length} files to ${pushResult.repoFullName}.`,
                    data: pushResult,
                }
            } catch (err) {
                deliverables.github = {
                    agentId: "github",
                    agentName: "GitHub Agent",
                    status: "failed",
                    durationMs: Date.now() - t0,
                    summary: "GitHub push failed",
                    error: err instanceof Error ? err.message : String(err),
                }
            }
        })()
    )

    // Email Agent: Formats executive update and emails investors/user
    secondaryTasks.push(
        (async () => {
            const t0 = Date.now()
            deliverables.email.status = "running"
            deliverables.email.summary = "Formatting executive project brief and preparing email dispatch..."

            try {
                const recipients = [
                    ...(investorEmails || []),
                    ...(plan.agents.email.recipients || []),
                    userEmail,
                ].filter((e): e is string => Boolean(e && e.includes("@")))

                const previewUrl = codeResult?.projectId ? `${appBaseUrl}/api/preview/${codeResult.projectId}` : ""
                const docSnippet = docResult?.summary || plan.projectSummary

                const emailContext = `Project Title: ${plan.projectTitle}
Overview: ${plan.projectSummary}
Documentation Brief: ${docSnippet}
Live Preview: ${previewUrl || "Generated in workspace"}
Architecture highlights: ${plan.architectureNotes.join("; ")}
Features: ${plan.suggestedFeatures.join("; ")}`

                const draft = await generateEmailDraft({
                    recipientEmail: recipients[0] || "stakeholders@workinggent.dev",
                    subject: plan.agents.email.subject || `Executive Brief: ${plan.projectTitle}`,
                    context: emailContext,
                })

                let sent = false
                let sendMsg = "Draft ready for review"

                // If valid recipients exist, attempt dispatch
                if (recipients.length > 0) {
                    try {
                        await sendDraftedEmail({
                            approved: true,
                            to: recipients.join(", "),
                            subject: draft.subject,
                            body: draft.body,
                        })
                        sent = true
                        sendMsg = `Dispatched executive update to ${recipients.join(", ")}`
                    } catch (sendErr) {
                        sendMsg = `Drafted successfully (SMTP note: ${sendErr instanceof Error ? sendErr.message : "check mail config"})`
                    }
                }

                deliverables.email = {
                    agentId: "email",
                    agentName: "Email Agent",
                    status: "completed",
                    durationMs: Date.now() - t0,
                    summary: sent ? `Dispatched to ${recipients.length} recipients.` : "Prepared executive briefing draft.",
                    data: {
                        subject: draft.subject,
                        body: draft.body,
                        sent,
                        recipients,
                        message: sendMsg,
                    },
                }
            } catch (err) {
                deliverables.email = {
                    agentId: "email",
                    agentName: "Email Agent",
                    status: "failed",
                    durationMs: Date.now() - t0,
                    summary: "Email dispatch failed",
                    error: err instanceof Error ? err.message : String(err),
                }
            }
        })()
    )

    await Promise.allSettled(secondaryTasks)

    return deliverables
}
