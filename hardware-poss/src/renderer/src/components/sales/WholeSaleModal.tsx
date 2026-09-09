import React, { useState } from 'react'
import { Briefcase, PackageOpen, UserRound } from 'lucide-react'

export interface WholeSaleCustomerInput {
  name: string
  businessName: string
}

interface WholeSaleModalProps {
  isOpen: boolean
  initialName: string
  initialBusinessName: string
  onClose: () => void
  onConfirm: (input: WholeSaleCustomerInput) => void
  onClear?: () => void
}

export const WholeSaleModal: React.FC<WholeSaleModalProps> = ({
  isOpen,
  initialName,
  initialBusinessName,
  onClose,
  onConfirm,
  onClear
}) => {
  if (!isOpen) return null

  return (
    <WholeSaleModalContent
      key={`${initialName}:${initialBusinessName}`}
      initialName={initialName}
      initialBusinessName={initialBusinessName}
      onClose={onClose}
      onConfirm={onConfirm}
      onClear={onClear}
    />
  )
}

interface WholeSaleModalContentProps {
  initialName: string
  initialBusinessName: string
  onClose: () => void
  onConfirm: (input: WholeSaleCustomerInput) => void
  onClear?: () => void
}

const WholeSaleModalContent: React.FC<WholeSaleModalContentProps> = ({
  initialName,
  initialBusinessName,
  onClose,
  onConfirm,
  onClear
}) => {
  const [name, setName] = useState(initialName)
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [error, setError] = useState('')

  const handleConfirm = (): void => {
    if (!name.trim()) {
      setError('Customer name is required for a whole sale.')
      return
    }

    onConfirm({ name: name.trim(), businessName: businessName.trim() })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,24rem)] flex-col gap-5 rounded-lg bg-white p-6 shadow-lg">
        <h3 className="m-0 text-center text-xl font-semibold text-ink">
          Whole Sale Customer
          <br />
          <span className="flex items-center justify-center gap-1.5 text-base font-semibold text-primary">
            <PackageOpen size={18} />
            Continue Bill as Whole Bill
          </span>
        </h3>

        <div className="flex flex-col gap-3">
          <label className="relative block">
            <UserRound
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-primary"
            />
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
              placeholder="Customer name"
              value={name}
              autoFocus
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError('')
              }}
              onKeyDown={handleKeyDown}
            />
          </label>

          <label className="relative block">
            <Briefcase
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-primary"
            />
            <input
              type="text"
              className="h-11 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
              placeholder="Business / company name (optional)"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : null}

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
            className="flex-1 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover"
            onClick={handleConfirm}
          >
            Continue Whole Bill
          </button>
        </div>

        {onClear && (
          <button
            type="button"
            className="w-full rounded-md border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            onClick={onClear}
          >
            Remove Whole Sale from Bill
          </button>
        )}
      </div>
    </div>
  )
}