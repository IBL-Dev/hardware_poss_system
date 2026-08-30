import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  PackageCheck,
  PhoneCall,
  Plus,
  WalletCards
} from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { SupplierModal, SupplierFormData } from '../components/classifications/SupplierModal'
import {
  SupplierVoucherFormData,
  SupplierVoucherModal
} from '../components/classifications/SupplierVoucherModal'
import { SupplierVoucherDetailsModal } from '../components/classifications/SupplierVoucherDetailsModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { suppliersApi } from '../api/suppliersApi'
import { productsApi } from '../api/productsApi'
import { formatLkr } from '../utils/currency'
import type { ProductRecord } from '../../../shared/products'
import type {
  SupplierRecord,
  CreateSupplierInput,
  CreateSupplierVoucherInput,
  SupplierVoucherRecord,
  SupplierVoucherStatus,
  UpdateSupplierInput,
  UpdateSupplierVoucherInput
} from '../../../shared/suppliers'

type SupplierView = 'overview' | 'list' | 'vouchers'

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [vouchers, setVouchers] = useState<SupplierVoucherRecord[]>([])
  const [activeView, setActiveView] = useState<SupplierView>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [isVoucherSaving, setIsVoucherSaving] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<SupplierVoucherRecord | null>(null)
  const [viewingVoucher, setViewingVoucher] = useState<SupplierVoucherRecord | null>(null)

  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    Promise.all([suppliersApi.list(), productsApi.list(), suppliersApi.listVouchers()])
      .then(([loadedSuppliers, loadedProducts, loadedVouchers]) => {
        if (isActive) {
          setSuppliers(loadedSuppliers)
          setProducts(loadedProducts)
          setVouchers(loadedVouchers)
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
  }, [toast])

  const columns: Column<SupplierRecord>[] = [
    {
      key: 'name',
      header: 'SUPPLIER',
      render: (item) => (
        <div className="flex min-w-[190px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
            <Building2 size={17} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-800">{item.name}</span>
            <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Hardware Supplier
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'contactName',
      header: 'CONTACT PERSON',
      render: (item) => <span className="text-sm font-medium text-slate-600">{item.contactName || '-'}</span>
    },
    {
      key: 'phone',
      header: 'PHONE',
      render: (item) => <span className="whitespace-nowrap text-sm font-medium text-slate-600">{item.phone || '-'}</span>
    },
    {
      key: 'email',
      header: 'EMAIL',
      render: (item) => <span className="block max-w-[220px] truncate text-sm text-slate-500">{item.email || '-'}</span>
    },
    {
      key: 'productCount',
      header: 'LINKED PRODUCTS',
      render: (item) =>
        item.productCount > 0 ? (
          <span className="inline-flex min-w-[76px] items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
            <PackageCheck size={13} />
            {item.productCount}
          </span>
        ) : (
          <span className="inline-flex min-w-[76px] items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
            None
          </span>
        )
    }
  ]

  const voucherColumns: Column<SupplierVoucherRecord>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      render: (item) => (
        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-700">
          {item.voucherNumber}
        </span>
      )
    },
    {
      key: 'supplierName',
      header: 'SUPPLIER',
      render: (item) => <span className="font-semibold text-slate-700">{item.supplierName || '-'}</span>
    },
    {
      key: 'voucherDate',
      header: 'DATE',
      render: (item) => <span className="whitespace-nowrap text-sm font-medium text-slate-500">{formatShortDate(item.voucherDate)}</span>
    },
    {
      key: 'amount',
      header: 'AMOUNT (LKR)',
      render: (item) => <span className="font-bold text-emerald-700">{formatLkr(item.amount)}</span>
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (item) => (
        <span className={`inline-flex rounded-md border px-2.5 py-1.5 text-xs font-bold ${getVoucherStatusClassName(item.status)}`}>
          {formatVoucherStatus(item.status)}
        </span>
      )
    },
    {
      key: 'note',
      header: 'NOTES',
      render: (item) => <span className="block max-w-64 truncate text-sm text-slate-500">{item.note || '-'}</span>
    }
  ]

  const linkedProducts = products.filter((product) => product.supplierId !== null)
  const totalProductLinks = suppliers.reduce((sum, supplier) => sum + supplier.productCount, 0)
  const estimatedPayable = linkedProducts.reduce(
    (sum, product) => sum + product.buyingPrice * product.stockQuantity,
    0
  )
  const stockedUnits = linkedProducts.reduce((sum, product) => sum + product.stockQuantity, 0)
  const activeSupplierCount = suppliers.filter((supplier) => supplier.productCount > 0).length
  const contactReadyCount = suppliers.filter(hasPaymentContact).length
  const missingContactCount = suppliers.length - contactReadyCount
  const contactReadyPercent =
    suppliers.length > 0 ? (contactReadyCount / suppliers.length) * 100 : 0
  const activeSupplierPercent =
    suppliers.length > 0 ? (activeSupplierCount / suppliers.length) * 100 : 0
  const averageSupplierValue = suppliers.length > 0 ? estimatedPayable / suppliers.length : 0
  const recentSuppliers = [...suppliers].sort(compareByCreatedAtDesc).slice(0, 5)
  const supplierLoad = buildSupplierLoad(suppliers, products)
  const topSupplierValue = Math.max(...supplierLoad.map((supplier) => supplier.stockValue), 0)
  const unassignedSuppliers = suppliers
    .filter((supplier) => supplier.productCount === 0)
    .slice(0, 4)

  const handleAddClick = (): void => {
    if (activeView === 'vouchers') {
      setEditingVoucher(null)
      setIsVoucherModalOpen(true)
      return
    }

    setEditingSupplier(null)
    setIsModalOpen(true)
  }

  const handleEdit = (supplier: SupplierRecord): void => {
    setEditingSupplier(supplier)
    setIsModalOpen(true)
  }

  const handleModalClose = (): void => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingSupplier(null)
  }

  const handleSave = async (data: SupplierFormData): Promise<void> => {
    setIsSaving(true)
    try {
      if (editingSupplier) {
        const payload: UpdateSupplierInput = {
          name: data.name,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email,
          address: data.address
        }
        const updatedSupplier = await suppliersApi.update(editingSupplier.id, payload)
        setSuppliers((prev) =>
          sortSuppliers(prev.map((sup) => (sup.id === editingSupplier.id ? updatedSupplier : sup)))
        )
        setVouchers((prev) =>
          prev.map((voucher) =>
            voucher.supplierId === updatedSupplier.id
              ? { ...voucher, supplierName: updatedSupplier.name }
              : voucher
          )
        )
        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateSupplierInput = {
          name: data.name,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email,
          address: data.address
        }
        const createdSupplier = await suppliersApi.create(payload)
        setSuppliers((prev) => sortSuppliers([...prev, createdSupplier]))
        toast.success(`"${data.name}" was added successfully.`)
      }
      setIsModalOpen(false)
      setEditingSupplier(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoucherModalClose = (): void => {
    if (isVoucherSaving) return
    setIsVoucherModalOpen(false)
    setEditingVoucher(null)
  }

  const handleVoucherEdit = (voucher: SupplierVoucherRecord): void => {
    setEditingVoucher(voucher)
    setIsVoucherModalOpen(true)
  }

  const handleVoucherView = (voucher: SupplierVoucherRecord): void => {
    setViewingVoucher(voucher)
  }

  const handleVoucherSave = async (data: SupplierVoucherFormData): Promise<void> => {
    setIsVoucherSaving(true)
    try {
      if (editingVoucher) {
        const payload: UpdateSupplierVoucherInput = {
          voucherNumber: data.voucherNumber,
          supplierId: data.supplierId,
          voucherDate: data.voucherDate,
          amount: data.amount,
          status: data.status,
          note: data.note
        }
        const updatedVoucher = await suppliersApi.updateVoucher(editingVoucher.id, payload)

        setVouchers((prev) =>
          sortVouchers(
            prev.map((voucher) => (voucher.id === editingVoucher.id ? updatedVoucher : voucher))
          )
        )
        toast.success(`Voucher "${data.voucherNumber}" was updated successfully.`)
      } else {
        const payload: CreateSupplierVoucherInput = {
          voucherNumber: data.voucherNumber,
          supplierId: data.supplierId,
          voucherDate: data.voucherDate,
          amount: data.amount,
          status: data.status,
          note: data.note
        }
        const createdVoucher = await suppliersApi.createVoucher(payload)

        setVouchers((prev) => sortVouchers([...prev, createdVoucher]))
        toast.success(`Voucher "${data.voucherNumber}" was added successfully.`)
      }

      setIsVoucherModalOpen(false)
      setEditingVoucher(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsVoucherSaving(false)
    }
  }

  const deleteVoucher = async (voucher: SupplierVoucherRecord): Promise<void> => {
    try {
      await suppliersApi.deleteVoucher(voucher.id)
      setVouchers((prev) => prev.filter((item) => item.id !== voucher.id))
      toast.success(`Voucher "${voucher.voucherNumber}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleVoucherDelete = (voucher: SupplierVoucherRecord): void => {
    confirm({
      title: 'Delete Voucher',
      message: `Are you sure you want to delete voucher "${voucher.voucherNumber}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteVoucher(voucher)
    })
  }

  const deleteSupplier = async (supplier: SupplierRecord): Promise<void> => {
    try {
      await suppliersApi.delete(supplier.id)
      setSuppliers((prev) => prev.filter((item) => item.id !== supplier.id))
      setVouchers((prev) =>
        prev.map((voucher) =>
          voucher.supplierId === supplier.id ? { ...voucher, supplierId: null } : voucher
        )
      )
      setProducts((prev) =>
        prev.map((product) =>
          product.supplierId === supplier.id
            ? { ...product, supplierId: null, supplierName: null }
            : product
        )
      )
      toast.success(`"${supplier.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = (supplier: SupplierRecord): void => {
    confirm({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteSupplier(supplier)
    })
  }

  return (
    <div className="flex min-h-full flex-col gap-5">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <Building2 size={21} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Suppliers</h1>
                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {suppliers.length} Suppliers
                  </span>
                )}
              </div>
              <p className="mt-1 text-[0.92rem] text-slate-500">
                Manage hardware suppliers, purchasing contacts, stock value and payment vouchers
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
            onClick={handleAddClick}
            disabled={activeView === 'vouchers' && suppliers.length === 0}
            title={
              activeView === 'vouchers' && suppliers.length === 0
                ? 'Create a supplier before adding vouchers'
                : undefined
            }
          >
            <Plus size={18} />
            {activeView === 'vouchers' ? 'Add Voucher' : 'Add Supplier'}
          </button>
        </div>
      </div>

      {/* ======================================================
          VIEW NAVIGATION
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
          <SupplierViewButton
            active={activeView === 'overview'}
            icon={<ClipboardList size={16} />}
            title="Overview"
            description="Supplier health & stock value"
            onClick={() => setActiveView('overview')}
          />
          <SupplierViewButton
            active={activeView === 'list'}
            icon={<Building2 size={16} />}
            title="Supplier List"
            description="Contacts & linked products"
            onClick={() => setActiveView('list')}
          />
          <SupplierViewButton
            active={activeView === 'vouchers'}
            icon={<FileText size={16} />}
            title="Vouchers"
            description="Supplier payment records"
            onClick={() => setActiveView('vouchers')}
          />
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading suppliers..." size="sm" />
        </div>
      ) : activeView === 'overview' ? (
        <div className="flex flex-col gap-5">
          {/* ==================================================
              PROCUREMENT METRICS
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SupplierMetricCard
              title="Total Suppliers"
              value={suppliers.length.toString()}
              meta={`${activeSupplierCount} actively supplying products`}
              icon={<Building2 size={19} />}
              tone="green"
            />
            <SupplierMetricCard
              title="Linked Products"
              value={totalProductLinks.toString()}
              meta={`${stockedUnits} stock units currently tracked`}
              icon={<PackageCheck size={19} />}
              tone="green"
            />
            <SupplierMetricCard
              title="Stock Purchase Value"
              value={formatLkr(estimatedPayable)}
              meta="Current stock valued at buying price"
              icon={<WalletCards size={19} />}
              tone="amber"
            />
            <SupplierMetricCard
              title="Contact Ready"
              value={`${contactReadyCount}/${suppliers.length}`}
              meta={`${missingContactCount} supplier contact record(s) incomplete`}
              icon={<PhoneCall size={19} />}
              tone="slate"
            />
          </div>

          {/* ==================================================
              READINESS + RECENT SUPPLIERS
          ================================================== */}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.65fr]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                icon={<WalletCards size={16} />}
                title="Procurement Readiness"
                description="Supplier activity and payment-contact readiness"
              />
              <div className="p-5">
                <div className="space-y-5">
                  <SupplierProgressRow
                    label="Payment contact ready"
                    value={`${Math.round(contactReadyPercent)}%`}
                    percent={contactReadyPercent}
                    tone="success"
                  />
                  <SupplierProgressRow
                    label="Suppliers linked to stock"
                    value={`${Math.round(activeSupplierPercent)}%`}
                    percent={activeSupplierPercent}
                    tone="primary"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <MiniMetric label="Avg. supplier stock value" value={formatLkr(averageSupplierValue)} />
                    <MiniMetric label="Contacts missing" value={missingContactCount.toString()} />
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                icon={<Clock size={16} />}
                title="Recent Suppliers"
                description="Newest hardware supplier records added to the system"
              />
              <div className="p-5">
                {recentSuppliers.length === 0 ? (
                  <CompactEmptyState icon={<Building2 size={22} />} text="No suppliers found." />
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {recentSuppliers.map((supplier) => (
                      <SupplierSummaryItem
                        key={supplier.id}
                        supplier={supplier}
                        status={hasPaymentContact(supplier) ? 'Ready' : 'Needs contact'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ==================================================
              SUPPLIER LOAD + ACTIONS
          ================================================== */}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_0.85fr]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                icon={<PackageCheck size={16} />}
                title="Supplier Stock Exposure"
                description="Buying-value and product coverage by hardware supplier"
              />
              <div className="p-5">
                {supplierLoad.length === 0 ? (
                  <CompactEmptyState
                    icon={<PackageCheck size={22} />}
                    text="No products are linked to suppliers yet."
                  />
                ) : (
                  <div className="space-y-3">
                    {supplierLoad.slice(0, 6).map((supplier) => (
                      <SupplierLoadRow
                        key={supplier.id}
                        supplier={supplier}
                        maxValue={topSupplierValue}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                icon={<AlertTriangle size={16} />}
                title="Supplier Action Queue"
                description="Records that still need product assignment"
              />
              <div className="p-5">
                {unassignedSuppliers.length === 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                      <BadgeCheck size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Supplier assignments complete</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-600">
                        Every supplier is currently linked to at least one product.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {unassignedSuppliers.map((supplier) => (
                      <div key={supplier.id} className="rounded-lg border border-amber-200 bg-amber-50/60 px-3.5 py-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-700">{supplier.name}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {supplier.phone || supplier.email || 'No contact saved'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : activeView === 'list' ? (
        suppliers.length === 0 ? (
          <LargeEmptyState
            icon={<Building2 size={28} />}
            title="No suppliers available"
            description="Add hardware suppliers to link products, manage purchasing contacts and track supplier stock value."
            actionLabel="Add First Supplier"
            onAction={handleAddClick}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">Hardware Supplier Directory</span>
              </div>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {suppliers.length} supplier{suppliers.length === 1 ? '' : 's'}
              </span>
            </div>
            <DataTable columns={columns} data={suppliers} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        )
      ) : suppliers.length === 0 ? (
        <LargeEmptyState
          icon={<FileText size={28} />}
          title="Supplier required first"
          description="Create at least one supplier before recording supplier payment vouchers."
          actionLabel="Add Supplier"
          onAction={() => {
            setActiveView('list')
            setEditingSupplier(null)
            setIsModalOpen(true)
          }}
        />
      ) : vouchers.length === 0 ? (
        <LargeEmptyState
          icon={<WalletCards size={28} />}
          title="No supplier vouchers available"
          description="Create a voucher to track pending, paid or cancelled supplier payment records."
          actionLabel="Add First Voucher"
          onAction={handleAddClick}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-600" />
              <span className="text-sm font-bold text-slate-700">Supplier Payment Vouchers</span>
            </div>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              {vouchers.length} voucher{vouchers.length === 1 ? '' : 's'}
            </span>
          </div>
          <DataTable
            columns={voucherColumns}
            data={vouchers}
            onView={handleVoucherView}
            onEdit={handleVoucherEdit}
            onDelete={handleVoucherDelete}
          />
        </div>
      )}

      <SupplierModal
        isOpen={isModalOpen}
        initialData={
          editingSupplier
            ? {
                name: editingSupplier.name,
                contactName: editingSupplier.contactName,
                phone: editingSupplier.phone,
                email: editingSupplier.email,
                address: editingSupplier.address
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleModalClose}
        onSave={handleSave}
      />

      <SupplierVoucherModal
        isOpen={isVoucherModalOpen}
        suppliers={suppliers}
        initialData={
          editingVoucher
            ? {
                voucherNumber: editingVoucher.voucherNumber,
                supplierId: editingVoucher.supplierId ?? 0,
                voucherDate: editingVoucher.voucherDate,
                amount: editingVoucher.amount,
                status: editingVoucher.status,
                note: editingVoucher.note
              }
            : undefined
        }
        isSaving={isVoucherSaving}
        onClose={handleVoucherModalClose}
        onSave={handleVoucherSave}
      />

      <SupplierVoucherDetailsModal
        voucher={viewingVoucher}
        onClose={() => setViewingVoucher(null)}
      />
    </div>
  )
}

export default SuppliersPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function sortSuppliers(items: SupplierRecord[]): SupplierRecord[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

function sortVouchers(items: SupplierVoucherRecord[]): SupplierVoucherRecord[] {
  return [...items].sort(
    (left, right) =>
      getDateTime(right.voucherDate) - getDateTime(left.voucherDate) || right.id - left.id
  )
}

function formatVoucherStatus(status: SupplierVoucherStatus): string {
  const labels: Record<SupplierVoucherStatus, string> = {
    PENDING: 'Pending',
    PAID: 'Paid',
    CANCELLED: 'Cancelled'
  }

  return labels[status]
}

function getVoucherStatusClassName(status: SupplierVoucherStatus): string {
  const classNames: Record<SupplierVoucherStatus, string> = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-red-200 bg-red-50 text-red-700'
  }

  return classNames[status]
}

interface SupplierLoadItem extends SupplierRecord {
  stockUnits: number
  stockValue: number
}

const SupplierViewButton: React.FC<{
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
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${active ? 'bg-white/15' : 'bg-slate-100'}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-sm font-bold">{title}</div>
      <div className={`mt-0.5 truncate text-[0.7rem] font-medium ${active ? 'text-emerald-50' : 'text-slate-400'}`}>
        {description}
      </div>
    </div>
  </button>
)

const SectionHeader: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
}> = ({ icon, title, description }) => (
  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
      {icon}
    </div>
    <div>
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{description}</p>
    </div>
  </div>
)

const SupplierMetricCard: React.FC<{
  title: string
  value: string
  meta: string
  icon: React.ReactNode
  tone: 'green' | 'amber' | 'slate'
}> = ({ title, value, meta, icon, tone }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`absolute inset-x-0 top-0 h-[3px] ${tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-400' : 'bg-slate-300'}`} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <h3 className={`mt-1.5 break-words text-xl font-bold tracking-tight ${tone === 'green' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>
          {value}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">{meta}</p>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
      </div>
    </div>
  </div>
)

const SupplierProgressRow: React.FC<{
  label: string
  value: string
  percent: number
  tone: 'primary' | 'success'
}> = ({ label, value, percent, tone }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-bold text-slate-500">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${tone === 'success' ? 'bg-emerald-500' : 'bg-emerald-600'}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  </div>
)

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
    <div className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1.5 break-words text-sm font-bold text-slate-700">{value}</div>
  </div>
)

const SupplierSummaryItem: React.FC<{ supplier: SupplierRecord; status: string }> = ({ supplier, status }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Building2 size={16} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{supplier.name}</div>
          <div className="mt-1 truncate text-xs text-slate-400">
            {supplier.contactName || supplier.phone || supplier.email || 'No contact saved'}
          </div>
        </div>
      </div>
      <span className={`shrink-0 rounded-md border px-2 py-1 text-[0.68rem] font-bold ${status === 'Ready' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
        {status}
      </span>
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
      <span>{supplier.productCount} linked product{supplier.productCount === 1 ? '' : 's'}</span>
      <span>{formatShortDate(supplier.createdAt)}</span>
    </div>
  </div>
)

const SupplierLoadRow: React.FC<{ supplier: SupplierLoadItem; maxValue: number }> = ({ supplier, maxValue }) => {
  const percent = maxValue > 0 ? (supplier.stockValue / maxValue) * 100 : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{supplier.name}</div>
          <div className="mt-1 text-xs text-slate-400">
            {supplier.productCount} product{supplier.productCount === 1 ? '' : 's'} • {supplier.stockUnits} stock units
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold text-emerald-700">{formatLkr(supplier.stockValue)}</div>
          <div className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">Stock value</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

const CompactEmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-400">{icon}</div>
    <p className="text-sm font-medium text-slate-500">{text}</p>
  </div>
)

const LargeEmptyState: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">{icon}</div>
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    <button
      type="button"
      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
      onClick={onAction}
    >
      <Plus size={17} />
      {actionLabel}
    </button>
  </div>
)

function buildSupplierLoad(
  suppliers: SupplierRecord[],
  products: ProductRecord[]
): SupplierLoadItem[] {
  return suppliers
    .map((supplier) => {
      const supplierProducts = products.filter((product) => product.supplierId === supplier.id)
      const stockUnits = supplierProducts.reduce((sum, product) => sum + product.stockQuantity, 0)
      const stockValue = supplierProducts.reduce(
        (sum, product) => sum + product.buyingPrice * product.stockQuantity,
        0
      )

      return {
        ...supplier,
        stockUnits,
        stockValue
      }
    })
    .filter((supplier) => supplier.productCount > 0 || supplier.stockValue > 0)
    .sort(
      (left, right) => right.stockValue - left.stockValue || right.productCount - left.productCount
    )
}

function hasPaymentContact(supplier: SupplierRecord): boolean {
  return supplier.phone.trim().length > 0 || supplier.email.trim().length > 0
}

function compareByCreatedAtDesc(left: SupplierRecord, right: SupplierRecord): number {
  return getDateTime(right.createdAt) - getDateTime(left.createdAt)
}

function getDateTime(value: string): number {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function formatShortDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}
