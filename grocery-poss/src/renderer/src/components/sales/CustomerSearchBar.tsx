import React, { useMemo, useRef, useState } from 'react'
import { Eye, Search, UserCheck, Users, X } from 'lucide-react'
import type { CustomerRecord } from '../../../../shared/customers'

interface CustomerSearchBarProps {
  customers: CustomerRecord[]
  selectedCustomer: CustomerRecord | null
  onSelect: (customer: CustomerRecord) => void
  onClear: () => void
  onAddNew: () => void
  onViewDetails: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  disabled?: boolean
}

const MAX_CUSTOMER_RESULTS = 8

export const CustomerSearchBar: React.FC<CustomerSearchBarProps> = ({
  customers,
  selectedCustomer,
  onSelect,
  onClear,
  onAddNew,
  onViewDetails,
  inputRef,
  disabled = false
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  const matchingCustomers = useMemo(() => {
    if (!normalizedQuery) return []

    return customers
      .filter((customer) => {
        const haystack = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      .slice(0, MAX_CUSTOMER_RESULTS)
  }, [customers, normalizedQuery])

  const handleChange = (value: string): void => {
    setQuery(value)
    setHighlightedIndex(0)
    setIsOpen(true)
  }

  const handleSelect = (customer: CustomerRecord): void => {
    onSelect(customer)
    setQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.min(index + 1, matchingCustomers.length))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const highlightedCustomer = matchingCustomers[highlightedIndex]
      if (highlightedCustomer) handleSelect(highlightedCustomer)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative flex min-w-0">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-line bg-white px-4 py-2.5 transition-shadow focus-within:border-primary focus-within:shadow-md">
        {selectedCustomer ? (
          <>
            <UserCheck size={18} className="shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {selectedCustomer.name}
              </span>
              <span className="block truncate text-[0.72rem] text-muted">
                {selectedCustomer.phone || selectedCustomer.email || 'No contact details'}
              </span>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-primary"
              onClick={onViewDetails}
              title="View customer details"
              aria-label="View customer details"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              onClick={onClear}
              title="Remove customer"
              aria-label="Remove customer"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Users size={18} className="shrink-0 text-primary" />
            <input
              ref={inputRef}
              type="text"
              className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-ink outline-none placeholder:text-faint"
              placeholder="Search customer by name, phone, or email"
              value={query}
              disabled={disabled}
              onChange={(event) => handleChange(event.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
          </>
        )}
      </div>

      {isOpen && !selectedCustomer && matchingCustomers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-md border border-line bg-white shadow-lg"
          role="menu"
        >
          {matchingCustomers.map((customer, index) => (
            <button
              key={customer.id}
              type="button"
              className={`flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                index === highlightedIndex ? 'bg-primary/10' : 'hover:bg-hover'
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleSelect(customer)}
              role="menuitem"
            >
              <UserCheck size={15} className="shrink-0 text-success" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {customer.name}
                </span>
                <span className="block truncate text-[0.72rem] text-muted">
                  {[customer.phone, customer.email].filter(Boolean).join(' · ') ||
                    'No contact details'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen &&
        !selectedCustomer &&
        normalizedQuery.length > 0 &&
        matchingCustomers.length === 0 && (
          <div
            className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-md border border-line bg-white shadow-lg"
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-hover"
              onClick={onAddNew}
              role="menuitem"
            >
              <Search size={15} className="shrink-0 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Add new customer &quot;{query.trim()}&quot;
              </span>
            </button>
          </div>
        )}
    </div>
  )
}
