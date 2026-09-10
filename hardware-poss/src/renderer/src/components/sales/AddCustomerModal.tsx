import React, { useMemo, useState } from 'react'
import { UserRoundCheck, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { customersApi } from '../../api/customersApi'
import type { CustomerRecord } from '../../../../shared/customers'

interface AddCustomerModalProps {
  isOpen: boolean
  customers: CustomerRecord[]
  onClose: () => void
  onSaved: (customer: CustomerRecord) => void
}

interface CustomerFormValues {
  name: string
  nic: string
  phone: string
}

const NIC_PATTERN = /^(\d{9}[VvXx]|\d{12})$/

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  customers,
  onClose,
  onSaved
}) => {
  if (!isOpen) return null

  return <AddCustomerContent customers={customers} onClose={onClose} onSaved={onSaved} />
}

const AddCustomerContent: React.FC<{
  customers: CustomerRecord[]
  onClose: () => void
  onSaved: (customer: CustomerRecord) => void
}> = ({ customers, onClose, onSaved }) => {
  const toast = useToast()
  const [form, setForm] = useState<CustomerFormValues>({ name: '', nic: '', phone: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const matchedCustomer = useMemo(() => {
    const name = form.name.trim()
    const nic = form.nic.trim()

    if (!name && !nic) return null

    return (
      customers.find((customer) => customer.name.toLowerCase() === name.toLowerCase()) ??
      (nic ? customers.find((customer) => customer.nic.toLowerCase() === nic.toLowerCase()) : null)
    )
  }, [customers, form.name, form.nic])

  const updateField = (field: keyof CustomerFormValues, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }))

    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (): Promise<void> => {
    const name = form.name.trim()
    const nic = form.nic.trim()
    const phone = form.phone.trim()

    if (!name) {
      setError('Customer name is required.')
      return
    }

    if (nic && !NIC_PATTERN.test(nic)) {
      setError('Enter a valid NIC (e.g. 200345612345 or 983452109V).')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      let savedCustomer: CustomerRecord
      const existing = matchedCustomer

      if (existing) {
        const changes: Record<string, string> = {}

        if (nic && nic.toLowerCase() !== existing.nic.toLowerCase()) {
          changes.nic = nic
        }

        if (phone && phone !== existing.phone) {
          changes.phone = phone
        }

        savedCustomer =
          Object.keys(changes).length > 0
            ? await customersApi.update(existing.id, changes)
            : existing

        toast.success('Customer updated.')
      } else {
        savedCustomer = await customersApi.create({ name, nic, phone })
        toast.success('Customer added.')
      }

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
          <h3 className="m-0 text-xl font-semibold text-ink">Add Customer</h3>

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
          {matchedCustomer && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <UserRoundCheck size={15} className="shrink-0 text-emerald-600" />
              <p className="min-w-0 text-xs font-semibold text-emerald-800">
                Existing customer &quot;{matchedCustomer.name}&quot; will be updated instead of
                creating a duplicate.
              </p>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Name
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="Customer name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            NIC
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line px-3 text-sm text-ink outline-none transition-colors focus:border-primary"
              placeholder="National Identity Card number"
              value={form.nic}
              onChange={(event) => updateField('nic', event.target.value)}
              onKeyDown={handleKeyDown}
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
            {isSaving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
