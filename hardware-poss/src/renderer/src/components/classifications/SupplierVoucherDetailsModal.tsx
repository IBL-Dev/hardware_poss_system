import React from 'react'
import { X } from 'lucide-react'
import { formatLkr } from '../../utils/currency'
import type { SupplierVoucherRecord, SupplierVoucherStatus } from '../../../../shared/suppliers'

interface SupplierVoucherDetailsModalProps {
  voucher: SupplierVoucherRecord | null
  onClose: () => void
}

export const SupplierVoucherDetailsModal: React.FC<SupplierVoucherDetailsModalProps> = ({
  voucher,
  onClose
}) => {
  if (!voucher) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,34rem)] flex-col gap-5 rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-xl font-bold text-ink">
              Voucher {voucher.voucherNumber}
            </h3>
            <p className="mt-1 text-sm text-muted">{voucher.supplierName || 'No supplier'}</p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Voucher Number" value={voucher.voucherNumber} />
          <Detail label="Supplier" value={voucher.supplierName || '-'} />
          <Detail label="Date" value={formatDate(voucher.voucherDate)} />
          <Detail label="Amount (LKR)" value={formatLkr(voucher.amount)} strong />
          <Detail label="Status" value={formatVoucherStatus(voucher.status)} />
          <Detail label="Created" value={formatDateTime(voucher.createdAt)} />
        </div>

        <div className="rounded-md border border-line bg-bg p-4">
          <div className="text-xs font-semibold uppercase text-muted">Notes</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-ink">{voucher.note || '-'}</div>
        </div>
      </div>
    </div>
  )
}

const Detail: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong = false
}) => (
  <div className="rounded-md border border-line bg-bg p-3">
    <div className="text-xs font-semibold uppercase text-muted">{label}</div>
    <div className={`mt-1 break-words text-sm ${strong ? 'font-bold text-ink' : 'text-ink'}`}>
      {value}
    </div>
  </div>
)

function formatVoucherStatus(status: SupplierVoucherStatus): string {
  const labels: Record<SupplierVoucherStatus, string> = {
    PENDING: 'Pending',
    PAID: 'Paid',
    CANCELLED: 'Cancelled'
  }

  return labels[status]
}

function formatDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatDateTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
