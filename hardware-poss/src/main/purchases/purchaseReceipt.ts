import type { PurchaseRecord, PurchasePayTermUnit } from '../../shared/purchases'
import { escapeHtml } from '../pdf'

export function createPurchaseReceiptFileName(purchase: PurchaseRecord): string {
  return `purchase-receipt-${purchase.purchaseNumber}`
}

export function buildPurchaseReceiptHtml(
  purchase: PurchaseRecord,
  logoDataUrl: string,
  generatedAt: Date
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Purchase Receipt ${escapeHtml(purchase.purchaseNumber)}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #ffffff;
        color: #1f2937;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.5;
      }

      .report {
        border: 1px solid #d9e0e7;
        border-radius: 12px;
        overflow: hidden;
      }

      .hero {
        background: #f8fafc;
        border-bottom: 3px solid #0f766e;
        padding: 22px 30px 20px;
      }

      .brand-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo {
        width: 48px;
        height: 48px;
        object-fit: contain;
      }

      .logo-fallback {
        display: flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #0f766e;
        color: #ffffff;
        font-size: 17px;
        font-weight: 800;
      }

      .brand-name {
        color: #111827;
        font-size: 18px;
        font-weight: 800;
      }

      .brand-subtitle {
        margin-top: 2px;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .receipt-stamp {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 12px;
        text-align: right;
      }

      .receipt-stamp-label {
        color: #0f766e;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .receipt-stamp-value {
        margin-top: 2px;
        color: #111827;
        font-size: 13px;
        font-weight: 800;
      }

      .eyebrow {
        margin-top: 20px;
        color: #0f766e;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 6px 0 8px;
        color: #111827;
        font-size: 26px;
        line-height: 1.1;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 14px;
      }

      .meta-item {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px 10px;
      }

      .meta-label {
        color: #64748b;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .meta-value {
        margin-top: 2px;
        color: #111827;
        font-size: 11px;
        font-weight: 700;
        word-break: break-word;
      }

      .content {
        padding: 22px 30px 26px;
      }

      .section {
        margin-top: 20px;
        page-break-inside: avoid;
      }

      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 9px;
      }

      h2 {
        margin: 0;
        color: #111827;
        font-size: 14px;
      }

      .badge {
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        background: #eaf4ff;
        color: #1d4f73;
        padding: 4px 9px;
        font-size: 10px;
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border: 1px solid #dbe4ed;
        border-radius: 8px;
      }

      thead {
        background: #eef6f5;
      }

      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 9px 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #0f766e;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      .right {
        text-align: right;
      }

      .muted {
        color: #6b7280;
      }

      .strong {
        font-weight: 800;
      }

      .no-data {
        color: #6b7280;
        padding: 18px;
        text-align: center;
      }

      .totals {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
      }

      .total-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        min-width: 260px;
      }

      .total-row strong {
        color: #111827;
        font-weight: 800;
      }

      .total-row.grand {
        margin-top: 4px;
        border-top: 2px solid #0f766e;
        padding-top: 8px;
      }

      .total-row.grand strong {
        color: #0f766e;
        font-size: 16px;
      }

      .footer {
        margin-top: 26px;
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
        color: #6b7280;
        font-size: 10px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="hero">
        <div class="brand-row">
          <div class="brand">
            ${receiptLogo(logoDataUrl)}
            <div>
              <div class="brand-name">Grocery POS</div>
              <div class="brand-subtitle">Purchase Receipt</div>
            </div>
          </div>
          <div class="receipt-stamp">
            <div class="receipt-stamp-label">Purchase No.</div>
            <div class="receipt-stamp-value">${escapeHtml(purchase.purchaseNumber)}</div>
          </div>
        </div>
        <div class="eyebrow">Purchase Order</div>
        <h1>${escapeHtml(purchase.supplierName || 'Supplier Receipt')}</h1>
        <div class="meta">
          ${metaItem('Status', formatPurchaseStatus(purchase.status))}
          ${metaItem('Supplier Type', purchase.supplierType === 'BUSINESS' ? 'Business' : 'Individual')}
          ${metaItem('Mobile No.', purchase.mobileNo || '-')}
          ${metaItem('Contact ID', purchase.contactId || '-')}
          ${metaItem('Email', purchase.email || '-')}
          ${metaItem('Address', purchase.address || '-')}
          ${metaItem('Business Location', purchase.businessLocation || '-')}
          ${metaItem('Pay Term', formatPayTerm(purchase.payTermValue, purchase.payTermUnit))}
          ${metaItem('Created', formatDateTime(purchase.createdAt))}
        </div>
      </header>

      <section class="content">
        <section class="section">
          <div class="section-title">
            <h2>Purchase Items</h2>
            <span class="badge">${purchase.items.length} item(s)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="right">Qty</th>
                <th class="right">Price (LKR)</th>
                <th class="right">Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${
                purchase.items.length > 0
                  ? purchase.items
                      .map(
                        (item) => `
                <tr>
                  <td>
                    <span class="strong">${escapeHtml(item.productName)}</span>
                    ${item.sku ? `<br /><span class="muted">${escapeHtml(item.sku)}</span>` : ''}
                  </td>
                  <td class="right">${item.quantity}</td>
                  <td class="right">${formatLkr(item.unitPrice)}</td>
                  <td class="right"><span class="strong">${formatLkr(item.lineTotal)}</span></td>
                </tr>
              `
                      )
                      .join('')
                  : '<tr><td class="no-data" colspan="4">No items found on this purchase.</td></tr>'
              }
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="muted">Subtotal</span>
              <strong>${formatLkr(purchase.subtotal)}</strong>
            </div>
            ${
              purchase.discountAmount > 0
                ? `<div class="total-row">
                  <span class="muted">Discount</span>
                  <strong>- ${formatLkr(purchase.discountAmount)}</strong>
                </div>`
                : ''
            }
            ${
              purchase.advanceBalance > 0
                ? `<div class="total-row">
                  <span class="muted">Advance Balance</span>
                  <strong>${formatLkr(purchase.advanceBalance)}</strong>
                </div>`
                : ''
            }
            <div class="total-row grand">
              <span>Total</span>
              <strong>${formatLkr(purchase.total)}</strong>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <h2>Payments</h2>
            <span class="badge">${purchase.payments.length} record(s)</span>
          </div>
          ${
            purchase.payments.length > 0
              ? `<table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th class="right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${purchase.payments
                .map(
                  (payment) => `
                <tr>
                  <td>${escapeHtml(formatDateOnly(payment.paidOn))}</td>
                  <td>${escapeHtml(formatPaymentMethod(payment.paymentMethod))}</td>
                  <td class="right"><span class="strong">${formatLkr(payment.amount)}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
              : '<div class="no-data" style="border:1px solid #e2e8f0;border-radius:8px;">No payment records.</div>'
          }
        </section>

        <div class="footer">
          This receipt was generated by the Grocery POS system on ${escapeHtml(
            formatDateTime(generatedAt)
          )}.
        </div>
      </section>
    </main>
  </body>
</html>`
}

function receiptLogo(logoDataUrl: string): string {
  if (!logoDataUrl) {
    return '<div class="logo-fallback">GP</div>'
  }

  return `<img class="logo" src="${logoDataUrl}" alt="Grocery POS logo" />`
}

function metaItem(label: string, value: string): string {
  return `
    <div class="meta-item">
      <div class="meta-label">${escapeHtml(label)}</div>
      <div class="meta-value">${escapeHtml(value)}</div>
    </div>
  `
}

function formatLkr(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatPurchaseStatus(status: string): string {
  const labels: Record<string, string> = {
    RECEIVED: 'Received',
    PENDING: 'Pending',
    ORDERED: 'Ordered'
  }

  return labels[status] ?? status
}

function formatPayTerm(value: number, unit: PurchasePayTermUnit): string {
  if (value <= 0) return '-'

  return `${value} ${unit === 'MONTHS' ? (value === 1 ? 'month' : 'months') : value === 1 ? 'day' : 'days'}`
}

function formatPaymentMethod(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDateOnly(value: string): string {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString()
}

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString()
}
