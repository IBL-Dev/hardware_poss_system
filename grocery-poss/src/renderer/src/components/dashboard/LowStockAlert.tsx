import React from 'react'
import { AlertTriangle, PackageX } from 'lucide-react'
import type { ProductRecord } from '../../../../shared/products'

interface LowStockAlertProps {
  products: ProductRecord[]
  isLoading?: boolean
}

const MAX_VISIBLE = 5
const LOW_STOCK_THRESHOLD = 5

export const LowStockAlert: React.FC<LowStockAlertProps> = ({ products, isLoading = false }) => {
  const lowStockProducts = [...products]
    .filter(
      (product) => product.stockQuantity <= Math.max(product.reorderLevel, LOW_STOCK_THRESHOLD)
    )
    .sort((a, b) => a.stockQuantity - b.stockQuantity)

  const visibleProducts = lowStockProducts.slice(0, MAX_VISIBLE)
  const remainingCount = lowStockProducts.length - visibleProducts.length

  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-wider text-muted">
          <AlertTriangle size={15} className="text-warning" />
          Low Stock
        </h3>
        {lowStockProducts.length > 0 && (
          <span className="rounded-md bg-danger/10 px-2 py-1 text-[0.7rem] font-bold text-danger">
            {lowStockProducts.length}
          </span>
        )}
      </div>
      <div>
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted">Loading...</div>
        ) : lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
            <PackageX size={24} className="text-faint" />
            <span>All stock levels healthy.</span>
          </div>
        ) : (
          visibleProducts.map((product) => {
            const isOutOfStock = product.stockQuantity === 0
            return (
              <div
                key={product.id}
                className={`mb-2.5 flex items-center justify-between gap-2 rounded-md border px-3 py-2 last:mb-0 ${isOutOfStock ? 'border-danger/20 bg-danger/5' : 'border-warning/20 bg-warning/5'}`}
              >
                <div className="min-w-0">
                  <span className="block truncate text-[0.85rem] font-medium text-ink">
                    {product.name}
                  </span>
                  <span className="text-[0.7rem] text-muted">{product.sku}</span>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[0.7rem] font-bold ${isOutOfStock ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}
                >
                  {isOutOfStock ? 'OUT' : `${product.stockQuantity}`}
                </span>
              </div>
            )
          })
        )}
        {remainingCount > 0 && (
          <div className="pt-2 text-center text-[0.7rem] text-muted">+{remainingCount} more</div>
        )}
      </div>
    </div>
  )
}
