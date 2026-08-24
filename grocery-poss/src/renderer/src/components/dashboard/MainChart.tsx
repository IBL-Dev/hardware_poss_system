import React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
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
    <div className="rounded-lg border border-line bg-white p-6 shadow-md">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 text-[0.9rem] text-muted">Paid Sales Trend (LKR)</div>
          <div className="text-2xl font-bold text-ink">
            {isLoading ? 'Loading...' : formatLkr(totalSales)}
          </div>
        </div>
        <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
          Live sales data
        </span>
      </div>
      <div className="h-[18.75rem] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted">Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-ink)' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-ink)' }}
                dx={-10}
                tickFormatter={(value) => formatLkr(Number(value))}
              />
              <Tooltip
                formatter={(value) => formatLkr(Number(value))}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-card)',
                  boxShadow: 'var(--shadow-md)'
                }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                name="Sales (LKR)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
