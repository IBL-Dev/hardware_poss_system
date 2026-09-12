import React, { useEffect, useRef, useState } from 'react'
import { Minus, Plus, Percent, Banknote } from 'lucide-react'
import { formatLkrAmount } from '../../utils/currency'
import { onPosShortcutEvent } from '../../shortcuts/posShortcutEvents'

export interface QuantitySelection {
  quantity: number
  discountAmount: number
}

type DiscountMode = 'amount' | 'percent'

interface QuantityModalProps {
  isOpen: boolean
  productName: string
  unitPrice: number
  initialQuantity: number
  maxQuantity?: number
  unit?: string
  initialDiscountAmount?: number
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
  initialDiscountAmount,
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
      initialDiscountAmount={initialDiscountAmount}
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
  initialDiscountAmount,
  onClose,
  onConfirm
}) => {
  const [quantityInput, setQuantityInput] = useState(
    String(clampQuantity(initialQuantity || 1, maxQuantity))
  )
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount')
  const [discountAmountInput, setDiscountAmountInput] = useState(
    initialDiscountAmount && initialDiscountAmount > 0 ? String(initialDiscountAmount) : ''
  )
  const [discountPercentInput, setDiscountPercentInput] = useState('')
  const discountInputRef = useRef<HTMLInputElement | null>(null)

  const quantity = parseQuantityInput(quantityInput)
  const lineGrossTotal = roundMoney(unitPrice * quantity)

  const fixedPerUnitDiscount = clampMoney(parseMoneyInput(discountAmountInput), unitPrice)

  const discountAmount =
    discountMode === 'amount'
      ? clampMoney(roundMoney(fixedPerUnitDiscount * quantity), lineGrossTotal)
      : clampMoney(
          roundMoney((lineGrossTotal * parsePercentInput(discountPercentInput)) / 100),
          lineGrossTotal
        )

  const lineNetTotal = Math.max(0, roundMoney(lineGrossTotal - discountAmount))

  const computedDiscountPercent =
    lineGrossTotal > 0 ? roundMoney((discountAmount / lineGrossTotal) * 100) : 0

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

  const isWeightUnit = unit === 'KG' || unit === 'G' || unit === 'L' || unit === 'ML'

  const getUnitPriceDisplay = (): string | null => {
    if (!unit) return null
    if (unit === 'KG') return `Price per 1 kg: ${formatLkrAmount(unitPrice)}`
    if (unit === 'G') return `Price per 1 g: ${formatLkrAmount(unitPrice)} | Per 1 kg: ${formatLkrAmount(unitPrice * 1000)}`
    if (unit === 'L') return `Price per 1 L: ${formatLkrAmount(unitPrice)}`
    if (unit === 'ML') return `Price per 1 ml: ${formatLkrAmount(unitPrice)} | Per 1 L: ${formatLkrAmount(unitPrice * 1000)}`
    return `Price per ${unit}: ${formatLkrAmount(unitPrice)}`
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,24rem)] flex-col items-center gap-5 rounded-lg bg-white p-6 shadow-lg">
        <h3 className="m-0 text-center text-xl font-semibold text-ink">
          Select Quantity {unit ? `(${unit})` : ''}
          <br />
          <span className="text-primary">{productName}</span>
        </h3>

        {isWeightUnit && (
          <div className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700">
            {getUnitPriceDisplay()}
          </div>
        )}

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
          <button
            type="button"
            onClick={() => {
              if (discountMode === 'amount') {
                setDiscountPercentInput(
                  computedDiscountPercent > 0 ? String(computedDiscountPercent) : ''
                )
                setDiscountMode('percent')
              } else {
                setDiscountAmountInput(
                  discountAmount > 0 && quantity > 0 ? String(roundMoney(discountAmount / quantity)) : ''
                )
                setDiscountMode('amount')
              }
            }}
            className="flex items-center gap-1.5 text-left text-sm font-semibold text-muted transition-colors hover:text-primary"
            title="Tap to select discount type (Fixed or Percentage)"
          >
            Line Total
            <Percent size={12} className="text-primary" />
          </button>
          <div className="text-right text-sm font-bold text-ink">
            {formatLkrAmount(lineGrossTotal)}
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <label className="text-sm font-semibold text-muted whitespace-nowrap">
              Discount
            </label>
            <div className="flex flex-1 overflow-hidden rounded-md border border-line bg-white">
              <button
                type="button"
                onClick={() => {
                  if (discountMode !== 'amount') {
                    setDiscountAmountInput(
                      discountAmount > 0 && quantity > 0
                        ? String(roundMoney(discountAmount / quantity))
                        : ''
                    )
                    setDiscountMode('amount')
                  }
                }}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-bold transition-colors ${
                  discountMode === 'amount'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-hover hover:text-ink'
                }`}
                title="Fixed discount in LKR amount"
              >
                <Banknote size={14} />
                Fixed (LKR)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (discountMode !== 'percent') {
                    setDiscountPercentInput(
                      computedDiscountPercent > 0 ? String(computedDiscountPercent) : ''
                    )
                    setDiscountMode('percent')
                  }
                }}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-bold transition-colors ${
                  discountMode === 'percent'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-hover hover:text-ink'
                }`}
                title="Percentage discount"
              >
                <Percent size={14} />
                Percentage (%)
              </button>
            </div>
          </div>

          {discountMode === 'amount' && (
            <div className="col-span-2 flex items-center justify-end gap-2">
              <input
                ref={discountInputRef}
                type="number"
                min="0"
                max={Math.max(0, unitPrice)}
                step="0.01"
                className="h-10 w-full flex-1 rounded-md border border-line bg-white px-2 text-right text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
                placeholder="0.00"
                value={discountAmountInput}
                onChange={(event) => setDiscountAmountInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <span className="shrink-0 text-xs font-semibold text-muted">LKR</span>
            </div>
          )}

          {discountMode === 'percent' && (
            <div className="col-span-2 flex items-center justify-end gap-2">
              <input
                ref={discountInputRef}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="h-10 w-full flex-1 rounded-md border border-line bg-white px-2 text-right text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
                placeholder="0.0"
                value={discountPercentInput}
                onChange={(event) => setDiscountPercentInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <span className="shrink-0 text-xs font-semibold text-muted">%</span>
            </div>
          )}

          {discountMode === 'percent' && discountPercentInput.trim() && discountAmount > 0 && (
            <div className="col-span-2 text-[0.7rem] text-muted">
              = {formatLkrAmount(discountAmount)} discount
            </div>
          )}

          <div className="border-t border-dashed border-line pt-1 text-sm font-semibold text-muted">
            Total Discount
          </div>
          <div className="border-t border-dashed border-line pt-1 text-right text-sm font-bold text-[#dc2626]">
            {discountAmount > 0 ? `-${formatLkrAmount(discountAmount)}` : formatLkrAmount(0)}
          </div>

          <div className="text-sm font-semibold text-muted">Net</div>
          <div className="text-right text-sm font-bold text-success">
            {formatLkrAmount(lineNetTotal)}
          </div>
        </div>

        <div className="rounded-full border border-line bg-subtle px-3 py-1 text-xs font-semibold text-muted">
          Available {maxQuantity} {unit || ''}
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

function parsePercentInput(value: string): number {
  if (value.trim() === '') return 0

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0

  return Math.min(parsedValue, 100)
}

function clampMoney(value: number, maxAmount: number): number {
  return roundMoney(Math.min(Math.max(0, value), Math.max(0, maxAmount)))
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
