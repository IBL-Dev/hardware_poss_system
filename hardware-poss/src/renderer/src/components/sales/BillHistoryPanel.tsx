import React, { useEffect, useMemo, useState } from 'react'
import { Eye, History, Printer, ReceiptText, Search, X } from 'lucide-react'
import { salesApi } from '../../api/salesApi'
import { useToast } from '../../context/ToastContext'
import { formatLkr } from '../../utils/currency'
import {
  formatBillNumber,
  formatDateTime,
  formatPaymentMethod,
  printSaleBill
} from '../../utils/receiptPrinting'
import type { SaleRecord } from '../../../../shared/sales'

interface BillHistoryPanelProps {
  onView: (sale: SaleRecord) => void
}

const MAX_HISTORY_ITEMS = 100

export const BillHistoryPanel: React.FC<BillHistoryPanelProps> = ({ onView }) => {
  const toast = useToast()
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isActive = true

    salesApi
      .list()
      .then((loadedSales) => {
        if (isActive) {
          setSales(loadedSales)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Bill history could not be loaded.')
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

  const visibleSales = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const sortedSales = [...sales].sort((a, b) => {
      const dateOrder = b.paidAt.localeCompare(a.paidAt)
      return dateOrder !== 0 ? dateOrder : b.id - a.id
    })

    if (!normalizedQuery) return sortedSales.slice(0, MAX_HISTORY_ITEMS)

    return sortedSales
      .filter((sale) =>
        [
          sale.saleNumber,
          formatBillNumber(sale),
          sale.customerName ?? '',
          sale.customerBusinessName ?? '',
          formatPaymentMethod(sale.paymentMethod)
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      )
      .slice(0, MAX_HISTORY_ITEMS)
  }, [sales, searchQuery])

  const handlePrint = async (sale: SaleRecord): Promise<void> => {
    const result = await printSaleBill(sale)

    if (!result.success) {
      toast.error(result.message ?? 'Bill could not be printed.')
      return
    }

    toast.success(`Bill #${formatBillNumber(sale)} was sent to the printer.`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
            Completed Bills
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">
            {sales.length} Bills
          </span>
        </div>

        <div className="group mt-2 flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10">
          <Search
            size={15}
            className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
          />
          <input
            type="text"
            className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
            placeholder="Search bill number, customer..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setSearchQuery('')}
              aria-label="Clear history search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-3">
        {isLoading ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center px-6 text-center">
            <History size={24} className="mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Loading bills...</p>
          </div>
        ) : visibleSales.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center px-6 text-center">
            <ReceiptText size={24} className="mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {searchQuery.trim() ? 'No bills match your search.' : 'No completed bills yet.'}
            </p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">
              Bills that are paid at this counter will appear here with full details and reprint
              options.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleSales.map((sale) => (
              <div
                key={sale.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-emerald-300"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[0.82rem] font-bold text-slate-800">
                        Bill #{formatBillNumber(sale)}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
                          sale.paymentMethod === 'CREDIT'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {formatPaymentMethod(sale.paymentMethod)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[0.68rem] text-slate-400">
                      {sale.customerName || 'No customer'} · {formatDateTime(sale.paidAt)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="block text-[0.75rem] font-bold text-slate-800">
                      {formatLkr(sale.total)}
                    </span>
                    <span className="block text-[0.62rem] text-slate-400">
                      {sale.itemCount} item(s)
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => onView(sale)}
                    aria-label={`View bill ${formatBillNumber(sale)}`}
                    title="View"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => void handlePrint(sale)}
                    aria-label={`Print bill ${formatBillNumber(sale)}`}
                    title="Print"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
