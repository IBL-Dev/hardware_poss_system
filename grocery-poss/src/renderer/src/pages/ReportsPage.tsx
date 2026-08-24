import React, { useEffect, useState } from 'react'
import { IncomeExpenseChart } from '../components/reports/IncomeExpenseChart'
import { DailyAnalysis } from '../components/reports/DailyAnalysis'
import { ReportGenerator } from '../components/reports/ReportGenerator'
import { useToast } from '../context/ToastContext'
import { salesApi } from '../api/salesApi'
import type { SalesReportSummary } from '../../../shared/sales'

const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<SalesReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let isActive = true

    salesApi
      .summary()
      .then((loadedSummary) => {
        if (isActive) {
          setSummary(loadedSummary)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Failed to load report data.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [toast])

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Track paid sales, tax, transactions, and payment performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <IncomeExpenseChart data={summary?.dailySales ?? []} isLoading={isLoading} />
          <DailyAnalysis summary={summary} isLoading={isLoading} />
        </div>
        <div>
          <ReportGenerator summary={summary} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
