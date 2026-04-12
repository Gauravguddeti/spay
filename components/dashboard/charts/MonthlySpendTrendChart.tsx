"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MonthlySpendPoint } from "@/lib/insights/analyzer"

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  })
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const value = Number(payload[0]?.value ?? 0)

  return (
    <div className="rounded-none border border-border/70 bg-card px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatInr(value)}</p>
    </div>
  )
}

type MonthlySpendTrendChartProps = {
  data: MonthlySpendPoint[]
}

export default function MonthlySpendTrendChart({ data }: MonthlySpendTrendChartProps) {
  return (
    <ResponsiveContainer height={220} width="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          dataKey="amountInr"
          dot={{ fill: "var(--primary)", r: 4 }}
          stroke="var(--primary)"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
