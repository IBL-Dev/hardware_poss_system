import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatLkr } from '../../utils/currency'
import type { DailySalesSummary } from '../../../../shared/sales'

interface MainChartProps {
  data: DailySalesSummary[]
  totalSales: number
  isLoading?: boolean
}

export const MainChart: React.FC<MainChartProps> = ({ data, totalSales, isLoading = false }) => {
  const chartData =
    data.length > 0
      ? data.map((item) => ({ name: item.label, sales: item.total }))
      : [{ name: 'No Sales', sales: 0 }]

  return (
    <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
            Daily Sales Trend
          </h3>
          <div className="mt-1.5 text-xl font-bold text-ink">
            {isLoading ? '—' : `Rs. ${formatLkr(totalSales)}`}
          </div>
        </div>
        <span className="rounded-md border border-success/20 bg-success/8 px-3 py-1.5 text-xs font-semibold text-success">
          Total
        </span>
      </div>
      <div className="h-56 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                dx={-8}
                tickFormatter={(value) => formatLkr(Number(value))}
                width={70}
              />
              <Tooltip
                formatter={(value) => [`Rs. ${formatLkr(Number(value))}`, 'Sales']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-card)',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#salesGradient)"
                name="Sales (LKR)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
