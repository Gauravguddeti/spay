
"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth/client"

export default function LandingPage() {
  const router = useRouter()
  const { data: sessionData } = authClient.useSession()

  useEffect(() => {
    if (sessionData?.user) {
      router.replace("/dashboard")
    }
  }, [router, sessionData?.user])

  useEffect(() => {
    // 1. Cursor blob follower
    const blob = document.getElementById("cursor-blob")
    const handleMouseMove = (e: MouseEvent) => {
      if (blob) {
        blob.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`
      }
    }
    document.addEventListener("mousemove", handleMouseMove)

    // 2. Parallax on scroll
    const handleScroll = () => {
      const scroll = window.pageYOffset

      // Hero parallax text
      document.querySelectorAll<HTMLElement>(".parallax-text").forEach((el) => {
        const speed = el.dataset.speed
        if (speed) {
          el.style.transform = `translateX(${scroll * parseFloat(speed) * 0.1}px)`
        }
      })

      // Hero image parallax + scale
      const heroImg = document.getElementById("hero-img")
      if (heroImg) {
        heroImg.style.transform = `translate(-50%, calc(-50% + ${scroll * 0.2}px)) scale(${1 + scroll * 0.0005})`
      }

      // Floating label drift
      document.querySelectorAll<HTMLElement>(".floating-label").forEach((el, i) => {
        const dir = i % 2 === 0 ? 1 : -1
        el.style.transform = `translateY(${scroll * 0.1 * dir}px)`
      })
    }
    window.addEventListener("scroll", handleScroll)

    // 3. Scroll-reveal (Intersection Observer)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active")
        })
      },
      { threshold: 0.1 },
    )
    document.querySelectorAll(".reveal-text").forEach((el) => observer.observe(el))

    // 4. Smooth anchor scroll
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault()
        const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href")
        if (href) document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
      })
    })

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("scroll", handleScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      className="template-landing"
      style={{ "--landing-accent": "#5a9078" } as React.CSSProperties}
    >
      {/* Cursor blob - green glow, follows mouse, styled in .template-landing .blob */}
      <div className="blob" id="cursor-blob" />

      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <nav>
        <div className="logo">SPAY ©26</div>
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#how-it-works">How It Works</a>
          </li>
          <li>
            <Link href="/login">Log in</Link>
          </li>
        </ul>
      </nav>

      <main>
        {/* ─── HERO ────────────────────────────────────────────────────────── */}
        <section id="hero">
          <Image
            src="/hero-abstract.png"
            alt="Abstract light form"
            className="hero-img"
            id="hero-img"
            width={1800}
            height={1200}
            priority
          />
          <div className="hero-title-container container">
            <span className="huge-type parallax-text" data-speed="-2">
              SPAY
            </span>
          </div>
        </section>

        {/* ─── INTRO ───────────────────────────────────────────────────────── */}
        <section id="about">
          <div className="container">
            <div style={{ maxWidth: "800px" }}>
              <h2 className="about-heading reveal-text">
                <span>STOP PAYING FOR TOOLS YOUR TEAM STOPPED USING.</span>
              </h2>
              <p className="about-copy">
                Every SaaS subscription tracked, every renewal flagged, every rupee defended.
                SPAY gives your team complete visibility over what you&apos;re spending —
                and what you&apos;re wasting.
              </p>
            </div>
          </div>
        </section>

        {/* ─── MARQUEE ─────────────────────────────────────────────────────── */}
        <div className="scrolling-marquee template-landing">
          <div className="marquee-inner">
            <span className="huge-type outline-text">
              TRACK — DETECT — ALERT — CONTROL — VISIBILITY —&nbsp;
            </span>
            <span className="huge-type outline-text">
              TRACK — DETECT — ALERT — CONTROL — VISIBILITY —&nbsp;
            </span>
          </div>
        </div>

        {/* ─── FEATURES ────────────────────────────────────────────────────── */}
        <section id="features" className="container">
          <div className="sticky-type">FEATURES</div>

          {/* Feature 1 — TRACK */}
          <div className="project-row">
            <div className="project-info">
              <span className="project-tag">001 / SUBSCRIPTIONS</span>
              <h3 className="huge-type project-title">TRACK</h3>
              <p>
                All your SaaS tools in one dashboard. Know exactly what your team pays, when
                it renews, and what&apos;s been sitting unused for months.
              </p>
              <div className="divider" />
              <p>POTENTIAL SAVINGS: UP TO 30%</p>
            </div>
            <div className="project-media">
              <Image
                src="https://images.pexels.com/photos/20206391/pexels-photo-20206391.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Analytics dashboard tracking software subscriptions"
                className="project-image"
                width={1200}
                height={800}
                unoptimized
              />
              <div className="floating-label huge-type outline-text label-right">SPEND</div>
            </div>
          </div>

          {/* Feature 2 — DETECT */}
          <div className="project-row reverse-row">
            <div className="project-info">
              <span className="project-tag">002 / GMAIL DETECTION</span>
              <h3 className="huge-type project-title">DETECT</h3>
              <p>
                Connect Gmail and SPAY automatically finds subscriptions buried in
                receipts and invoices. No spreadsheets. No manual entry.
              </p>
              <div className="divider" />
              <p>20+ VENDORS DETECTED AUTOMATICALLY</p>
            </div>
            <div className="project-media">
              <Image
                src="https://images.pexels.com/photos/19435870/pexels-photo-19435870.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Phone and laptop used to review incoming email tools"
                className="project-image"
                width={1200}
                height={800}
                unoptimized
              />
              <div className="floating-label huge-type outline-text label-left">INBOX</div>
            </div>
          </div>

          {/* Feature 3 — ALERT */}
          <div className="project-row">
            <div className="project-info">
              <span className="project-tag">003 / EMAIL ALERTS</span>
              <h3 className="huge-type project-title">ALERT</h3>
              <p>
                Get email digests before every renewal — 30 days, 7 days, or 1 day out.
                Cancel unused tools before the charge hits.
              </p>
              <div className="divider" />
              <p>NEVER SURPRISED BY A CHARGE AGAIN</p>
            </div>
            <div className="project-media">
              <Image
                src="https://images.pexels.com/photos/32944547/pexels-photo-32944547.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Smartphone showing multiple notification alerts"
                className="project-image"
                width={1200}
                height={800}
                unoptimized
              />
              <div className="floating-label huge-type outline-text label-right">ALERT</div>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ──────────────────────── */}
        <section id="how-it-works" className="container">
          <div className="project-row">
            <div className="project-info">
              <span className="project-tag">004 / WORKFLOW</span>
              <h3 className="huge-type project-title">THE FULL PICTURE</h3>
              <p>
                Connect your inbox, review what we find, and import subscriptions in one click.
                Set your alert preferences and walk away — SPAY handles the rest before
                your next billing cycle.
              </p>
              <div className="divider" />
              <p>AUTOMATED RECONCILIATION COMING SOON</p>
            </div>
            <div className="project-media">
              <Image
                src="https://images.pexels.com/photos/12969403/pexels-photo-12969403.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Laptop with spend analytics"
                className="project-image"
                width={1200}
                height={800}
                unoptimized
              />
              <div className="floating-label huge-type outline-text label-right">SYNC</div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
        <footer id="contact">
          <div className="container">
            <div className="footer-cta">
              <Link href="/signup">START FREE</Link>
            </div>
            <div className="divider" />
            <div className="footer-meta">
              <div>© 2026 SPAY</div>
              <div className="footer-links">
                <Link href="/login">LOG IN</Link>
                <a href="mailto:hello@spay.app">CONTACT</a>
                <a href="#features">FEATURES</a>
              </div>
              <div>KNOW WHAT YOU PAY</div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
