import React, { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Filter,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingCart,
  Tags
} from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { SaleDetailsModal } from '../components/sales/SaleDetailsModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { salesApi } from '../api/salesApi'
import { formatLkr, formatLkrAmount } from '../utils/currency'
import type { SaleFilters, SalePaymentMethod, SaleRecord } from '../../../shared/sales'

const emptyFilters: Required<SaleFilters> = {
  search: '',
  paymentMethod: 'ALL',
  dateFrom: '',
  dateTo: ''
}

const SalesHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [filters, setFilters] = useState<Required<SaleFilters>>(emptyFilters)
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const confirm = useConfirm()
  const toast = useToast()

  /* ==========================================================
     LOAD SALES
  ========================================================== */

  useEffect(() => {
    let isActive = true

    salesApi
      .list(filters)
      .then((loadedSales) => {
        if (isActive) {
          setSales(loadedSales)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(getErrorMessage(error))
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
  }, [filters, toast])

  /* ==========================================================
     SALES TOTALS
  ========================================================== */

  const totals = useMemo(
    () => ({
      revenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      discounts: sales.reduce((sum, sale) => sum + getSaleDiscountTotal(sale), 0),
      items: sales.reduce((sum, sale) => sum + sale.itemCount, 0),
      transactions: sales.length
    }),
    [sales]
  )

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns: Column<SaleRecord>[] = [
    {
      key: 'dailyBillNumber',
      header: 'BILL',
      render: (sale) => (
        <div className="min-w-[145px]">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
            <ReceiptText size={14} className="shrink-0 text-emerald-600" />

            <span className="text-xs font-bold text-emerald-700">
              Bill #{formatBillNumber(sale)}
            </span>
          </div>

          <div className="mt-1.5 max-w-[160px] truncate font-mono text-[0.7rem] text-slate-400">
            {sale.saleNumber}
          </div>
        </div>
      )
    },
    {
      key: 'paidAt',
      header: 'DATE / TIME',
      render: (sale) => (
        <div className="min-w-[125px]">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <CalendarDays size={14} className="text-slate-400" />
            {formatDateOnly(sale.paidAt)}
          </div>

          <div className="mt-1 pl-5 text-xs font-medium text-slate-400">
            {formatTimeOnly(sale.paidAt)}
          </div>
        </div>
      )
    },
    {
      key: 'paymentMethod',
      header: 'PAYMENT',
      render: (sale) => (
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold ${getPaymentMethodClass(sale.paymentMethod)}`}>
          {getPaymentMethodIcon(sale.paymentMethod)}
          {formatPaymentMethod(sale.paymentMethod)}
        </span>
      )
    },
    {
      key: 'itemCount',
      header: 'ITEMS',
      render: (sale) => (
        <span className="inline-flex min-w-[60px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600">
          <PackageCheck size={13} />
          {sale.itemCount}
        </span>
      )
    },
    {
      key: 'discountAmount',
      header: 'DISCOUNT (LKR)',
      render: (sale) =>
        getSaleDiscountTotal(sale) > 0 ? (
          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
            - {formatLkrAmount(getSaleDiscountTotal(sale))}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
    },
    {
      key: 'total',
      header: 'TOTAL (LKR)',
      render: (sale) => (
        <div className="min-w-[110px]">
          <span className="text-sm font-bold text-emerald-700">
            {formatLkrAmount(sale.total)}
          </span>
        </div>
      )
    }
  ]

  /* ==========================================================
     UPDATE FILTER
  ========================================================== */

  const updateFilter = (key: keyof Required<SaleFilters>, value: string): void => {
    setIsLoading(true)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  /* ==========================================================
     RESET FILTERS
  ========================================================== */

  const handleReset = (): void => {
    setIsLoading(true)
    setFilters({ ...emptyFilters })
  }

  /* ==========================================================
     DELETE SALE
  ========================================================== */

  const deleteSale = async (sale: SaleRecord): Promise<void> => {
    try {
      await salesApi.delete(sale.id)

      setSales((prev) => prev.filter((item) => item.id !== sale.id))

      toast.success(`${sale.saleNumber} was deleted and its stock restored.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE CONFIRMATION
  ========================================================== */

  const handleDelete = (sale: SaleRecord): void => {
    confirm({
      title: 'Delete Sale',
      message: `Are you sure you want to delete "${sale.saleNumber}"? Its items' stock will be restored. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteSale(sale)
    })
  }

  /* ==========================================================
     RETURN SALE ITEM
  ========================================================== */

  const handleReturnItem = async (itemId: number, quantity: number): Promise<void> => {
    if (!selectedSale) return

    try {
      const updatedSale = await salesApi.returnItem(selectedSale.id, {
        itemId,
        quantity
      })

      if (updatedSale) {
        setSales((prev) => prev.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale)))

        setSelectedSale(updatedSale)
      } else {
        setSales((prev) => prev.filter((sale) => sale.id !== selectedSale.id))

        setSelectedSale(null)
      }

      toast.success(`Returned ${quantity} item(s) and restored stock.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.paymentMethod !== 'ALL' ||
    filters.dateFrom.length > 0 ||
    filters.dateTo.length > 0

  return (
    <div className="flex min-h-full flex-col gap-5">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <ReceiptText size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sales History
                </h1>

                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {sales.length} Transactions
                  </span>
                )}
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Review hardware store transactions, payments, discounts and returned items
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <ShoppingCart size={14} className="text-emerald-600" />
            </div>

            <div>
              <p className="text-[0.67rem] font-bold uppercase tracking-wider text-emerald-600">
                Sales Register
              </p>

              <p className="text-xs font-medium text-emerald-800">
                Hardware POS Transactions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SALES SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          label="Revenue"
          helper="Filtered sales value"
          value={formatLkr(totals.revenue)}
          icon={<Banknote size={20} />}
          tone="success"
        />

        <Summary
          label="Discounts"
          helper="Total discounts given"
          value={formatLkr(totals.discounts)}
          icon={<Tags size={20} />}
          tone="warning"
        />

        <Summary
          label="Items Sold"
          helper="Hardware units sold"
          value={totals.items.toString()}
          icon={<PackageCheck size={20} />}
          tone="default"
        />

        <Summary
          label="Transactions"
          helper="Completed receipts"
          value={totals.transactions.toString()}
          icon={<ReceiptText size={20} />}
          tone="default"
        />
      </div>

      {/* ======================================================
          FILTER SECTION
      ====================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
              <Filter size={14} className="text-emerald-600" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Search & Filter
              </h2>
            </div>
          </div>

          <span className="text-xs font-medium text-slate-500">
            Search receipts, products or select a date range
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]">
            {/* ==================================================
                SEARCH
            ================================================== */}

            <div className="group flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <Search
                size={17}
                className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
              />

              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                placeholder="Bill no, sale no, product or SKU..."
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
              />
            </div>

            {/* ==================================================
                PAYMENT METHOD
            ================================================== */}

            <div className="relative">
              <CreditCard
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              />

              <select
                className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                value={filters.paymentMethod}
                onChange={(event) => updateFilter('paymentMethod', event.target.value)}
              >
                <option value="ALL">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="MOBILE_PAY">Mobile Pay</option>
              </select>

              <SelectArrow />
            </div>

            {/* ==================================================
                DATE FROM
            ================================================== */}

            <div>
              <label className="mb-1 hidden text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                From
              </label>

              <input
                type="date"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                value={filters.dateFrom}
                onChange={(event) => updateFilter('dateFrom', event.target.value)}
                aria-label="Sales date from"
              />
            </div>

            {/* ==================================================
                DATE TO
            ================================================== */}

            <div>
              <label className="mb-1 hidden text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                To
              </label>

              <input
                type="date"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                value={filters.dateTo}
                onChange={(event) => updateFilter('dateTo', event.target.value)}
                aria-label="Sales date to"
              />
            </div>

            {/* ==================================================
                RESET
            ================================================== */}

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
              onClick={handleReset}
              disabled={!hasActiveFilters}
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          SALES TABLE
      ====================================================== */}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading sales history..." size="sm" />
        </div>
      ) : sales.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
            <ReceiptText size={27} className="text-emerald-600" />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            No sales found
          </h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            No completed hardware sales match the selected filters. New POS transactions will
            appear here after payment.
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* ==================================================
              TABLE TITLE
          ================================================== */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <ReceiptText size={16} className="text-emerald-600" />

              <span className="text-sm font-bold text-slate-700">
                Transaction Records
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Showing</span>

              <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {sales.length}
              </span>

              <span>
                transaction{sales.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={sales}
            showSelection={false}
            onView={setSelectedSale}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ======================================================
          SALE DETAILS MODAL
      ====================================================== */}

      <SaleDetailsModal
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onReturnItem={handleReturnItem}
      />
    </div>
  )
}

export default SalesHistoryPage

/* ==========================================================
   SUMMARY CARD
========================================================== */

const Summary: React.FC<{
  label: string
  helper: string
  value: string
  icon: React.ReactNode
  tone: 'success' | 'warning' | 'default'
}> = ({ label, helper, value, icon, tone }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div
      className={`absolute inset-x-0 top-0 h-[3px] ${
        tone === 'success'
          ? 'bg-emerald-500'
          : tone === 'warning'
            ? 'bg-amber-400'
            : 'bg-slate-200'
      }`}
    />

    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.72rem] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p
          className={`mt-1.5 truncate text-xl font-bold tracking-tight ${
            tone === 'success'
              ? 'text-emerald-700'
              : tone === 'warning'
                ? 'text-amber-700'
                : 'text-slate-800'
          }`}
        >
          {value}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {helper}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          tone === 'success'
            ? 'bg-emerald-50 text-emerald-600'
            : tone === 'warning'
              ? 'bg-amber-50 text-amber-600'
              : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>
    </div>
  </div>
)

/* ==========================================================
   SELECT ARROW
========================================================== */

const SelectArrow: React.FC = () => (
  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-400"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
)

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

/* ==========================================================
   PAYMENT METHOD LABEL
========================================================== */

function formatPaymentMethod(value: SalePaymentMethod): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

/* ==========================================================
   PAYMENT METHOD STYLE
========================================================== */

function getPaymentMethodClass(value: SalePaymentMethod): string {
  if (value === 'CASH') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value === 'CARD') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  if (value === 'BANK_TRANSFER') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }

  if (value === 'MOBILE_PAY') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

/* ==========================================================
   PAYMENT METHOD ICON
========================================================== */

function getPaymentMethodIcon(value: SalePaymentMethod): React.ReactNode {
  if (value === 'CASH') {
    return <Banknote size={13} />
  }

  return <CreditCard size={13} />
}

/* ==========================================================
   BILL NUMBER
========================================================== */

function formatBillNumber(sale: SaleRecord): string {
  return sale.dailyBillNumber > 0
    ? sale.dailyBillNumber.toString()
    : formatSaleNumber(sale.saleNumber)
}

/* ==========================================================
   SALE DISCOUNT TOTAL
========================================================== */

function getSaleDiscountTotal(sale: SaleRecord): number {
  return sale.items.reduce(
    (sum, item) => sum + item.discountAmount,
    sale.discountAmount
  )
}

/* ==========================================================
   FORMAT SALE NUMBER
========================================================== */

function formatSaleNumber(value: string): string {
  const trailingNumber = value.match(/(\d{1,6})$/)?.[1]

  return trailingNumber ?? value
}

/* ==========================================================
   PARSE DATE TIME
========================================================== */

function parseDateTime(value: string): Date | null {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? null : date
}

/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDateOnly(value: string): string {
  return parseDateTime(value)?.toLocaleDateString() ?? value
}

/* ==========================================================
   FORMAT TIME
========================================================== */

function formatTimeOnly(value: string): string {
  return (
    parseDateTime(value)?.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    }) ?? ''
  )
}