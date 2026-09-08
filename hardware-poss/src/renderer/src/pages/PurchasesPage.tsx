import React, { useEffect, useState } from 'react'
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  Undo2,
  WalletCards
} from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { PurchaseFormData, PurchaseModal } from '../components/purchases/PurchaseModal'
import {
  PurchaseReturnFormData,
  PurchaseReturnModal
} from '../components/purchases/PurchaseReturnModal'
import {
  PurchaseDetailsModal,
  PurchaseReturnDetailsModal
} from '../components/purchases/PurchaseDetailsModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { purchasesApi } from '../api/purchasesApi'
import { suppliersApi } from '../api/suppliersApi'
import { productsApi } from '../api/productsApi'
import { formatLkr } from '../utils/currency'
import type { ProductRecord } from '../../../shared/products'
import type { SupplierRecord } from '../../../shared/suppliers'
import type {
  CreatePurchaseInput,
  CreatePurchaseReturnInput,
  PurchaseFilters,
  PurchasePayTermUnit,
  PurchaseRecord,
  PurchaseReturnFilters,
  PurchaseReturnRecord,
  PurchaseStatus
} from '../../../shared/purchases'

type PurchaseView = 'purchases' | 'returns'

const emptyPurchaseFilters: Required<PurchaseFilters> = {
  search: '',
  status: 'ALL',
  dateFrom: '',
  dateTo: ''
}

const emptyReturnFilters: Required<PurchaseReturnFilters> & { businessLocation: string } = {
  search: '',
  dateFrom: '',
  dateTo: '',
  businessLocation: ''
}

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [activeView, setActiveView] = useState<PurchaseView>('purchases')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isReturnSaving, setIsReturnSaving] = useState(false)
  const [purchaseFilters, setPurchaseFilters] =
    useState<Required<PurchaseFilters>>(emptyPurchaseFilters)
  const [returnFilters, setReturnFilters] = useState<
    Required<PurchaseReturnFilters> & { businessLocation: string }
  >(emptyReturnFilters)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseRecord | null>(null)
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturnRecord | null>(null)

  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    Promise.all([
      purchasesApi.list(purchaseFilters),
      purchasesApi.listReturns({
        search: returnFilters.search,
        dateFrom: returnFilters.dateFrom,
        dateTo: returnFilters.dateTo
      }),
      suppliersApi.list(),
      productsApi.list()
    ])
      .then(([loadedPurchases, loadedReturns, loadedSuppliers, loadedProducts]) => {
        if (isActive) {
          setPurchases(loadedPurchases)
          setReturns(loadedReturns)
          setSuppliers(loadedSuppliers)
          setProducts(loadedProducts)
        }
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
  }, [purchaseFilters, returnFilters.search, returnFilters.dateFrom, returnFilters.dateTo, toast])

  const filteredReturns = returns.filter(
    (purchaseReturn) =>
      returnFilters.businessLocation === '' ||
      purchaseReturn.businessLocation.toLowerCase() === returnFilters.businessLocation.toLowerCase()
  )

  const purchaseColumns: Column<PurchaseRecord>[] = [
    {
      key: 'purchaseNumber',
      header: 'PURCHASE NO',
      render: (item) => (
        <div className="min-w-[150px]">
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
            <ShoppingBag size={14} className="shrink-0 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{item.purchaseNumber}</span>
          </span>
          <div className="mt-1.5 max-w-[150px] truncate text-xs font-medium text-slate-400">
            {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
          </div>
        </div>
      )
    },
    {
      key: 'supplierName',
      header: 'SUPPLIER',
      render: (item) => (
        <div className="min-w-[130px]">
          <span className="block truncate font-semibold text-slate-700">
            {item.supplierName || '-'}
          </span>
          <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
            {item.supplierType === 'BUSINESS' ? 'Business' : 'Individual'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (item) => (
        <span
          className={`inline-flex rounded-md border px-2.5 py-1.5 text-xs font-bold ${getPurchaseStatusClassName(item.status)}`}
        >
          {formatPurchaseStatus(item.status)}
        </span>
      )
    },
    {
      key: 'businessLocation',
      header: 'LOCATION',
      render: (item) => (
        <span className="block max-w-[150px] truncate text-sm font-medium text-slate-500">
          {item.businessLocation || '-'}
        </span>
      )
    },
    {
      key: 'paidOn',
      header: 'DATE',
      render: (item) => (
        <div className="min-w-[110px]">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <CalendarDays size={14} className="text-slate-400" />
            {formatShortDate(item.createdAt)}
          </div>
          <div className="mt-1 pl-5 text-xs text-slate-400">
            {formatPayTerm(item.payTermValue, item.payTermUnit)}
          </div>
        </div>
      )
    },
    {
      key: 'total',
      header: 'TOTAL (LKR)',
      render: (item) => (
        <span className="text-sm font-bold text-emerald-700">{formatLkr(item.total)}</span>
      )
    }
  ]

  const returnColumns: Column<PurchaseReturnRecord>[] = [
    {
      key: 'returnNumber',
      header: 'RETURN NO',
      render: (item) => (
        <div className="min-w-[150px]">
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
            <Undo2 size={14} className="shrink-0 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">{item.returnNumber}</span>
          </span>
          <div className="mt-1.5 max-w-[150px] truncate text-xs font-medium text-slate-400">
            {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
          </div>
        </div>
      )
    },
    {
      key: 'supplierName',
      header: 'SUPPLIER',
      render: (item) => (
        <span className="block max-w-[150px] truncate font-semibold text-slate-700">
          {item.supplierName || '-'}
        </span>
      )
    },
    {
      key: 'purchaseNumber',
      header: 'PURCHASE',
      render: (item) => (
        <span className="font-mono text-xs font-medium text-slate-400">
          {item.purchaseNumber || '-'}
        </span>
      )
    },
    {
      key: 'businessLocation',
      header: 'LOCATION',
      render: (item) => (
        <span className="block max-w-[150px] truncate text-sm font-medium text-slate-500">
          {item.businessLocation || '-'}
        </span>
      )
    },
    {
      key: 'returnDate',
      header: 'DATE',
      render: (item) => (
        <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
          {formatShortDate(item.returnDate)}
        </span>
      )
    },
    {
      key: 'total',
      header: 'TOTAL (LKR)',
      render: (item) => (
        <span className="text-sm font-bold text-amber-700">{formatLkr(item.total)}</span>
      )
    }
  ]

  const receivedCount = purchases.filter((purchase) => purchase.status === 'RECEIVED').length
  const pendingCount = purchases.filter((purchase) => purchase.status === 'PENDING').length
  const orderedCount = purchases.filter((purchase) => purchase.status === 'ORDERED').length
  const totalValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0)
  const advanceTotal = purchases.reduce((sum, purchase) => sum + purchase.advanceBalance, 0)
  const returnValue = filteredReturns.reduce((sum, purchaseReturn) => sum + purchaseReturn.total, 0)
  const returnLocations = Array.from(
    new Set(returns.map((purchaseReturn) => purchaseReturn.businessLocation).filter(Boolean))
  ).sort()

  const handleAddClick = (): void => {
    if (activeView === 'returns') {
      setIsReturnModalOpen(true)
      return
    }

    setIsPurchaseModalOpen(true)
  }

  const handlePurchaseModalClose = (): void => {
    if (isSaving) return
    setIsPurchaseModalOpen(false)
  }

  const handlePurchaseSave = async (data: PurchaseFormData): Promise<void> => {
    setIsSaving(true)
    try {
      const payload: CreatePurchaseInput = {
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        supplierType: data.supplierType,
        contactId: data.contactId,
        mobileNo: data.mobileNo,
        email: data.email,
        address: data.address,
        status: data.status,
        businessLocation: data.businessLocation,
        payTermValue: data.payTermValue,
        payTermUnit: data.payTermUnit,
        attachmentPath: data.attachmentPath,
        invoicePdfPath: data.invoicePdfPath,
        advanceBalance: data.advanceBalance,
        paymentMethod: data.paymentMethod,
        paidOn: data.paidOn,
        discountAmount: data.discountAmount,
        items: data.items,
        payments: data.payments
      }

      const createdPurchase = await purchasesApi.create(payload)

      setPurchases((prev) => [createdPurchase, ...prev])
      toast.success(`Purchase ${createdPurchase.purchaseNumber} was added successfully.`)
      setIsPurchaseModalOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const deletePurchase = async (purchase: PurchaseRecord): Promise<void> => {
    try {
      await purchasesApi.delete(purchase.id)
      setPurchases((prev) => prev.filter((item) => item.id !== purchase.id))
      toast.success(`Purchase ${purchase.purchaseNumber} was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handlePurchaseDelete = (purchase: PurchaseRecord): void => {
    confirm({
      title: 'Delete Purchase',
      message: `Are you sure you want to delete purchase "${purchase.purchaseNumber}"? Its received stock will be removed. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deletePurchase(purchase)
    })
  }

  const handleReturnModalClose = (): void => {
    if (isReturnSaving) return
    setIsReturnModalOpen(false)
  }

  const handleReturnSave = async (data: PurchaseReturnFormData): Promise<void> => {
    setIsReturnSaving(true)
    try {
      const payload: CreatePurchaseReturnInput = {
        purchaseId: data.purchaseId,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        businessLocation: data.businessLocation,
        returnDate: data.returnDate,
        reason: data.reason,
        items: data.items
      }

      const createdReturn = await purchasesApi.createReturn(payload)

      setReturns((prev) => [createdReturn, ...prev])
      toast.success(`Return ${createdReturn.returnNumber} was recorded successfully.`)
      setIsReturnModalOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsReturnSaving(false)
    }
  }

  const deleteReturn = async (purchaseReturn: PurchaseReturnRecord): Promise<void> => {
    try {
      await purchasesApi.deleteReturn(purchaseReturn.id)
      setReturns((prev) => prev.filter((item) => item.id !== purchaseReturn.id))
      toast.success(`Return ${purchaseReturn.returnNumber} was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleReturnDelete = (purchaseReturn: PurchaseReturnRecord): void => {
    confirm({
      title: 'Delete Purchase Return',
      message: `Are you sure you want to delete return "${purchaseReturn.returnNumber}"? Its items' stock will be restored. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteReturn(purchaseReturn)
    })
  }

  const updatePurchaseFilter = (key: keyof Required<PurchaseFilters>, value: string): void => {
    setIsLoading(true)
    setPurchaseFilters((current) => ({ ...current, [key]: value }))
  }

  const resetPurchaseFilters = (): void => {
    setIsLoading(true)
    setPurchaseFilters({ ...emptyPurchaseFilters })
  }

  const updateReturnFilter = (key: keyof typeof emptyReturnFilters, value: string): void => {
    setIsLoading(true)
    setReturnFilters((current) => ({ ...current, [key]: value }))
  }

  const resetReturnFilters = (): void => {
    setIsLoading(true)
    setReturnFilters({ ...emptyReturnFilters })
  }

  const hasActivePurchaseFilters =
    purchaseFilters.search.trim().length > 0 ||
    purchaseFilters.status !== 'ALL' ||
    purchaseFilters.dateFrom.length > 0 ||
    purchaseFilters.dateTo.length > 0

  const hasActiveReturnFilters =
    returnFilters.search.trim().length > 0 ||
    returnFilters.businessLocation.length > 0 ||
    returnFilters.dateFrom.length > 0 ||
    returnFilters.dateTo.length > 0

  return (
    <div className="flex min-h-full flex-col gap-5">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <ShoppingBag size={21} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchases</h1>
                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {activeView === 'purchases' ? purchases.length : filteredReturns.length}{' '}
                    {activeView === 'purchases' ? 'Purchases' : 'Returns'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[0.92rem] text-slate-500">
                Record supplier purchases, stock-in deliveries, payments and purchase returns
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
            onClick={handleAddClick}
            disabled={products.length === 0}
            title={
              products.length === 0
                ? 'Create at least one product before adding a purchase'
                : undefined
            }
          >
            <Plus size={18} />
            {activeView === 'returns' ? 'Add Return' : 'Add Purchase'}
          </button>
        </div>
      </div>

      {/* ======================================================
          VIEW NAVIGATION
      ====================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <PurchaseViewButton
            active={activeView === 'purchases'}
            icon={<ShoppingBag size={16} />}
            title="Purchases"
            description="Supplier purchase orders & stock-in"
            onClick={() => setActiveView('purchases')}
          />
          <PurchaseViewButton
            active={activeView === 'returns'}
            icon={<Undo2 size={16} />}
            title="Purchase Returns"
            description="Returned goods & stock-out records"
            onClick={() => setActiveView('returns')}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader
            label={activeView === 'purchases' ? 'Loading purchases...' : 'Loading returns...'}
            size="sm"
          />
        </div>
      ) : activeView === 'purchases' ? (
        /* ======================================================
            PURCHASES VIEW
        ====================================================== */
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Total Purchases"
              helper="Filtered purchase orders"
              value={purchases.length.toString()}
              icon={<ShoppingBag size={19} />}
              tone="success"
            />
            <Summary
              label="Received"
              helper="Stock-in ready purchases"
              value={receivedCount.toString()}
              icon={<CheckCircle2 size={19} />}
              tone="success"
            />
            <Summary
              label="Pending & Ordered"
              helper={`${pendingCount} pending / ${orderedCount} ordered`}
              value={(pendingCount + orderedCount).toString()}
              icon={<Clock size={19} />}
              tone="warning"
            />
            <Summary
              label="Purchase Value"
              helper={`${formatLkr(advanceTotal)} advanced`}
              value={formatLkr(totalValue)}
              icon={<WalletCards size={19} />}
              tone="default"
            />
          </div>

          {/* FILTERS */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                  <Filter size={14} className="text-emerald-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Search & Filter</h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Search orders, suppliers or select a date range
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]">
                <div className="group flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10">
                  <Search
                    size={17}
                    className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
                  />
                  <input
                    type="text"
                    className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Purchase no, supplier, product or SKU..."
                    value={purchaseFilters.search}
                    onChange={(event) => updatePurchaseFilter('search', event.target.value)}
                  />
                </div>

                <div className="relative">
                  <Truck
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                    value={purchaseFilters.status}
                    onChange={(event) => updatePurchaseFilter('status', event.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="RECEIVED">Received</option>
                    <option value="PENDING">Pending</option>
                    <option value="ORDERED">Ordered</option>
                  </select>
                  <SelectArrow />
                </div>

                <input
                  type="date"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                  value={purchaseFilters.dateFrom}
                  onChange={(event) => updatePurchaseFilter('dateFrom', event.target.value)}
                  aria-label="Purchase date from"
                />
                <input
                  type="date"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                  value={purchaseFilters.dateTo}
                  onChange={(event) => updatePurchaseFilter('dateTo', event.target.value)}
                  aria-label="Purchase date to"
                />

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                  onClick={resetPurchaseFilters}
                  disabled={!hasActivePurchaseFilters}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* PURCHASES TABLE */}
          {purchases.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <ShoppingBag size={27} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {hasActivePurchaseFilters ? 'No purchases found' : 'No purchases yet'}
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                {hasActivePurchaseFilters
                  ? 'No supplier purchases match the selected filters.'
                  : 'Record supplier purchases to track orders, stock-in deliveries and payments.'}
              </p>
              {hasActivePurchaseFilters ? (
                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  onClick={resetPurchaseFilters}
                >
                  <RotateCcw size={16} />
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                  onClick={handleAddClick}
                >
                  <Plus size={16} />
                  Add Purchase
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-emerald-600" />
                  <span className="text-sm font-bold text-slate-700">Purchase Records</span>
                </div>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {purchases.length} purchase{purchases.length === 1 ? '' : 's'}
                </span>
              </div>
              <DataTable
                columns={purchaseColumns}
                data={purchases}
                showSelection={false}
                onView={setViewingPurchase}
                onDelete={handlePurchaseDelete}
              />
            </div>
          )}
        </div>
      ) : (
        /* ======================================================
            PURCHASE RETURNS VIEW
        ====================================================== */
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Summary
              label="Total Returns"
              helper="Filtered return records"
              value={filteredReturns.length.toString()}
              icon={<Undo2 size={19} />}
              tone="warning"
            />
            <Summary
              label="Returned Value"
              helper="Goods returned to suppliers"
              value={formatLkr(returnValue)}
              icon={<Banknote size={19} />}
              tone="warning"
            />
            <Summary
              label="Stock Restored"
              helper="Items moved out of stock"
              value={filteredReturns
                .reduce((sum, purchaseReturn) => sum + purchaseReturn.itemCount, 0)
                .toString()}
              icon={<PackageCheck size={19} />}
              tone="default"
            />
          </div>

          {/* FILTERS */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
                  <Filter size={14} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Business Location & Date Range</h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Filter returns by location or return date
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                <div className="group flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10">
                  <Search
                    size={17}
                    className="shrink-0 text-slate-400 transition-colors group-focus-within:text-amber-600"
                  />
                  <input
                    type="text"
                    className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Return no, supplier, purchase or SKU..."
                    value={returnFilters.search}
                    onChange={(event) => updateReturnFilter('search', event.target.value)}
                  />
                </div>

                <div className="relative">
                  <Truck
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10"
                    value={returnFilters.businessLocation}
                    onChange={(event) => updateReturnFilter('businessLocation', event.target.value)}
                  >
                    <option value="">All Locations</option>
                    {returnLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>

                <input
                  type="date"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10"
                  value={returnFilters.dateFrom}
                  onChange={(event) => updateReturnFilter('dateFrom', event.target.value)}
                  aria-label="Return date from"
                />
                <input
                  type="date"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10"
                  value={returnFilters.dateTo}
                  onChange={(event) => updateReturnFilter('dateTo', event.target.value)}
                  aria-label="Return date to"
                />

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                  onClick={resetReturnFilters}
                  disabled={!hasActiveReturnFilters}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* RETURNS TABLE */}
          {filteredReturns.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
                <Undo2 size={27} className="text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {hasActiveReturnFilters ? 'No returns found' : 'No purchase returns yet'}
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                {hasActiveReturnFilters
                  ? 'No purchase returns match the selected filters.'
                  : 'Record returns of goods sent back to suppliers. Stock is reduced automatically.'}
              </p>
              {hasActiveReturnFilters ? (
                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100"
                  onClick={resetReturnFilters}
                >
                  <RotateCcw size={16} />
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                  onClick={handleAddClick}
                >
                  <Plus size={16} />
                  Add Return
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Undo2 size={16} className="text-amber-600" />
                  <span className="text-sm font-bold text-slate-700">Purchase Return Records</span>
                </div>
                <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {filteredReturns.length} return{filteredReturns.length === 1 ? '' : 's'}
                </span>
              </div>
              <DataTable
                columns={returnColumns}
                data={filteredReturns}
                showSelection={false}
                onView={setViewingReturn}
                onDelete={handleReturnDelete}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          MODALS
      ====================================================== */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        suppliers={suppliers}
        products={products}
        isSaving={isSaving}
        onClose={handlePurchaseModalClose}
        onSave={handlePurchaseSave}
      />

      <PurchaseReturnModal
        isOpen={isReturnModalOpen}
        products={products}
        purchases={purchases}
        isSaving={isReturnSaving}
        onClose={handleReturnModalClose}
        onSave={handleReturnSave}
      />

      <PurchaseDetailsModal purchase={viewingPurchase} onClose={() => setViewingPurchase(null)} />
      <PurchaseReturnDetailsModal
        purchaseReturn={viewingReturn}
        onClose={() => setViewingReturn(null)}
      />
    </div>
  )
}

export default PurchasesPage

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/* ==========================================================
   PURCHASE STATUS
========================================================== */

function formatPurchaseStatus(status: PurchaseStatus): string {
  const labels: Record<PurchaseStatus, string> = {
    RECEIVED: 'Received',
    PENDING: 'Pending',
    ORDERED: 'Ordered'
  }

  return labels[status]
}

function getPurchaseStatusClassName(status: PurchaseStatus): string {
  const classNames: Record<PurchaseStatus, string> = {
    RECEIVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    ORDERED: 'border-slate-200 bg-slate-50 text-slate-600'
  }

  return classNames[status]
}

/* ==========================================================
   PAY TERM
========================================================== */

function formatPayTerm(value: number, unit: PurchasePayTermUnit): string {
  if (value <= 0) return 'No pay term'

  return `${value} ${unit === 'MONTHS' ? (value === 1 ? 'month' : 'months') : value === 1 ? 'day' : 'days'}`
}

/* ==========================================================
   DATE
========================================================== */

function formatShortDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}

/* ==========================================================
   VIEW BUTTON
========================================================== */

const PurchaseViewButton: React.FC<{
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}> = ({ active, icon, title, description, onClick }) => (
  <button
    type="button"
    className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-colors ${
      active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
    onClick={onClick}
  >
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
        active ? 'bg-white/15' : 'bg-slate-100'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-sm font-bold">{title}</div>
      <div
        className={`mt-0.5 truncate text-[0.7rem] font-medium ${
          active ? 'text-emerald-50' : 'text-slate-400'
        }`}
      >
        {description}
      </div>
    </div>
  </button>
)

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
        tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-400' : 'bg-slate-300'
      }`}
    />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p
          className={`mt-1.5 break-words text-xl font-bold tracking-tight ${
            tone === 'success'
              ? 'text-emerald-700'
              : tone === 'warning'
                ? 'text-amber-700'
                : 'text-slate-800'
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
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
