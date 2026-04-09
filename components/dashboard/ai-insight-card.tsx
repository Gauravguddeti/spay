"use client"

import { Bot, CheckCircle2, AlertTriangle, Lightbulb, Sparkles } from "lucide-react"
import { type AIInsightMessage } from "@/lib/insights/ai-generator"

export function AIInsightCard({ insight }: { insight: AIInsightMessage }) {
  // Select color themes and icons based on the insight type
  let colorClass = "border-primary/50 bg-primary/10"
  let iconColor = "text-primary"
  let Icon = Sparkles

  if (insight.type === "danger") {
    colorClass = "border-red-500/50 bg-red-500/10"
    iconColor = "text-red-500"
    Icon = AlertTriangle
  } else if (insight.type === "warning") {
    colorClass = "border-amber-500/50 bg-amber-500/10"
    iconColor = "text-amber-500"
    Icon = Lightbulb
  } else if (insight.type === "celebration") {
    colorClass = "border-emerald-500/50 bg-emerald-500/10"
    iconColor = "text-emerald-500"
    Icon = CheckCircle2
  }

  // A helper to render bold text directly inside strings without weird markdown parsers
  // Splitting by ** to bold words 
  const parts = insight.message.split("**")

  return (
    <div className={`rounded-none border px-6 py-5 shadow-none mb-6 relative overflow-hidden ${colorClass}`}>
      {/* Decorative gradient flare behind the bot */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full ${insight.type === 'danger' ? 'bg-red-500' : insight.type === 'warning' ? 'bg-amber-500' : 'bg-primary'}`} />

      <div className="relative z-10 flex gap-4 md:gap-6 items-start">
        <div className={`shrink-0 flex items-center justify-center p-3 sm:p-4 rounded-none border ${colorClass} backdrop-blur-md`}>
          <Bot className={`h-6 w-6 md:h-8 md:w-8 ${iconColor}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`h-3 w-3 ${iconColor}`} />
            <span className={`text-[10px] font-mono uppercase tracking-widest ${iconColor}`}>
              SPAY INSIGHT
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight mb-2 text-foreground">
            {insight.title}
          </h2>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed max-w-3xl">
            {parts.map((part, i) => (
              i % 2 === 1 ? <strong key={i} className={`font-semibold ${iconColor}`}>{part}</strong> : part
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}
