import React from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailySalesSummary } from '../../../../shared/sales'

interface DividendChartProps {
  data: DailySalesSummary[]
  isLoading?: boolean
}

export const DividendChart: React.FC<DividendChartProps> = ({ data, isLoading = false }) => {
  const chartData =
    data.length > 0
      ? data.map((item) => ({ name: item.label, txns: item.transactions }))
      : [{ name: 'No Sales', txns: 0 }]

  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
          Daily Transactions
        </h3>
      </div>
      <div className="h-40 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 0, left: -15, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-card)',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="txns" fill="var(--color-primary)" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
