import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Wallet } from 'lucide-react'
import { formatLkr } from '../../utils/currency'
import type { DailySalesSummary } from '../../../../shared/sales'

interface IncomeExpenseChartProps {
  data: DailySalesSummary[]
  isLoading?: boolean
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  isLoading = false
}) => {
  const chartData =
    data.length > 0
      ? data.map((item) => ({
          name: item.label,
          sales: item.total,
          tax: item.tax
        }))
      : [{ name: 'No Sales', sales: 0, tax: 0 }]

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[1.05rem] font-semibold">
        <Wallet size={20} className="text-primary" />
        Sales Revenue (LKR)
      </h2>
      <div className="h-75 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted">Loading chart...</div>
        ) : (
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatLkr(Number(value))}
              />
              <Tooltip
                formatter={(value, name) => [formatLkr(Number(value)), name]}
                cursor={{ fill: 'rgba(44,42,38,0.05)' }}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-card)',
                  boxShadow: 'var(--shadow-md)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar
                dataKey="sales"
                fill="var(--color-success)"
                radius={[4, 4, 0, 0]}
                name="Sales (LKR)"
              />
              <Bar
                dataKey="tax"
                fill="var(--color-warning)"
                radius={[4, 4, 0, 0]}
                name="Tax (LKR)"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
