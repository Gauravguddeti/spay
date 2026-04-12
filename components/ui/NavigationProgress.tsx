"use client"

import { useEffect } from "react"
import NProgress from "nprogress"
import { usePathname, useSearchParams } from "next/navigation"

// Inject minimal NProgress styles
const progressStyle = `
  #nprogress { pointer-events: none; }
  #nprogress .bar {
    background: hsl(var(--primary));
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
  }
  #nprogress .peg {
    display: block;
    position: absolute;
    right: 0;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary));
    opacity: 1;
    transform: rotate(3deg) translate(0px, -4px);
  }
`

NProgress.configure({ showSpinner: false })

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Mark completion when the actual route state updates.
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest("a")
      if (!anchor) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return

      const currentPath = `${window.location.pathname}${window.location.search}`
      const nextPath = `${nextUrl.pathname}${nextUrl.search}`
      if (nextPath === currentPath) return

      NProgress.start()
    }

    function handlePopState() {
      NProgress.start()
    }

    document.addEventListener("click", handleDocumentClick, true)
    window.addEventListener("popstate", handlePopState)

    return () => {
      document.removeEventListener("click", handleDocumentClick, true)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [pathname])

  return <style>{progressStyle}</style>
}
