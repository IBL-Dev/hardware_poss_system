import type { SaleItemRecord, SalePaymentMethod, SaleRecord } from '../../../shared/sales'
import { formatLkrAmount } from './currency'

// ===============================
// STORE INFORMATION
// ===============================
export const STORE_NAME = 'Alufix Engineering'
export const STORE_ADDRESS_LINES = ['Kandy Road, Dambulugama, Dambulla']
export const STORE_PHONE = '076 654 5140'

// ===============================
// PRINT PRESETS
// ===============================
export const PRINTER_HINT = 'POSPrinter POS80'
export const DEFAULT_PAPER_WIDTH_MM = 72
export const DEFAULT_RECEIPT_TEXT_WIDTH = 42

const PAPER_WIDTH_TEXT_WIDTH_PRESETS: Record<number, number> = {
  58: 32,
  72: DEFAULT_RECEIPT_TEXT_WIDTH,
  80: 48
}

export interface PrintSaleBillResult {
  success: boolean
  message?: string
}

export async function printSaleBill(sale: SaleRecord): Promise<PrintSaleBillResult> {
  try {
    const result = await window.api.receipt.printReceipt({
      html: buildBillPrintHtml(sale),
      text: buildBillPrintText(sale),
      printerName: PRINTER_HINT
    })

    if (!result.success) {
      return { success: false, message: result.message ?? 'Bill could not be printed.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, message: getErrorMessage(error) }
  }
}

export function getSaleSubtotal(sale: SaleRecord): number {
  return Math.round(sale.items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100
}

export function formatPaymentMethod(value: SalePaymentMethod): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function formatBillNumber(sale: SaleRecord): string {
  return sale.dailyBillNumber > 0
    ? sale.dailyBillNumber.toString()
    : formatSaleNumber(sale.saleNumber)
}

function formatSaleNumber(value: string): string {
  const trailingNumber = value.match(/(\d{1,6})$/)?.[1]

  return trailingNumber ?? value
}

export function formatDateTime(value: string): string {
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
  return sale.customerBusinessName?.trim() ?? ''
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
