import React from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatLkr } from '../../utils/currency'
import type { PaymentSummary } from '../../../../shared/sales'

interface DiversificationChartProps {
  payments: PaymentSummary[]
  isLoading?: boolean
}

const colors = [
  'var(--color-success)',
  'var(--color-primary)',
  'var(--color-warning)',
  'var(--color-accent)'
]

export const DiversificationChart: React.FC<DiversificationChartProps> = ({
  payments,
  isLoading = false
}) => {
  const total = payments.reduce((sum, item) => sum + item.total, 0)
  const data =
    payments.length > 0
      ? payments.map((item) => ({
          name: formatPaymentMethod(item.paymentMethod),
          value: item.total,
          transactions: item.transactions
        }))
      : [{ name: 'No Sales', value: 1, transactions: 0 }]

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[1.05rem] font-semibold">Payment Mix</h3>
      </div>
      <div className="relative h-[12.5rem] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted">
            Loading payments...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={colors[index % colors.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatLkr(Number(value)), 'Total (LKR)']} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 text-[0.8rem]">
        {payments.length === 0 ? (
          <div className="text-center text-muted">No payment data yet.</div>
        ) : (
          payments.map((item, index) => (
            <div key={item.paymentMethod} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-muted">{formatPaymentMethod(item.paymentMethod)}</span>
              </div>
              <span className="font-semibold">
                {total > 0 ? ((item.total / total) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function formatPaymentMethod(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}
