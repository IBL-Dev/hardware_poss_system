import React from 'react'

interface StatCardProps {
  title: string
  amount: string
  meta: string
  icon: React.ReactNode
  accentColor: string
}

export const StatCard: React.FC<StatCardProps> = ({ title, amount, meta, icon, accentColor }) => {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-line bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <span className="text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
            {title}
          </span>
          <h3 className="mt-2 break-words text-2xl font-bold text-ink">{amount}</h3>
          <p className="mt-1.5 text-[0.8rem] text-muted">{meta}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
