import React, { useEffect, useState } from 'react'
import { Calendar, Banknote, ReceiptText, ShoppingBag, CreditCard } from 'lucide-react'
import { StatCard } from '../components/dashboard/StatCard'
import { MainChart } from '../components/dashboard/MainChart'
import { LowStockAlert } from '../components/dashboard/LowStockAlert'
import { DiversificationChart } from '../components/dashboard/DiversificationChart'
import { DividendChart } from '../components/dashboard/DividendChart'
import { TopGainers } from '../components/dashboard/TopGainers'
import { formatLkr } from '../utils/currency'
import { salesApi } from '../api/salesApi'
import { productsApi } from '../api/productsApi'
import { useToast } from '../context/ToastContext'
import type { SalesReportSummary } from '../../../shared/sales'
import type { ProductRecord } from '../../../shared/products'

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<SalesReportSummary | null>(null)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let isActive = true

    salesApi
      .summary()
      .then((loadedSummary) => {
        if (isActive) setSummary(loadedSummary)
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

  useEffect(() => {
    let isActive = true

    productsApi
      .list()
      .then((loadedProducts) => {
        if (isActive) setProducts(loadedProducts)
      })
      .catch((error) => {
        if (isActive) toast.error(getErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsProductsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [toast])

  const today = new Date().toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-[0.85rem] text-muted">Store overview & daily metrics</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-card px-3 py-2 text-[0.8rem] text-muted">
          <Calendar size={14} />
          {today}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Today Sales"
          amount={`Rs. ${formatLkr(summary?.todaySales ?? 0)}`}
          meta={`${summary?.todayTransactions ?? 0} transactions`}
          icon={<Banknote size={20} />}
          accentColor="var(--color-success)"
        />
        <StatCard
          title="All-Time Sales"
          amount={`Rs. ${formatLkr(summary?.totalSales ?? 0)}`}
          meta={`${summary?.totalTransactions ?? 0} total transactions`}
          icon={<ReceiptText size={20} />}
          accentColor="var(--color-primary)"
        />
        <StatCard
          title="Items Sold Today"
          amount={(summary?.todayItems ?? 0).toString()}
          meta={`Avg Rs. ${formatLkr(summary?.averageSale ?? 0)}/sale`}
          icon={<ShoppingBag size={20} />}
          accentColor="var(--color-warning)"
        />
        <StatCard
          title="Outstanding Credit"
          amount={`Rs. ${formatLkr(summary?.totalCreditedAmount ?? 0)}`}
          meta="Unpaid amount"
          icon={<CreditCard size={20} />}
          accentColor="var(--color-danger)"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <MainChart
            data={summary?.dailySales ?? []}
            totalSales={summary?.totalSales ?? 0}
            isLoading={isLoading}
          />
          <DividendChart data={summary?.dailySales ?? []} isLoading={isLoading} />
        </div>
        <div className="flex flex-col gap-5">
          <TopGainers products={summary?.topProducts ?? []} isLoading={isLoading} />
          <LowStockAlert products={products} isLoading={isProductsLoading} />
        </div>
      </div>

      <DiversificationChart payments={summary?.paymentBreakdown ?? []} isLoading={isLoading} />
    </div>
  )
}

export default DashboardPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
