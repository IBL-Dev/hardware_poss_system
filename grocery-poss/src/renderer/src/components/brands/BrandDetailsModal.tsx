import React from 'react'
import { X } from 'lucide-react'
import type { BrandRecord } from '../../../../shared/brands'

interface BrandDetailsModalProps {
  brand: BrandRecord | null
  onClose: () => void
}

export const BrandDetailsModal: React.FC<BrandDetailsModalProps> = ({ brand, onClose }) => {
  if (!brand) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,30rem)] flex-col gap-5 rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">Brand Details</h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-[0.95rem]">
          <DetailRow label="Name" value={brand.name} />
          <DetailRow label="Description" value={brand.description || '-'} />
          <DetailRow label="Products" value={brand.productCount.toString()} />
          <DetailRow label="Created" value={formatDate(brand.createdAt)} />
          <DetailRow label="Updated" value={formatDate(brand.updatedAt)} />
        </div>
      </div>
    </div>
  )
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-3 rounded-md border border-line bg-bg px-3 py-2.5">
    <span className="font-medium text-muted">{label}</span>
    <span className="break-words text-ink">{value}</span>
  </div>
)

function formatDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value || '-' : date.toLocaleString()
}
