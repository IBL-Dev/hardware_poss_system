import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  FileBarChart,
  FileText,
  LineChart,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
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

  /* ==========================================================
     LOAD REPORT SUMMARY
  ========================================================== */

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
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to load report data.'
          )
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
    <div className="flex min-h-full flex-col gap-5">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <BarChart3 size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Reports
                </h1>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  Sales Analytics
                </span>
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Monitor hardware store sales, transactions and business performance
              </p>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            {isLoading ? (
              <>
                <RefreshCw
                  size={15}
                  className="animate-spin text-emerald-600"
                />

                <span className="text-xs font-semibold text-slate-500">
                  Loading report data...
                </span>
              </>
            ) : (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                  <TrendingUp
                    size={14}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                    Report Status
                  </p>

                  <p className="text-xs font-semibold text-slate-700">
                    Data Updated
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          REPORT WORKSPACE
      ====================================================== */}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.82fr)]">
        {/* ====================================================
            MAIN ANALYTICS
        ==================================================== */}

        <div className="flex min-w-0 flex-col gap-5">
          {/* ==================================================
              SALES PERFORMANCE
          ================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <LineChart
                    size={16}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Sales Performance
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Daily revenue and transaction activity
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-emerald-700">
                Performance
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <IncomeExpenseChart
                data={summary?.dailySales ?? []}
                isLoading={isLoading}
              />
            </div>
          </section>

          {/* ==================================================
              DAILY ANALYSIS
          ================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <BarChart3
                    size={16}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Daily Analysis
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Key daily hardware store performance indicators
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">
                Overview
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <DailyAnalysis
                summary={summary}
                isLoading={isLoading}
              />
            </div>
          </section>
        </div>

        {/* ====================================================
            REPORT GENERATOR
        ==================================================== */}

        <aside className="min-w-0 xl:sticky xl:top-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
                  <FileText
                    size={17}
                    className="text-white"
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Report Generator
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Generate business reports from the available sales data
                  </p>
                </div>
              </div>
            </div>

            {/* ================================================
                REPORT TYPE INFO
            ================================================ */}

            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                <FileBarChart
                  size={16}
                  className="shrink-0 text-emerald-600"
                />

                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-800">
                    Hardware Sales Report
                  </p>

                  <p className="mt-0.5 text-[0.7rem] leading-4 text-emerald-600">
                    Use current sales information for reporting
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <ReportGenerator
                summary={summary}
                isLoading={isLoading}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ReportsPage