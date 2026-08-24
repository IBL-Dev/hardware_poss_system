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
      header: 'SUPPLIER NAME',
      render: (item) => (
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {item.name}
        </span>
      )
    },
    { key: 'contactName', header: 'CONTACT', render: (item) => item.contactName || '-' },
    { key: 'phone', header: 'PHONE', render: (item) => item.phone || '-' },
    { key: 'email', header: 'EMAIL', render: (item) => item.email || '-' },
    {
      key: 'productCount',
      header: 'PRODUCTS',
      render: (item) => (
        <span className="inline-flex rounded-full border border-line-strong bg-subtle px-2.5 py-1 text-xs font-semibold text-muted">
          {item.productCount}
        </span>
      )
    }
  ]

  const voucherColumns: Column<SupplierVoucherRecord>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      render: (item) => (
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {item.voucherNumber}
        </span>
      )
    },
    { key: 'supplierName', header: 'SUPPLIER', render: (item) => item.supplierName || '-' },
    { key: 'voucherDate', header: 'DATE', render: (item) => formatShortDate(item.voucherDate) },
    {
      key: 'amount',
      header: 'AMOUNT (LKR)',
      render: (item) => <span className="font-semibold text-ink">{formatLkr(item.amount)}</span>
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (item) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVoucherStatusClassName(
            item.status
          )}`}
        >
          {formatVoucherStatus(item.status)}
        </span>
      )
    },
    {
      key: 'note',
      header: 'NOTES',
      render: (item) => (
        <span className="block max-w-64 truncate text-sm text-muted">{item.note || '-'}</span>
      )
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
    <div className="flex flex-col gap-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Suppliers</h1>
          <p className="mt-1 text-[0.95rem] text-muted">
            Manage supplier activity and contact readiness
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-success"
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

      <div className="flex gap-1 border-b border-line">
        <button
          type="button"
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
            activeView === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          onClick={() => setActiveView('overview')}
        >
          <ClipboardList size={16} />
          Overview
        </button>
        <button
          type="button"
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
            activeView === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          onClick={() => setActiveView('list')}
        >
          <Building2 size={16} />
          Supplier List
        </button>
        <button
          type="button"
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
            activeView === 'vouchers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          onClick={() => setActiveView('vouchers')}
        >
          <FileText size={16} />
          Vouchers
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <Loader label="Loading suppliers..." size="sm" />
        </div>
      ) : activeView === 'overview' ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SupplierMetricCard
              title="Total Suppliers"
              value={suppliers.length.toString()}
              meta={`${activeSupplierCount} linked to products`}
              icon={<Building2 size={20} />}
              iconClassName="bg-primary"
            />
            <SupplierMetricCard
              title="Linked Products"
              value={totalProductLinks.toString()}
              meta={`${stockedUnits} stock units tracked`}
              icon={<PackageCheck size={20} />}
              iconClassName="bg-success"
            />
            <SupplierMetricCard
              title="Payment Estimate (LKR)"
              value={formatLkr(estimatedPayable)}
              meta="Stock value at buying price"
              icon={<WalletCards size={20} />}
              iconClassName="bg-warning"
            />
            <SupplierMetricCard
              title="Payment Contacts"
              value={`${contactReadyCount}/${suppliers.length}`}
              meta={`${missingContactCount} need phone or email`}
              icon={<PhoneCall size={20} />}
              iconClassName="bg-accent"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-lg border border-line bg-card p-5 shadow-sm xl:col-span-1">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Payment Readiness</h2>
                  <p className="mt-1 text-sm text-muted">
                    Supplier contact and stock-value summary
                  </p>
                </div>
                <WalletCards size={20} className="text-primary" />
              </div>

              <div className="space-y-4">
                <SupplierProgressRow
                  label="Contact ready"
                  value={`${Math.round(contactReadyPercent)}%`}
                  percent={contactReadyPercent}
                  tone="success"
                />
                <SupplierProgressRow
                  label="Active suppliers"
                  value={`${Math.round(activeSupplierPercent)}%`}
                  percent={activeSupplierPercent}
                  tone="primary"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <MiniMetric
                    label="Avg. stock value (LKR)"
                    value={formatLkr(averageSupplierValue)}
                  />
                  <MiniMetric label="Needs contact" value={missingContactCount.toString()} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-card p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Recent Suppliers</h2>
                  <p className="mt-1 text-sm text-muted">Newest supplier records in the system</p>
                </div>
                <Clock size={20} className="text-primary" />
              </div>

              {recentSuppliers.length === 0 ? (
                <div className="rounded-md border border-line bg-bg p-4 text-center text-sm text-muted">
                  No suppliers found.
                </div>
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
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-lg border border-line bg-card p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Supplier Product Load</h2>
                  <p className="mt-1 text-sm text-muted">
                    Stock value (LKR) and product coverage by supplier
                  </p>
                </div>
                <PackageCheck size={20} className="text-primary" />
              </div>

              {supplierLoad.length === 0 ? (
                <div className="rounded-md border border-line bg-bg p-4 text-center text-sm text-muted">
                  No linked supplier products yet.
                </div>
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

            <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Action Queue</h2>
                  <p className="mt-1 text-sm text-muted">Suppliers needing product assignment</p>
                </div>
                <AlertTriangle size={20} className="text-warning" />
              </div>

              {unassignedSuppliers.length === 0 ? (
                <div className="flex items-center gap-3 rounded-md border border-success/20 bg-success/10 p-4 text-sm text-success">
                  <BadgeCheck size={18} />
                  <span>All suppliers are linked to products.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="rounded-md border border-line bg-bg px-3 py-2.5"
                    >
                      <div className="truncate font-semibold text-ink">{supplier.name}</div>
                      <div className="text-xs text-muted">
                        {supplier.phone || supplier.email || 'No contact saved'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeView === 'list' ? (
        suppliers.length === 0 ? (
          <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
            No suppliers found.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={suppliers}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          Create a supplier before adding vouchers.
        </div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No vouchers found.
        </div>
      ) : (
        <DataTable
          columns={voucherColumns}
          data={vouchers}
          onView={handleVoucherView}
          onEdit={handleVoucherEdit}
          onDelete={handleVoucherDelete}
        />
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
    PENDING: 'border-warning/25 bg-warning/10 text-warning',
    PAID: 'border-success/20 bg-success/10 text-success',
    CANCELLED: 'border-danger/20 bg-danger/10 text-danger'
  }

  return classNames[status]
}

interface SupplierLoadItem extends SupplierRecord {
  stockUnits: number
  stockValue: number
}

const SupplierMetricCard: React.FC<{
  title: string
  value: string
  meta: string
  icon: React.ReactNode
  iconClassName: string
}> = ({ title, value, meta, icon, iconClassName }) => (
  <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[0.9rem] font-medium text-muted">{title}</span>
        <h3 className="mt-2 break-words text-2xl font-semibold text-ink">{value}</h3>
      </div>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${iconClassName}`}
      >
        {icon}
      </div>
    </div>
    <div className="text-[0.9rem] text-muted">{meta}</div>
  </div>
)

const SupplierProgressRow: React.FC<{
  label: string
  value: string
  percent: number
  tone: 'primary' | 'success'
}> = ({ label, value, percent, tone }) => (
  <div>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="font-medium text-ink">{label}</span>
      <span className="text-muted">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-subtle">
      <div
        className={`h-full rounded-full ${tone === 'success' ? 'bg-success' : 'bg-primary'}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  </div>
)

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md border border-line bg-bg p-3">
    <div className="text-xs font-medium text-muted">{label}</div>
    <div className="mt-1 break-words text-sm font-bold text-ink">{value}</div>
  </div>
)

const SupplierSummaryItem: React.FC<{ supplier: SupplierRecord; status: string }> = ({
  supplier,
  status
}) => (
  <div className="rounded-md border border-line bg-bg p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-semibold text-ink">{supplier.name}</div>
        <div className="mt-1 truncate text-xs text-muted">
          {supplier.contactName || supplier.phone || supplier.email || 'No contact saved'}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === 'Ready'
            ? 'border border-success/20 bg-success/10 text-success'
            : 'border border-warning/25 bg-warning/10 text-warning'
        }`}
      >
        {status}
      </span>
    </div>
    <div className="mt-3 flex items-center justify-between text-xs text-muted">
      <span>{supplier.productCount} product(s)</span>
      <span>{formatShortDate(supplier.createdAt)}</span>
    </div>
  </div>
)

const SupplierLoadRow: React.FC<{ supplier: SupplierLoadItem; maxValue: number }> = ({
  supplier,
  maxValue
}) => {
  const percent = maxValue > 0 ? (supplier.stockValue / maxValue) * 100 : 0

  return (
    <div className="rounded-md border border-line bg-bg p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{supplier.name}</div>
          <div className="mt-1 text-xs text-muted">
            {supplier.productCount} product(s) - {supplier.stockUnits} stock units
          </div>
        </div>
        <div className="shrink-0 text-right text-sm font-bold text-ink">
          {formatLkr(supplier.stockValue)}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

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
