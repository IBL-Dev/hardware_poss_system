import React from 'react'
import { AlertTriangle, PackageX } from 'lucide-react'
import type { ProductRecord } from '../../../../shared/products'

interface LowStockAlertProps {
  products: ProductRecord[]
  isLoading?: boolean
}

const MAX_VISIBLE = 6
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
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <AlertTriangle size={18} className="text-warning" />
          Low Stock Alert
        </h3>
        {lowStockProducts.length > 0 && (
          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
            {lowStockProducts.length} item{lowStockProducts.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div>
        {isLoading ? (
          <div className="py-8 text-center text-muted">Loading products...</div>
        ) : lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
            <PackageX size={28} className="text-faint" />
            <span>All stock levels are healthy.</span>
          </div>
        ) : (
          <>
            {visibleProducts.map((product) => {
              const isOutOfStock = product.stockQuantity === 0

              return (
                <div
                  key={product.id}
                  className={`mb-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 last:mb-0 ${
                    isOutOfStock ? 'border-danger/20 bg-danger/5' : 'border-warning/25 bg-warning/5'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{product.name}</span>
                    <span className="text-[0.8rem] text-muted">
                      {product.sku} - Reorder at{' '}
                      {Math.max(product.reorderLevel, LOW_STOCK_THRESHOLD)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isOutOfStock
                        ? 'border border-danger/20 bg-danger/10 text-danger'
                        : 'border border-warning/25 bg-warning/10 text-warning'
                    }`}
                  >
                    {isOutOfStock ? 'Out of stock' : `${product.stockQuantity} left`}
                  </span>
                </div>
              )
            })}
            {remainingCount > 0 && (
              <div className="pt-1 text-center text-[0.8rem] text-muted">
                +{remainingCount} more low on stock
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
