import React, { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Download,
  Filter,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react'
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
        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700">
          {item.sku}
        </span>
      )
    },
    {
      key: 'barcode',
      header: 'BARCODE',
      render: (item) => (
        <span className="font-mono text-[0.82rem] font-medium text-slate-500">
          {item.barcode || '-'}
        </span>
      )
    },
    {
      key: 'name',
      header: 'PRODUCT NAME',
      render: (item) => (
        <div className="flex min-w-[170px] items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50">
            <Boxes size={15} className="text-emerald-600" />
          </div>

          <span className="font-semibold text-slate-800">{item.name}</span>
        </div>
      )
    },
    {
      key: 'brandName',
      header: 'BRAND',
      render: (item) => (
        <span className="text-sm font-medium text-slate-600">
          {item.brandName ?? '-'}
        </span>
      )
    },
    {
      key: 'categoryName',
      header: 'CATEGORY',
      render: (item) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {item.categoryName ?? '-'}
        </span>
      )
    },
    {
      key: 'supplierName',
      header: 'SUPPLIER',
      render: (item) => (
        <span className="text-sm font-medium text-slate-500">
          {item.supplierName ?? '-'}
        </span>
      )
    },
    {
      key: 'sellingPrice',
      header: 'PRICE (LKR)',
      render: (item) => (
        <div className="min-w-[100px]">
          <span className="font-bold text-emerald-700">
            {formatLkrAmount(item.sellingPrice)}
          </span>
        </div>
      )
    },
    {
      key: 'discountPercent',
      header: 'DISCOUNT',
      render: (item) =>
        item.discountPercent > 0 ? (
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            {item.discountPercent}% OFF
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
    },
    {
      key: 'stockQuantity',
      header: 'STOCK',
      render: (item) => (
        <span
          className={`inline-flex min-w-[74px] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-bold ${getStockBadgeClass(
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
          prev.map((product) =>
            product.id === editingProduct.id ? updatedProduct : product
          )
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

      setSelectedProductIds((prev) =>
        prev.filter((id) => id !== product.id)
      )

      toast.success(`"${product.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteProducts = async (
    productsToDelete: ProductRecord[]
  ): Promise<void> => {
    const deletedIds = new Set<number>()

    try {
      for (const product of productsToDelete) {
        await productsApi.delete(product.id)

        deletedIds.add(product.id)
      }

      setProducts((prev) =>
        prev.filter((product) => !deletedIds.has(product.id))
      )

      setSelectedProductIds([])

      toast.success(
        `${productsToDelete.length} product(s) were deleted successfully.`
      )
    } catch (error) {
      if (deletedIds.size > 0) {
        setProducts((prev) =>
          prev.filter((product) => !deletedIds.has(product.id))
        )

        setSelectedProductIds((prev) =>
          prev.filter((id) => !deletedIds.has(id))
        )
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
    const productsToDelete = products.filter((product) =>
      selectedProductIds.includes(product.id)
    )

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

    Promise.all([
      brandsApi.list(),
      categoriesApi.list(),
      suppliersApi.list()
    ])
      .then(([loadedBrands, loadedCategories, loadedSuppliers]) => {
        setBrands(loadedBrands)
        setCategories(loadedCategories)
        setSuppliers(loadedSuppliers)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error))
      })
  }

  const handleCreateBrand = async (
    name: string
  ): Promise<BrandRecord> => {
    try {
      const createdBrand = await brandsApi.create({ name })

      setBrands((prev) =>
        sortByName([
          createdBrand,
          ...prev.filter((brand) => brand.id !== createdBrand.id)
        ])
      )

      toast.success(
        `Brand "${createdBrand.name}" was added successfully.`
      )

      return createdBrand
    } catch (error) {
      const refreshedBrands = await brandsApi.list().catch(() => null)

      const existingBrand = refreshedBrands?.find(
        (brand) =>
          normalizeName(brand.name) === normalizeName(name)
      )

      if (existingBrand && refreshedBrands) {
        setBrands(refreshedBrands)

        toast.info(
          `Brand "${existingBrand.name}" already exists.`
        )

        return existingBrand
      }

      toast.error(getErrorMessage(error))

      throw error
    }
  }

  const handleCreateCategory = async (
    name: string
  ): Promise<CategoryRecord> => {
    try {
      const createdCategory = await categoriesApi.create({ name })

      setCategories((prev) =>
        sortByName([
          createdCategory,
          ...prev.filter(
            (category) => category.id !== createdCategory.id
          )
        ])
      )

      toast.success(
        `Category "${createdCategory.name}" was added successfully.`
      )

      return createdCategory
    } catch (error) {
      const refreshedCategories = await categoriesApi
        .list()
        .catch(() => null)

      const existingCategory = refreshedCategories?.find(
        (category) =>
          normalizeName(category.name) === normalizeName(name)
      )

      if (existingCategory && refreshedCategories) {
        setCategories(refreshedCategories)

        toast.info(
          `Category "${existingCategory.name}" already exists.`
        )

        return existingCategory
      }

      toast.error(getErrorMessage(error))

      throw error
    }
  }

  const handleCreateSupplier = async (
    name: string
  ): Promise<SupplierRecord> => {
    try {
      const createdSupplier = await suppliersApi.create({ name })

      setSuppliers((prev) =>
        sortByName([
          createdSupplier,
          ...prev.filter(
            (supplier) => supplier.id !== createdSupplier.id
          )
        ])
      )

      toast.success(
        `Supplier "${createdSupplier.name}" was added successfully.`
      )

      return createdSupplier
    } catch (error) {
      const refreshedSuppliers = await suppliersApi
        .list()
        .catch(() => null)

      const existingSupplier = refreshedSuppliers?.find(
        (supplier) =>
          normalizeName(supplier.name) === normalizeName(name)
      )

      if (existingSupplier && refreshedSuppliers) {
        setSuppliers(refreshedSuppliers)

        toast.info(
          `Supplier "${existingSupplier.name}" already exists.`
        )

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
    <div className="min-h-full">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
              <Boxes size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Products
                </h1>

                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {products.length} Items
                  </span>
                )}
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Manage products, prices, suppliers and stock inventory
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleDeleteSelected}
              disabled={selectedProductIds.length === 0}
            >
              <Trash2 size={17} />

              {selectedProductIds.length > 0
                ? `Delete (${selectedProductIds.length})`
                : 'Delete Selected'}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleExportClick}
              disabled={isExporting || products.length === 0}
            >
              <Download size={17} />

              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 active:translate-y-0"
              onClick={handleAddClick}
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          PRODUCT FILTERS
      ====================================================== */}

      {!isLoading && products.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <Filter size={14} className="text-emerald-600" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Search & Filter
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Displaying</span>

              <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {filteredProducts.length}
              </span>

              <span>of</span>

              <span className="font-bold text-slate-700">
                {products.length}
              </span>

              <span>products</span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_0.8fr_auto]">
              {/* ==================================================
                  SEARCH INPUT
              ================================================== */}

              <div className="group flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10">
                <Search
                  size={17}
                  className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
                />

                <input
                  type="text"
                  className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                  placeholder="Search code, barcode, product or supplier..."
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(event.target.value)
                  }
                />
              </div>

              {/* ==================================================
                  BRAND FILTER
              ================================================== */}

              <SearchableSelect
                options={[
                  {
                    value: '',
                    label: 'All Brands'
                  },
                  ...brands.map((brand) => ({
                    value: String(brand.id),
                    label: brand.name
                  }))
                ]}
                value={brandFilterId}
                onChange={setBrandFilterId}
                placeholder="All Brands"
                searchPlaceholder="Search brand..."
                ariaLabel="Filter products by brand"
                triggerClassName="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
              />

              {/* ==================================================
                  CATEGORY FILTER
              ================================================== */}

              <SearchableSelect
                options={[
                  {
                    value: '',
                    label: 'All Categories'
                  },
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
                triggerClassName="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
              />

              {/* ==================================================
                  RESET
              ================================================== */}

              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          PRODUCT TABLE / STATES
      ====================================================== */}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading products..." size="sm" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
            <PackagePlus size={27} className="text-emerald-600" />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            No products available
          </h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Your product inventory is currently empty. Add your first
            hardware product to start managing your store inventory.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            onClick={handleAddClick}
          >
            <Plus size={17} />
            Add First Product
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Search size={22} className="text-slate-400" />
          </div>

          <h3 className="font-bold text-slate-800">
            No matching products
          </h3>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            No products match your current search or filter selection.
          </p>

          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            onClick={handleResetFilters}
          >
            <RotateCcw size={15} />
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <Boxes size={16} className="text-emerald-600" />

              <span className="text-sm font-bold text-slate-700">
                Product Inventory
              </span>
            </div>

            {selectedProductIds.length > 0 && (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {selectedProductIds.length} selected
              </span>
            )}
          </div>

          <DataTable
            columns={columns}
            data={filteredProducts}
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ======================================================
          PRODUCT FORM MODAL
      ====================================================== */}

      <ProductModal
        isOpen={isModalOpen}
        brands={brands}
        categories={categories}
        suppliers={suppliers}
        existingProductNames={products.map(
          (product) => product.name
        )}
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

      {/* ======================================================
          PRODUCT DETAILS MODAL
      ====================================================== */}

      <ProductDetailsModal
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />
    </div>
  )
}

export default ProductsPage

/* ==========================================================
   PRODUCT PAYLOAD
========================================================== */

function buildProductPayload(
  data: ProductFormData
): CreateProductInput {
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

/* ==========================================================
   NAME NORMALIZER
========================================================== */

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

/* ==========================================================
   SORT BY NAME
========================================================== */

function sortByName<T extends { name: string }>(
  records: T[]
): T[] {
  return [...records].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}

/* ==========================================================
   PRODUCT SEARCH
========================================================== */

function productMatchesSearch(
  product: ProductRecord,
  normalizedSearch: string
): boolean {
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

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

/* ==========================================================
   STOCK BADGE
========================================================== */

function getStockBadgeClass(
  product: ProductRecord
): string {
  if (product.stockQuantity === 0) {
    return 'border border-red-200 bg-red-50 text-red-700'
  }

  if (product.stockQuantity <= product.reorderLevel) {
    return 'border border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
}