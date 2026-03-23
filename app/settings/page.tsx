"use client"

import { LogOut, UserCircle2 } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useHasMounted } from "@/lib/useHasMounted"

export default function SettingsPage() {
    const { isAuthenticated, user, logout } = useAuth()
    const mounted = useHasMounted()

    return (
        <div className="mx-auto max-w-lg space-y-4">
            <div>
                <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-foreground-soft">Account and preferences</p>
            </div>

            <div className="panel p-4">
                {!mounted ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="skeleton h-10 w-10 rounded-lg" />
                            <div className="space-y-1.5">
                                <div className="skeleton h-4 w-28" />
                                <div className="skeleton h-3 w-40" />
                            </div>
                        </div>
                        <div className="skeleton h-10 w-full rounded-lg" />
                    </div>
                ) : isAuthenticated && user ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                                <UserCircle2 size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-foreground">{user.name}</div>
                                <div className="text-xs text-foreground-soft">{user.email}</div>
                            </div>
                        </div>
                        <button onClick={logout} className="button-secondary w-full">
                            <LogOut size={14} />
                            Logout
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-foreground-soft">
                        No active session. Use the top bar to sign in.
                    </p>
                )}
            </div>
        </div>
    )
}
