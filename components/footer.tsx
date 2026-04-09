export default function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 border-2 border-foreground rounded-sm flex items-center justify-center">
                <span className="text-[10px] font-mono">T</span>
              </div>
              <span className="font-serif">Typewriter.</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              AUTOMATED CORRESPONDENCE
              <br />
              SYSTEM V2.0
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-4">◆ ALL SYSTEMS OPERATIONAL</p>
          </div>

          {/* Directory */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-4">DIRECTORY</h4>
            <ul className="space-y-2">
              {["Product_Tour", "Pricing_Index", "Manifesto", "Changelog"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-4">LEGAL</h4>
            <ul className="space-y-2">
              {["Privacy_Policy_v4", "Terms_of_Service", "Security_Whitepaper", "GDPR_Compliance"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocols */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-mono text-muted-foreground mb-4">PROTOCOLS</h4>
            <div className="bg-secondary/50 rounded-xl p-4 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">07:44:30 UTC</span>
              </div>
              <div className="space-y-1">
                <p className="text-primary">US-WEST-2 [ACTIVE]</p>
                <p className="text-muted-foreground">Okay!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">©2025 TYPEWRITER AI INC.</p>
          <p className="text-xs text-muted-foreground">DESIGNED IN CALIFORNIA, ASSEMBLED ON THE CLOUD.</p>
        </div>
      </div>
    </footer>
  )
}
