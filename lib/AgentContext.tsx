"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { v4 as uuidv4 } from "uuid"
import { Agent } from "@/types/agent"

export interface ActivityLog {
    id: string
    type: "system" | "execution" | "transfer"
    agent: string
    message: string
    reward: number | null
    time: string
    status: "success" | "info" | "error" | "warning"
}

export interface ChartDataPoint {
    time: string
    earnings: number
}

interface AgentContextType {
    agents: Agent[]
    activities: ActivityLog[]
    chartData: ChartDataPoint[]
    balance: number
    isHydrated: boolean
    autoMode: boolean
    setAutoMode: (mode: boolean) => void
    handleAgentCreated: (agent: Agent) => void
    runAgent: (agentName: string, task: string, reward: number) => Promise<void>
    updateAgent: (id: string, updates: Partial<Pick<Agent, "name" | "task" | "reward">>) => void
    startAgentRun: (agentId: string, detail: string) => void
    completeAgentRun: (agentId: string, detail: string, reward?: number) => void
    failAgentRun: (agentId: string, detail: string) => void
    logAgentEvent: (
        agentId: string,
        detail: string,
        options?: {
            status?: ActivityLog["status"]
            type?: ActivityLog["type"]
            reward?: number | null
        }
    ) => void
}

const STORAGE_KEYS = {
    agents: "agentforge_platform_agents_v2",
    activities: "agentforge_platform_activities_v2",
    chartData: "agentforge_platform_chart_v2",
    autoMode: "agentforge_platform_auto_v2",
}

const PLATFORM_AGENTS: Agent[] = [
    {
        id: "coding",
        name: "Coding Agent",
        task: "Generates project files and previews through backend file and preview tools.",
        reward: 4,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
    {
        id: "websearch",
        name: "Web Search Agent",
        task: "Fetches live search results with SerpAPI and summarizes only fetched evidence.",
        reward: 3,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
    {
        id: "email",
        name: "Email Agent",
        task: "Drafts outbound emails and sends only after explicit approval.",
        reward: 2,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
    {
        id: "github",
        name: "GitHub Agent",
        task: "Connects to GitHub, indexes repository context, and analyzes real code.",
        reward: 5,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
    {
        id: "document",
        name: "Document Agent",
        task: "Uploads documents, parses supported files on the backend, and returns clean analysis.",
        reward: 3,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
    {
        id: "browser",
        name: "Browser Automation Agent",
        task: "Plans safe browser actions and uses Puppeteer to navigate, click, type, and extract real data.",
        reward: 4,
        earnings: 0,
        tasksCompleted: 0,
        status: "idle",
    },
]

const AgentContext = createContext<AgentContextType | undefined>(undefined)

function getNow() {
    return new Date().toLocaleTimeString("en-US", { hour12: false })
}

function readStorage<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback

    try {
        const raw = window.localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
        return fallback
    }
}

function normalizeAgents(input: Agent[]): Agent[] {
    const byId = new Map(input.map((agent) => [agent.id, agent]))

    return PLATFORM_AGENTS.map((baseAgent) => {
        const saved = byId.get(baseAgent.id)
        if (!saved) return baseAgent

        return {
            ...baseAgent,
            earnings: Number(saved.earnings) || 0,
            tasksCompleted: Number(saved.tasksCompleted) || 0,
            status: saved.status === "running" ? "running" : "idle",
            reward: Number(saved.reward) || baseAgent.reward,
            task: saved.task || baseAgent.task,
        }
    })
}

function createActivity(
    agentName: string,
    message: string,
    type: ActivityLog["type"],
    status: ActivityLog["status"],
    reward: number | null = null
): ActivityLog {
    return {
        id: uuidv4(),
        agent: agentName,
        message,
        type,
        reward,
        status,
        time: getNow(),
    }
}

export function AgentProvider({ children }: { children: ReactNode }) {
    const [agents, setAgents] = useState<Agent[]>(PLATFORM_AGENTS)
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [chartData, setChartData] = useState<ChartDataPoint[]>([])
    const [autoMode, setAutoMode] = useState<boolean>(false)
    const [isHydrated, setIsHydrated] = useState(false)

    const balance = useMemo(
        () => agents.reduce((total, agent) => total + agent.earnings, 0),
        [agents]
    )

    useEffect(() => {
        setAgents(normalizeAgents(readStorage(STORAGE_KEYS.agents, PLATFORM_AGENTS)))
        setActivities(readStorage<ActivityLog[]>(STORAGE_KEYS.activities, []))
        setChartData(readStorage<ChartDataPoint[]>(STORAGE_KEYS.chartData, []))
        setAutoMode(readStorage<boolean>(STORAGE_KEYS.autoMode, false))
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        if (!isHydrated) return
        window.localStorage.setItem(STORAGE_KEYS.agents, JSON.stringify(agents))
    }, [agents, isHydrated])

    useEffect(() => {
        if (!isHydrated) return
        window.localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities))
    }, [activities, isHydrated])

    useEffect(() => {
        if (!isHydrated) return
        window.localStorage.setItem(STORAGE_KEYS.chartData, JSON.stringify(chartData))
    }, [chartData, isHydrated])

    useEffect(() => {
        if (!isHydrated) return
        window.localStorage.setItem(STORAGE_KEYS.autoMode, JSON.stringify(autoMode))
    }, [autoMode, isHydrated])

    const findAgent = useCallback(
        (agentIdOrName: string) =>
            agents.find(
                (agent) =>
                    agent.id === agentIdOrName ||
                    agent.name.toLowerCase() === agentIdOrName.toLowerCase()
            ),
        [agents]
    )

    const appendActivity = useCallback((entry: ActivityLog) => {
        setActivities((prev) => [entry, ...prev].slice(0, 80))
    }, [])

    const logAgentEvent: AgentContextType["logAgentEvent"] = useCallback(
        (agentId, detail, options) => {
            const agent = findAgent(agentId)
            appendActivity(
                createActivity(
                    agent?.name ?? agentId,
                    detail,
                    options?.type ?? "system",
                    options?.status ?? "info",
                    options?.reward ?? null
                )
            )
        },
        [appendActivity, findAgent]
    )

    const startAgentRun: AgentContextType["startAgentRun"] = useCallback(
        (agentId, detail) => {
            const agent = findAgent(agentId)
            if (!agent) return

            setAgents((prev) =>
                prev.map((entry) =>
                    entry.id === agent.id ? { ...entry, status: "running" } : entry
                )
            )
            appendActivity(createActivity(agent.name, detail, "execution", "info"))
        },
        [appendActivity, findAgent]
    )

    const completeAgentRun: AgentContextType["completeAgentRun"] = useCallback(
        (agentId, detail, reward) => {
            const agent = findAgent(agentId)
            if (!agent) return

            const score = reward ?? agent.reward

            setAgents((prev) =>
                prev.map((entry) =>
                    entry.id === agent.id
                        ? {
                            ...entry,
                            status: "idle",
                            earnings: entry.earnings + score,
                            tasksCompleted: entry.tasksCompleted + 1,
                        }
                        : entry
                )
            )

            setChartData((prev) => [
                ...prev,
                {
                    time: getNow(),
                    earnings: (prev[prev.length - 1]?.earnings ?? balance) + score,
                },
            ].slice(-24))

            appendActivity(createActivity(agent.name, detail, "execution", "success", score))
        },
        [appendActivity, balance, findAgent]
    )

    const failAgentRun: AgentContextType["failAgentRun"] = useCallback(
        (agentId, detail) => {
            const agent = findAgent(agentId)
            if (!agent) return

            setAgents((prev) =>
                prev.map((entry) =>
                    entry.id === agent.id ? { ...entry, status: "idle" } : entry
                )
            )
            appendActivity(createActivity(agent.name, detail, "execution", "error"))
        },
        [appendActivity, findAgent]
    )

    const handleAgentCreated = useCallback((agent: Agent) => {
        appendActivity(
            createActivity(
                "System",
                `Custom agent creation is disabled. ${agent.name} was not added to the workspace.`,
                "system",
                "warning"
            )
        )
    }, [appendActivity])

    const updateAgent: AgentContextType["updateAgent"] = useCallback((id, updates) => {
        setAgents((prev) =>
            prev.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent))
        )
    }, [])

    const runAgent: AgentContextType["runAgent"] = useCallback(
        async (agentName, task, reward) => {
            const agent = findAgent(agentName)
            if (!agent) return

            startAgentRun(agent.id, `Started task: ${task}`)

            try {
                const res = await fetch("/api/runAgent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task, reward }),
                })

                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data.error ?? "Agent execution failed")
                }

                const resultMsg = data.result?.result || "Task completed"
                completeAgentRun(agent.id, resultMsg, reward)
            } catch (error) {
                failAgentRun(
                    agent.id,
                    error instanceof Error ? error.message : "Agent execution failed"
                )
            }
        },
        [completeAgentRun, failAgentRun, findAgent, startAgentRun]
    )

    return (
        <AgentContext.Provider
            value={{
                agents,
                activities,
                chartData,
                balance,
                isHydrated,
                autoMode,
                setAutoMode,
                handleAgentCreated,
                runAgent,
                updateAgent,
                startAgentRun,
                completeAgentRun,
                failAgentRun,
                logAgentEvent,
            }}
        >
            {children}
        </AgentContext.Provider>
    )
}

export function useAgentContext() {
    const context = useContext(AgentContext)
    if (context === undefined) {
        throw new Error("useAgentContext must be used within an AgentProvider")
    }
    return context
}
