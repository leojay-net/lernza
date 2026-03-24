import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { WorkspaceView } from "@/pages/workspace"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"

// ─── Theme Context ─────────────────────────────────────────────────────────────

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getInitialTheme(): Theme {
  // 1. Check persisted preference
  try {
    const stored = localStorage.getItem("lernza-theme")
    if (stored === "dark" || stored === "light") return stored
  } catch (_) {}
  // 2. Fall back to system preference
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } catch (_) {}
  return "light"
}

// ─── Routing ───────────────────────────────────────────────────────────────────

const VALID_PAGES = ["landing", "dashboard", "profile"] as const
type Page = (typeof VALID_PAGES)[number] | "workspace" | "404"

function pathToPage(pathname: string): { page: Page; workspaceId: number | null } {
  const clean = pathname.replace(/\/+$/, "") || "/"
  if (clean === "/") return { page: "landing", workspaceId: null }
  if (clean === "/dashboard") return { page: "dashboard", workspaceId: null }
  if (clean === "/profile") return { page: "profile", workspaceId: null }
  const wsMatch = clean.match(/^\/workspace\/(\d+)$/)
  if (wsMatch) return { page: "workspace", workspaceId: Number(wsMatch[1]) }
  return { page: "404", workspaceId: null }
}

function pageToPath(page: Page, workspaceId: number | null): string {
  if (page === "landing") return "/"
  if (page === "workspace" && workspaceId !== null) return `/workspace/${workspaceId}`
  return `/${page}`
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [state, setState] = useState(() => pathToPage(window.location.pathname))

  // Apply theme class to <html> and persist
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    try {
      localStorage.setItem("lernza-theme", theme)
    } catch (_) {}
  }, [theme])

  // Listen for system preference changes (when no stored preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem("lernza-theme")
        // Only follow system changes if user hasn't explicitly set a preference
        if (!stored) {
          setTheme(e.matches ? "dark" : "light")
        }
      } catch (_) {}
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"))
  }, [])

  useEffect(() => {
    const onPopState = () => setState(pathToPage(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const handleNavigate = useCallback((p: string) => {
    const page = (VALID_PAGES as readonly string[]).includes(p) ? (p as Page) : "404"
    const path = pageToPath(page, null)
    window.history.pushState(null, "", path)
    setState({ page, workspaceId: null })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleSelectWorkspace = useCallback((id: number) => {
    const path = pageToPath("workspace", id)
    window.history.pushState(null, "", path)
    setState({ page: "workspace", workspaceId: id })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const renderPage = () => {
    if (state.page === "workspace" && state.workspaceId !== null) {
      return (
        <WorkspaceView
          workspaceId={state.workspaceId}
          onBack={() => handleNavigate("dashboard")}
        />
      )
    }
    switch (state.page) {
      case "landing":
        return <Landing onNavigate={handleNavigate} />
      case "dashboard":
        return <Dashboard onSelectWorkspace={handleSelectWorkspace} />
      case "profile":
        return <Profile />
      default:
        return <NotFound onNavigate={handleNavigate} />
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar activePage={state.page} onNavigate={handleNavigate} />
        <main>{renderPage()}</main>
        <Analytics />
        <SpeedInsights />
      </div>
    </ThemeContext.Provider>
  )
}

export default App