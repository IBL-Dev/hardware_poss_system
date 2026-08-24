import React from 'react'
import { Pencil, X } from 'lucide-react'
import type { CustomerRecord } from '../../../../shared/customers'

interface CustomerDetailsModalProps {
  customer: CustomerRecord | null
  onClose: () => void
  onEdit: (customer: CustomerRecord) => void
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  onClose,
  onEdit
}) => {
  if (!customer) return null

  const createdAt = new Date(customer.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const details: Array<{ label: string; value: string }> = [
    { label: 'Name', value: customer.name },
    { label: 'Phone', value: customer.phone || '—' },
    { label: 'Email', value: customer.email || '—' },
    { label: 'Address', value: customer.address || '—' },
    { label: 'Notes', value: customer.notes || '—' },
    { label: 'Customer since', value: createdAt }
  ]

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,26rem)] flex-col gap-5 rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-semibold text-ink">Customer Details</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-ink"
            aria-label="Close customer details popup"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] font-semibold tracking-wide text-muted uppercase">
                {detail.label}
              </span>
              <span className="text-sm font-medium text-ink">{detail.value}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover"
            onClick={() => onEdit(customer)}
          >
            <Pencil size={15} />
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
