import type { DownloadSalesReportInput, DownloadSalesReportResult } from '../../../shared/reports'

export const reportsApi = {
  downloadSalesPdf: (input: DownloadSalesReportInput): Promise<DownloadSalesReportResult> =>
    window.api.reports.downloadSalesPdf(input)
}
