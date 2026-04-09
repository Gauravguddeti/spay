import { Check, Lock, Mail, Zap } from "lucide-react"

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-start justify-between mb-16">
          <div>
            <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ SYSTEM_MODULES</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-4 max-w-lg leading-tight">
              Why founders choose Typewriter
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs hidden md:block">
            The tactile precision of 1957 meets the infinite scale of 2025.
          </p>
        </div>

        {/* Top row features */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Tone Control */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">TONE_MODULATION</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-card rounded-full px-3 py-1 border border-border">
                  <div className="w-4 h-4 rounded-full bg-foreground" />
                  <div className="w-4 h-4 rounded-full border-2 border-border" />
                </div>
                <div className="flex-1 h-1 bg-border rounded-full">
                  <div className="w-2/3 h-full bg-foreground rounded-full" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">FORMAL</span>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Tone Control</h3>
            <p className="text-sm text-muted-foreground">
              Switch modes instantly, from casual Slack replies to boardroom formal.
            </p>
          </div>

          {/* Works Everywhere */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">CHANNEL_INPUT</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-2">
                {["Gmail", "Outlook", "Slack", "Teams", "Discord", "More"].map((app, i) => (
                  <div
                    key={app}
                    className={`text-center p-2 rounded-lg ${i < 5 ? "bg-card border border-border" : "border border-dashed border-border"}`}
                  >
                    <div className="w-6 h-6 mx-auto mb-1 rounded bg-secondary flex items-center justify-center">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{app}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-[10px] font-mono text-accent-foreground bg-accent px-2 py-0.5 rounded">
                  + MORE
                </span>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Works Everywhere</h3>
            <p className="text-sm text-muted-foreground">Native integrations for Gmail, Outlook, and Superhuman.</p>
          </div>

          {/* Private By Design */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">SECURITY_GRADE</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-accent flex items-center justify-center">
                  <Lock className="w-6 h-6 text-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Private By Design</h3>
            <p className="text-sm text-muted-foreground">
              Enterprise-grade encryption. Your data never trains our models.
            </p>
          </div>
        </div>

        {/* Bottom row features */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Saves Time */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex gap-6">
              <div className="bg-secondary/50 rounded-xl p-4 flex-shrink-0">
                <div className="relative w-20 h-20 rounded-full border-4 border-accent flex items-center justify-center">
                  <Zap className="w-8 h-8 text-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">METRIC</span>
                </div>
                <h3 className="font-semibold text-2xl mb-1">Saves 12h / week</h3>
                <p className="text-sm text-muted-foreground">
                  Reclaim your mornings. Typewriter handles the bulk, so you can focus on the big decisions. Speed
                  without sacrifice.
                </p>
              </div>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">OUTPUT</span>
                </div>
                <h3 className="font-semibold text-2xl mb-1">500+ Emails / Month</h3>
                <p className="text-sm text-muted-foreground">
                  Built for high volume. Whether it's support tickets, outreach, or internal comms, Typewriter never
                  gets tired.
                </p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 flex-shrink-0">
                <div className="flex gap-1">
                  {["5", "0", "0", "+"].map((num, i) => (
                    <div
                      key={i}
                      className="w-8 h-10 bg-card border border-border rounded flex items-center justify-center"
                    >
                      <span className="font-mono text-lg">{num}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
