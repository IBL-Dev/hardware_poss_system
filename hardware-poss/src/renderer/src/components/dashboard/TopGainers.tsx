import React from 'react'
import { Trophy } from 'lucide-react'
import { formatLkr } from '../../utils/currency'
import type { TopProductSummary } from '../../../../shared/sales'

interface TopGainersProps {
  products: TopProductSummary[]
  isLoading?: boolean
}

export const TopGainers: React.FC<TopGainersProps> = ({ products, isLoading = false }) => {
  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
          <Trophy size={15} className="text-warning" />
          Top Products
        </h3>
        <span className="text-[0.7rem] font-semibold text-muted">By Revenue</span>
      </div>
      <div>
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted">Loading...</div>
        ) : products.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">No data yet.</div>
        ) : (
          products.map((product, index) => (
            <div
              key={`${product.sku}:${index}`}
              className="mb-3 flex items-center justify-between last:mb-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[0.7rem] font-bold text-white"
                  style={{
                    backgroundColor:
                      index === 0
                        ? 'var(--color-warning)'
                        : index === 1
                          ? 'var(--color-muted)'
                          : index === 2
                            ? 'var(--color-accent)'
                            : 'var(--color-line-strong)',
                    color: index < 3 ? 'white' : 'var(--color-muted)'
                  }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[0.85rem] font-medium text-ink">
                    {product.productName}
                  </span>
                  <span className="text-[0.7rem] text-muted">
                    {product.quantity} sold &middot; {product.sku}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[0.85rem] font-semibold text-success">
                {formatLkr(product.total)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
