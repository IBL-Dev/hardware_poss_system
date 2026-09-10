import React, { useState } from 'react'
import { History, ReceiptText } from 'lucide-react'
import { BillHistoryPanel } from '../components/sales/BillHistoryPanel'
import { SaleDetailsModal } from '../components/sales/SaleDetailsModal'
import type { SaleRecord } from '../../../shared/sales'

const SalesHistoryPage: React.FC = () => {
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-40px)] min-h-[44rem] flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
            <History size={19} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Bill History</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-emerald-700">
                Sales Archive
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <ReceiptText size={12} className="mr-1 inline" />
              View receipts and reprint any completed bill
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <BillHistoryPanel onView={setSelectedSale} />
      </div>

      <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  )
}

export default SalesHistoryPage