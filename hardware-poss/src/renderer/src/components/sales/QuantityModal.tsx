import React, { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatLkrAmount } from '../../utils/currency'
import { onPosShortcutEvent } from '../../shortcuts/posShortcutEvents'

export interface QuantitySelection {
  quantity: number
  discountAmount: number
}

interface QuantityModalProps {
  isOpen: boolean
  productName: string
  unitPrice: number
  initialQuantity: number
  maxQuantity?: number
  unit?: string
  onClose: () => void
  onConfirm: (selection: QuantitySelection) => void
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  isOpen,
  productName,
  unitPrice,
  initialQuantity,
  maxQuantity = 9999,
  unit,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null

  return (
    <QuantityModalContent
      key={`${productName}:${maxQuantity}`}
      productName={productName}
      unitPrice={unitPrice}
      initialQuantity={initialQuantity}
      maxQuantity={maxQuantity}
      unit={unit}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

const QuantityModalContent: React.FC<Omit<QuantityModalProps, 'isOpen'>> = ({
  productName,
  unitPrice,
  initialQuantity,
  maxQuantity = 9999,
  unit,
  onClose,
  onConfirm
}) => {
  const [quantityInput, setQuantityInput] = useState(
    String(clampQuantity(initialQuantity || 1, maxQuantity))
  )
  const [discountInput, setDiscountInput] = useState('')
  const discountInputRef = useRef<HTMLInputElement | null>(null)

  const quantity = parseQuantityInput(quantityInput)
  const lineGrossTotal = roundMoney(unitPrice * quantity)
  const discountAmount = clampMoney(parseMoneyInput(discountInput), lineGrossTotal)
  const lineNetTotal = Math.max(0, roundMoney(lineGrossTotal - discountAmount))

  useEffect(
    () =>
      onPosShortcutEvent('pos:focus-product-discount', () => {
        window.requestAnimationFrame(() => {
          discountInputRef.current?.focus()
          discountInputRef.current?.select()
        })
      }),
    []
  )

  const updateQuantity = (nextQuantity: number): void => {
    setQuantityInput(String(clampQuantity(nextQuantity, maxQuantity)))
  }

  const handleConfirm = (): void => {
    onConfirm({ quantity, discountAmount })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      updateQuantity(quantity + 1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      updateQuantity(quantity - 1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,24rem)] flex-col items-center gap-5 rounded-lg bg-white p-6 shadow-lg">
        <h3 className="m-0 text-center text-xl font-semibold text-ink">
          Select Quantity {unit ? `(${unit})` : ''}
          <br />
          <span className="text-primary">{productName}</span>
        </h3>

        <div className="flex items-center overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-primary"
            onClick={() => updateQuantity(quantity - 1)}
          >
            <Minus size={18} />
          </button>
          <input
            type="number"
            step="any"
            className="h-12 w-24 border-x border-line text-center text-2xl font-semibold text-ink outline-none"
            value={quantityInput}
            min={0.001}
            max={maxQuantity}
            onChange={(event) => setQuantityInput(event.target.value)}
            onBlur={() => updateQuantity(quantity)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-primary"
            onClick={() => updateQuantity(quantity + 1)}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 rounded-md border border-line bg-subtle p-3">
          <div className="text-sm font-semibold text-muted">Line Total</div>
          <div className="text-right text-sm font-bold text-ink">
            {formatLkrAmount(lineGrossTotal)}
          </div>

          <label className="text-sm font-semibold text-muted" htmlFor="quantity-discount">
            Discount (LKR)
          </label>
          <input
            ref={discountInputRef}
            id="quantity-discount"
            type="number"
            min="0"
            max={lineGrossTotal}
            step="0.01"
            className="h-10 rounded-md border border-line bg-white px-2 text-right text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
            placeholder="0.00"
            value={discountInput}
            onChange={(event) => setDiscountInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="text-sm font-semibold text-muted">Net</div>
          <div className="text-right text-sm font-bold text-success">
            {formatLkrAmount(lineNetTotal)}
          </div>
        </div>

        <div className="rounded-full border border-line bg-subtle px-3 py-1 text-xs font-semibold text-muted">
          Available {maxQuantity}
        </div>

        <div className="flex w-full gap-3">
          <button
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function clampQuantity(value: number, maxQuantity: number): number {
  return Math.min(Math.max(0.001, value), Math.max(0.001, maxQuantity))
}

function parseQuantityInput(value: string): number {
  if (value.trim() === '') return 0
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0
  return parsedValue
}

function parseMoneyInput(value: string): number {
  if (value.trim() === '') return 0

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0

  return parsedValue
}

function clampMoney(value: number, maxAmount: number): number {
  return roundMoney(Math.min(Math.max(0, value), Math.max(0, maxAmount)))
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
