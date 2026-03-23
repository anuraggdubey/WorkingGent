import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { AgentProvider } from "@/lib/AgentContext"
import { ThemeProvider } from "@/components/ThemeProvider"
import { AuthProvider } from "@/lib/AuthContext"
import AppShell from "@/components/layout/AppShell"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  title: "WorkingGent",
  description: "WorkingGent is a calmer control surface for tool-driven work.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} min-h-screen bg-background text-foreground antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <AuthProvider>
              <AgentProvider>
                <AppShell>{children}</AppShell>
              </AgentProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
