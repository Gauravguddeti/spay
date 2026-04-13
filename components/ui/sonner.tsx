'use client'

import type { CSSProperties } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  const classNames = {
    toast:
      'rounded-none border [background:var(--surface-overlay)] [border-color:var(--border-accent)] text-[var(--text-primary)] shadow-[var(--shadow-md)] [&[data-type=success]]:border-l-[3px] [&[data-type=success]]:border-l-[var(--accent-primary)]',
    title: 'font-medium text-sm',
    description: 'text-xs text-[var(--text-muted)]',
    success: '[&_[data-icon]]:text-[var(--accent-primary)]',
    actionButton: 'rounded-none',
    cancelButton: 'rounded-none',
    ...(props.toastOptions?.classNames ?? {}),
  }

  const toastOptions = {
    ...props.toastOptions,
    classNames,
  }

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={toastOptions}
      style={
        {
          '--normal-bg': 'var(--surface-overlay)',
          '--normal-text': 'var(--text-primary)',
          '--normal-border': 'var(--border-accent)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
