"use client"

import { Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="button-secondary relative h-11 w-11 rounded-2xl p-0"
      aria-label="Toggle theme"
    >
      <SunMedium className="h-4.5 w-4.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-4.5 w-4.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </button>
  )
}
