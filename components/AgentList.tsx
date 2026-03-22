"use client"

import { useEffect, useState } from "react"
import AgentCard from "./AgentCard"
import EarningsChart from "./EarningsChart"
import { Agent } from "@/types/agent"

interface AgentListProps {
    agents: Agent[]
    setAgents: React.Dispatch<React.SetStateAction<Agent[]>>
}

export default function AgentList({ agents, setAgents }: AgentListProps) {
    const [result, setResult] = useState("")
    const [balance, setBalance] = useState(0)
    const [activities, setActivities] = useState<string[]>([])
    const [autoMode, setAutoMode] = useState(false)
    const [chartData, setChartData] = useState<any[]>([])

    useEffect(() => {
        if (!autoMode) return

        const interval = setInterval(() => {
            if (agents.length > 0) {
                const idleAgents = agents.filter(a => a.status === "idle")
                const availableAgents = idleAgents.length > 0 ? idleAgents : agents
                const randomAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)]
                runAgent(randomAgent.name, randomAgent.task, randomAgent.reward)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [autoMode, agents])

    const runAgent = async (agentName: string, task: string, reward: number) => {
        // Set agent to running
        setAgents((prevAgents) =>
            prevAgents.map((agent) =>
                agent.name === agentName
                    ? { ...agent, status: "running" }
                    : agent
            )
        )

        try {
            const res = await fetch("/api/runAgent", {
                method: "POST",
                body: JSON.stringify({ task, reward }),
            })

            const data = await res.json()
            const agentResult = data.result?.result || "Task completed"

            setResult(agentResult)
            
            setBalance((prev) => {
                const newBalance = prev + reward
                setChartData((prevChart) => [
                    ...prevChart,
                    {
                        time: new Date().toLocaleTimeString(),
                        earnings: newBalance
                    }
                ])
                return newBalance
            })

            const newActivity = `${agentName} completed "${task}" → ${agentResult} +${reward} pts`
            setActivities((prev) => [newActivity, ...prev])

            // update agent stats back to idle
            setAgents((prevAgents) =>
                prevAgents.map((agent) =>
                    agent.name === agentName
                        ? {
                            ...agent,
                            status: "idle",
                            earnings: agent.earnings + reward,
                            tasksCompleted: agent.tasksCompleted + 1
                        }
                        : agent
                )
            )
        } catch (error) {
            console.error("Failed to run agent:", error)
            setAgents((prevAgents) =>
                prevAgents.map((agent) =>
                    agent.name === agentName
                        ? { ...agent, status: "idle" }
                        : agent
                )
            )
        }
    }

    return (
        <div className="mt-8">
            <div className="mb-6 p-6 border-4 border-border bg-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <h2 className="text-xl font-heading font-black text-foreground uppercase italic tracking-tighter">
                    AGGREGATED_SCORE: <span className="text-success">{balance} pts</span>
                </h2>
            </div>
            <div className="mb-8">
                <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`px-6 py-3 border-4 border-border font-black uppercase italic transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${
                        autoMode ? "bg-error text-white" : "bg-primary text-white"
                    }`}
                >
                    {autoMode ? "TERMINATE_AUTO_MODE" : "INITIATE_AUTO_MODE"}
                </button>
            </div>

            <h2 className="text-2xl font-heading font-black mb-6 uppercase italic tracking-tighter flex items-center gap-3">
                <div className="w-8 h-8 bg-warning border-2 border-border"></div>
                DEPLOYED_ASSETS
            </h2>

            {agents.length === 0 ? (
                <p className="text-gray-500 mb-8 font-black uppercase italic text-xs">NO_ACTIVE_ASSETS_FOUND_IN_BUFFER</p>
            ) : (
                agents.map((agent) => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        runAgent={runAgent}
                    />
                ))
            )}

            {result && (
                <div className="mt-8 p-6 border-4 border-border bg-warning text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <strong className="font-black uppercase italic mr-2">PROTOCOL_OUTPUT:</strong> 
                    <span className="font-black uppercase">{result}</span>
                </div>
            )}

            <div className="mt-12 brutal-card p-6 bg-surface">
                <h2 className="text-2xl font-heading font-black mb-6 uppercase italic tracking-tighter">LOCAL_TX_LOGS</h2>

                {activities.length === 0 ? (
                    <p className="text-gray-500 font-black uppercase italic text-xs">AWAITING_LOCAL_EVENTS...</p>
                ) : (
                    <div className="space-y-3">
                        {activities.map((activity, index) => (
                            <div
                                key={index}
                                className="bg-background border-2 border-border p-3 text-[10px] font-black uppercase italic text-gray-500"
                            >
                                <span className="text-primary mr-2">&gt;</span> {activity}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <EarningsChart data={chartData} />

        </div>
    )
}
