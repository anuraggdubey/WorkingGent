"use client"

import { useState } from "react"
import { ShieldAlert, Plus, LogIn } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

interface CreateAgentProps {
    onAgentCreated: (agent: {
        id: string
        name: string
        task: string
        reward: number
        earnings: number
        tasksCompleted: number
        status: "idle" | "running"
    }) => void
}

export default function CreateAgent({ onAgentCreated }: CreateAgentProps) {
    const { isAuthenticated } = useAuth()
    const [name, setName] = useState("")
    const [task, setTask] = useState("")
    const [reward, setReward] = useState(5)
    const [isDeploying, setIsDeploying] = useState(false)

    const createAgent = async () => {
        if (!name || !task) return

        setIsDeploying(true)
        try {
            const res = await fetch("/api/createAgent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, task, reward }),
            })

            const newAgent = await res.json()
            onAgentCreated(newAgent)

            setName("")
            setTask("")
            setReward(5)
        } finally {
            setIsDeploying(false)
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center p-6 border-2 border-border border-dashed bg-gray-50/50 dark:bg-white/[0.02] rounded-xl h-[105px]">
                <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldAlert className="text-amber-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-foreground font-bold text-sm">Account Required</h3>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
                            Login Or Register To Create Agents
                        </p>
                    </div>
                    <LogIn className="text-gray-400" size={16} />
                </div>
            </div>
        )
    }

    return (
        <div className="p-3 flex gap-4 items-end h-full">
            <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Identifier</label>
                        <input
                            placeholder="e.g. InsightOps_v1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-background border border-border rounded-xl p-2.5 w-full text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Score</label>
                        <input
                            type="number"
                            min="1"
                            value={reward}
                            onChange={(e) => setReward(Number(e.target.value))}
                            className="bg-background border border-border rounded-xl p-2.5 w-full text-sm text-primary font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Task Definition</label>
                    <input
                        placeholder="Define node objective..."
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        className="bg-background border border-border rounded-xl p-2.5 w-full text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            <button
                onClick={createAgent}
                disabled={isDeploying || !name || !task}
                className="h-[105px] w-[105px] bg-primary text-white font-bold uppercase rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 disabled:shadow-none disabled:scale-100 flex flex-col items-center justify-center gap-1 group"
            >
                {isDeploying ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                ) : (
                    <>
                        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="text-[10px] tracking-widest">CREATE</span>
                    </>
                )}
            </button>
        </div>
    )
}
