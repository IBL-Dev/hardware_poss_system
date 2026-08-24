import React, { useState } from 'react'
import { X } from 'lucide-react'
import { BrandSelect } from './BrandSelect'
import { ProductCsvImport } from './ProductCsvImport'
import { Spinner } from '../common/Spinner'
import { CategorySelect } from './CategorySelect'
import { SupplierSelect } from './SupplierSelect'
import type { BrandRecord } from '../../../../shared/brands'
import type { CategoryRecord } from '../../../../shared/categories'
import type { SupplierRecord } from '../../../../shared/suppliers'
import type { ProductRecord, ProductUnit } from '../../../../shared/products'

export interface ProductFormData {
  sku: string
  barcode: string
  name: string
  brandId: number
  categoryId: number
  supplierId: number | null
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  discountPercent: number
}

interface ProductFormState {
  sku: string
  barcode: string
  name: string
  brandId: number
  categoryId: number
  supplierId: number | null
  unit: ProductUnit
  buyingPrice: string
  sellingPrice: string
  stockQuantity: string
  discountPercent: string
}

interface ProductModalProps {
  isOpen: boolean
  brands: BrandRecord[]
  categories: CategoryRecord[]
  suppliers: SupplierRecord[]
  existingProductNames: string[]
  initialData?: ProductFormData
  isSaving?: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => void
  onImported: (createdProducts: ProductRecord[]) => void
  onCreateBrand?: (name: string) => Promise<BrandRecord>
  onCreateCategory?: (name: string) => Promise<CategoryRecord>
  onCreateSupplier?: (name: string) => Promise<SupplierRecord>
}

const emptyForm: ProductFormState = {
  sku: '',
  barcode: '',
  name: '',
  brandId: 0,
  categoryId: 0,
  supplierId: null,
  unit: 'PCS',
  buyingPrice: '',
  sellingPrice: '',
  stockQuantity: '',
  discountPercent: ''
}

function toFormState(data: ProductFormData): ProductFormState {
  return {
    ...data,
    buyingPrice: data.buyingPrice.toString(),
    sellingPrice: data.sellingPrice.toString(),
    stockQuantity: data.stockQuantity.toString(),
    discountPercent: data.discountPercent.toString()
  }
}

function parseNonNegativeNumber(value: string): number | null {
  if (value.trim().length === 0) return null

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null
}

function parseOptionalPercentage(value: string): number | null {
  if (value.trim().length === 0) return 0

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 100 ? parsedValue : null
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  brands,
  categories,
  suppliers,
  existingProductNames,
  initialData,
  isSaving = false,
  onClose,
  onSave,
  onImported,
  onCreateBrand,
  onCreateCategory,
  onCreateSupplier
}) => {
  if (!isOpen) return null

  return (
    <ProductModalContent
      key={initialData ? 'edit-product' : 'new-product'}
      brands={brands}
      categories={categories}
      suppliers={suppliers}
      existingProductNames={existingProductNames}
      initialData={initialData}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
      onImported={onImported}
      onCreateBrand={onCreateBrand}
      onCreateCategory={onCreateCategory}
      onCreateSupplier={onCreateSupplier}
    />
  )
}

const ProductModalContent: React.FC<Omit<ProductModalProps, 'isOpen'>> = ({
  brands,
  categories,
  suppliers,
  existingProductNames,
  initialData,
  isSaving = false,
  onClose,
  onSave,
  onImported,
  onCreateBrand,
  onCreateCategory,
  onCreateSupplier
}) => {
  const defaultTab = 'manual'
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>(defaultTab)
  const [form, setForm] = useState<ProductFormState>(
    initialData ? toFormState(initialData) : emptyForm
  )

  const buyingPrice = parseNonNegativeNumber(form.buyingPrice)
  const sellingPrice = parseNonNegativeNumber(form.sellingPrice)
  const stockQuantity = parseNonNegativeNumber(form.stockQuantity)
  const discountPercent = parseOptionalPercentage(form.discountPercent)

  const isValid =
    form.name.trim().length > 0 &&
    form.brandId > 0 &&
    form.categoryId > 0 &&
    buyingPrice !== null &&
    sellingPrice !== null &&
    stockQuantity !== null &&
    discountPercent !== null

  const handleSave = (): void => {
    if (
      !isValid ||
      buyingPrice === null ||
      sellingPrice === null ||
      stockQuantity === null ||
      discountPercent === null
    ) {
      return
    }

    onSave({
      sku: form.sku,
      barcode: form.barcode,
      name: form.name,
      brandId: form.brandId,
      categoryId: form.categoryId,
      supplierId: form.supplierId,
      unit: form.unit,
      buyingPrice,
      sellingPrice,
      stockQuantity,
      discountPercent
    })
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,38rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit Product' : 'Add Product'}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        {!initialData && (
          <div className="flex gap-1 border-b border-line">
            <button
              type="button"
              className={`-mb-px border-b-2 px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
                activeTab === 'manual'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              Add Manually
            </button>
            <button
              type="button"
              className={`-mb-px border-b-2 px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
                activeTab === 'csv'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
              onClick={() => setActiveTab('csv')}
            >
              Upload CSV
            </button>
          </div>
        )}

        {activeTab === 'csv' && !initialData ? (
          <ProductCsvImport
            brands={brands}
            categories={categories}
            existingProductNames={existingProductNames}
            onImported={onImported}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[0.85rem] font-medium text-muted">Product Name</label>
                <input
                  type="text"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="e.g. Fresh Milk 1L"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Product Code</label>
                <input
                  type="text"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="e.g. MILK-001 (Optional)"
                  value={form.sku}
                  onChange={(event) => setForm({ ...form, sku: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Barcode</label>
                <input
                  type="text"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="e.g. 4791234567890 (Optional)"
                  value={form.barcode}
                  onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Brand</label>
                <BrandSelect
                  brands={brands}
                  value={form.brandId}
                  onChange={(brandId) => setForm({ ...form, brandId })}
                  onCreate={onCreateBrand}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Supplier</label>
                <SupplierSelect
                  suppliers={suppliers}
                  value={form.supplierId}
                  onChange={(supplierId) => setForm({ ...form, supplierId })}
                  onCreate={onCreateSupplier}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Category</label>
                <CategorySelect
                  categories={categories}
                  value={form.categoryId}
                  onChange={(categoryId) => setForm({ ...form, categoryId })}
                  onCreate={onCreateCategory}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Unit</label>
                <select
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.unit}
                  onChange={(event) =>
                    setForm({ ...form, unit: event.target.value as ProductUnit })
                  }
                >
                  <option value="PCS">Pieces</option>
                  <option value="KG">Kilogram</option>
                  <option value="G">Gram</option>
                  <option value="L">Liter</option>
                  <option value="ML">Milliliter</option>
                  <option value="PACK">Pack</option>
                  <option value="BOX">Box</option>
                  <option value="BOTTLE">Bottle</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Buying Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.buyingPrice}
                  onChange={(event) => setForm({ ...form, buyingPrice: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Selling Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.sellingPrice}
                  onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.stockQuantity}
                  onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.discountPercent}
                  onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
                />
              </div>
            </div>

            <div className="flex w-full gap-3">
              <button
                className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleSave}
                disabled={isSaving || !isValid}
              >
                {isSaving && <Spinner size={16} />}
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
