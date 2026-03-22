import { Sparkles, Power } from "lucide-react"

export default function AutoModeToggle({ 
    autoMode, 
    setAutoMode 
}: { 
    autoMode: boolean, 
    setAutoMode: (v: boolean) => void 
}) {
    return (
        <section className={`brutal-card transition-all duration-500 relative overflow-hidden group ${
            autoMode 
                ? 'bg-primary shadow-lg shadow-primary/20' 
                : 'bg-surface border-border'
        }`}>
            {/* Subtle glow effect when active */}
            {autoMode && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-indigo-400 to-primary opacity-20 animate-pulse"></div>
            )}

            <div className="p-6 relative z-10 flex items-center justify-between h-full gap-6">
                
                <div className="flex-1">
                    <h2 className={`text-lg font-heading font-bold flex items-center gap-2 mb-1 transition-colors ${autoMode ? 'text-white' : 'text-foreground'}`}>
                        <div className={`p-1 rounded-lg transition-colors ${autoMode ? 'bg-white/20' : 'bg-primary/10'}`}>
                            <Sparkles className={autoMode ? "text-white animate-pulse" : "text-primary"} size={20} />
                        </div>
                        Autonomous Intelligence
                    </h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${autoMode ? 'text-white/80' : 'text-gray-400'}`}>
                        {autoMode 
                            ? "Active: Agents operating at peak autonomy" 
                            : "Standby: Manual oversight required"}
                    </p>
                </div>

                {/* Modern Pill Toggle */}
                <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`relative w-16 h-8 rounded-full transition-all duration-300 flex items-center px-1 group shadow-inner ${
                        autoMode 
                            ? 'bg-white/30' 
                            : 'bg-gray-200 dark:bg-white/10'
                    }`}
                >
                    <div 
                        className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-all duration-300 transform ${
                            autoMode 
                                ? 'translate-x-8 bg-white text-primary' 
                                : 'translate-x-0 bg-white text-gray-400'
                        }`}
                    >
                        <Power size={12} className={autoMode ? "animate-pulse" : ""} />
                    </div>
                </button>

            </div>
        </section>
    )
}
