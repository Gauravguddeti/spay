import { Check } from "lucide-react"

export default function PricingSection() {
  const features = [
    "500 AI Drafts per month",
    "Standard Tone Library",
    "Gmail Integration",
    "Chrome Extension",
    "7-Day Context History",
  ]

  return (
    <section id="pricing" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ PRICING</span>
          <h2 className="font-serif text-4xl md:text-5xl mt-4 mb-4">
            Write like a founder,
            <br />
            pay like one
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-[#fffef0] px-3 py-1 rounded shadow-sm rotate-[-2deg] border border-amber-100">
              <span className="text-xs font-mono">FOUNDERS_FREE</span>
            </div>
            <p className="text-muted-foreground text-sm">No hidden fees. 14-day free trial</p>
            <div className="bg-[#fffef0] px-3 py-1 rounded shadow-sm rotate-[2deg] border border-amber-100">
              <span className="text-xs font-mono">APPROVED_BUDGET</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[1, 2, 3].map((tier) => (
            <div
              key={tier}
              className={`bg-card border rounded-2xl p-6 relative ${
                tier === 2 ? "border-primary shadow-lg" : "border-border"
              }`}
            >
              {tier === 2 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-mono px-3 py-1 rounded-full">
                  ◆ MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <span className="text-xs font-mono text-muted-foreground">FREELANCE</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-serif">$19</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">For individuals who need a second pair of eyes.</p>
              </div>

              <div className="space-y-3 mb-6">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-accent-foreground" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-3 rounded-full text-sm font-medium transition-colors ${
                  tier === 2
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                GET STARTED
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
