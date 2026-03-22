"use client"

import { useState } from "react"
import { LogIn, UserPlus, X, Mail, Lock, User } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

type Mode = "login" | "register"

export default function AuthDialog({ isOpen, onClose, initialMode = "login" }: { isOpen: boolean; onClose: () => void; initialMode?: Mode }) {
    const { login, register } = useAuth()
    const [mode, setMode] = useState<Mode>(initialMode)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const submit = () => {
        const result = mode === "login"
            ? login({ email, password })
            : register({ name, email, password })

        if (!result.success) {
            setError(result.error ?? "Authentication failed.")
            return
        }

        setError(null)
        setName("")
        setEmail("")
        setPassword("")
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-primary">
                            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">
                                {mode === "login" ? "Login" : "Register"}
                            </span>
                        </div>
                        <h2 className="text-2xl font-heading font-bold text-foreground">
                            {mode === "login" ? "Access AgentForge" : "Create Your Account"}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            {mode === "login" ? "Sign in with your email and password." : "Set up a Web2 account for your workspace."}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-xl border border-border p-2 text-gray-400 transition-colors hover:text-foreground">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {mode === "register" && (
                        <Field icon={<User size={14} />} value={name} onChange={setName} placeholder="Full name" type="text" />
                    )}
                    <Field icon={<Mail size={14} />} value={email} onChange={setEmail} placeholder="Email address" type="email" />
                    <Field icon={<Lock size={14} />} value={password} onChange={setPassword} placeholder="Password" type="password" />

                    {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>}

                    <button
                        onClick={submit}
                        className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                    >
                        {mode === "login" ? "Login" : "Register"}
                    </button>
                </div>

                <div className="mt-5 text-center text-sm text-gray-500">
                    {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => {
                            setError(null)
                            setMode(mode === "login" ? "register" : "login")
                        }}
                        className="font-bold text-primary"
                    >
                        {mode === "login" ? "Register" : "Login"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function Field({
    icon,
    value,
    onChange,
    placeholder,
    type,
}: {
    icon: React.ReactNode
    value: string
    onChange: (value: string) => void
    placeholder: string
    type: string
}) {
    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
        </div>
    )
}
