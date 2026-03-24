import type { ReactNode } from "react"
import { Navbar } from "./navbar"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

interface LayoutProps {
  children: ReactNode
  onNavigate: (page: string) => void
  activePage: string
}

export function Layout({ children, onNavigate, activePage }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <Navbar activePage={activePage} onNavigate={onNavigate} />
      <main className="relative">{children}</main>
      <Analytics />
      <SpeedInsights />
      
      {/* Global floating accents */}
      <div className="fixed bottom-10 right-10 w-12 h-12 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-20 pointer-events-none z-0 animate-float hidden lg:block" />
      <div className="fixed top-20 left-10 w-8 h-8 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 opacity-10 pointer-events-none z-0 animate-float hidden lg:block" style={{ animationDelay: "1s" }} />
    </div>
  )
}
