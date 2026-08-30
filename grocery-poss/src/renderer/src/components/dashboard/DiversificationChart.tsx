import React from 'react'
import { DollarSign } from 'lucide-react'
import { formatLkr } from '../../utils/currency'
import type { PaymentSummary } from '../../../../shared/sales'

interface DiversificationChartProps {
  payments: PaymentSummary[]
  isLoading?: boolean
}

const paymentMeta: Record<string, { color: string; label: string }> = {
  CASH: { color: 'var(--color-success)', label: 'Cash' },
  CARD: { color: 'var(--color-primary)', label: 'Card' },
  BANK_TRANSFER: { color: 'var(--color-warning)', label: 'Bank Transfer' },
  MOBILE_PAY: { color: 'var(--color-accent)', label: 'Mobile Pay' },
  CREDIT: { color: 'var(--color-danger)', label: 'Credit' }
}

export const DiversificationChart: React.FC<DiversificationChartProps> = ({
  payments,
  isLoading = false
}) => {
  const total = payments.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
          <DollarSign size={15} />
          Payment Breakdown
        </h3>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-muted">Loading...</div>
      ) : payments.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted">No data yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((item) => {
            const meta = paymentMeta[item.paymentMethod] || {
              color: 'var(--color-muted)',
              label: item.paymentMethod
            }
            const pct = total > 0 ? (item.total / total) * 100 : 0
            return (
              <div key={item.paymentMethod}>
                <div className="mb-1.5 flex items-center justify-between text-[0.8rem]">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.label}
                  </span>
                  <span className="font-semibold text-ink">{formatLkr(item.total)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: meta.color
                    }}
                  />
                </div>
                <div className="mt-1 text-[0.7rem] text-muted">
                  {item.transactions} transaction{item.transactions === 1 ? '' : 's'} &middot;{' '}
                  {pct.toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
