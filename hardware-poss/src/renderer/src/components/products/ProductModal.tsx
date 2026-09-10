import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BrandSelect } from './BrandSelect'
import { ProductCsvImport } from './ProductCsvImport'
import { Spinner } from '../common/Spinner'
import { CategorySelect } from './CategorySelect'
import { SupplierSelect } from './SupplierSelect'
import type { BrandRecord } from '../../../../shared/brands'
import type { CategoryRecord } from '../../../../shared/categories'
import type { SupplierRecord } from '../../../../shared/suppliers'
import type { ProductRecord, ProductUnit } from '../../../../shared/products'
import { isWeightUnit } from '../../../../shared/products'

export interface ProductFormData {
  name: string
  brandId: number
  categoryId: number
  supplierId: number | null
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  discountAmount: number
}

interface ProductFormState {
  name: string
  brandId: number
  categoryId: number
  supplierId: number | null
  unit: ProductUnit
  buyingPrice: string
  sellingPrice: string
  stockQuantity: string
  discountAmount: string
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
  name: '',
  brandId: 0,
  categoryId: 0,
  supplierId: null,
  unit: 'PCS',
  buyingPrice: '',
  sellingPrice: '',
  stockQuantity: '',
  discountAmount: ''
}

function toFormState(data: ProductFormData): ProductFormState {
  return {
    ...data,
    buyingPrice: data.buyingPrice.toString(),
    sellingPrice: data.sellingPrice.toString(),
    stockQuantity: data.stockQuantity.toString(),
    discountAmount: data.discountAmount.toString()
  }
}

function parseNonNegativeNumber(value: string): number | null {
  if (value.trim().length === 0) return null

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null
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
  const [quickCreate, setQuickCreate] = useState<'brand' | 'category' | null>(null)

  const buyingPrice = parseNonNegativeNumber(form.buyingPrice)
  const sellingPrice = parseNonNegativeNumber(form.sellingPrice)
  const stockQuantity = parseNonNegativeNumber(form.stockQuantity)
  const discountAmount = parseNonNegativeNumber(form.discountAmount)

  const isValid =
    form.name.trim().length > 0 &&
    form.brandId > 0 &&
    form.categoryId > 0 &&
    buyingPrice !== null &&
    sellingPrice !== null &&
    stockQuantity !== null &&
    discountAmount !== null

  const handleSave = (): void => {
    if (
      !isValid ||
      buyingPrice === null ||
      sellingPrice === null ||
      stockQuantity === null ||
      discountAmount === null
    ) {
      return
    }

    onSave({
      name: form.name,
      brandId: form.brandId,
      categoryId: form.categoryId,
      supplierId: form.supplierId,
      unit: form.unit,
      buyingPrice,
      sellingPrice,
      stockQuantity,
      discountAmount
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[0.85rem] font-medium text-muted">Brand</label>
                  {onCreateBrand && (
                    <button
                      type="button"
                      className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.72rem] font-semibold text-primary transition-colors hover:bg-hover"
                      onClick={() => setQuickCreate('brand')}
                    >
                      <Plus size={12} />
                      Add Brand
                    </button>
                  )}
                </div>
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[0.85rem] font-medium text-muted">Category</label>
                  {onCreateCategory && (
                    <button
                      type="button"
                      className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.72rem] font-semibold text-primary transition-colors hover:bg-hover"
                      onClick={() => setQuickCreate('category')}
                    >
                      <Plus size={12} />
                      Add Category
                    </button>
                  )}
                </div>
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
                  <option value="M">Meter</option>
                  <option value="FT">Feet</option>
                  <option value="BOX">Box</option>
                  <option value="PACK">Pack</option>
                  <option value="SET">Set</option>
                  <option value="ROLL">Roll</option>
                  <option value="SHEET">Sheet</option>
                  <option value="BAG">Bag</option>
                  <option value="TUBE">Tube</option>
                  <option value="CAN">Can</option>
                  <option value="BOTTLE">Bottle</option>
                  <option value="DOZEN">Dozen</option>
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[0.85rem] font-medium text-muted">
                    Discount (LKR)
                  </label>
                  <span className="text-[0.7rem] font-semibold text-slate-400">
                    {isWeightUnit(form.unit) ? 'per 1 kg' : 'per 1 item'}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  value={form.discountAmount}
                  onChange={(event) =>
                    setForm({ ...form, discountAmount: event.target.value })
                  }
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

      {quickCreate && (
        <QuickCreateModal
          title={quickCreate === 'brand' ? 'Add Brand' : 'Add Category'}
          onCancel={() => setQuickCreate(null)}
          onCreate={async (name) => {
            if (quickCreate === 'brand') {
              if (!onCreateBrand) return
              const createdBrand = await onCreateBrand(name)
              setForm({ ...form, brandId: createdBrand.id })
              return
            }

            if (!onCreateCategory) return
            const createdCategory = await onCreateCategory(name)
            setForm({ ...form, categoryId: createdCategory.id })
          }}
        />
      )}
    </div>
  )
}

interface QuickCreateModalProps {
  title: string
  onCancel: () => void
  onCreate: (name: string) => Promise<void>
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ title, onCancel, onCreate }) => {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (): Promise<void> => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(`${title.replace('Add ', '')} name is required.`)
      return
    }

    if (isCreating) return

    setIsCreating(true)
    setError('')

    try {
      await onCreate(trimmedName)
      onCancel()
    } catch (catchError) {
      setError(catchError instanceof Error ? catchError.message : `${title} could not be added.`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,22rem)] flex-col gap-4 rounded-lg bg-card p-6 shadow-lg">
        <h3 className="m-0 text-lg font-bold text-ink">{title}</h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] font-medium text-muted">
            {title === 'Add Brand' ? 'Brand Name' : 'Category Name'}
          </span>
          <input
            type="text"
            className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            placeholder={title === 'Add Brand' ? 'e.g. Nestle' : 'e.g. Vegetables'}
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreate()
              }
            }}
          />
        </label>

        {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}

        <div className="flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-2.5 text-[0.9rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void handleCreate()}
            disabled={isCreating || name.trim().length === 0}
          >
            {isCreating && <Spinner size={15} />}
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
