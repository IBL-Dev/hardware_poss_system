import React, { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { reportsApi } from '../../api/reportsApi'
import { useToast } from '../../context/ToastContext'
import { formatLkr } from '../../utils/currency'
import type { SalesReportSummary } from '../../../../shared/sales'
import type { SalesReportType } from '../../../../shared/reports'

interface ReportGeneratorProps {
  summary: SalesReportSummary | null
  isLoading?: boolean
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ summary, isLoading = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())
  const [downloadingReport, setDownloadingReport] = useState<SalesReportType | null>(null)
  const toast = useToast()
  const monthOptions = buildMonthOptions()
  const isBusy = isLoading || downloadingReport !== null

  const handleGenerateDaily = async (): Promise<void> => {
    const today = getDateKey(new Date())
    await downloadReport({
      type: 'DAILY',
      dateFrom: today,
      dateTo: today,
      periodLabel: formatDateLabel(today)
    })
  }

  const handleGenerateMonthly = async (): Promise<void> => {
    const range = getMonthRange(selectedMonth)
    await downloadReport({
      type: 'MONTHLY',
      ...range,
      periodLabel: formatMonthLabel(selectedMonth)
    })
  }

  const downloadReport = async (input: {
    type: SalesReportType
    dateFrom: string
    dateTo: string
    periodLabel: string
  }): Promise<void> => {
    setDownloadingReport(input.type)
    try {
      const result = await reportsApi.downloadSalesPdf(input)

      if (result.saved) {
        toast.success('PDF report downloaded successfully.')
      } else {
        toast.info('PDF download was cancelled.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF report.')
    } finally {
      setDownloadingReport(null)
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[1.05rem] font-semibold">
        <FileText size={20} className="text-primary" />
        Report Snapshot
      </h2>
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="text-[0.85rem] font-medium text-muted">Total Paid Sales (LKR)</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {isLoading ? 'Loading...' : formatLkr(summary?.totalSales ?? 0)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="text-[0.85rem] font-medium text-muted">Average Sale (LKR)</div>
          <div className="mt-1 text-xl font-bold text-primary">
            {isLoading ? 'Loading...' : formatLkr(summary?.averageSale ?? 0)}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.9rem] text-muted">Daily Summary</label>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-faint"
            disabled={isBusy}
            onClick={handleGenerateDaily}
          >
            <Download size={16} />
            {downloadingReport === 'DAILY' ? 'Downloading...' : 'Download Daily PDF'}
          </button>
        </div>

        <hr className="my-4 border-t border-line" />

        <div className="flex flex-col gap-2">
          <label className="text-[0.9rem] text-muted">Monthly Summary</label>
          <select
            className="w-full rounded-md border border-line bg-white p-3 font-sans text-[0.95rem] text-ink"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={isBusy}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-transparent py-3 font-medium text-primary transition-colors hover:bg-primary/6 disabled:cursor-not-allowed disabled:border-line disabled:text-faint"
            disabled={isBusy}
            onClick={handleGenerateMonthly}
          >
            <Download size={16} />
            {downloadingReport === 'MONTHLY' ? 'Downloading...' : 'Download Monthly PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

function getCurrentMonthKey(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function buildMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const current = new Date()

  for (let index = 0; index < 6; index += 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    options.push({ value, label: formatMonthLabel(value) })
  }

  return options
}

function getMonthRange(monthKey: string): { dateFrom: string; dateTo: string } {
  const [yearValue, monthValue] = monthKey.split('-')
  const year = Number(yearValue)
  const month = Number(monthValue)
  const lastDay = new Date(year, month, 0).getDate()

  return {
    dateFrom: `${monthKey}-01`,
    dateTo: `${monthKey}-${String(lastDay).padStart(2, '0')}`
  }
}

function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMonthLabel(monthKey: string): string {
  const [yearValue, monthValue] = monthKey.split('-')
  const date = new Date(Number(yearValue), Number(monthValue) - 1, 1)

  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
