'use client'

import type { CSSProperties } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  const classNames = {
    toast:
      'rounded-none border border-border/70 bg-card text-card-foreground shadow-sm',
    title: 'font-medium text-sm',
    description: 'text-xs text-muted-foreground',
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
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
