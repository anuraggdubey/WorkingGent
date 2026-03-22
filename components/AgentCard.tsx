"use client"

interface AgentCardProps {
    agent: any
    runAgent: (name: string, task: string, reward: number) => void
}

export default function AgentCard({ agent, runAgent }: AgentCardProps) {
    return (
        <div className="brutal-card p-6 mb-4 flex justify-between items-center group/card">

            <div>
                <p className="font-black text-xl text-foreground uppercase tracking-tight italic">{agent.name}</p>

                <p className="text-gray-500 text-sm mb-2">{agent.task}</p>

                <p className="text-sm text-gray-500">
                    Reward: {agent.reward} pts
                </p>

                <p className="text-sm text-gray-500">
                    Tasks Completed: {agent.tasksCompleted}
                </p>

                <p className="text-sm text-gray-500">
                    Total Earned: {agent.earnings} pts
                </p>

                <p className="text-sm mt-3 font-black uppercase">
                    Status: {agent.status === "running" ? <span className="text-primary animate-pulse">EXECUTING_OPS_</span> : <span className="text-gray-500">SYSTEM_IDLE</span>}
                </p>
            </div>

            <button
                onClick={() => runAgent(agent.name, agent.task, agent.reward)}
                className="bg-primary text-white px-6 py-3 border-2 border-border font-black uppercase italic brutal-btn hover:bg-primary/90 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            >
                RUN_CORE
            </button>

        </div>
    )
}
