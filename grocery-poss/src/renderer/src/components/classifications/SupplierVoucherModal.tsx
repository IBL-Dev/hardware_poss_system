import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Spinner } from '../common/Spinner'
import type { SupplierRecord, SupplierVoucherStatus } from '../../../../shared/suppliers'

export interface SupplierVoucherFormData {
  voucherNumber: string
  supplierId: number
  voucherDate: string
  amount: number
  status: SupplierVoucherStatus
  note: string
}

interface SupplierVoucherModalProps {
  isOpen: boolean
  suppliers: SupplierRecord[]
  initialData?: SupplierVoucherFormData
  isSaving?: boolean
  onClose: () => void
  onSave: (data: SupplierVoucherFormData) => void
}

interface SupplierVoucherFormState {
  voucherNumber: string
  supplierId: string
  voucherDate: string
  amount: string
  status: SupplierVoucherStatus
  note: string
}

const voucherStatuses: Array<{ value: SupplierVoucherStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' }
]

export const SupplierVoucherModal: React.FC<SupplierVoucherModalProps> = ({
  isOpen,
  suppliers,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  if (!isOpen) return null

  return (
    <SupplierVoucherModalContent
      key={initialData ? `voucher-${initialData.voucherNumber}` : 'new-supplier-voucher'}
      suppliers={suppliers}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

const SupplierVoucherModalContent: React.FC<Omit<SupplierVoucherModalProps, 'isOpen'>> = ({
  suppliers,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<SupplierVoucherFormState>({
    voucherNumber: initialData?.voucherNumber ?? '',
    supplierId: initialData?.supplierId ? initialData.supplierId.toString() : '',
    voucherDate: initialData?.voucherDate ?? getTodayInputValue(),
    amount: initialData?.amount ? initialData.amount.toString() : '',
    status: initialData?.status ?? 'PENDING',
    note: initialData?.note ?? ''
  })

  const amount = Number(form.amount)
  const isValid =
    form.voucherNumber.trim().length > 0 &&
    Number(form.supplierId) > 0 &&
    form.voucherDate.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount > 0

  const handleSave = (): void => {
    if (!isValid) return

    onSave({
      voucherNumber: form.voucherNumber,
      supplierId: Number(form.supplierId),
      voucherDate: form.voucherDate,
      amount,
      status: form.status,
      note: form.note
    })
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(92vw,34rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit Voucher' : 'Add Voucher'}
          </h3>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Voucher Number</label>
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="e.g. VCH-0001"
                value={form.voucherNumber}
                onChange={(event) => setForm({ ...form, voucherNumber: event.target.value })}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Voucher Date</label>
              <input
                type="date"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                value={form.voucherDate}
                onChange={(event) => setForm({ ...form, voucherDate: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Supplier Name</label>
            <select
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              value={form.supplierId}
              onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
              disabled={suppliers.length === 0}
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Amount (LKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Status</label>
              <select
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as SupplierVoucherStatus })
                }
              >
                {voucherStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Notes</label>
            <textarea
              className="min-h-20 resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              placeholder="Payment or purchase details"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-2 flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleSave}
            disabled={isSaving || !isValid}
          >
            {isSaving && <Spinner size={16} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function getTodayInputValue(): string {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 10)
}
