import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailySalesSummary } from '../../../../shared/sales'

interface DividendChartProps {
  data: DailySalesSummary[]
  isLoading?: boolean
}

export const DividendChart: React.FC<DividendChartProps> = ({ data, isLoading = false }) => {
  const chartData =
    data.length > 0
      ? data.map((item) => ({ name: item.label, transactions: item.transactions }))
      : [{ name: 'No Sales', transactions: 0 }]

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[1.05rem] font-semibold">Transactions</h3>
      </div>
      <div className="h-[15.625rem] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted">
            Loading transactions...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barGap={4}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-ink)', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              />
              <Tooltip />
              <Bar
                dataKey="transactions"
                fill="var(--color-primary)"
                radius={[2, 2, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
