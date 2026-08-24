import React, { useEffect, useMemo, useState } from 'react'
import { Filter, RotateCcw } from 'lucide-react'
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

  const totals = useMemo(
    () => ({
      revenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      discounts: sales.reduce((sum, sale) => sum + getSaleDiscountTotal(sale), 0),
      items: sales.reduce((sum, sale) => sum + sale.itemCount, 0),
      transactions: sales.length
    }),
    [sales]
  )

  const columns: Column<SaleRecord>[] = [
    {
      key: 'dailyBillNumber',
      header: 'BILL NO',
      render: (sale) => (
        <div className="min-w-32">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            Bill #{formatBillNumber(sale)}
          </span>
          <div className="mt-1 max-w-44 truncate text-xs text-muted">{sale.saleNumber}</div>
        </div>
      )
    },
    {
      key: 'paidAt',
      header: 'DATE / TIME',
      render: (sale) => (
        <div>
          <div className="font-semibold text-ink">{formatDateOnly(sale.paidAt)}</div>
          <div className="text-xs text-muted">{formatTimeOnly(sale.paidAt)}</div>
        </div>
      )
    },
    {
      key: 'paymentMethod',
      header: 'PAYMENT',
      render: (sale) => (
        <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
          {formatPaymentMethod(sale.paymentMethod)}
        </span>
      )
    },
    { key: 'itemCount', header: 'ITEMS' },
    {
      key: 'discountAmount',
      header: 'DISCOUNT (LKR)',
      render: (sale) =>
        getSaleDiscountTotal(sale) > 0 ? (
          <span className="font-semibold text-warning">
            {formatLkrAmount(getSaleDiscountTotal(sale))}
          </span>
        ) : (
          <span className="text-muted">-</span>
        )
    },
    { key: 'total', header: 'TOTAL (LKR)', render: (sale) => formatLkrAmount(sale.total) }
  ]

  const updateFilter = (key: keyof Required<SaleFilters>, value: string): void => {
    setIsLoading(true)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const handleReset = (): void => {
    setIsLoading(true)
    setFilters({ ...emptyFilters })
  }

  const deleteSale = async (sale: SaleRecord): Promise<void> => {
    try {
      await salesApi.delete(sale.id)
      setSales((prev) => prev.filter((item) => item.id !== sale.id))
      toast.success(`${sale.saleNumber} was deleted and its stock restored.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = (sale: SaleRecord): void => {
    confirm({
      title: 'Delete Sale',
      message: `Are you sure you want to delete "${sale.saleNumber}"? Its items' stock will be restored. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteSale(sale)
    })
  }

  const handleReturnItem = async (itemId: number, quantity: number): Promise<void> => {
    if (!selectedSale) return

    try {
      const updatedSale = await salesApi.returnItem(selectedSale.id, { itemId, quantity })

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

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-ink">Sales History</h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          View paid sales and filter by receipt, date, and payment method
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Revenue (LKR)" value={formatLkr(totals.revenue)} tone="success" />
        <Summary label="Discounts (LKR)" value={formatLkr(totals.discounts)} tone="warning" />
        <Summary label="Items Sold" value={totals.items.toString()} tone="muted" />
        <Summary label="Transactions" value={totals.transactions.toString()} tone="muted" />
      </div>

      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[0.9rem] font-semibold text-muted">
          <Filter size={16} />
          Filters
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
          <input
            className="rounded-md border border-line bg-white px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            placeholder="Search bill no, sale number, product, SKU"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
          <select
            className="rounded-md border border-line bg-white px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            value={filters.paymentMethod}
            onChange={(event) => updateFilter('paymentMethod', event.target.value)}
          >
            <option value="ALL">All Payments</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="MOBILE_PAY">Mobile Pay</option>
          </select>
          <input
            type="date"
            className="rounded-md border border-line bg-white px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
          />
          <input
            type="date"
            className="rounded-md border border-line bg-white px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
          />
          <button
            className="flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover"
            onClick={handleReset}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-white p-6">
          <Loader label="Loading sales history..." size="sm" />
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-6 text-center text-muted">
          No paid sales found.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          showSelection={false}
          onView={setSelectedSale}
          onDelete={handleDelete}
        />
      )}

      <SaleDetailsModal
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onReturnItem={handleReturnItem}
      />
    </div>
  )
}

export default SalesHistoryPage

const Summary: React.FC<{
  label: string
  value: string
  tone: 'success' | 'warning' | 'muted'
}> = ({ label, value, tone }) => (
  <div className={`rounded-lg border bg-white p-4 shadow-sm ${getSummaryClass(tone)}`}>
    <div className="text-[0.78rem] font-semibold tracking-wide uppercase">{label}</div>
    <div className="mt-1 text-xl font-bold">{value}</div>
  </div>
)

function getSummaryClass(tone: 'success' | 'warning' | 'muted'): string {
  if (tone === 'success') return 'border-success/20 text-success'
  if (tone === 'warning') return 'border-warning/25 text-warning'

  return 'border-line text-muted'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatPaymentMethod(value: SalePaymentMethod): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatBillNumber(sale: SaleRecord): string {
  return sale.dailyBillNumber > 0
    ? sale.dailyBillNumber.toString()
    : formatSaleNumber(sale.saleNumber)
}

function getSaleDiscountTotal(sale: SaleRecord): number {
  return sale.items.reduce((sum, item) => sum + item.discountAmount, sale.discountAmount)
}

function formatSaleNumber(value: string): string {
  const trailingNumber = value.match(/(\d{1,6})$/)?.[1]

  return trailingNumber ?? value
}

function parseDateTime(value: string): Date | null {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateOnly(value: string): string {
  return parseDateTime(value)?.toLocaleDateString() ?? value
}

function formatTimeOnly(value: string): string {
  return (
    parseDateTime(value)?.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    }) ?? ''
  )
}
