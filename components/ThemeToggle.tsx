"use client"

import { useEffect, useState } from "react"
import { Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-8 w-8 rounded-lg border border-border" />
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="button-ghost h-8 w-8 rounded-lg p-0"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <SunMedium size={14} /> : <Moon size={14} />}
    </button>
  )
}
