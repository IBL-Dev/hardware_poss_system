import React from 'react'
import { formatLkr } from '../../utils/currency'
import type { TopProductSummary } from '../../../../shared/sales'

interface TopGainersProps {
  products: TopProductSummary[]
  isLoading?: boolean
}

export const TopGainers: React.FC<TopGainersProps> = ({ products, isLoading = false }) => {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[1.05rem] font-semibold">Top Products</h3>
        <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-muted">
          By revenue (LKR)
        </span>
      </div>
      <div>
        {isLoading ? (
          <div className="py-8 text-center text-muted">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-muted">No paid sales yet.</div>
        ) : (
          products.map((product, index) => (
            <div
              key={`${product.sku}:${index}`}
              className="mb-4 flex items-center justify-between last:mb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {product.productName}
                  </span>
                  <span className="text-[0.8rem] text-muted">
                    {product.sku} - {product.quantity} sold
                  </span>
                </div>
              </div>
              <div className="text-right font-semibold text-success">
                {formatLkr(product.total)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
