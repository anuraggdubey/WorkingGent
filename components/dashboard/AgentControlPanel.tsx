import { Play, Activity, Clock, Cpu, CheckCircle2 } from "lucide-react"
import { Agent } from "@/types/agent"

export default function AgentControlPanel({ agents, runAgent }: { agents: Agent[], runAgent: (name: string, task: string, reward: number) => void }) {
    return (
        <section className="col-span-1 xl:col-span-2 glass-panel rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                        <Cpu className="text-primary" size={20} />
                        Active Agent Microservices
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Deploy, monitor, and run your autonomous workers.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    <span className="text-sm text-gray-400 font-mono">System Online</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-black/10 dark:border-white/10 rounded-xl bg-surface">
                        <Cpu className="text-gray-400 mb-3" size={32} />
                        <p className="text-gray-500 font-medium">No agents deployed</p>
                        <p className="text-sm text-gray-400 mt-1">Use the right panel to instantiate a new AI worker.</p>
                    </div>
                ) : (
                    agents.map((agent) => (
                        <AgentNodeCard 
                            key={agent.id} 
                            agent={agent} 
                            runAgent={runAgent} 
                        />
                    ))
                )}
            </div>
        </section>
    )
}

function AgentNodeCard({ agent, runAgent }: { agent: Agent, runAgent: (n: string, t: string, r: number) => void }) {
    const isRunning = agent.status === "running";

    return (
        <div className={`p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden shadow-sm hover:shadow-md ${
            isRunning 
                ? 'bg-primary/[0.03] border-primary/30' 
                : 'bg-surface border-border hover:border-primary/20'
        }`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                        isRunning ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background border-border text-gray-400'
                    }`}>
                        <Cpu size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground tracking-tight">{agent.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className={`text-[10px] uppercase tracking-widest font-bold ${isRunning ? 'text-amber-500' : 'text-gray-400'}`}>
                                {isRunning ? 'Executing' : 'Standby'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Reward</p>
                    <p className="text-lg font-bold text-primary">
                        {agent.reward} <span className="text-xs text-gray-400 font-medium">pts</span>
                    </p>
                </div>
            </div>

            <div className="bg-background/50 backdrop-blur-sm rounded-xl border border-border p-3 mb-4 relative z-10">
                <p className="text-xs text-gray-500 font-medium truncate">
                    {agent.task}
                </p>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 relative z-10">
                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5" title="Tasks Completed">
                        <CheckCircle2 size={14} className="text-primary/50" /> {agent.tasksCompleted}
                    </span>
                    <span className="flex items-center gap-1.5" title="Total Earned">
                        <Activity size={14} className="text-success/50" /> {agent.earnings}
                    </span>
                </div>

                <button
                    onClick={() => runAgent(agent.name, agent.task, agent.reward)}
                    disabled={isRunning}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                        isRunning 
                            ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed' 
                            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                    <Play size={12} className={isRunning ? '' : 'fill-current'} />
                    {isRunning ? 'Busy' : 'Run'}
                </button>
            </div>
        </div>
    )
}
