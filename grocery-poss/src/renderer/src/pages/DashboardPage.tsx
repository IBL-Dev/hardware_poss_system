import React, { useEffect, useState } from 'react'
import { Banknote, ReceiptText, ShoppingBag, TrendingUp, CreditCard } from 'lucide-react'
import { StatCard } from '../components/dashboard/StatCard'
import { MainChart } from '../components/dashboard/MainChart'
import { LowStockAlert } from '../components/dashboard/LowStockAlert'
import { DiversificationChart } from '../components/dashboard/DiversificationChart'
import { DividendChart } from '../components/dashboard/DividendChart'
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
        if (isActive) {
          setSummary(loadedSummary)
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
  }, [toast])

  useEffect(() => {
    let isActive = true

    productsApi
      .list()
      .then((loadedProducts) => {
        if (isActive) {
          setProducts(loadedProducts)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isActive) {
          setIsProductsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [toast])

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-[0.95rem] text-muted">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Today Sales (LKR)"
          amount={formatLkr(summary?.todaySales ?? 0)}
          meta={`${summary?.todayTransactions ?? 0} paid transactions`}
          icon={<Banknote size={20} />}
          iconBgColor="var(--color-success)"
        />
        <StatCard
          title="Total Sales (LKR)"
          amount={formatLkr(summary?.totalSales ?? 0)}
          meta={`${summary?.totalTransactions ?? 0} all-time paid sales`}
          icon={<ReceiptText size={20} />}
          iconBgColor="var(--color-primary)"
        />
        <StatCard
          title="Items Sold Today"
          amount={(summary?.todayItems ?? 0).toString()}
          meta="Paid sale items"
          icon={<ShoppingBag size={20} />}
          iconBgColor="var(--color-warning)"
        />
        <StatCard
          title="Average Sale (LKR)"
          amount={formatLkr(summary?.averageSale ?? 0)}
          meta="Per paid transaction"
          icon={<TrendingUp size={20} />}
          iconBgColor="var(--color-accent)"
        />
        <StatCard
          title="Total Credited (LKR)"
          amount={formatLkr(summary?.totalCreditedAmount ?? 0)}
          meta="Outstanding amount"
          icon={<CreditCard size={20} />}
          iconBgColor="var(--color-danger)"
        />
      </div>

      <MainChart
        data={summary?.dailySales ?? []}
        totalSales={summary?.totalSales ?? 0}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <LowStockAlert products={products} isLoading={isProductsLoading} />
        <DiversificationChart payments={summary?.paymentBreakdown ?? []} isLoading={isLoading} />
        <DividendChart data={summary?.dailySales ?? []} isLoading={isLoading} />
      </div>
    </div>
  )
}

export default DashboardPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
