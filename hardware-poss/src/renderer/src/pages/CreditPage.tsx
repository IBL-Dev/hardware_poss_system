import React, { useEffect, useState } from 'react'
import { CreditCard, Eye, ReceiptText, ShieldCheck } from 'lucide-react'
import { salesApi } from '../api/salesApi'
import { useToast } from '../context/ToastContext'
import { SaleDetailsModal } from '../components/sales/SaleDetailsModal'
import { formatLkr } from '../utils/currency'
import { formatBillNumber, formatDateTime } from '../utils/receiptPrinting'
import type { SaleRecord } from '../../../shared/sales'

const CreditPage: React.FC = () => {
  const toast = useToast()
  const [bills, setBills] = useState<SaleRecord[]>([])
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    salesApi
      .list({ paymentMethod: 'CREDIT' })
      .then((loadedBills) => {
        if (isActive) {
          setBills(loadedBills)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Credit bills could not be loaded.')
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

  const totalOutstanding = bills.reduce((sum, bill) => sum + bill.total, 0)

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-40px)] min-h-[44rem] flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
            <CreditCard size={19} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Credit Sales</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-amber-700">
                Outstanding
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <ReceiptText size={12} className="mr-1 inline" />
              Click the view icon on a row for full customer and item details
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Credit Bills
            </div>
            <div className="text-base font-extrabold text-slate-800">{bills.length}</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Total Outstanding (LKR)
            </div>
            <div className="text-base font-extrabold text-amber-600">
              {formatLkr(totalOutstanding)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <CreditCard size={26} className="mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Loading credit bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShieldCheck size={26} className="mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No credit bills yet.</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">
              Bills paid on credit by customers will appear here with their details.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse bg-white text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-[0.72rem] font-bold text-slate-500 uppercase">
                    Bill #
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-[0.72rem] font-bold text-slate-500 uppercase">
                    Date
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-[0.72rem] font-bold text-slate-500 uppercase">
                    Customer
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right text-[0.72rem] font-bold text-slate-500 uppercase">
                    Items
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right text-[0.72rem] font-bold text-slate-500 uppercase">
                    Total (LKR)
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right text-[0.72rem] font-bold text-slate-500 uppercase">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="transition-colors hover:bg-amber-50/40">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
                      Bill #{formatBillNumber(bill)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                      {formatDateTime(bill.paidAt)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">
                        {bill.customerName || 'No customer'}
                      </div>
                      {bill.customerBusinessName && (
                        <div className="text-xs text-slate-400">{bill.customerBusinessName}</div>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right text-sm text-slate-600">
                      {bill.itemCount}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-extrabold text-amber-600">
                      {formatLkr(bill.total)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600"
                          onClick={() => setSelectedSale(bill)}
                          aria-label={`View bill ${formatBillNumber(bill)} details`}
                          title="View full details"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  )
}

export default CreditPage
