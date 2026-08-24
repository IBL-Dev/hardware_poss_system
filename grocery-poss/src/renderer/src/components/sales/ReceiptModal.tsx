import React, { useEffect, useRef, useState } from 'react'
import { Printer, ShoppingBag, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { formatLkrAmount } from '../../utils/currency'
import type { SalePaymentMethod } from '../../../../shared/sales'

interface CartItem {
  id: number
  sku?: string
  name: string
  price: number
  quantity: number
  discountAmount?: number
}

interface ReceiptModalProps {
  isOpen: boolean
  cartItems: CartItem[]
  subtotal: number
  tax: number
  discountAmount: number
  total: number
  cashReceivedAmount?: number
  balanceAmount?: number
  saleNumber?: string
  dailyBillNumber?: number
  paidAt?: string
  paymentMethod: SalePaymentMethod
  cashierName?: string
  customerName?: string
  onProcessToBill?: () => Promise<ReceiptSaleSnapshot | null>
  onClose: () => void
  onNewSale: () => void
  // Thermal paper width in millimetres for the PRINTED receipt only
  // (e.g. 58, 72, 80). Defaults to 72mm to preserve existing behaviour.
  paperWidthMm?: number
}

interface ReceiptSaleSnapshot {
  saleNumber: string
  dailyBillNumber: number
  paidAt: string
  paymentMethod: SalePaymentMethod
}

const STORE_NAME = 'NMS Trade Centre'
const STORE_ADDRESS_LINES = [
  'Master town',
  'No 1',
  'Main street, Jayamawaththa junction',
  'Balaluwewa, palagala,kekirawa'
]
const STORE_PHONE = '077 727 1160'

// ===============================
// PAPER WIDTH -> TEXT WIDTH
// ===============================
// Baseline: 72mm thermal paper fits 42 monospace characters per line.
// This ratio is used to derive a sensible character width for other
// common paper widths (58mm, 80mm, etc.) so the plain-text receipt
// (used by ESC/POS style raw text printing) stays readable and
// doesn't overflow/underflow the physical paper.
const DEFAULT_PAPER_WIDTH_MM = 72
const DEFAULT_RECEIPT_TEXT_WIDTH = 42

// Known-good presets for the most common thermal paper sizes.
// Falls back to a proportional calculation for anything else.
const PAPER_WIDTH_TEXT_WIDTH_PRESETS: Record<number, number> = {
  58: 32,
  72: DEFAULT_RECEIPT_TEXT_WIDTH,
  80: 48
}

function getReceiptTextWidth(paperWidthMm: number): number {
  const preset = PAPER_WIDTH_TEXT_WIDTH_PRESETS[paperWidthMm]

  if (preset) return preset

  const proportionalWidth = Math.round(
    (paperWidthMm / DEFAULT_PAPER_WIDTH_MM) * DEFAULT_RECEIPT_TEXT_WIDTH
  )

  return Math.max(20, proportionalWidth)
}

// ===============================
// PRINT SPACING
// ===============================
// Very small space at top of paper
const RECEIPT_TOP_PADDING_MM = 0.5

// Extra blank space at bottom of paper
const RECEIPT_BOTTOM_PADDING_MM = 20

function createReceiptDate(paidAt?: string): Date {
  if (!paidAt) return new Date()

  const normalizedDate = paidAt.includes('T') ? paidAt : paidAt.replace(' ', 'T')

  const parsedDate = new Date(normalizedDate)

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
}

function waitForReceiptRender(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function formatReceiptDateTime(date: Date): string {
  const dateStr = date.toLocaleDateString('en-LK', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const timeStr = date.toLocaleTimeString('en-LK', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return `${dateStr} ${timeStr}`
}

function writeReceiptDateTime(receiptElement: HTMLElement, printDate: Date): void {
  const dateTimeElement = receiptElement.querySelector('[data-receipt-date-time]')

  if (dateTimeElement) {
    dateTimeElement.textContent = formatReceiptDateTime(printDate)
  }
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  cartItems,
  subtotal,
  discountAmount,
  total,
  cashReceivedAmount,
  balanceAmount,
  saleNumber,
  dailyBillNumber,
  paidAt,
  paymentMethod,
  cashierName = 'CASHIER',
  onProcessToBill,
  onClose,
  onNewSale,
  paperWidthMm = DEFAULT_PAPER_WIDTH_MM
}) => {
  const receiptRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  const isPrintingRef = useRef(false)
  const toast = useToast()
  const [generatedBillNumber, setGeneratedBillNumber] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [printedAt, setPrintedAt] = useState<Date | null>(null)
  const [processedSale, setProcessedSale] = useState<ReceiptSaleSnapshot | null>(null)
  const processedSaleRef = useRef<ReceiptSaleSnapshot | null>(null)

  useEffect(() => {
    const activeSaleNumber = processedSale?.saleNumber ?? saleNumber
    const activeDailyBillNumber = processedSale?.dailyBillNumber ?? dailyBillNumber
    const providedSaleNumber = activeSaleNumber?.trim()
    const providedDailyBillNumber =
      activeDailyBillNumber && activeDailyBillNumber > 0 ? activeDailyBillNumber.toString() : ''

    if (!isOpen) {
      wasOpenRef.current = false
      setGeneratedBillNumber('')
      setPrintedAt(null)
      setProcessedSale(null)
      processedSaleRef.current = null
      return
    }

    if (providedDailyBillNumber) {
      setGeneratedBillNumber(providedDailyBillNumber)
      wasOpenRef.current = true
      return
    }

    if (providedSaleNumber) {
      setGeneratedBillNumber(formatReceiptBillNumber(providedSaleNumber))
      wasOpenRef.current = true
      return
    }

    if (!wasOpenRef.current) {
      setGeneratedBillNumber('PREVIEW')
    }

    wasOpenRef.current = true
  }, [dailyBillNumber, isOpen, processedSale, saleNumber])

  if (!isOpen) return null

  const activeSaleNumber = processedSale?.saleNumber ?? saleNumber
  const activeDailyBillNumber = processedSale?.dailyBillNumber ?? dailyBillNumber
  const activePaidAt = processedSale?.paidAt ?? paidAt
  const activePaymentMethod = processedSale?.paymentMethod ?? paymentMethod
  const receiptDate = printedAt ?? createReceiptDate(activePaidAt)
  const billNumber =
    activeDailyBillNumber && activeDailyBillNumber > 0
      ? activeDailyBillNumber.toString()
      : generatedBillNumber ||
        (activeSaleNumber ? formatReceiptBillNumber(activeSaleNumber) : 'PREVIEW')
  const displayBillNumber =
    billNumber === 'PREVIEW' ? 'Preview' : formatReceiptBillNumber(billNumber)
  const receiptTitle = displayBillNumber === 'Preview' ? 'Bill Preview' : 'Payment Receipt'

  const receiptDateTime = formatReceiptDateTime(receiptDate)

  const itemDiscountTotal = roundReceiptAmount(
    cartItems.reduce((sum, item) => sum + getReceiptItemDiscountAmount(item), 0)
  )
  const discount = normalizeReceiptAmount(discountAmount)
  const net = normalizeReceiptAmount(total)
  const receivedAmount = normalizeReceiptAmount(cashReceivedAmount ?? net)
  const balance = normalizeReceiptAmount(balanceAmount ?? Math.max(0, receivedAmount - net))

  // Resolve the printed-paper text width for this render, based on
  // the requested physical paper width (falls back to 72mm/42 chars).
  const resolvedPaperWidthMm =
    Number.isFinite(paperWidthMm) && paperWidthMm > 0 ? paperWidthMm : DEFAULT_PAPER_WIDTH_MM

  const receiptTextWidth = getReceiptTextWidth(resolvedPaperWidthMm)

  // ============================================================
  // BUILD HTML FOR ACTUAL HARD-COPY THERMAL PRINTER
  // ============================================================
  const buildReceiptHtml = (printDate: Date): string => {
    const receiptElement = receiptRef.current?.cloneNode(true)

    if (receiptElement instanceof HTMLElement) {
      writeReceiptDateTime(receiptElement, printDate)
    }

    const printContent =
      receiptElement instanceof HTMLElement
        ? receiptElement.innerHTML
        : receiptRef.current?.innerHTML

    if (!printContent) return ''

    /*
      Thermal paper width is configurable via `paperWidthMm`
      (defaults to 72mm). Common widths: 58mm, 72mm, 80mm.

      The previous code used:
        Math.max(210, 135 + cartItems.length * 24)

      210mm is A4-like height and can create unnecessary paper length.

      Here we calculate the page based on the receipt content and
      explicitly add extra bottom space.
    */
    const pageHeightMm = Math.max(155, 135 + cartItems.length * 24 + RECEIPT_BOTTOM_PADDING_MM)

    const paperWidthCss = `${resolvedPaperWidthMm}mm`

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>Receipt - ${billNumber}</title>

          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            /*
              IMPORTANT FOR THERMAL PRINTER

              Paper width:
              ${paperWidthCss} (configurable via paperWidthMm prop)

              Page height:
              dynamically calculated above
            */
            @page {
              size: ${paperWidthCss} ${pageHeightMm}mm;
              margin: 0;
            }

            html {
              width: ${paperWidthCss};
              background: #ffffff;
              margin: 0;
              padding: 0;
            }

            body {
              width: ${paperWidthCss};

              /*
                TOP = 0.5mm
                LEFT = 2mm
                RIGHT = 2mm
                BOTTOM = 20mm

                This is the actual hard-copy spacing.
              */
              padding:
                ${RECEIPT_TOP_PADDING_MM}mm
                2mm
                ${RECEIPT_BOTTOM_PADDING_MM}mm
                2mm;

              margin: 0;

              background: #ffffff;
              color: #000000;

              font-family: 'Courier New', monospace;
              font-size: 12px;

              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .receipt-inner {
              width: 100%;
              margin: 0;
              padding: 0;
            }

            .text-center {
              text-align: center;
            }

            .text-right {
              text-align: right;
            }

            .text-left {
              text-align: left;
            }

            .font-bold,
            .font-semibold,
            .font-black {
              font-weight: 700;
            }

            .store-name {
              margin-bottom: 2px;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 2px;
            }

            .dashed-line {
              margin: 6px 0;
              border-top: 1px dashed #000000;
            }

            .solid-line {
              margin: 4px 0;
              border-top: 1px solid #000000;
            }

            .receipt-row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }

            .receipt-grid-four {
              display: grid;
              grid-template-columns: 1fr auto auto auto;
              column-gap: 4px;
            }

            .receipt-summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              column-gap: 4px;
            }

            .receipt-meta-row {
              display: flex;
            }

            .receipt-meta-label {
              width: 80px;
            }

            .receipt-item {
              margin-bottom: 8px;
            }

            .receipt-notice {
              text-align: center;
              font-size: 10px;
              line-height: 16px;
            }

            @media print {
              html,
              body {
                width: ${paperWidthCss};
                margin: 0;
              }

              body {
                padding-top: ${RECEIPT_TOP_PADDING_MM}mm;
                padding-bottom: ${RECEIPT_BOTTOM_PADDING_MM}mm;
              }
            }
          </style>
        </head>

        <body>
          ${printContent}
        </body>
      </html>
    `
  }

  // ============================================================
  // BUILD TEXT RECEIPT
  // ============================================================
  const buildReceiptText = (
    saleSnapshot: ReceiptSaleSnapshot | null = null,
    printDate: Date = new Date()
  ): string => {
    const lines: string[] = []
    const textWidth = receiptTextWidth
    const printSale = saleSnapshot ?? processedSaleRef.current
    const printBillNumber =
      printSale && printSale.dailyBillNumber > 0 ? printSale.dailyBillNumber.toString() : billNumber
    const printDateTime = formatReceiptDateTime(printDate)
    const printPaymentMethod = printSale?.paymentMethod ?? activePaymentMethod
    const printReceivedAmount = printPaymentMethod === 'CASH' ? receivedAmount : net
    const printBalance = printPaymentMethod === 'CASH' ? balance : 0

    lines.push(centerReceiptText(STORE_NAME, textWidth))
    STORE_ADDRESS_LINES.forEach((line) => {
      lines.push(centerReceiptText(line, textWidth))
    })
    lines.push(centerReceiptText(STORE_PHONE, textWidth))
    lines.push(receiptDivider('=', textWidth))
    lines.push(
      `Bill No: ${cleanReceiptText(formatReceiptBillNumber(printBillNumber))}`.slice(0, textWidth)
    )
    lines.push(`Date: ${printDateTime}`.slice(0, textWidth))
    lines.push(`Payment: ${formatPaymentMethod(printPaymentMethod)}`.slice(0, textWidth))
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

    cartItems.forEach((item, index) => {
      const itemName = item.sku ? `${item.sku} ${item.name}` : item.name

      const lineDiscountAmount = getReceiptItemDiscountAmount(item)
      const lineTotal = getReceiptItemLineTotal(item)

      lines.push(
        ...formatNumberedReceiptItemLine(
          index + 1,
          itemName,
          formatReceiptQuantity(item.quantity),
          formatLkrAmount(item.price),
          formatLkrAmount(lineTotal),
          textWidth
        )
      )

      if (lineDiscountAmount > 0) {
        lines.push(
          formatReceiptPair(
            '   Item discount:',
            `-${formatLkrAmount(lineDiscountAmount)}`,
            textWidth
          )
        )
      }

      lines.push('')
    })

    lines.push(receiptDivider('-', textWidth))

    lines.push(formatReceiptPair('Sub Total:', formatLkrAmount(subtotal), textWidth))
    if (itemDiscountTotal > 0) {
      lines.push(
        formatReceiptPair('Item Discounts:', `-${formatLkrAmount(itemDiscountTotal)}`, textWidth)
      )
    }
    if (discount > 0) {
      lines.push(formatReceiptPair('Bill Discount:', `-${formatLkrAmount(discount)}`, textWidth))
    }
    lines.push(formatReceiptPair('Net Total:', formatLkrAmount(net), textWidth))
    lines.push(
      formatReceiptPair(
        `${printPaymentMethod === 'CASH' ? 'Cash Received' : formatPaymentMethod(printPaymentMethod)}:`,
        formatLkrAmount(printReceivedAmount),
        textWidth
      )
    )
    lines.push(formatReceiptPair('Balance:', formatLkrAmount(printBalance), textWidth))

    lines.push(receiptDivider('=', textWidth))

    lines.push(centerReceiptText('Thank You for Shopping With Us', textWidth))

    lines.push(centerReceiptText('Please Visit Us Again', textWidth))

    lines.push(receiptDivider('-', textWidth))

    lines.push(...wrapReceiptText('', textWidth))

    return lines.join('\n')
  }

  // ============================================================
  // SEND RECEIPT TO PRINTER
  // ============================================================
  const ensureProcessedSale = async (): Promise<ReceiptSaleSnapshot | null> => {
    if (processedSaleRef.current) {
      return processedSaleRef.current
    }

    if (!onProcessToBill) {
      return null
    }

    const savedSale = await onProcessToBill()

    if (!savedSale) {
      return null
    }

    processedSaleRef.current = savedSale
    setProcessedSale(savedSale)
    await waitForReceiptRender()

    return savedSale
  }

  const sendReceiptToPrinter = async (): Promise<boolean> => {
    if (isPrintingRef.current) return false

    isPrintingRef.current = true
    setIsPrinting(true)

    try {
      const savedSale = await ensureProcessedSale()

      if (onProcessToBill && !savedSale) {
        return false
      }

      const printStartedAt = new Date()
      const html = buildReceiptHtml(printStartedAt)

      if (!html) {
        toast.error('Receipt content is not ready to print.')
        return false
      }

      const result = await window.api.receipt.printReceipt({
        html,
        text: buildReceiptText(savedSale, printStartedAt),
        printerName: 'POSPrinter POS80'
      })

      if (!result.success) {
        toast.error(result.message ?? 'Receipt could not be printed.')

        return false
      }

      setPrintedAt(printStartedAt)
      return true
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
    } finally {
      isPrintingRef.current = false
      setIsPrinting(false)
    }
  }

  const handlePrint = (): void => {
    void sendReceiptToPrinter()
  }

  const handleProcessToBill = async (): Promise<void> => {
    const printed = await sendReceiptToPrinter()

    if (printed) {
      onNewSale()
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-[26rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ======================================================
            HEADER
        ====================================================== */}
        <div className="flex items-center justify-between bg-gray-900 px-5 py-3.5">
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag size={18} />

            <span className="text-sm font-semibold tracking-wide">{receiptTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
            >
              <Printer size={13} />

              {isPrinting ? 'Printing...' : 'Print'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close receipt"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ======================================================
            RECEIPT PREVIEW
        ====================================================== */}
        <div className="flex-1 overflow-y-auto bg-[#f5f3ef] p-4">
          <div
            ref={receiptRef}
            className="receipt-inner mx-auto w-full max-w-[300px] bg-white px-4 pt-1 pb-20 font-mono shadow-sm"
            style={{
              fontFamily: "'Courier Prime', 'Courier New', monospace"
            }}
          >
            {/* STORE HEADER */}
            <div className="text-center">
              <div
                className="store-name text-[18px] font-black tracking-[3px]"
                style={{
                  letterSpacing: '3px'
                }}
              >
                {STORE_NAME}
              </div>

              <div className="text-[11px] leading-5 text-gray-700">
                {STORE_ADDRESS_LINES.map((line) => (
                  <React.Fragment key={line}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
                {STORE_PHONE}
              </div>
            </div>

            {/* DIVIDER */}
            <div className="dashed-line my-3 border-t border-dashed border-gray-400" />

            {/* RECEIPT DETAILS */}
            <div className="mt-2 space-y-0.5 text-[11px]">
              <div className="receipt-meta-row flex">
                <span className="receipt-meta-label w-20 text-gray-600">Cashier</span>

                <span className="mr-1 text-gray-600">:</span>

                <span className="font-semibold">{cashierName}</span>
              </div>

              <div className="receipt-meta-row flex">
                <span className="receipt-meta-label w-20 text-gray-600">Bill No</span>

                <span className="mr-1 text-gray-600">:</span>

                <span className="font-semibold">{displayBillNumber}</span>
              </div>

              <div className="receipt-meta-row flex">
                <span className="receipt-meta-label w-20 text-gray-600">Date</span>

                <span className="mr-1 text-gray-600">:</span>

                <span className="font-semibold" data-receipt-date-time>
                  {receiptDateTime}
                </span>
              </div>

              <div className="receipt-meta-row flex">
                <span className="receipt-meta-label w-20 text-gray-600">Payment</span>

                <span className="mr-1 text-gray-600">:</span>

                <span className="font-semibold">{formatPaymentMethod(activePaymentMethod)}</span>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="solid-line my-2 border-t border-gray-800" />

            {/* COLUMN HEADERS */}
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_3.5rem_4rem] items-center gap-x-1 text-[10px] font-bold text-gray-700">
              <span>No.</span>

              <span className="min-w-0">Item</span>

              <span className="text-center">Qty</span>

              <span className="text-right">Price</span>

              <span className="text-right">Amount</span>
            </div>

            {/* DIVIDER */}
            <div className="solid-line mb-1 border-t border-gray-800" />

            {/* ITEMS */}
            {cartItems.map((item, index) => {
              const lineDiscountAmount = getReceiptItemDiscountAmount(item)
              const lineTotal = getReceiptItemLineTotal(item)

              return (
                <div key={item.id} className="receipt-item mb-2">
                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_3.5rem_4rem] items-center gap-x-1 text-[10px]">
                    <span className="text-gray-700">{index + 1}</span>

                    <span className="min-w-0 break-words font-bold text-gray-800">
                      {item.sku ? `${item.sku} ${item.name}` : item.name}
                    </span>

                    <span className="text-center text-gray-700">
                      {formatReceiptQuantity(item.quantity)}
                    </span>

                    <span className="text-right text-gray-700">{formatLkrAmount(item.price)}</span>

                    <span className="text-right font-semibold text-gray-800">
                      {formatLkrAmount(lineTotal)}
                    </span>
                  </div>
                  {lineDiscountAmount > 0 && (
                    <div className="mt-0.5 grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_3.5rem_4rem] items-center gap-x-1 text-[10px] text-gray-700">
                      <span />
                      <span className="min-w-0">Item discount</span>
                      <span />
                      <span />
                      <span className="text-right font-semibold">
                        -{formatLkrAmount(lineDiscountAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* DIVIDER */}
            <div className="solid-line border-t border-gray-800" />

            <div className="mt-2 space-y-1 text-[11px]">
              <ReceiptAmountRow label="Sub Total" value={formatLkrAmount(subtotal)} />

              {itemDiscountTotal > 0 && (
                <ReceiptAmountRow
                  label="Item Discounts"
                  value={`-${formatLkrAmount(itemDiscountTotal)}`}
                />
              )}

              {discount > 0 && (
                <ReceiptAmountRow label="Bill Discount" value={`-${formatLkrAmount(discount)}`} />
              )}

              <ReceiptAmountRow label="Net Total" value={formatLkrAmount(net)} strong />
              <ReceiptAmountRow
                label={
                  activePaymentMethod === 'CASH'
                    ? 'Cash Received'
                    : formatPaymentMethod(activePaymentMethod)
                }
                value={formatLkrAmount(activePaymentMethod === 'CASH' ? receivedAmount : net)}
              />
              <ReceiptAmountRow
                label="Balance"
                value={formatLkrAmount(activePaymentMethod === 'CASH' ? balance : 0)}
                strong
              />
            </div>

            {/* THANK YOU DIVIDER */}
            <div className="dashed-line my-3 border-t border-dashed border-gray-400" />

            {/* THANK YOU */}
            <div className="text-center text-[13px] font-bold leading-6">
              <div>Thank You for Shopping With Us</div>

              <div>Please Visit Us Again</div>
            </div>

            {/* FINAL DIVIDER */}
            <div className="dashed-line my-2 border-t border-dashed border-gray-400" />

            {/* NOTICE - KEPT COMMENTED AS ORIGINAL */}
            {/*<div className="receipt-notice text-center text-[10px] leading-4 text-gray-600">*/}
            {/*  <span className="font-semibold">Important Notice:</span>{' '}*/}
            {/*  Please check your items and bill carefully before leaving the*/}
            {/*  supermarket. Keep this receipt for future reference.*/}
            {/*</div>*/}
          </div>
        </div>

        {/* ======================================================
            BOTTOM BUTTONS
        ====================================================== */}
        <div className="flex gap-3 border-t border-gray-200 bg-white p-4">
          <button
            type="button"
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            onClick={handleProcessToBill}
            disabled={isPrinting}
          >
            {isPrinting ? 'Printing...' : 'Process to Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ReceiptAmountRow: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong = false
}) => (
  <div className={`receipt-row flex justify-between ${strong ? 'font-black' : 'font-semibold'}`}>
    <span>{label}:</span>
    <span>{value}</span>
  </div>
)

// ============================================================
// PAYMENT METHOD
// ============================================================

function formatPaymentMethod(value: SalePaymentMethod): string {
  const paymentMethodLabels: Record<SalePaymentMethod, string> = {
    CASH: 'Cash',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_PAY: 'Mobile Pay',
    CREDIT: 'Credit'
  }

  return paymentMethodLabels[value] ?? value
}

// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Receipt could not be printed.'
}

// ============================================================
// RECEIPT QUANTITY
// ============================================================

function formatReceiptQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0'

  return String(Number(value.toFixed(3)))
}

// ============================================================
// RECEIPT DIVIDER
// ============================================================

function receiptDivider(character = '-', width: number = DEFAULT_RECEIPT_TEXT_WIDTH): string {
  return character.repeat(width)
}

// ============================================================
// CENTER TEXT
// ============================================================

function centerReceiptText(value: string, width: number = DEFAULT_RECEIPT_TEXT_WIDTH): string {
  const text = cleanReceiptText(value)

  if (text.length >= width) {
    return text.slice(0, width)
  }

  const leftPadding = Math.floor((width - text.length) / 2)

  return `${' '.repeat(leftPadding)}${text}`
}

// ============================================================
// RECEIPT PAIR
// ============================================================

function formatReceiptPair(
  leftValue: string,
  rightValue: string,
  width: number = DEFAULT_RECEIPT_TEXT_WIDTH
): string {
  const left = cleanReceiptText(leftValue)
  const right = cleanReceiptText(rightValue)

  const gap = width - left.length - right.length

  if (gap > 0) {
    return `${left}${' '.repeat(gap)}${right}`
  }

  return `${left.slice(0, Math.max(0, width - right.length - 1))} ${right}`.slice(0, width)
}

// ============================================================
// SCALE COLUMN WIDTHS TO PAPER WIDTH
// ============================================================
// Proportionally scales a set of base column widths (designed for the
// 42-char / 72mm baseline) to fit a different total text width, so
// column layouts stay balanced on narrower/wider thermal paper.
// Any rounding remainder is absorbed by the first (flexible) column.

function scaleReceiptColumnWidths(baseWidths: number[], totalWidth: number): number[] {
  const baseTotal = baseWidths.reduce((sum, width) => sum + width, 0)

  if (baseTotal === totalWidth || baseTotal === 0) {
    return baseWidths
  }

  const scaled = baseWidths.map((width) =>
    Math.max(1, Math.round((width / baseTotal) * totalWidth))
  )

  const scaledTotal = scaled.reduce((sum, width) => sum + width, 0)
  const diff = totalWidth - scaledTotal

  scaled[0] = Math.max(1, scaled[0] + diff)

  return scaled
}

// ============================================================
// RECEIPT COLUMNS
// ============================================================

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

      if (alignment === 'right') {
        return text.padStart(width, ' ')
      }

      if (alignment === 'center') {
        return centerTextInWidth(text, width)
      }

      return text.padEnd(width, ' ')
    })
    .join('')
    .slice(0, totalWidth)
}

function centerTextInWidth(value: string, width: number): string {
  if (value.length >= width) {
    return value.slice(0, width)
  }

  const leftPadding = Math.floor((width - value.length) / 2)
  const rightPadding = width - value.length - leftPadding

  return `${' '.repeat(leftPadding)}${value}${' '.repeat(rightPadding)}`
}

// ============================================================
// WRAP RECEIPT TEXT
// ============================================================

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

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

function formatReceiptBillNumber(value: string): string {
  const trailingNumber = value.match(/(\d{1,6})$/)?.[1]

  return trailingNumber ?? value
}

function normalizeReceiptAmount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function roundReceiptAmount(value: number): number {
  return Math.round(value * 100) / 100
}

function getReceiptItemGrossTotal(item: CartItem): number {
  return roundReceiptAmount(item.price * item.quantity)
}

function getReceiptItemDiscountAmount(item: CartItem): number {
  const requestedDiscount = Number(item.discountAmount ?? 0)

  if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0) {
    return 0
  }

  return roundReceiptAmount(Math.min(requestedDiscount, getReceiptItemGrossTotal(item)))
}

function getReceiptItemLineTotal(item: CartItem): number {
  return Math.max(
    0,
    roundReceiptAmount(getReceiptItemGrossTotal(item) - getReceiptItemDiscountAmount(item))
  )
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

  const firstLine = `${numberText.padEnd(numberWidth, ' ')}${nameLines[0].padEnd(nameWidth, ' ')}${quantityText}${cleanReceiptText(
    unitPrice
  )
    .slice(0, priceWidth)
    .padStart(priceWidth, ' ')}${cleanReceiptText(amount)
    .slice(0, amountWidth)
    .padStart(amountWidth, ' ')}`

  const continuationLines = nameLines
    .slice(1)
    .map((line) => `${''.padEnd(numberWidth, ' ')}${line.padEnd(nameWidth, ' ')}`)

  return [firstLine, ...continuationLines]
}

// ============================================================
// CLEAN RECEIPT TEXT
// ============================================================

function cleanReceiptText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '?').trim()
}
