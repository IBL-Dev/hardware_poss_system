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
import type { SaleItemRecord, SalePaymentMethod, SaleRecord } from '../../../../shared/sales'

interface SaleDetailsModalProps {
  sale: SaleRecord | null
  onClose: () => void
  onReturnItem?: (itemId: number, quantity: number) => Promise<void>
}

type DetailTab = 'bill' | 'items'

const STORE_NAME = 'Alufix Engineering'
const STORE_ADDRESS_LINES = [
  'Kandy Road, Dambulugama, Dambulla'
]
const STORE_PHONE = '076 654 5140'

// ===============================
// PRINT PRESETS
// ===============================
const PRINTER_HINT = 'POSPrinter POS80'
const DEFAULT_PAPER_WIDTH_MM = 72
const DEFAULT_RECEIPT_TEXT_WIDTH = 42

const PAPER_WIDTH_TEXT_WIDTH_PRESETS: Record<number, number> = {
  58: 32,
  72: DEFAULT_RECEIPT_TEXT_WIDTH,
  80: 48
}

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
      const result = await window.api.receipt.printReceipt({
        html: buildBillPrintHtml(sale),
        text: buildBillPrintText(sale),
        printerName: PRINTER_HINT
      })

      if (!result.success) {
        toast.error(result.message ?? 'Bill could not be printed.')
        return
      }

      toast.success(`Bill #${billNumber} was sent to the printer.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
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

function getSaleSubtotal(sale: SaleRecord): number {
  return Math.round(sale.items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100
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

// ============================================================
// BILL REPRINT (THERMAL PRINT)
// ============================================================

function getReceiptTextWidth(paperWidthMm: number): number {
  const preset = PAPER_WIDTH_TEXT_WIDTH_PRESETS[paperWidthMm]

  if (preset) return preset

  const proportionalWidth = Math.round(
    (paperWidthMm / DEFAULT_PAPER_WIDTH_MM) * DEFAULT_RECEIPT_TEXT_WIDTH
  )

  return Math.max(20, proportionalWidth)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bill could not be printed.'
}

function cleanReceiptText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '?').trim()
}

function receiptDivider(character = '-', width: number = DEFAULT_RECEIPT_TEXT_WIDTH): string {
  return character.repeat(width)
}

function centerReceiptText(value: string, width: number = DEFAULT_RECEIPT_TEXT_WIDTH): string {
  const text = cleanReceiptText(value)

  if (text.length >= width) return text.slice(0, width)

  const leftPadding = Math.floor((width - text.length) / 2)

  return `${' '.repeat(leftPadding)}${text}`
}

function centerTextInWidth(value: string, width: number): string {
  if (value.length >= width) return value.slice(0, width)

  const leftPadding = Math.floor((width - value.length) / 2)
  const rightPadding = width - value.length - leftPadding

  return `${' '.repeat(leftPadding)}${value}${' '.repeat(rightPadding)}`
}

function wrapReceiptText(value: string, maxWidth: number = DEFAULT_RECEIPT_TEXT_WIDTH): string[] {
  const words = cleanReceiptText(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }

      for (let index = 0; index < word.length; index += maxWidth) {
        lines.push(word.slice(index, index + maxWidth))
      }

      return
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word

    if (nextLine.length > maxWidth) {
      lines.push(currentLine)
      currentLine = word
      return
    }

    currentLine = nextLine
  })

  if (currentLine) lines.push(currentLine)

  return lines.length > 0 ? lines : ['']
}

function scaleReceiptColumnWidths(baseWidths: number[], totalWidth: number): number[] {
  const baseTotal = baseWidths.reduce((sum, width) => sum + width, 0)

  if (baseTotal === totalWidth || baseTotal === 0) return baseWidths

  const scaled = baseWidths.map((width) =>
    Math.max(1, Math.round((width / baseTotal) * totalWidth))
  )

  const scaledTotal = scaled.reduce((sum, width) => sum + width, 0)
  const diff = totalWidth - scaledTotal

  scaled[0] = Math.max(1, scaled[0] + diff)

  return scaled
}

function formatReceiptColumns(
  values: string[],
  widths: number[],
  alignments: Array<'left' | 'center' | 'right'> = [],
  totalWidth: number = DEFAULT_RECEIPT_TEXT_WIDTH
): string {
  return values
    .map((value, index) => {
      const width = widths[index] ?? Math.floor(totalWidth / values.length)
      const alignment = alignments[index] ?? 'left'
      const text = cleanReceiptText(value).slice(0, width)

      if (alignment === 'right') return text.padStart(width, ' ')
      if (alignment === 'center') return centerTextInWidth(text, width)

      return text.padEnd(width, ' ')
    })
    .join('')
    .slice(0, totalWidth)
}

function formatReceiptPair(
  leftValue: string,
  rightValue: string,
  width: number = DEFAULT_RECEIPT_TEXT_WIDTH
): string {
  const left = cleanReceiptText(leftValue)
  const right = cleanReceiptText(rightValue)
  const gap = width - left.length - right.length

  if (gap > 0) return `${left}${' '.repeat(gap)}${right}`

  return `${left.slice(0, Math.max(0, width - right.length - 1))} ${right}`.slice(0, width)
}

function getPrintedBusinessName(sale: SaleRecord): string {
  if (sale.customerBusinessName?.trim()) return sale.customerBusinessName.trim()

  return sale.isWholeSale && sale.customerName?.trim() ? sale.customerName.trim() : ''
}

function formatNumberedReceiptItemLine(
  itemNumber: number,
  itemName: string,
  quantity: string,
  unitPrice: string,
  amount: string,
  totalWidth: number = DEFAULT_RECEIPT_TEXT_WIDTH
): string[] {
  const [numberWidth, qtyWidth, priceWidth, amountWidth] = scaleReceiptColumnWidths(
    [4, 5, 8, 8],
    Math.max(12, Math.round((25 / DEFAULT_RECEIPT_TEXT_WIDTH) * totalWidth))
  )
  const rightWidth = numberWidth + qtyWidth + priceWidth + amountWidth
  const nameWidth = Math.max(1, totalWidth - rightWidth)
  const nameLines = wrapReceiptText(itemName, nameWidth)
  const numberText = cleanReceiptText(itemNumber.toString()).slice(0, numberWidth)
  const quantityText = centerTextInWidth(cleanReceiptText(quantity).slice(0, qtyWidth), qtyWidth)

  const firstLine = `${numberText.padEnd(numberWidth, ' ')}${nameLines[0].padEnd(
    nameWidth,
    ' '
  )}${quantityText}${cleanReceiptText(unitPrice)
    .slice(0, priceWidth)
    .padStart(priceWidth, ' ')}${cleanReceiptText(amount)
    .slice(0, amountWidth)
    .padStart(amountWidth, ' ')}`

  const continuationLines = nameLines
    .slice(1)
    .map((line) => `${''.padEnd(numberWidth, ' ')}${line.padEnd(nameWidth, ' ')}`)

  return [firstLine, ...continuationLines]
}

function formatReceiptQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0'

  return String(Number(value.toFixed(3)))
}

function getBillItemDiscountAmount(item: SaleItemRecord): number {
  const requestedDiscount = Number(item.discountAmount ?? 0)

  return Number.isFinite(requestedDiscount) && requestedDiscount > 0 ? requestedDiscount : 0
}

function buildBillPrintText(sale: SaleRecord): string {
  const textWidth = getReceiptTextWidth(DEFAULT_PAPER_WIDTH_MM)
  const lines: string[] = []
  const itemDiscountTotal = sale.items.reduce((sum, item) => sum + item.discountAmount, 0)
  const businessName = getPrintedBusinessName(sale)
  const itemNameLines = (item: SaleItemRecord): string =>
    item.sku ? `${item.sku} ${item.productName}` : item.productName

  lines.push(centerReceiptText(STORE_NAME, textWidth))
  STORE_ADDRESS_LINES.forEach((line) => {
    lines.push(centerReceiptText(line, textWidth))
  })
  lines.push(centerReceiptText(STORE_PHONE, textWidth))
  lines.push(receiptDivider('=', textWidth))
  lines.push(`Bill No: ${formatBillNumber(sale)}`.slice(0, textWidth))
  lines.push(`Date: ${formatDateTime(sale.paidAt)}`.slice(0, textWidth))
  lines.push(`Payment: ${formatPaymentMethod(sale.paymentMethod)}`.slice(0, textWidth))

  if (sale.customerName?.trim()) {
    lines.push(`Customer: ${cleanReceiptText(sale.customerName)}`.slice(0, textWidth))
  }

  if (businessName) {
    lines.push(`Business: ${businessName}`.slice(0, textWidth))
  }

  lines.push('')

  const productColumnWidths = scaleReceiptColumnWidths([4, 16, 6, 8, 8], textWidth)

  lines.push(
    formatReceiptColumns(
      ['No.', 'Item', 'Qty', 'Price', 'Amount'],
      productColumnWidths,
      ['left', 'left', 'center', 'right', 'right'],
      textWidth
    )
  )

  lines.push(receiptDivider('-', textWidth))

  sale.items.forEach((item, index) => {
    const lineDiscountAmount = getBillItemDiscountAmount(item)
    const lineTotal = item.lineTotal

    lines.push(
      ...formatNumberedReceiptItemLine(
        index + 1,
        itemNameLines(item),
        formatReceiptQuantity(item.quantity),
        formatLkrAmount(item.unitPrice),
        formatLkrAmount(lineTotal),
        textWidth
      )
    )

    if (lineDiscountAmount > 0) {
      lines.push(
        formatReceiptPair('   Item discount:', `-${formatLkrAmount(lineDiscountAmount)}`, textWidth)
      )
    }

    lines.push('')
  })

  lines.push(receiptDivider('-', textWidth))
  lines.push(formatReceiptPair('Sub Total:', formatLkrAmount(getSaleSubtotal(sale)), textWidth))

  if (itemDiscountTotal > 0) {
    lines.push(
      formatReceiptPair('Item Discounts:', `-${formatLkrAmount(itemDiscountTotal)}`, textWidth)
    )
  }

  if (sale.discountAmount > 0) {
    lines.push(
      formatReceiptPair('Bill Discount:', `-${formatLkrAmount(sale.discountAmount)}`, textWidth)
    )
  }

  lines.push(formatReceiptPair('Net Total:', formatLkrAmount(sale.total), textWidth))
  lines.push(receiptDivider('=', textWidth))
  lines.push(centerReceiptText('Thank You for Shopping With Us', textWidth))
  lines.push(centerReceiptText('Please Visit Us Again', textWidth))
  lines.push(receiptDivider('-', textWidth))
  lines.push('')

  return lines.join('\n')
}

function buildBillPrintHtml(sale: SaleRecord): string {
  const itemDiscountTotal = sale.items.reduce((sum, item) => sum + item.discountAmount, 0)
  const itemsHtml = sale.items
    .map((item, index) => {
      const discountHtml =
        item.discountAmount > 0
          ? `<div class="receipt-row item-discount"><span>   Item discount</span><span>-${formatLkrAmount(
              item.discountAmount
            )}</span></div>`
          : ''

      return `
            <div class="receipt-item">
              <div class="receipt-row">
                <span class="item-index">${index + 1}.</span>
                <span class="item-name">${escapeReceiptHtml(item.productName)}</span>
                <span>${formatReceiptQuantity(item.quantity)}</span>
                <span>${formatLkrAmount(item.unitPrice)}</span>
                <span class="amount">${formatLkrAmount(item.lineTotal)}</span>
              </div>
              ${discountHtml}
            </div>`
    })
    .join('')

  const customerHtml = sale.customerName?.trim()
    ? `<div class="receipt-meta-row"><span class="receipt-meta-label">Customer</span><span>${escapeReceiptHtml(
        sale.customerName.trim()
      )}</span></div>`
    : ''

  const businessHtml = getPrintedBusinessName(sale)
    ? `<div class="receipt-meta-row"><span class="receipt-meta-label">Business</span><span class="font-bold">${escapeReceiptHtml(
        getPrintedBusinessName(sale)
      )}</span></div>`
    : ''

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bill - ${formatBillNumber(sale)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          @page { size: 72mm 155mm; margin: 0; }

          html { width: 72mm; background: #ffffff; margin: 0; padding: 0; }

          body {
            width: 72mm;
            padding: 0.5mm 2mm 20mm 2mm;
            margin: 0;
            background: #ffffff;
            color: #000000;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .store-name {
            margin-bottom: 2px;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 2px;
            text-align: center;
          }

          .store-line {
            text-align: center;
          }

          .dashed-line { margin: 6px 0; border-top: 1px dashed #000000; }
          .solid-line { margin: 4px 0; border-top: 1px solid #000000; }

          .receipt-meta-row { display: flex; }
          .receipt-meta-label { width: 80px; flex-shrink: 0; }
          .receipt-meta-rows { margin-top: 4px; margin-bottom: 4px; }

          .receipt-row { display: flex; justify-content: space-between; gap: 8px; }

          .receipt-item { margin-bottom: 8px; }

          .item-index { margin-right: 8px; }
          .item-name { flex: 1; min-width: 0; word-break: break-word; font-weight: 700; }
          .amount { font-weight: 700; }

          .item-discount { font-size: 10px; }

          .font-bold { font-weight: 700; }

          th, td { text-align: left; }

          .amounts { margin-top: 4px; }

          .totals-row { display: flex; justify-content: space-between; }
          .totals-row strong { font-weight: 700; }

          .thank-you { text-align: center; font-size: 13px; font-weight: 700; line-height: 20px; }
        </style>
      </head>
      <body>
        <div class="store-name">${STORE_NAME}</div>
        ${STORE_ADDRESS_LINES.map((line) => `<div class="store-line">${line}</div>`).join('')}
        <div class="store-line">${STORE_PHONE}</div>

        <div class="dashed-line"></div>

        <div class="receipt-meta-rows">
          <div class="receipt-meta-row"><span class="receipt-meta-label">Bill No</span><span class="font-bold">${formatBillNumber(
            sale
          )}</span></div>
          <div class="receipt-meta-row"><span class="receipt-meta-label">Date</span><span>${formatDateTime(
            sale.paidAt
          )}</span></div>
          <div class="receipt-meta-row"><span class="receipt-meta-label">Payment</span><span>${formatPaymentMethod(
            sale.paymentMethod
          )}</span></div>
          ${customerHtml}
          ${businessHtml}
        </div>

        <div class="solid-line"></div>

        <div class="receipt-row font-bold">
          <span>No.</span>
          <span class="item-name">Item</span>
          <span>Qty</span>
          <span>Price</span>
          <span class="amount">Amount</span>
        </div>

        <div class="solid-line"></div>

        ${itemsHtml}

        <div class="solid-line"></div>

        <div class="amounts">
          <div class="totals-row"><span>Sub Total:</span><span>${formatLkrAmount(
            getSaleSubtotal(sale)
          )}</span></div>
          ${
            itemDiscountTotal > 0
              ? `<div class="totals-row"><span>Item Discounts:</span><span>-${formatLkrAmount(
                  itemDiscountTotal
                )}</span></div>`
              : ''
          }
          ${
            sale.discountAmount > 0
              ? `<div class="totals-row"><span>Bill Discount:</span><span>-${formatLkrAmount(
                  sale.discountAmount
                )}</span></div>`
              : ''
          }
          <div class="totals-row"><strong>Net Total:</strong><strong>${formatLkrAmount(
            sale.total
          )}</strong></div>
        </div>

        <div class="dashed-line"></div>

        <div class="thank-you">
          <div>Thank You for Shopping With Us</div>
          <div>Please Visit Us Again</div>
        </div>

        <div class="dashed-line"></div>
      </body>
    </html>
  `
}

function escapeReceiptHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}