import React, { useEffect, useMemo, useRef, useState } from 'react'
import { UserRound, Users } from 'lucide-react'
import type { CustomerRecord } from '../../../../shared/customers'

export interface CreditCustomerPick {
  customerId: number | null
  name: string
  nic: string
  phone: string
  businessName: string
}

interface CreditCustomerPickerProps {
  customers: CustomerRecord[]
  value: CreditCustomerPick
  onChange: (value: CreditCustomerPick) => void
  disabled?: boolean
}

const MAX_SUGGESTIONS = 8

export const CreditCustomerPicker: React.FC<CreditCustomerPickerProps> = ({
  customers,
  value,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const normalizedName = value.name.trim().toLowerCase()

  const matchingCustomers = useMemo(() => {
    if (!normalizedName) return []

    return customers
      .filter((customer) =>
        `${customer.name} ${customer.nic} ${customer.businessName} ${customer.phone} ${customer.email}`
          .toLowerCase()
          .includes(normalizedName)
      )
      .slice(0, MAX_SUGGESTIONS)
  }, [customers, normalizedName])

  const handleNameChange = (name: string): void => {
    const exactCustomer = customers.find(
      (customer) => customer.name.toLowerCase() === name.trim().toLowerCase()
    )

    onChange({
      customerId: exactCustomer ? exactCustomer.id : null,
      name,
      nic: exactCustomer ? exactCustomer.nic : value.nic,
      phone: exactCustomer ? exactCustomer.phone : value.phone,
      businessName: exactCustomer ? exactCustomer.businessName : value.businessName
    })
    setHighlightedIndex(0)
    setIsOpen(name.trim().length > 0)
  }

  const handleSelectCustomer = (customer: CustomerRecord): void => {
    onChange({
      customerId: customer.id,
      name: customer.name,
      nic: customer.nic,
      phone: customer.phone,
      businessName: customer.businessName
    })
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return
    if (matchingCustomers.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.min(index + 1, matchingCustomers.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
      return
    }

    event.preventDefault()
    const highlightedCustomer = matchingCustomers[highlightedIndex]
    if (highlightedCustomer) handleSelectCustomer(highlightedCustomer)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      const target = event.target

      if (
        target instanceof Node &&
        (dropdownRef.current?.contains(target) || nameInputRef.current?.contains(target))
      ) {
        return
      }

      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
    }
  }, [isOpen])

  const showDropdown = isOpen && !disabled && matchingCustomers.length > 0

  return (
    <div className="flex flex-col gap-2">
      <label className="relative block">
        <UserRound
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-emerald-600"
        />

        <input
          ref={nameInputRef}
          type="text"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-50 disabled:text-slate-400"
          placeholder="Type or search customer name..."
          value={value.name}
          disabled={disabled}
          onChange={(event) => handleNameChange(event.target.value)}
          onFocus={() => setIsOpen(value.name.trim().length > 0)}
          onKeyDown={handleNameKeyDown}
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">
                <Users size={13} />
                Saved Customers
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">
                {matchingCustomers.length}
              </span>
            </div>

            {matchingCustomers.map((customer, index) => (
              <button
                key={customer.id}
                type="button"
                className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                  index === highlightedIndex ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectCustomer(customer)}
                role="menuitem"
              >
                <UserRound size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800">
                    {customer.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.72rem] text-slate-500">
                    {[customer.nic, customer.businessName, customer.phone, customer.email]
                      .filter(Boolean)
                      .join(' · ') || 'No contact details'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </label>
    </div>
  )
}