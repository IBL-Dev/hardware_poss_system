import React, { useState } from 'react'
import { Building2, FileText, Paperclip, Plus, Trash2, Truck, User, X } from 'lucide-react'
import { Spinner } from '../common/Spinner'
import { suppliersApi } from '../../api/suppliersApi'
import type { ProductRecord } from '../../../../shared/products'
import type { SupplierRecord } from '../../../../shared/suppliers'
import type {
  CreatePurchaseItemInput,
  CreatePurchasePaymentInput,
  PurchasePayTermUnit,
  PurchasePaymentMethod,
  PurchaseStatus,
  PurchaseSupplierType
} from '../../../../shared/purchases'
import { PURCHASE_PAYMENT_METHODS, PURCHASE_PAY_TERM_UNITS } from '../../../../shared/purchases'

export interface PurchaseFormData {
  supplierId: number | null
  supplierName: string
  supplierType: PurchaseSupplierType
  contactId: string
  mobileNo: string
  email: string
  address: string
  status: PurchaseStatus
  businessLocation: string
  payTermValue: number
  payTermUnit: PurchasePayTermUnit
  attachmentPath: string
  invoicePdfPath: string
  advanceBalance: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  discountAmount: number
  items: CreatePurchaseItemInput[]
  payments: CreatePurchasePaymentInput[]
}

interface PurchaseModalProps {
  isOpen: boolean
  suppliers: SupplierRecord[]
  products: ProductRecord[]
  initialData?: PurchaseFormData
  isSaving?: boolean
  onClose: () => void
  onSave: (data: PurchaseFormData) => void
}

interface ProductLine {
  productId: string
  quantity: string
  unitPrice: string
}

interface PaymentLine {
  amount: string
  paymentMethod: PurchasePaymentMethod
  paidOn: string
}

interface QuickSupplierForm {
  name: string
  contactId: string
  mobileNo: string
  email: string
  address: string
}

const purchaseStatusOptions: Array<{ value: PurchaseStatus; label: string }> = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ORDERED', label: 'Ordered' }
]

const paymentMethodLabels: Record<PurchasePaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_PAY: 'Mobile Pay',
  CREDIT: 'Credit'
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  suppliers,
  products,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  if (!isOpen) return null

  return (
    <PurchaseModalContent
      key={initialData ? `purchase-${initialData.supplierName}` : 'new-purchase'}
      suppliers={suppliers}
      products={products}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

const PurchaseModalContent: React.FC<Omit<PurchaseModalProps, 'isOpen'>> = ({
  suppliers,
  products,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  const [availableSuppliers, setAvailableSuppliers] = useState<SupplierRecord[]>(suppliers)
  const [supplierId, setSupplierId] = useState(
    initialData?.supplierId?.toString() ??
      (suppliers.length === 1 ? suppliers[0].id.toString() : '')
  )
  const [supplierType, setSupplierType] = useState<PurchaseSupplierType>(
    initialData?.supplierType ?? 'INDIVIDUAL'
  )
  const [contactId, setContactId] = useState(initialData?.contactId ?? '')
  const [mobileNo, setMobileNo] = useState(initialData?.mobileNo ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [status, setStatus] = useState<PurchaseStatus>(initialData?.status ?? 'ORDERED')
  const [businessLocation, setBusinessLocation] = useState(initialData?.businessLocation ?? '')
  const [payTermValue, setPayTermValue] = useState(
    initialData?.payTermValue ? initialData.payTermValue.toString() : ''
  )
  const [payTermUnit, setPayTermUnit] = useState<PurchasePayTermUnit>(
    initialData?.payTermUnit ?? 'DAYS'
  )
  const [attachmentPath, setAttachmentPath] = useState(initialData?.attachmentPath ?? '')
  const [invoicePdfPath, setInvoicePdfPath] = useState(initialData?.invoicePdfPath ?? '')
  const [advanceBalance, setAdvanceBalance] = useState(
    initialData?.advanceBalance ? initialData.advanceBalance.toString() : ''
  )
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>(
    initialData?.paymentMethod ?? 'CASH'
  )
  const [paidOn, setPaidOn] = useState(initialData?.paidOn ?? getTodayInputValue())
  const [discountAmount, setDiscountAmount] = useState(
    initialData?.discountAmount ? initialData.discountAmount.toString() : ''
  )
  const [lines, setLines] = useState<ProductLine[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items.map((item) => ({
          productId: item.productId.toString(),
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString()
        }))
      : [{ productId: '', quantity: '1', unitPrice: '' }]
  )
  const [payments, setPayments] = useState<PaymentLine[]>(
    initialData?.payments && initialData.payments.length > 0
      ? initialData.payments.map((payment) => ({
          amount: payment.amount.toString(),
          paymentMethod: payment.paymentMethod,
          paidOn: payment.paidOn
        }))
      : []
  )
  const [showQuickSupplier, setShowQuickSupplier] = useState(false)
  const [quickSupplier, setQuickSupplier] = useState<QuickSupplierForm>({
    name: '',
    contactId: '',
    mobileNo: '',
    email: '',
    address: ''
  })
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)

  const handleSupplierChange = (value: string): void => {
    setSupplierId(value)

    const supplier = availableSuppliers.find((item) => item.id.toString() === value)

    if (supplier) {
      setSupplierType('BUSINESS')
      setContactId(supplier.phone)
      setMobileNo(supplier.phone)
      setEmail(supplier.email)
      setAddress(supplier.address)
      setBusinessLocation((current) => current || supplier.address)
    }
  }

  const addLine = (): void => {
    setLines((current) => [...current, { productId: '', quantity: '1', unitPrice: '' }])
  }

  const updateLine = (index: number, patch: Partial<ProductLine>): void => {
    setLines((current) =>
      current.map((line, i) => {
        if (i !== index) return line

        const nextLine = { ...line, ...patch }

        if (patch.productId) {
          const product = products.find((item) => item.id.toString() === patch.productId)

          if (product) {
            nextLine.unitPrice =
              nextLine.unitPrice === '' ? product.buyingPrice.toString() : nextLine.unitPrice
          }
        }

        return nextLine
      })
    )
  }

  const removeLine = (index: number): void => {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  const addPayment = (): void => {
    setPayments((current) => [
      ...current,
      { amount: '', paymentMethod: paymentMethod, paidOn: getTodayInputValue() }
    ])
  }

  const updatePayment = (index: number, patch: Partial<PaymentLine>): void => {
    setPayments((current) =>
      current.map((payment, i) => (i === index ? { ...payment, ...patch } : payment))
    )
  }

  const removePayment = (index: number): void => {
    setPayments((current) => current.filter((_, i) => i !== index))
  }

  const createQuickSupplier = async (): Promise<void> => {
    if (quickSupplier.name.trim() === '' && quickSupplier.mobileNo.trim() === '') {
      return
    }

    setIsAddingSupplier(true)
    try {
      const createdSupplier = await suppliersApi.create({
        name: quickSupplier.name.trim() || quickSupplier.mobileNo.trim(),
        phone: quickSupplier.mobileNo,
        email: quickSupplier.email,
        address: quickSupplier.address
      })

      setAvailableSuppliers((current) => [...current, createdSupplier])
      setSupplierId(createdSupplier.id.toString())
      setSupplierType(quickSupplier.name.trim() ? 'BUSINESS' : 'INDIVIDUAL')
      setContactId(quickSupplier.contactId)
      setMobileNo(quickSupplier.mobileNo)
      setEmail(quickSupplier.email)
      setAddress(quickSupplier.address)
      setBusinessLocation((current) => current || quickSupplier.address)
      setQuickSupplier({ name: '', contactId: '', mobileNo: '', email: '', address: '' })
      setShowQuickSupplier(false)
    } finally {
      setIsAddingSupplier(false)
    }
  }

  const totalCost = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0
    const unitPrice = Number(line.unitPrice) || 0

    return sum + quantity * unitPrice
  }, 0)
  const discount = Number(discountAmount) || 0
  const grandTotal = Math.max(0, totalCost - discount)
  const advance = Number(advanceBalance) || 0

  const hasValidLines =
    lines.length > 0 &&
    lines.every((line) => Number(line.productId) > 0 && Number(line.quantity) > 0)

  const supplierResolved = Number(supplierId) > 0

  const isValid = supplierResolved && hasValidLines

  const handleSave = (): void => {
    if (!isValid) return

    const selectedSupplier = availableSuppliers.find(
      (supplier) => supplier.id.toString() === supplierId
    )

    onSave({
      supplierId: selectedSupplier?.id ?? null,
      supplierName:
        selectedSupplier?.name ??
        (supplierType === 'BUSINESS'
          ? (quickSupplier.name || selectedSupplier?.name || '').trim()
          : quickSupplier.mobileNo.trim() || quickSupplier.name.trim()),
      supplierType,
      contactId,
      mobileNo,
      email,
      address,
      status,
      businessLocation,
      payTermValue: Number(payTermValue) || 0,
      payTermUnit,
      attachmentPath,
      invoicePdfPath,
      advanceBalance: advance,
      paymentMethod,
      paidOn,
      discountAmount: discount,
      items: lines
        .filter((line) => Number(line.productId) > 0 && Number(line.quantity) > 0)
        .map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity) || 1,
          unitPrice: Number(line.unitPrice) || 0
        })),
      payments: payments
        .filter((payment) => Number(payment.amount) > 0)
        .map((payment) => ({
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          paidOn: payment.paidOn
        }))
    })
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-[min(96vw,72rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit Purchase' : 'Add Purchase'}
          </h3>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================================
            SUPPLIER DETAILS
        ============================================================ */}
        <section className="rounded-lg border border-line bg-bg p-4">
          <SectionTitle icon={<Truck size={15} />} title="Supplier Details" />

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Supplier</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className="flex-1 rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    value={supplierId}
                    onChange={(event) => handleSupplierChange(event.target.value)}
                    disabled={availableSuppliers.length === 0}
                  >
                    <option value="">Select existing supplier</option>
                    {availableSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover"
                    onClick={() => setShowQuickSupplier((visible) => !visible)}
                  >
                    <Plus size={15} />
                    Add Supplier
                  </button>
                </div>
              </div>
            </div>

            {showQuickSupplier && (
              <div className="flex flex-col gap-4 rounded-md border border-line bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">New Supplier</span>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-ink"
                    onClick={() => setShowQuickSupplier(false)}
                    aria-label="Close supplier form"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name">
                    <input
                      type="text"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      placeholder="Supplier name"
                      value={quickSupplier.name}
                      onChange={(event) =>
                        setQuickSupplier({ ...quickSupplier, name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Contact ID">
                    <input
                      type="text"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      placeholder="Contact ID"
                      value={quickSupplier.contactId}
                      onChange={(event) =>
                        setQuickSupplier({ ...quickSupplier, contactId: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Mobile No.">
                    <input
                      type="text"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      placeholder="Mobile number"
                      value={quickSupplier.mobileNo}
                      onChange={(event) =>
                        setQuickSupplier({ ...quickSupplier, mobileNo: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      placeholder="Email address"
                      value={quickSupplier.email}
                      onChange={(event) =>
                        setQuickSupplier({ ...quickSupplier, email: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Address">
                    <input
                      type="text"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      placeholder="Business address"
                      value={quickSupplier.address}
                      onChange={(event) =>
                        setQuickSupplier({ ...quickSupplier, address: event.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={createQuickSupplier}
                    disabled={
                      isAddingSupplier ||
                      (quickSupplier.name.trim() === '' && quickSupplier.mobileNo.trim() === '')
                    }
                  >
                    {isAddingSupplier && <Spinner size={14} />}
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[0.85rem] font-medium text-muted">Type</span>
                <div className="flex gap-2">
                  <TypeToggle
                    active={supplierType === 'INDIVIDUAL'}
                    icon={<User size={14} />}
                    label="Individual"
                    onClick={() => setSupplierType('INDIVIDUAL')}
                  />
                  <TypeToggle
                    active={supplierType === 'BUSINESS'}
                    icon={<Building2 size={14} />}
                    label="Business"
                    onClick={() => setSupplierType('BUSINESS')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Contact ID">
                  <input
                    type="text"
                    className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                    value={contactId}
                    onChange={(event) => setContactId(event.target.value)}
                  />
                </Field>
                <Field label="Mobile No.">
                  <input
                    type="text"
                    className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                    value={mobileNo}
                    onChange={(event) => setMobileNo(event.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field label="Address">
                  <input
                    type="text"
                    className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            PURCHASE DETAILS
        ============================================================ */}
        <section className="rounded-lg border border-line bg-bg p-4">
          <SectionTitle icon={<Truck size={15} />} title="Purchase Details" />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Purchase Status</label>
              <div className="flex gap-2">
                {purchaseStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      status === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-line bg-bg text-muted hover:bg-hover'
                    }`}
                    onClick={() => setStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Business Location">
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="e.g. Colombo, Kandy"
                value={businessLocation}
                onChange={(event) => setBusinessLocation(event.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Pay Term</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  className="w-24 rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="0"
                  value={payTermValue}
                  onChange={(event) => setPayTermValue(event.target.value)}
                />
                <div className="flex overflow-hidden rounded-md border border-line">
                  {PURCHASE_PAY_TERM_UNITS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`px-3 py-2.5 text-sm font-semibold transition-colors ${
                        payTermUnit === unit
                          ? 'bg-primary text-white'
                          : 'bg-bg text-muted hover:bg-hover'
                      }`}
                      onClick={() => setPayTermUnit(unit)}
                    >
                      {unit === 'MONTHS' ? 'Months' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Attachment</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  className="hidden"
                  id="purchase-attachment"
                  onChange={(event) => setAttachmentPath(event.target.files?.[0]?.name ?? '')}
                />
                <label
                  htmlFor="purchase-attachment"
                  className="flex h-11 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-line bg-bg px-3 text-sm text-muted transition-colors hover:bg-hover"
                >
                  <Paperclip size={15} className="shrink-0" />
                  <span className="truncate">{attachmentPath || 'Browse file...'}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Invoice PDF</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="purchase-invoice-pdf"
                  onChange={(event) => setInvoicePdfPath(event.target.files?.[0]?.name ?? '')}
                />
                <label
                  htmlFor="purchase-invoice-pdf"
                  className="flex h-11 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-line bg-bg px-3 text-sm text-muted transition-colors hover:bg-hover"
                >
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">{invoicePdfPath || 'Browse PDF...'}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            PURCHASE ITEMS
        ============================================================ */}
        <section className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<Plus size={15} />} title="Purchase Items" />
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover"
              onClick={addLine}
            >
              <Plus size={15} />
              Add New Product
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {lines.map((line, index) => {
              const product = products.find((item) => item.id.toString() === line.productId)
              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)

              return (
                <div
                  key={`line-${index}`}
                  className="grid grid-cols-1 gap-2.5 rounded-md border border-line bg-card p-3 sm:grid-cols-[2fr_0.7fr_0.9fr_0.9fr_auto] sm:items-end"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Product
                    </label>
                    <select
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={line.productId}
                      onChange={(event) => updateLine(index, { productId: event.target.value })}
                    >
                      <option value="">Select product</option>
                      {products
                        .filter(
                          (item) =>
                            item.id.toString() === line.productId ||
                            !lines.some(
                              (other, otherIndex) =>
                                otherIndex !== index && other.productId === item.id.toString()
                            )
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.sku ? ` (${item.sku})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Price (LKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                      placeholder={product ? product.buyingPrice.toString() : '0.00'}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Line Total
                    </label>
                    <div className="rounded-md border border-line bg-bg px-3 py-2.5 text-base font-semibold text-ink">
                      {lineTotal.toLocaleString('en-LK', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center self-end rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    aria-label="Remove product line"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col items-end gap-3 rounded-md border border-dashed border-line bg-card p-4">
            <div className="flex w-full max-w-xs flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-ink">
                  {totalCost.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-base font-bold text-primary">
                  {grandTotal.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            PAYMENT DETAILS
        ============================================================ */}
        <section className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<FileText size={15} />} title="Payment Details" />
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover"
              onClick={addPayment}
            >
              <Plus size={15} />
              Add Payment
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Advance Balance (LKR)">
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="0.00"
                value={advanceBalance}
                onChange={(event) => setAdvanceBalance(event.target.value)}
              />
            </Field>
            <Field label="Payment Method">
              <select
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PurchasePaymentMethod)}
              >
                {PURCHASE_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paid On – Date">
              <input
                type="date"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
              />
            </Field>
          </div>

          {payments.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5">
              <span className="text-sm font-semibold text-ink">Payments</span>
              {payments.map((payment, index) => (
                <div
                  key={`payment-${index}`}
                  className="grid grid-cols-1 gap-2.5 rounded-md border border-line bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Amount (LKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={payment.amount}
                      onChange={(event) => updatePayment(index, { amount: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Method
                    </label>
                    <select
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={payment.paymentMethod}
                      onChange={(event) =>
                        updatePayment(index, {
                          paymentMethod: event.target.value as PurchasePaymentMethod
                        })
                      }
                    >
                      {PURCHASE_PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabels[method]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="hidden text-[0.78rem] font-medium text-muted sm:block">
                      Paid On
                    </label>
                    <input
                      type="date"
                      className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                      value={payment.paidOn}
                      onChange={(event) => updatePayment(index, { paidOn: event.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center self-end rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    onClick={() => removePayment(index)}
                    aria-label="Remove payment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-2 flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleSave}
            disabled={isSaving || !isValid}
          >
            {isSaving && <Spinner size={16} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
      {icon}
    </span>
    <span className="text-sm font-bold text-ink">{title}</span>
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[0.85rem] font-medium text-muted">{label}</label>
    {children}
  </div>
)

const TypeToggle: React.FC<{
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}> = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-line bg-bg text-muted hover:bg-hover'
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
)

function getTodayInputValue(): string {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 10)
}
