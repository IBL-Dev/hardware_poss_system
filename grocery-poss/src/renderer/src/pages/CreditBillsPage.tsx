import React, { useEffect, useState, useMemo } from 'react'
import { Loader } from '../components/common/Loader'
import { DataTable, Column } from '../components/common/DataTable'
import { useToast } from '../context/ToastContext'
import { salesApi } from '../api/salesApi'
import { formatLkr } from '../utils/currency'
import type { SaleRecord } from '../../../shared/sales'

const CreditBillsPage: React.FC = () => {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    salesApi
      .list({ paymentMethod: 'CREDIT' })
      .then((loadedSales) => {
        if (isActive) setSales(loadedSales)
      })
      .catch((error) => {
        if (isActive) toast.error(getErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [toast])

  const columns: Column<SaleRecord>[] = useMemo(
    () => [
      {
        key: 'saleNumber',
        header: 'SALE NUMBER',
        render: (item) => <span className="font-semibold text-ink">{item.saleNumber}</span>
      },
      {
        key: 'customerName',
        header: 'CUSTOMER NAME',
        render: (item) => <span className="font-medium text-ink">{item.customerName || '-'}</span>
      },
      {
        key: 'paidAt',
        header: 'DATE',
        render: (item) => <span className="text-muted">{formatShortDate(item.paidAt)}</span>
      },
      {
        key: 'total',
        header: 'TOTAL (LKR)',
        render: (item) => (
          <span className="font-semibold text-success">{formatLkr(item.total)}</span>
        )
      }
    ],
    []
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Credit Bills</h1>
        <p className="mt-1 text-[0.95rem] text-muted">View all outstanding credit bills</p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <Loader label="Loading credit bills..." size="sm" />
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No credit bills found.
        </div>
      ) : (
        <DataTable columns={columns} data={sales} />
      )}
    </div>
  )
}

export default CreditBillsPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate.replace(' ', 'T'))
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
