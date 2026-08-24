import React, { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { SearchableSelect } from '../components/common/SearchableSelect'
import { ProductDetailsModal } from '../components/products/ProductDetailsModal'
import { ProductModal, ProductFormData } from '../components/products/ProductModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { brandsApi } from '../api/brandsApi'
import { productsApi } from '../api/productsApi'
import { categoriesApi } from '../api/categoriesApi'
import { suppliersApi } from '../api/suppliersApi'
import { formatLkrAmount } from '../utils/currency'
import type { BrandRecord } from '../../../shared/brands'
import type { CategoryRecord } from '../../../shared/categories'
import type { SupplierRecord } from '../../../shared/suppliers'
import type {
  CreateProductInput,
  ProductRecord,
  UpdateProductInput
} from '../../../shared/products'

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [brands, setBrands] = useState<BrandRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [viewingProduct, setViewingProduct] = useState<ProductRecord | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [brandFilterId, setBrandFilterId] = useState('')
  const [categoryFilterId, setCategoryFilterId] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    let isActive = true

    Promise.all([productsApi.list(), brandsApi.list(), categoriesApi.list(), suppliersApi.list()])
      .then(([loadedProducts, loadedBrands, loadedCategories, loadedSuppliers]) => {
        if (isActive) {
          setProducts(loadedProducts)
          setBrands(loadedBrands)
          setCategories(loadedCategories)
          setSuppliers(loadedSuppliers)
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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeName(productSearch)

    return products.filter((product) => {
      if (brandFilterId && product.brandId !== Number(brandFilterId)) {
        return false
      }

      if (categoryFilterId && product.categoryId !== Number(categoryFilterId)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return productMatchesSearch(product, normalizedSearch)
    })
  }, [brandFilterId, categoryFilterId, productSearch, products])

  const hasActiveFilters =
    productSearch.trim().length > 0 || brandFilterId.length > 0 || categoryFilterId.length > 0

  useEffect(() => {
    const visibleProductIds = new Set(filteredProducts.map((product) => product.id))

    setSelectedProductIds((current) => {
      const next = current.filter((id) => visibleProductIds.has(id))

      return next.length === current.length ? current : next
    })
  }, [filteredProducts])

  const columns: Column<ProductRecord>[] = [
    {
      key: 'sku',
      header: 'CODE',
      render: (item) => (
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {item.sku}
        </span>
      )
    },
    {
      key: 'barcode',
      header: 'BARCODE',
      render: (item) => <span className="text-muted">{item.barcode || '-'}</span>
    },
    {
      key: 'name',
      header: 'PRODUCT NAME',
      render: (item) => <span className="font-semibold text-ink">{item.name}</span>
    },
    {
      key: 'brandName',
      header: 'BRAND',
      render: (item) => <span className="text-muted">{item.brandName ?? '-'}</span>
    },
    {
      key: 'categoryName',
      header: 'CATEGORY',
      render: (item) => <span className="text-muted">{item.categoryName ?? '-'}</span>
    },
    {
      key: 'supplierName',
      header: 'SUPPLIER',
      render: (item) => <span className="text-muted">{item.supplierName ?? '-'}</span>
    },
    {
      key: 'sellingPrice',
      header: 'PRICE (LKR)',
      render: (item) => (
        <span className="font-semibold text-success">{formatLkrAmount(item.sellingPrice)}</span>
      )
    },
    {
      key: 'discountPercent',
      header: 'DISCOUNT',
      render: (item) =>
        item.discountPercent > 0 ? (
          <span className="inline-flex rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
            {item.discountPercent}%
          </span>
        ) : (
          <span className="text-muted">-</span>
        )
    },
    {
      key: 'stockQuantity',
      header: 'STOCK',
      render: (item) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStockBadgeClass(
            item
          )}`}
        >
          {item.stockQuantity === 0 ? 'Out of stock' : item.stockQuantity}
        </span>
      )
    }
  ]

  const handleAddClick = (): void => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleView = (product: ProductRecord): void => {
    setViewingProduct(product)
  }

  const handleEdit = (product: ProductRecord): void => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleModalClose = (): void => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleSave = async (data: ProductFormData): Promise<void> => {
    setIsSaving(true)
    try {
      if (editingProduct) {
        const payload: UpdateProductInput = buildProductPayload(data)
        const updatedProduct = await productsApi.update(editingProduct.id, payload)
        setProducts((prev) =>
          prev.map((product) => (product.id === editingProduct.id ? updatedProduct : product))
        )
        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateProductInput = buildProductPayload(data)
        const createdProduct = await productsApi.create(payload)
        setProducts((prev) => [createdProduct, ...prev])
        toast.success(`"${data.name}" was added successfully.`)
      }
      setIsModalOpen(false)
      setEditingProduct(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteProduct = async (product: ProductRecord): Promise<void> => {
    try {
      await productsApi.delete(product.id)
      setProducts((prev) => prev.filter((item) => item.id !== product.id))
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id))
      toast.success(`"${product.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteProducts = async (productsToDelete: ProductRecord[]): Promise<void> => {
    const deletedIds = new Set<number>()

    try {
      for (const product of productsToDelete) {
        await productsApi.delete(product.id)
        deletedIds.add(product.id)
      }

      setProducts((prev) => prev.filter((product) => !deletedIds.has(product.id)))
      setSelectedProductIds([])
      toast.success(`${productsToDelete.length} product(s) were deleted successfully.`)
    } catch (error) {
      if (deletedIds.size > 0) {
        setProducts((prev) => prev.filter((product) => !deletedIds.has(product.id)))
        setSelectedProductIds((prev) => prev.filter((id) => !deletedIds.has(id)))
      }

      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = (product: ProductRecord): void => {
    confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteProduct(product)
    })
  }

  const handleDeleteSelected = (): void => {
    const productsToDelete = products.filter((product) => selectedProductIds.includes(product.id))

    if (productsToDelete.length === 0) {
      return
    }

    confirm({
      title: 'Delete Selected Products',
      message: `Are you sure you want to delete ${productsToDelete.length} selected product(s)? This action cannot be undone.`,
      confirmText: 'Delete Selected',
      variant: 'danger',
      onConfirm: () => deleteProducts(productsToDelete)
    })
  }

  const handleImported = (createdProducts: ProductRecord[]): void => {
    setProducts((prev) => [...createdProducts, ...prev])

    Promise.all([brandsApi.list(), categoriesApi.list(), suppliersApi.list()])
      .then(([loadedBrands, loadedCategories, loadedSuppliers]) => {
        setBrands(loadedBrands)
        setCategories(loadedCategories)
        setSuppliers(loadedSuppliers)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error))
      })
  }

  const handleCreateBrand = async (name: string): Promise<BrandRecord> => {
    try {
      const createdBrand = await brandsApi.create({ name })
      setBrands((prev) =>
        sortByName([createdBrand, ...prev.filter((brand) => brand.id !== createdBrand.id)])
      )
      toast.success(`Brand "${createdBrand.name}" was added successfully.`)

      return createdBrand
    } catch (error) {
      const refreshedBrands = await brandsApi.list().catch(() => null)
      const existingBrand = refreshedBrands?.find(
        (brand) => normalizeName(brand.name) === normalizeName(name)
      )

      if (existingBrand && refreshedBrands) {
        setBrands(refreshedBrands)
        toast.info(`Brand "${existingBrand.name}" already exists.`)

        return existingBrand
      }

      toast.error(getErrorMessage(error))
      throw error
    }
  }

  const handleCreateCategory = async (name: string): Promise<CategoryRecord> => {
    try {
      const createdCategory = await categoriesApi.create({ name })
      setCategories((prev) =>
        sortByName([
          createdCategory,
          ...prev.filter((category) => category.id !== createdCategory.id)
        ])
      )
      toast.success(`Category "${createdCategory.name}" was added successfully.`)

      return createdCategory
    } catch (error) {
      const refreshedCategories = await categoriesApi.list().catch(() => null)
      const existingCategory = refreshedCategories?.find(
        (category) => normalizeName(category.name) === normalizeName(name)
      )

      if (existingCategory && refreshedCategories) {
        setCategories(refreshedCategories)
        toast.info(`Category "${existingCategory.name}" already exists.`)

        return existingCategory
      }

      toast.error(getErrorMessage(error))
      throw error
    }
  }

  const handleCreateSupplier = async (name: string): Promise<SupplierRecord> => {
    try {
      const createdSupplier = await suppliersApi.create({ name })
      setSuppliers((prev) =>
        sortByName([
          createdSupplier,
          ...prev.filter((supplier) => supplier.id !== createdSupplier.id)
        ])
      )
      toast.success(`Supplier "${createdSupplier.name}" was added successfully.`)

      return createdSupplier
    } catch (error) {
      const refreshedSuppliers = await suppliersApi.list().catch(() => null)
      const existingSupplier = refreshedSuppliers?.find(
        (supplier) => normalizeName(supplier.name) === normalizeName(name)
      )

      if (existingSupplier && refreshedSuppliers) {
        setSuppliers(refreshedSuppliers)
        toast.info(`Supplier "${existingSupplier.name}" already exists.`)

        return existingSupplier
      }

      toast.error(getErrorMessage(error))
      throw error
    }
  }

  const exportProductsCsv = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const result = await productsApi.exportCsv()

      if (result.saved) {
        toast.success('Products exported to CSV successfully.')
      } else {
        toast.info('CSV export was cancelled.')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportClick = (): void => {
    confirm({
      title: 'Export Products',
      message: `Export all ${products.length} product(s) to a CSV file on this device?`,
      confirmText: 'Export',
      onConfirm: () => exportProductsCsv()
    })
  }

  const handleResetFilters = (): void => {
    setProductSearch('')
    setBrandFilterId('')
    setCategoryFilterId('')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-[0.95rem] text-muted">Manage the store product catalog</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            className="flex items-center gap-2 rounded-md border border-danger/30 bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleDeleteSelected}
            disabled={selectedProductIds.length === 0}
          >
            <Trash2 size={18} />
            {selectedProductIds.length > 0
              ? `Delete Selected (${selectedProductIds.length})`
              : 'Delete Selected'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleExportClick}
            disabled={isExporting || products.length === 0}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {!isLoading && products.length > 0 && (
        <div className="mb-5 rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-muted">
              <Filter size={16} />
              Product Filters
            </div>
            <span className="text-sm text-muted">
              Showing <span className="font-semibold text-ink">{filteredProducts.length}</span> of{' '}
              <span className="font-semibold text-ink">{products.length}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.9fr_0.9fr_auto]">
            <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2.5 focus-within:border-primary">
              <Search size={17} className="shrink-0 text-faint" />
              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-faint"
                placeholder="Search code, barcode, product, supplier"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>

            <SearchableSelect
              options={[
                { value: '', label: 'All Brands' },
                ...brands.map((brand) => ({ value: String(brand.id), label: brand.name }))
              ]}
              value={brandFilterId}
              onChange={setBrandFilterId}
              placeholder="All Brands"
              searchPlaceholder="Search brand..."
              ariaLabel="Filter products by brand"
              triggerClassName="flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            />

            <SearchableSelect
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((category) => ({
                  value: String(category.id),
                  label: category.name
                }))
              ]}
              value={categoryFilterId}
              onChange={setCategoryFilterId}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              ariaLabel="Filter products by category"
              triggerClassName="flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
            />

            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <Loader label="Loading products..." size="sm" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No products found.
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No products match the selected filters.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          selectedIds={selectedProductIds}
          onSelectionChange={setSelectedProductIds}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ProductModal
        isOpen={isModalOpen}
        brands={brands}
        categories={categories}
        suppliers={suppliers}
        existingProductNames={products.map((product) => product.name)}
        initialData={
          editingProduct
            ? {
                sku: editingProduct.sku,
                barcode: editingProduct.barcode ?? '',
                name: editingProduct.name,
                brandId: editingProduct.brandId ?? 0,
                categoryId: editingProduct.categoryId,
                supplierId: editingProduct.supplierId ?? null,
                unit: editingProduct.unit,
                buyingPrice: editingProduct.buyingPrice,
                sellingPrice: editingProduct.sellingPrice,
                stockQuantity: editingProduct.stockQuantity,
                discountPercent: editingProduct.discountPercent
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleModalClose}
        onSave={handleSave}
        onImported={handleImported}
        onCreateBrand={handleCreateBrand}
        onCreateCategory={handleCreateCategory}
        onCreateSupplier={handleCreateSupplier}
      />

      <ProductDetailsModal product={viewingProduct} onClose={() => setViewingProduct(null)} />
    </div>
  )
}

export default ProductsPage

function buildProductPayload(data: ProductFormData): CreateProductInput {
  return {
    sku: data.sku,
    barcode: data.barcode,
    name: data.name,
    brandId: data.brandId,
    categoryId: data.categoryId,
    supplierId: data.supplierId,
    unit: data.unit,
    buyingPrice: data.buyingPrice,
    sellingPrice: data.sellingPrice,
    stockQuantity: data.stockQuantity,
    discountPercent: data.discountPercent
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function sortByName<T extends { name: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => left.name.localeCompare(right.name))
}

function productMatchesSearch(product: ProductRecord, normalizedSearch: string): boolean {
  return [
    product.sku,
    product.barcode ?? '',
    product.name,
    product.brandName ?? '',
    product.categoryName ?? '',
    product.supplierName ?? '',
    product.sellingPrice.toString()
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function getStockBadgeClass(product: ProductRecord): string {
  if (product.stockQuantity === 0) return 'border border-danger/20 bg-danger/10 text-danger'
  if (product.stockQuantity <= product.reorderLevel) {
    return 'border border-warning/25 bg-warning/10 text-warning'
  }

  return 'border border-success/20 bg-success/10 text-success'
}
