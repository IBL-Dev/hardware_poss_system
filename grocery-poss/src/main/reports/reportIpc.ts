import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import logoPath from '../../../resources/icon.png?asset'
import { getDatabase } from '../database'
import { ProductRepository } from '../products/productRepository'
import { SaleRepository } from '../sales/saleRepository'
import { SaleService } from '../sales/saleService'
import type { DailySalesSummary, PaymentSummary, SalesReportSummary } from '../../shared/sales'
import {
  SALES_REPORT_TYPES,
  type DownloadSalesReportInput,
  type DownloadSalesReportResult,
  type SalesReportType
} from '../../shared/reports'

interface ReportModel {
  type: SalesReportType
  periodLabel: string
  dateFrom: string
  dateTo: string
  generatedAt: Date
  logoDataUrl: string
  summary: SalesReportSummary
}

export function registerReportHandlers(): void {
  const database = getDatabase()
  const saleService = new SaleService(new SaleRepository(database), new ProductRepository(database))

  ipcMain.handle(
    'reports:download-sales-pdf',
    async (event, input: DownloadSalesReportInput): Promise<DownloadSalesReportResult> => {
      const reportInput = normalizeReportInput(input)
      const summary = saleService.getSummary({
        dateFrom: reportInput.dateFrom,
        dateTo: reportInput.dateTo
      })
      const report: ReportModel = {
        ...reportInput,
        generatedAt: new Date(),
        logoDataUrl: await getReportLogoDataUrl(),
        summary
      }
      const ownerWindow = BrowserWindow.fromWebContents(event.sender)
      const saveOptions: SaveDialogOptions = {
        title: 'Download Sales Report',
        defaultPath: `${createReportFileName(report)}.pdf`,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      }
      const saveResult = ownerWindow
        ? await dialog.showSaveDialog(ownerWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions)

      if (saveResult.canceled || !saveResult.filePath) {
        return { saved: false }
      }

      const pdf = await createPdfBuffer(buildSalesReportHtml(report))
      await writeFile(saveResult.filePath, pdf)

      return { saved: true, filePath: saveResult.filePath }
    }
  )
}

function normalizeReportInput(input: DownloadSalesReportInput): DownloadSalesReportInput {
  if (!SALES_REPORT_TYPES.includes(input?.type)) {
    throw new Error('Report type is invalid.')
  }

  const dateFrom = input.dateFrom?.trim()
  const dateTo = input.dateTo?.trim()
  const periodLabel = input.periodLabel?.trim()

  if (!isDateKey(dateFrom) || !isDateKey(dateTo)) {
    throw new Error('Report date range is invalid.')
  }

  if (dateFrom > dateTo) {
    throw new Error('Report start date must be before the end date.')
  }

  return {
    type: input.type,
    dateFrom,
    dateTo,
    periodLabel: periodLabel || `${dateFrom} to ${dateTo}`
  }
}

async function createPdfBuffer(html: string): Promise<Buffer> {
  const reportWindow = new BrowserWindow({
    width: 794,
    height: 1123,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  try {
    await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await reportWindow.webContents.executeJavaScript(
      'document.fonts ? document.fonts.ready.then(() => true) : true'
    )

    try {
      return await reportWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          marginType: 'none'
        }
      })
    } catch (error) {
      if (!isPdfMarginError(error)) {
        throw error
      }

      return await reportWindow.webContents.printToPDF({
        printBackground: true
      })
    }
  } finally {
    reportWindow.destroy()
  }
}

function buildSalesReportHtml(report: ReportModel): string {
  const { summary } = report
  const netSales = Math.max(0, summary.totalSales - summary.totalTax)
  const title = report.type === 'DAILY' ? 'Daily Sales Report' : 'Monthly Sales Report'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
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
        padding: 24px 30px 22px;
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

      .report-stamp {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        color: #334155;
        padding: 7px 10px;
        text-align: right;
      }

      .report-stamp-label {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .report-stamp-value {
        margin-top: 2px;
        font-size: 12px;
        font-weight: 800;
      }

      .eyebrow {
        margin-top: 22px;
        color: #0f766e;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 7px 0 8px;
        color: #111827;
        font-size: 27px;
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
      }

      .content {
        padding: 24px 30px 30px;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 22px;
      }

      .card {
        min-height: 82px;
        border: 1px solid #dbe4ed;
        border-radius: 8px;
        background: #ffffff;
        padding: 13px;
      }

      .card-label {
        color: #6b7280;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .card-value {
        margin-top: 6px;
        color: #111827;
        font-size: 16px;
        font-weight: 800;
      }

      .section {
        margin-top: 22px;
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
        font-size: 15px;
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

      tbody tr:nth-child(even) {
        background: #fbfdff;
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

      .footer {
        margin-top: 28px;
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
            ${reportLogo(report.logoDataUrl)}
            <div>
              <div class="brand-name">Grocery POS</div>
              <div class="brand-subtitle">Sales Performance Report</div>
            </div>
          </div>
          <div class="report-stamp">
            <div class="report-stamp-label">Report Type</div>
            <div class="report-stamp-value">${escapeHtml(report.type === 'DAILY' ? 'Daily' : 'Monthly')}</div>
          </div>
        </div>
        <div class="eyebrow">Grocery POS</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Period</div>
            <div class="meta-value">${escapeHtml(report.periodLabel)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Date Range</div>
            <div class="meta-value">${escapeHtml(report.dateFrom)} to ${escapeHtml(report.dateTo)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Generated</div>
            <div class="meta-value">${escapeHtml(formatDateTime(report.generatedAt))}</div>
          </div>
        </div>
      </header>

      <section class="content">
        <div class="cards">
          ${metricCard('Paid Sales (LKR)', formatLkr(summary.totalSales))}
          ${metricCard('Net Sales (LKR)', formatLkr(netSales))}
          ${metricCard('Tax (LKR)', formatLkr(summary.totalTax))}
          ${metricCard('Average Sale (LKR)', formatLkr(summary.averageSale))}
        </div>

        <div class="cards">
          ${metricCard('Transactions', summary.totalTransactions.toString())}
          ${metricCard('Payment Methods', summary.paymentBreakdown.length.toString())}
          ${metricCard('Top Products', summary.topProducts.length.toString())}
          ${metricCard('Report Type', report.type === 'DAILY' ? 'Daily' : 'Monthly')}
        </div>

        ${dailySalesTable(summary.dailySales)}
        ${paymentTable(summary.paymentBreakdown)}
        ${topProductsTable(summary.topProducts)}

        <div class="footer">
          This PDF was generated from paid sales stored in the Grocery POS system.
        </div>
      </section>
    </main>
  </body>
</html>`
}

function isPdfMarginError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('margins')
}

async function getReportLogoDataUrl(): Promise<string> {
  try {
    const logo = await readFile(logoPath)
    return `data:image/png;base64,${logo.toString('base64')}`
  } catch {
    return ''
  }
}

function reportLogo(logoDataUrl: string): string {
  if (!logoDataUrl) {
    return '<div class="logo-fallback">GP</div>'
  }

  return `<img class="logo" src="${logoDataUrl}" alt="Grocery POS logo" />`
}

function metricCard(label: string, value: string): string {
  return `
    <div class="card">
      <div class="card-label">${escapeHtml(label)}</div>
      <div class="card-value">${escapeHtml(value)}</div>
    </div>
  `
}

function dailySalesTable(rows: DailySalesSummary[]): string {
  return `
    <section class="section">
      <div class="section-title">
        <h2>Sales by Date</h2>
        <span class="badge">${rows.length} row(s)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="right">Transactions</th>
            <th class="right">Sales (LKR)</th>
            <th class="right">Tax (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length > 0
              ? rows
                  .map(
                    (row) => `
              <tr>
                <td><span class="strong">${escapeHtml(row.label)}</span><br /><span class="muted">${escapeHtml(row.date)}</span></td>
                <td class="right">${row.transactions}</td>
                <td class="right">${formatLkrAmount(row.total)}</td>
                <td class="right">${formatLkrAmount(row.tax)}</td>
              </tr>
            `
                  )
                  .join('')
              : '<tr><td class="no-data" colspan="4">No paid sales found for this period.</td></tr>'
          }
        </tbody>
      </table>
    </section>
  `
}

function paymentTable(rows: PaymentSummary[]): string {
  return `
    <section class="section">
      <div class="section-title">
        <h2>Payment Summary</h2>
        <span class="badge">By method</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Payment Method</th>
            <th class="right">Transactions</th>
            <th class="right">Total (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length > 0
              ? rows
                  .map(
                    (row) => `
              <tr>
                <td>${escapeHtml(formatPaymentMethod(row.paymentMethod))}</td>
                <td class="right">${row.transactions}</td>
                <td class="right">${formatLkrAmount(row.total)}</td>
              </tr>
            `
                  )
                  .join('')
              : '<tr><td class="no-data" colspan="3">No payment data found for this period.</td></tr>'
          }
        </tbody>
      </table>
    </section>
  `
}

function topProductsTable(rows: SalesReportSummary['topProducts']): string {
  return `
    <section class="section">
      <div class="section-title">
        <h2>Top Products</h2>
        <span class="badge">By revenue</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th class="right">Qty</th>
            <th class="right">Revenue (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length > 0
              ? rows
                  .map(
                    (row) => `
              <tr>
                <td>${escapeHtml(row.productName)}</td>
                <td>${escapeHtml(row.sku)}</td>
                <td class="right">${row.quantity}</td>
                <td class="right">${formatLkrAmount(row.total)}</td>
              </tr>
            `
                  )
                  .join('')
              : '<tr><td class="no-data" colspan="4">No product sales found for this period.</td></tr>'
          }
        </tbody>
      </table>
    </section>
  `
}

function createReportFileName(report: ReportModel): string {
  return `${report.type.toLowerCase()}-sales-report-${report.dateFrom}-to-${report.dateTo}`
}

function isDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

function formatLkr(value: number): string {
  return formatLkrAmount(value)
}

function formatLkrAmount(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatPaymentMethod(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDateTime(date: Date): string {
  return date.toLocaleString()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
