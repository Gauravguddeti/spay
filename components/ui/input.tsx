import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-[var(--text-faint)] selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded-none border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [background:var(--surface-sunken)] [border-color:var(--border-default)]',
        'focus-visible:[border-color:var(--accent-primary)] focus-visible:ring-[3px] focus-visible:ring-[rgba(90,144,120,0.5)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
