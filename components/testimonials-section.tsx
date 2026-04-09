export default function TestimonialsSection() {
  const testimonials = [
    {
      id: "ANC-0088",
      quote:
        "I used to dread opening Gmail. Now I watch the cursor move and feel like I hired a dedicated chief of staff. It captures my tone so perfectly it's honestly a little scary.",
      author: "Alex Chen",
      role: "FOUNDER & VESSEL",
    },
    {
      id: "ANC-2301",
      quote:
        "The first AI tool that doesn't sound like AI. It's brief, polite, and ruthlessly efficient. Just how I like it. I saved 14 hours last week.",
      author: "Marcus Otero",
      role: "PARTNER & SEQUOIA",
    },
    {
      id: "ANC-7725",
      quote:
        "Typewriter handles 80% of my inbox before I've had coffee. It's not just a productivity tool, it's a lifestyle change.",
      author: "Sarah Jenkins",
      role: "CEO & LINEAR",
    },
    {
      id: "ANC-0030",
      quote:
        "It knows when to be formal and when to use an emoji. It's like it read my mind before I even typed the prompt.",
      author: "Elena Fisher",
      role: "PRODUCT & NOTION",
    },
    {
      id: "ANC-2134",
      quote: "The minimalist interface is a breath of fresh air. Finally, software that respects my attention span.",
      author: "David Park",
      role: "DIRECTOR & FIGMA",
    },
  ]

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-start justify-between mb-16">
          <div>
            <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ HALL OF FAME</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-4 max-w-md leading-tight">
              Founders who never write alone
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs hidden md:block">
            Uncensored correspondence from the network.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <div key={testimonial.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground">REF</span>
                <span className="text-xs font-mono text-primary">{testimonial.id}</span>
                <div className="w-12 h-12 bg-secondary rounded-lg" />
              </div>
              <p className="text-sm leading-relaxed mb-6">{testimonial.quote}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs font-mono text-muted-foreground">{testimonial.role}</p>
                </div>
                <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                  <span className="text-[8px]">↗</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {testimonials.slice(3, 4).map((testimonial) => (
            <div key={testimonial.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground">REF</span>
                <span className="text-xs font-mono text-primary">{testimonial.id}</span>
                <div className="w-12 h-12 bg-secondary rounded-lg" />
              </div>
              <p className="text-sm leading-relaxed mb-6">{testimonial.quote}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs font-mono text-muted-foreground">{testimonial.role}</p>
                </div>
                <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                  <span className="text-[8px]">↗</span>
                </div>
              </div>
            </div>
          ))}

          {/* Join CTA */}
          <div className="bg-secondary/50 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center mb-3">
              <span className="text-lg">+</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">YOUR STORY HERE</span>
            <p className="text-sm text-muted-foreground mt-1">Join the archive.</p>
          </div>

          {testimonials.slice(4).map((testimonial) => (
            <div key={testimonial.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground">REF</span>
                <span className="text-xs font-mono text-primary">{testimonial.id}</span>
                <div className="w-12 h-12 bg-secondary rounded-lg" />
              </div>
              <p className="text-sm leading-relaxed mb-6">{testimonial.quote}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs font-mono text-muted-foreground">{testimonial.role}</p>
                </div>
                <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                  <span className="text-[8px]">↗</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
