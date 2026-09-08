import React, { useState } from 'react'
import { Plus, RotateCcw, Trash2, Truck, X } from 'lucide-react'
import { Spinner } from '../common/Spinner'
import type { ProductRecord } from '../../../../shared/products'
import type { PurchaseRecord } from '../../../../shared/purchases'
import type { CreatePurchaseReturnInput } from '../../../../shared/purchases'

export interface PurchaseReturnFormData {
  purchaseId: number | null
  supplierId: number | null
  supplierName: string
  businessLocation: string
  returnDate: string
  reason: string
  items: CreatePurchaseReturnInput['items']
}

interface PurchaseReturnModalProps {
  isOpen: boolean
  products: ProductRecord[]
  purchases: PurchaseRecord[]
  initialData?: PurchaseReturnFormData
  isSaving?: boolean
  onClose: () => void
  onSave: (data: PurchaseReturnFormData) => void
}

interface ReturnLine {
  productId: string
  quantity: string
  unitPrice: string
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({
  isOpen,
  products,
  purchases,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  if (!isOpen) return null

  return (
    <PurchaseReturnModalContent
      key={initialData ? `return-${initialData.returnDate}` : 'new-purchase-return'}
      products={products}
      purchases={purchases}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

const PurchaseReturnModalContent: React.FC<Omit<PurchaseReturnModalProps, 'isOpen'>> = ({
  products,
  purchases,
  initialData,
  isSaving = false,
  onClose,
  onSave
}) => {
  const [purchaseId, setPurchaseId] = useState(
    initialData?.purchaseId?.toString() ??
      (purchases.length === 1 ? purchases[0].id.toString() : '')
  )
  const [supplierName, setSupplierName] = useState(initialData?.supplierName ?? '')
  const [businessLocation, setBusinessLocation] = useState(initialData?.businessLocation ?? '')
  const [returnDate, setReturnDate] = useState(initialData?.returnDate ?? getTodayInputValue())
  const [reason, setReason] = useState(initialData?.reason ?? '')
  const [lines, setLines] = useState<ReturnLine[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items.map((item) => ({
          productId: item.productId.toString(),
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString()
        }))
      : [{ productId: '', quantity: '1', unitPrice: '' }]
  )

  const handlePurchaseChange = (value: string): void => {
    setPurchaseId(value)

    const purchase = purchases.find((item) => item.id.toString() === value)

    if (purchase) {
      setSupplierName(purchase.supplierName)
      setBusinessLocation((current) => current || purchase.businessLocation)
    }
  }

  const addLine = (): void => {
    setLines((current) => [...current, { productId: '', quantity: '1', unitPrice: '' }])
  }

  const updateLine = (index: number, patch: Partial<ReturnLine>): void => {
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

  const subtotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0
    const unitPrice = Number(line.unitPrice) || 0

    return sum + quantity * unitPrice
  }, 0)

  const hasValidLines =
    lines.length > 0 &&
    lines.every((line) => Number(line.productId) > 0 && Number(line.quantity) > 0)

  const supplierResolved = Number(purchaseId) > 0 || supplierName.trim().length > 0

  const isValid = supplierResolved && hasValidLines

  const handleSave = (): void => {
    if (!isValid) return

    const selectedPurchase = purchases.find((purchase) => purchase.id.toString() === purchaseId)

    onSave({
      purchaseId: selectedPurchase?.id ?? null,
      supplierId: selectedPurchase?.supplierId ?? null,
      supplierName: supplierName.trim() || selectedPurchase?.supplierName || '',
      businessLocation,
      returnDate,
      reason,
      items: lines
        .filter((line) => Number(line.productId) > 0 && Number(line.quantity) > 0)
        .map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity) || 1,
          unitPrice: Number(line.unitPrice) || 0
        }))
    })
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-[min(96vw,56rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">Add Purchase Return</h3>
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

        <section className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <RotateCcw size={15} />
            </span>
            <span className="text-sm font-bold text-ink">Return Details</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Linked Purchase</label>
              <select
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                value={purchaseId}
                onChange={(event) => handlePurchaseChange(event.target.value)}
              >
                <option value="">No linked purchase (manual)</option>
                {purchases.map((purchase) => (
                  <option key={purchase.id} value={purchase.id}>
                    {purchase.purchaseNumber} · {purchase.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Return Date</label>
              <input
                type="date"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Business Location</label>
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="e.g. Colombo, Kandy"
                value={businessLocation}
                onChange={(event) => setBusinessLocation(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-medium text-muted">Supplier</label>
              <input
                type="text"
                className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="Supplier name"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[0.85rem] font-medium text-muted">Reason</label>
              <textarea
                className="min-h-16 resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                placeholder="Reason for returning goods"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Truck size={15} />
              </span>
              <span className="text-sm font-bold text-ink">Returned Items</span>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover"
              onClick={addLine}
            >
              <Plus size={15} />
              Add Item
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {lines.map((line, index) => {
              const product = products.find((item) => item.id.toString() === line.productId)
              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)

              return (
                <div
                  key={`return-line-${index}`}
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
                    aria-label="Remove return line"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end rounded-md border border-dashed border-line bg-card p-4">
            <div className="flex w-full max-w-xs items-center justify-between text-sm">
              <span className="text-muted">Return Total</span>
              <span className="text-base font-bold text-primary">
                {subtotal.toLocaleString('en-LK', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
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

function getTodayInputValue(): string {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 10)
}
