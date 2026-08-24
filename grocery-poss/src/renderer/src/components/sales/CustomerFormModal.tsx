import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { customersApi } from '../../api/customersApi'
import type { CustomerRecord } from '../../../../shared/customers'

interface CustomerFormModalProps {
  isOpen: boolean
  customer?: CustomerRecord | null
  onClose: () => void
  onSaved: (customer: CustomerRecord) => void
}

interface CustomerFormContentProps {
  customer?: CustomerRecord | null
  onClose: () => void
  onSaved: (customer: CustomerRecord) => void
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSaved
}) => {
  if (!isOpen) return null

  return (
    <CustomerFormContent
      key={customer ? `edit-${customer.id}` : 'create'}
      customer={customer}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

const CustomerFormContent: React.FC<CustomerFormContentProps> = ({
  customer,
  onClose,
  onSaved
}) => {
  const toast = useToast()
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          notes: customer.notes
        }
      : EMPTY_FORM
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = Boolean(customer)

  const updateField = (field: keyof typeof EMPTY_FORM, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }))

    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const savedCustomer = customer
        ? await customersApi.update(customer.id, form)
        : await customersApi.create(form)

      toast.success(customer ? 'Customer updated.' : 'Customer added.')
      onSaved(savedCustomer)
      onClose()
    } catch (catchError) {
      setError(catchError instanceof Error ? catchError.message : 'Customer could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,26rem)] flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-semibold text-ink">
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-ink"
            aria-label="Close customer popup"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Name
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Customer name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Phone
            <input
              type="tel"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Email
            <input
              type="email"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Email address"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Address
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Address"
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Notes
            <textarea
              className="w-full resize-none rounded-md border border-line px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Notes"
              rows={2}
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </label>
        </div>

        {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}

        <div className="flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="flex-1 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary/50"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
