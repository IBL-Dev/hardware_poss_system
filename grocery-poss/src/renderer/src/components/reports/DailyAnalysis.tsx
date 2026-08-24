import React from 'react'
import { Activity } from 'lucide-react'
import { formatLkr } from '../../utils/currency'
import type { SalesReportSummary } from '../../../../shared/sales'

interface DailyAnalysisProps {
  summary: SalesReportSummary | null
  isLoading?: boolean
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({ summary, isLoading = false }) => {
  const netSales = Math.max(0, (summary?.todaySales ?? 0) - (summary?.todayTax ?? 0))

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-[1.05rem] font-semibold">
        <Activity size={20} className="text-primary" />
        Daily Analysis
      </h2>
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="mb-1 text-[0.85rem] text-muted">Today Sales (LKR)</div>
          <div className="text-xl font-semibold text-success">
            {isLoading ? 'Loading...' : formatLkr(summary?.todaySales ?? 0)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="mb-1 text-[0.85rem] text-muted">Today Tax (LKR)</div>
          <div className="text-xl font-semibold text-warning">
            {isLoading ? 'Loading...' : formatLkr(summary?.todayTax ?? 0)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="mb-1 text-[0.85rem] text-muted">Transactions</div>
          <div className="text-xl font-semibold">
            {isLoading ? '-' : (summary?.todayTransactions ?? 0)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-gray-50 p-4">
          <div className="mb-1 text-[0.85rem] text-muted">Net Sales (LKR)</div>
          <div className="text-xl font-semibold text-primary">
            {isLoading ? 'Loading...' : formatLkr(netSales)}
          </div>
        </div>
      </div>
      <p className="text-[0.9rem] leading-relaxed text-muted">
        {summary && summary.todayTransactions > 0
          ? `${summary.todayItems} item(s) sold today across ${summary.todayTransactions} paid transaction(s).`
          : 'No paid sales recorded for today yet.'}
      </p>
    </div>
  )
}
