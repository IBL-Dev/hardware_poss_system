import React from 'react'
import { X } from 'lucide-react'
import type { ProductRecord } from '../../../../shared/products'
import { formatLkrAmount } from '../../utils/currency'

interface ProductDetailsModalProps {
  product: ProductRecord | null
  onClose: () => void
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  if (!product) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,36rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">Product Details</h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-[0.95rem] sm:grid-cols-2">
          <DetailRow label="Code" value={product.sku} />
          <DetailRow label="Barcode" value={product.barcode ?? '-'} />
          <DetailRow label="Name" value={product.name} wide />
          <DetailRow label="Brand" value={product.brandName ?? '-'} />
          <DetailRow label="Category" value={product.categoryName ?? '-'} />
          <DetailRow label="Supplier" value={product.supplierName ?? '-'} />
          <DetailRow label="Unit" value={formatStatus(product.unit)} />
          <DetailRow label="Buying Price (LKR)" value={formatLkrAmount(product.buyingPrice)} />
          <DetailRow label="Selling Price (LKR)" value={formatLkrAmount(product.sellingPrice)} />
          <DetailRow label="Discount" value={`${product.discountPercent}%`} />
          <DetailRow label="Stock" value={product.stockQuantity.toString()} />
          <DetailRow label="Reorder Level" value={product.reorderLevel.toString()} />
          <DetailRow label="Created" value={formatDate(product.createdAt)} />
          <DetailRow label="Updated" value={formatDate(product.updatedAt)} />
        </div>
      </div>
    </div>
  )
}

const DetailRow: React.FC<{ label: string; value: string; wide?: boolean }> = ({
  label,
  value,
  wide = false
}) => (
  <div
    className={`grid grid-cols-[7rem_1fr] gap-3 rounded-md border border-line bg-bg px-3 py-2.5 ${
      wide ? 'sm:col-span-2' : ''
    }`}
  >
    <span className="font-medium text-muted">{label}</span>
    <span className="break-words text-ink">{value}</span>
  </div>
)

function formatStatus(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value || '-' : date.toLocaleString()
}
