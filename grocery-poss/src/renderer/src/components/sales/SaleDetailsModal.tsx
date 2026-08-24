import React, { useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import { formatLkr, formatLkrAmount } from '../../utils/currency'
import type { SaleItemRecord, SalePaymentMethod, SaleRecord } from '../../../../shared/sales'

interface SaleDetailsModalProps {
  sale: SaleRecord | null
  onClose: () => void
  onReturnItem?: (itemId: number, quantity: number) => Promise<void>
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  onClose,
  onReturnItem
}) => {
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({})
  const confirm = useConfirm()

  if (!sale) return null

  const itemDiscountTotal = sale.items.reduce((sum, item) => sum + item.discountAmount, 0)
  const grossSubtotal = sale.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const billNumber = formatBillNumber(sale)

  const getReturnQuantity = (item: SaleItemRecord): number => {
    const value = returnQuantities[item.id]
    return value && value >= 1 && value <= item.quantity ? value : 1
  }

  const handleReturnClick = (item: SaleItemRecord): void => {
    if (!onReturnItem) return

    const quantity = getReturnQuantity(item)

    confirm({
      title: 'Return Item',
      message: `Return ${quantity} of "${item.productName}"? Its stock will be restored.`,
      confirmText: 'Return',
      variant: 'danger',
      onConfirm: () => onReturnItem(item.id, quantity)
    })
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,56rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-muted uppercase">
              Sale History
            </div>
            <h3 className="m-0 mt-1 text-2xl font-bold text-ink">Bill #{billNumber}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-line bg-subtle px-2.5 py-1 font-semibold text-muted">
                {formatDateTime(sale.paidAt)}
              </span>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 font-semibold text-accent">
                {formatPaymentMethod(sale.paymentMethod)}
              </span>
              <span className="max-w-64 truncate text-xs text-muted">{sale.saleNumber}</span>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Summary label="Items" value={sale.itemCount.toString()} tone="muted" />
          <Summary label="Gross (LKR)" value={formatLkr(grossSubtotal)} tone="muted" />
          <Summary label="Item Disc. (LKR)" value={formatLkr(itemDiscountTotal)} tone="muted" />
          <Summary label="Bill Disc. (LKR)" value={formatLkr(sale.discountAmount)} tone="muted" />
          <Summary label="Total (LKR)" value={formatLkr(sale.total)} tone="success" />
        </div>

        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-subtle">
              <tr>
                <th className="border-b border-line p-3 text-[0.78rem] font-semibold text-muted uppercase">
                  Product
                </th>
                <th className="border-b border-line p-3 text-right text-[0.78rem] font-semibold text-muted uppercase">
                  Qty
                </th>
                <th className="border-b border-line p-3 text-right text-[0.78rem] font-semibold text-muted uppercase">
                  Price (LKR)
                </th>
                <th className="border-b border-line p-3 text-right text-[0.78rem] font-semibold text-muted uppercase">
                  Discount (LKR)
                </th>
                <th className="border-b border-line p-3 text-right text-[0.78rem] font-semibold text-muted uppercase">
                  Total (LKR)
                </th>
                {onReturnItem && (
                  <th className="border-b border-line p-3 text-right text-[0.78rem] font-semibold text-muted uppercase">
                    Return
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="last:*:border-b-0">
                  <td className="border-b border-line p-3">
                    <div className="font-semibold text-ink">{item.productName}</div>
                    <div className="text-xs text-muted">{item.sku}</div>
                  </td>
                  <td className="border-b border-line p-3 text-right">{item.quantity}</td>
                  <td className="border-b border-line p-3 text-right">
                    {formatLkrAmount(item.unitPrice)}
                  </td>
                  <td className="border-b border-line p-3 text-right">
                    {formatLkrAmount(item.discountAmount)}
                  </td>
                  <td className="border-b border-line p-3 text-right font-semibold">
                    {formatLkrAmount(item.lineTotal)}
                  </td>
                  {onReturnItem && (
                    <td className="border-b border-line p-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          className="h-8 w-14 rounded-md border border-line text-center text-sm font-semibold text-ink outline-none focus:border-warning"
                          value={getReturnQuantity(item)}
                          onChange={(event) =>
                            setReturnQuantities((current) => ({
                              ...current,
                              [item.id]: clampReturnQuantity(
                                Number(event.target.value),
                                item.quantity
                              )
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/15"
                          onClick={() => handleReturnClick(item)}
                        >
                          <RotateCcw size={14} />
                          Return
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const Summary: React.FC<{
  label: string
  value: string
  tone: 'muted' | 'warning' | 'success'
}> = ({ label, value, tone }) => (
  <div className={`rounded-lg border p-3 ${getSummaryClass(tone)}`}>
    <div className="text-xs font-semibold uppercase">{label}</div>
    <div className="mt-1 text-lg font-bold">{value}</div>
  </div>
)

function getSummaryClass(tone: 'muted' | 'warning' | 'success'): string {
  if (tone === 'success') return 'border-success/20 bg-success/10 text-success'
  if (tone === 'warning') return 'border-warning/25 bg-warning/10 text-warning'

  return 'border-line bg-subtle text-muted'
}

function clampReturnQuantity(value: number, maxQuantity: number): number {
  if (!Number.isFinite(value)) return 1

  return Math.min(Math.max(1, Math.trunc(value)), Math.max(1, maxQuantity))
}

function formatPaymentMethod(value: SalePaymentMethod): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatBillNumber(sale: SaleRecord): string {
  return sale.dailyBillNumber > 0
    ? sale.dailyBillNumber.toString()
    : formatSaleNumber(sale.saleNumber)
}

function formatSaleNumber(value: string): string {
  const trailingNumber = value.match(/(\d{1,6})$/)?.[1]

  return trailingNumber ?? value
}

function formatDateTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
