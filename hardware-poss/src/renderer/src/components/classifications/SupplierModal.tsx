import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Spinner } from '../common/Spinner'

export interface SupplierFormData {
  name: string
  contactName: string
  phone: string
  email: string
  address: string
}

interface SupplierModalProps {
  isOpen: boolean
  initialData?: SupplierFormData
  isSaving?: boolean
  onClose: () => void
  onSave: (data: SupplierFormData) => void
}

const emptyForm: SupplierFormData = { name: '', contactName: '', phone: '', email: '', address: '' }

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  if (!isOpen) return null

  return (
    <SupplierModalContent
      key={initialData ? initialData.name : 'new-supplier'}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

const SupplierModalContent: React.FC<Omit<SupplierModalProps, 'isOpen'>> = ({
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<SupplierFormData>(initialData ?? emptyForm)
  const isValid = form.name.trim().length > 0

  const handleSave = (): void => {
    if (!isValid) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,32rem)] flex-col gap-5 rounded-lg bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit Supplier' : 'Add Supplier'}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Supplier Name</label>
            <input
              type="text"
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              placeholder="e.g. ABC Distributors"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Contact Name</label>
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="Contact Person"
                value={form.contactName}
                onChange={(event) => setForm({ ...form, contactName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Phone Number</label>
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="Phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Email Address</label>
            <input
              type="email"
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.85rem] font-medium text-muted">Address</label>
            <textarea
              className="min-h-20 resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              placeholder="Physical address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
        </div>

        <div className="flex w-full gap-3 mt-2">
          <button
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
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
