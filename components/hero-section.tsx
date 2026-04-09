import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Main hero area */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
              <span>AI-POWERED EMAIL CO-PILOT V2.0</span>
            </div>

            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-balance">
              Emails that
              <br />
              write themselves.
            </h1>

            <p className="text-muted-foreground text-lg max-w-md">One sentence from you. Perfect replies forever.</p>

            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
              Start Typing
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right visual */}
          <div className="relative">
            {/* Interface mockup container */}
            <div className="relative bg-secondary/50 rounded-3xl p-8 border border-border/50">
              {/* Top labels */}
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-4">
                <span>NO.01 — DATA:PILOT_INTERFACE</span>
                <span>SECURE_CONNECTION ESTABLISHED</span>
              </div>

              {/* Sticky note */}
              <div className="absolute -left-4 top-20 bg-[#fffef0] p-3 rounded shadow-sm rotate-[-3deg] border border-amber-100 w-36">
                <p className="text-xs font-mono text-foreground/80">CORE_INPUT</p>
                <p className="text-sm font-serif italic mt-1">"No budget til Q2."</p>
              </div>

              {/* Typewriter keyboard */}
              <div className="bg-[#4a5d52] rounded-2xl p-6 my-6 mx-auto max-w-sm">
                <div className="flex justify-between text-[8px] text-white/70 font-mono mb-2 px-2">
                  <span>AUTOMATED DRAFT</span>
                  <span>SENDS_DATE</span>
                </div>
                <div className="text-[10px] text-white/80 font-mono mb-4 px-2">
                  <p>To: Board of Directors</p>
                  <p>Subject: Q2 Financial Planning</p>
                </div>
                <div className="bg-[#3a4a42] rounded-xl p-3">
                  <div className="grid grid-cols-10 gap-1">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => (
                      <div
                        key={key}
                        className="w-5 h-5 bg-[#2a3a32] rounded text-[8px] text-white/60 flex items-center justify-center font-mono"
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-10 gap-1 mt-1">
                    {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => (
                      <div
                        key={key}
                        className="w-5 h-5 bg-[#2a3a32] rounded text-[8px] text-white/60 flex items-center justify-center font-mono"
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-9 gap-1 mt-1 px-2">
                    {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => (
                      <div
                        key={key}
                        className="w-5 h-5 bg-[#2a3a32] rounded text-[8px] text-white/60 flex items-center justify-center font-mono"
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="absolute -right-2 top-32 space-y-2">
                <div className="bg-card border border-border rounded-xl p-3 shadow-sm max-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-secondary rounded-full" />
                    <span className="text-xs font-medium">Adam Ross</span>
                    <span className="text-[10px] text-muted-foreground">BOARD MEMBER</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Hi Sarah,</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 shadow-sm max-w-[200px]">
                  <p className="text-xs text-muted-foreground">
                    Thanks for the update. We understand the Q2 constraints and will revisit...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
