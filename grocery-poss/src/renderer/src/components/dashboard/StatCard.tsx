import React from 'react'

interface StatCardProps {
  title: string
  amount: string
  meta: string
  icon: React.ReactNode
  iconBgColor: string
}

export const StatCard: React.FC<StatCardProps> = ({ title, amount, meta, icon, iconBgColor }) => {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <span className="text-[0.9rem] font-medium text-muted">{title}</span>
          <h3 className="mt-2 break-words text-2xl font-semibold text-ink">{amount}</h3>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[0.9rem] text-muted">{meta}</div>
    </div>
  )
}
