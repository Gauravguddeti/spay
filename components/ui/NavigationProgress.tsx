"use client"

import { useEffect } from "react"
import NProgress from "nprogress"
import { usePathname } from "next/navigation"

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

  useEffect(() => {
    NProgress.start()
    const timer = setTimeout(() => NProgress.done(), 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return <style>{progressStyle}</style>
}
