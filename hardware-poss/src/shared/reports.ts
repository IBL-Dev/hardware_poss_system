export const SALES_REPORT_TYPES = ['DAILY', 'MONTHLY'] as const

export type SalesReportType = (typeof SALES_REPORT_TYPES)[number]

export interface DownloadSalesReportInput {
  type: SalesReportType
  dateFrom: string
  dateTo: string
  periodLabel: string
}

export interface DownloadSalesReportResult {
  saved: boolean
  filePath?: string
}

export interface ReportsApi {
  downloadSalesPdf: (input: DownloadSalesReportInput) => Promise<DownloadSalesReportResult>
}
