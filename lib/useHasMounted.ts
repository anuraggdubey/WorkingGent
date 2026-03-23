"use client"

import { useEffect, useState } from "react"

/**
 * Returns false during SSR and on the very first client render,
 * then true after the component mounts. Use this to gate any
 * rendering that depends on client-only state (auth, theme,
 * localStorage, window, etc.) and prevent hydration mismatches.
 */
export function useHasMounted() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    return mounted
}
