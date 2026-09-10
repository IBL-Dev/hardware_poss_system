import React, { useState } from 'react'
import {
  Briefcase,
  ListOrdered,
  Printer,
  ReceiptText,
  RotateCcw,
  UserRound,
  X
} from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatLkr, formatLkrAmount } from '../../utils/currency'
import {
  STORE_ADDRESS_LINES,
  STORE_NAME,
  STORE_PHONE,
  formatBillNumber,
  formatDateTime,
  formatPaymentMethod,
  getSaleSubtotal,
  printSaleBill
} from '../../utils/receiptPrinting'
import type { SaleItemRecord, SaleRecord } from '../../../../shared/sales'

interface SaleDetailsModalProps {
  sale: SaleRecord | null
  onClose: () => void
  onReturnItem?: (itemId: number, quantity: number) => Promise<void>
}

type DetailTab = 'bill' | 'items'

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  onClose,
  onReturnItem
}) => {
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({})
  const [activeTab, setActiveTab] = useState<DetailTab>('bill')
  const [isPrinting, setIsPrinting] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

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

  const handlePrintBill = async (): Promise<void> => {
    if (isPrinting) return

    setIsPrinting(true)

    try {
      const result = await printSaleBill(sale)

      if (!result.success) {
        toast.error(result.message ?? 'Bill could not be printed.')
        return
      }

      toast.success(`Bill #${billNumber} was sent to the printer.`)
    } finally {
      setIsPrinting(false)
    }
  }

  const tabStyle = (tab: DetailTab): string =>
    `flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
      activeTab === tab
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
        : 'border-line bg-bg text-muted hover:bg-hover hover:text-ink'
    }`

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
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-line disabled:bg-bg disabled:text-muted"
              onClick={() => void handlePrintBill()}
              disabled={isPrinting}
              title="Print this bill"
            >
              <Printer size={15} />
              {isPrinting ? 'Printing...' : 'Print Bill'}
            </button>

            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
              onClick={onClose}
              aria-label="Close sale details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={tabStyle('bill')}
            onClick={() => setActiveTab('bill')}
          >
            <ReceiptText size={14} />
            Whole Bill
          </button>
          <button
            type="button"
            className={tabStyle('items')}
            onClick={() => setActiveTab('items')}
          >
            <ListOrdered size={14} />
            Items
          </button>
        </div>

        {activeTab === 'bill' ? (
          <WholeBill sale={sale} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

const WholeBill: React.FC<{ sale: SaleRecord }> = ({ sale }) => {
  const itemDiscountTotal = sale.items.reduce((sum, item) => sum + item.discountAmount, 0)

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-dashed border-line p-5 text-center">
        <div className="text-xl font-black tracking-[3px] text-ink">{STORE_NAME}</div>
        <div className="mt-1 text-xs leading-5 text-muted">
          {STORE_ADDRESS_LINES.map((line) => (
            <React.Fragment key={line}>
              {line}
              <br />
            </React.Fragment>
          ))}
          {STORE_PHONE}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-dashed border-line px-5 py-4 text-sm">
        <div>
          <span className="mr-1 text-xs font-semibold text-muted">Bill No</span>
          <span className="font-bold text-ink">#{formatBillNumber(sale)}</span>
        </div>
        <div>
          <span className="mr-1 text-xs font-semibold text-muted">Date</span>
          <span className="font-semibold text-ink">{formatDateTime(sale.paidAt)}</span>
        </div>
        <div>
          <span className="mr-1 text-xs font-semibold text-muted">Payment</span>
          <span className="font-semibold text-ink">{formatPaymentMethod(sale.paymentMethod)}</span>
        </div>
      </div>

      {sale.customerName && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-dashed border-line bg-subtle/60 px-5 py-4 text-sm">
          <div className="flex items-center gap-2">
            <UserRound size={15} className="text-accent" />
            <div>
              <div className="text-[0.68rem] font-bold tracking-wide text-muted uppercase">
                Customer
              </div>
              <div className="font-bold text-ink">{sale.customerName}</div>
            </div>
          </div>
          {sale.customerBusinessName && (
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-accent" />
              <div>
                <div className="text-[0.68rem] font-bold tracking-wide text-muted uppercase">
                  Business Name
                </div>
                <div className="font-bold text-ink">{sale.customerBusinessName}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b border-line px-5 py-2.5 text-[0.72rem] font-bold text-muted uppercase">
                Item
              </th>
              <th className="border-b border-line px-3 py-2.5 text-right text-[0.72rem] font-bold text-muted uppercase">
                Qty
              </th>
              <th className="border-b border-line px-3 py-2.5 text-right text-[0.72rem] font-bold text-muted uppercase">
                Price
              </th>
              <th className="border-b border-line px-3 py-2.5 text-right text-[0.72rem] font-bold text-muted uppercase">
                Discount
              </th>
              <th className="border-b border-line px-5 py-2.5 text-right text-[0.72rem] font-bold text-muted uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-line px-5 py-3">
                  <div className="font-semibold text-ink">{item.productName}</div>
                  <div className="text-[0.7rem] text-muted">{item.sku}</div>
                </td>
                <td className="border-b border-line px-3 py-3 text-right">{item.quantity}</td>
                <td className="border-b border-line px-3 py-3 text-right">
                  {formatLkrAmount(item.unitPrice)}
                </td>
                <td className="border-b border-line px-3 py-3 text-right">
                  {item.discountAmount > 0
                    ? `-${formatLkrAmount(item.discountAmount)}`
                    : '—'}
                </td>
                <td className="border-b border-line px-5 py-3 text-right font-semibold">
                  {formatLkrAmount(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5 border-t border-dashed border-line px-5 py-4 text-sm sm:ml-auto sm:w-72">
        <BillRow label="Sub Total" value={formatLkrAmount(getSaleSubtotal(sale))} />
        {itemDiscountTotal > 0 && (
          <BillRow label="Item Discounts" value={`-${formatLkrAmount(itemDiscountTotal)}`} />
        )}
        {sale.discountAmount > 0 && (
          <BillRow label="Bill Discount" value={`-${formatLkrAmount(sale.discountAmount)}`} />
        )}
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="font-bold text-ink">Net Total</span>
          <span className="text-lg font-extrabold text-success">{formatLkr(sale.total)}</span>
        </div>
      </div>
    </div>
  )
}

const BillRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-muted">
    <span>{label}</span>
    <span className="font-semibold text-ink">{value}</span>
  </div>
)

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