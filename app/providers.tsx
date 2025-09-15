"use client"

import { GeistProvider, CssBaseline } from "@geist-ui/core"
import { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GeistProvider>
      <CssBaseline />
      {children}
    </GeistProvider>
  )
}
