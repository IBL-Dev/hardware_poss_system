import React, { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Boxes,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Trash2
} from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { BrandDetailsModal } from '../components/brands/BrandDetailsModal'
import { BrandModal, BrandFormData } from '../components/brands/BrandModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { brandsApi } from '../api/brandsApi'
import type { BrandRecord, CreateBrandInput, UpdateBrandInput } from '../../../shared/brands'

type BrandProductFilter = 'ALL' | 'WITH_PRODUCTS' | 'WITHOUT_PRODUCTS'

const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<BrandRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null)
  const [viewingBrand, setViewingBrand] = useState<BrandRecord | null>(null)
  const [brandSearch, setBrandSearch] = useState('')
  const [productFilter, setProductFilter] = useState<BrandProductFilter>('ALL')
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const confirm = useConfirm()
  const toast = useToast()

  /* ==========================================================
     LOAD BRANDS
  ========================================================== */

  useEffect(() => {
    let isActive = true

    brandsApi
      .list()
      .then((loadedBrands) => {
        if (isActive) {
          setBrands(loadedBrands)
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

  /* ==========================================================
     FILTERED BRANDS
  ========================================================== */

  const filteredBrands = useMemo(() => {
    const normalizedSearch = normalizeText(brandSearch)

    return brands.filter((brand) => {
      if (productFilter === 'WITH_PRODUCTS' && brand.productCount === 0) {
        return false
      }

      if (productFilter === 'WITHOUT_PRODUCTS' && brand.productCount > 0) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return brandMatchesSearch(brand, normalizedSearch)
    })
  }, [brandSearch, brands, productFilter])

  const hasActiveFilters = brandSearch.trim().length > 0 || productFilter !== 'ALL'

  /* ==========================================================
     CLEAR HIDDEN SELECTIONS
  ========================================================== */

  useEffect(() => {
    const visibleBrandIds = new Set(filteredBrands.map((brand) => brand.id))

    setSelectedBrandIds((current) => {
      const next = current.filter((id) => visibleBrandIds.has(id))

      return next.length === current.length ? current : next
    })
  }, [filteredBrands])

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns: Column<BrandRecord>[] = [
    {
      key: 'name',
      header: 'BRAND NAME',
      render: (item) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
            <Tags size={17} className="text-emerald-600" />
          </div>

          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-800">{item.name}</span>
            <span className="mt-0.5 block text-[0.72rem] font-medium uppercase tracking-wide text-slate-400">
              Hardware Brand
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'DESCRIPTION',
      render: (item) => (
        <span className="block max-w-[420px] truncate text-sm leading-6 text-slate-500">
          {item.description || '-'}
        </span>
      )
    },
    {
      key: 'productCount',
      header: 'PRODUCTS',
      render: (item) =>
        item.productCount > 0 ? (
          <span className="inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
            <Boxes size={13} />
            {item.productCount}
          </span>
        ) : (
          <span className="inline-flex min-w-[72px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
            0
          </span>
        )
    }
  ]

  /* ==========================================================
     ADD BRAND
  ========================================================== */

  const handleAddClick = (): void => {
    setEditingBrand(null)
    setIsModalOpen(true)
  }

  /* ==========================================================
     VIEW BRAND
  ========================================================== */

  const handleView = (brand: BrandRecord): void => {
    setViewingBrand(brand)
  }

  /* ==========================================================
     EDIT BRAND
  ========================================================== */

  const handleEdit = (brand: BrandRecord): void => {
    setEditingBrand(brand)
    setIsModalOpen(true)
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  const handleModalClose = (): void => {
    if (isSaving) return

    setIsModalOpen(false)
    setEditingBrand(null)
  }

  /* ==========================================================
     SAVE BRAND
  ========================================================== */

  const handleSave = async (data: BrandFormData): Promise<void> => {
    setIsSaving(true)

    try {
      if (editingBrand) {
        const payload: UpdateBrandInput = {
          name: data.name,
          description: data.description
        }

        const updatedBrand = await brandsApi.update(editingBrand.id, payload)

        setBrands((prev) =>
          sortBrands(prev.map((brand) => (brand.id === editingBrand.id ? updatedBrand : brand)))
        )

        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateBrandInput = {
          name: data.name,
          description: data.description
        }

        const createdBrand = await brandsApi.create(payload)

        setBrands((prev) => sortBrands([...prev, createdBrand]))

        toast.success(`"${data.name}" was added successfully.`)
      }

      setIsModalOpen(false)
      setEditingBrand(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  /* ==========================================================
     DELETE BRAND
  ========================================================== */

  const deleteBrand = async (brand: BrandRecord): Promise<void> => {
    try {
      await brandsApi.delete(brand.id)

      setBrands((prev) => prev.filter((item) => item.id !== brand.id))

      setSelectedBrandIds((prev) => prev.filter((id) => id !== brand.id))

      toast.success(`"${brand.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE MULTIPLE BRANDS
  ========================================================== */

  const deleteBrands = async (brandsToDelete: BrandRecord[]): Promise<void> => {
    const deletedIds = new Set<number>()

    try {
      for (const brand of brandsToDelete) {
        await brandsApi.delete(brand.id)

        deletedIds.add(brand.id)
      }

      setBrands((prev) => prev.filter((brand) => !deletedIds.has(brand.id)))

      setSelectedBrandIds([])

      toast.success(`${brandsToDelete.length} brand(s) were deleted successfully.`)
    } catch (error) {
      if (deletedIds.size > 0) {
        setBrands((prev) => prev.filter((brand) => !deletedIds.has(brand.id)))

        setSelectedBrandIds((prev) => prev.filter((id) => !deletedIds.has(id)))
      }

      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE CONFIRMATION
  ========================================================== */

  const handleDelete = (brand: BrandRecord): void => {
    confirm({
      title: 'Delete Brand',
      message: `Are you sure you want to delete "${brand.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteBrand(brand)
    })
  }

  /* ==========================================================
     DELETE SELECTED
  ========================================================== */

  const handleDeleteSelected = (): void => {
    const brandsToDelete = brands.filter((brand) => selectedBrandIds.includes(brand.id))

    if (brandsToDelete.length === 0) {
      return
    }

    confirm({
      title: 'Delete Selected Brands',
      message: `Are you sure you want to delete ${brandsToDelete.length} selected brand(s)? This action cannot be undone.`,
      confirmText: 'Delete Selected',
      variant: 'danger',
      onConfirm: () => deleteBrands(brandsToDelete)
    })
  }

  /* ==========================================================
     IMPORT BRANDS
  ========================================================== */

  const handleImported = (createdBrands: BrandRecord[]): void => {
    setBrands((prev) => sortBrands([...prev, ...createdBrands]))
  }

  /* ==========================================================
     EXPORT CSV
  ========================================================== */

  const exportBrandsCsv = async (): Promise<void> => {
    setIsExporting(true)

    try {
      const result = await brandsApi.exportCsv()

      if (result.saved) {
        toast.success('Brands exported to CSV successfully.')
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
      title: 'Export Brands',
      message: `Export all ${brands.length} brand(s) to a CSV file on this device?`,
      confirmText: 'Export',
      onConfirm: () => exportBrandsCsv()
    })
  }

  /* ==========================================================
     RESET FILTERS
  ========================================================== */

  const handleResetFilters = (): void => {
    setBrandSearch('')
    setProductFilter('ALL')
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
              <Tags size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brands</h1>

                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {brands.length} Brands
                  </span>
                )}
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Manage hardware manufacturers and product brands
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleDeleteSelected}
              disabled={selectedBrandIds.length === 0}
            >
              <Trash2 size={17} />

              {selectedBrandIds.length > 0
                ? `Delete (${selectedBrandIds.length})`
                : 'Delete Selected'}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleExportClick}
              disabled={isExporting || brands.length === 0}
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
              Add Brand
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      {!isLoading && brands.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <Filter size={14} className="text-emerald-600" />
              </div>

              <h2 className="text-sm font-bold text-slate-800">Search & Filter</h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Displaying</span>

              <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {filteredBrands.length}
              </span>

              <span>of</span>

              <span className="font-bold text-slate-700">{brands.length}</span>

              <span>brands</span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_auto]">
              {/* ==================================================
                  SEARCH
              ================================================== */}

              <div className="group flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10">
                <Search
                  size={17}
                  className="shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-600"
                />

                <input
                  type="text"
                  className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                  placeholder="Search brand name or description..."
                  value={brandSearch}
                  onChange={(event) => setBrandSearch(event.target.value)}
                />
              </div>

              {/* ==================================================
                  PRODUCT STATUS FILTER
              ================================================== */}

              <div className="relative">
                <select
                  className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                  value={productFilter}
                  onChange={(event) =>
                    setProductFilter(event.target.value as BrandProductFilter)
                  }
                >
                  <option value="ALL">All Product Status</option>
                  <option value="WITH_PRODUCTS">With Products</option>
                  <option value="WITHOUT_PRODUCTS">No Products</option>
                </select>

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
              </div>

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
          CONTENT
      ====================================================== */}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading brands..." size="sm" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
            <Tags size={27} className="text-emerald-600" />
          </div>

          <h3 className="text-base font-bold text-slate-800">No brands available</h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            No hardware brands have been added yet. Add manufacturers and brands to organize your
            store products.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            onClick={handleAddClick}
          >
            <Plus size={17} />
            Add First Brand
          </button>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Search size={22} className="text-slate-400" />
          </div>

          <h3 className="font-bold text-slate-800">No matching brands</h3>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            No brands match your current search or product status filter.
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
          {/* ==================================================
              TABLE HEADER
          ================================================== */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="text-emerald-600" />

              <span className="text-sm font-bold text-slate-700">Hardware Brands</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {filteredBrands.length} brand{filteredBrands.length === 1 ? '' : 's'}
              </span>

              {selectedBrandIds.length > 0 && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {selectedBrandIds.length} selected
                </span>
              )}
            </div>
          </div>

          {/* ==================================================
              DATA TABLE
          ================================================== */}

          <DataTable
            columns={columns}
            data={filteredBrands}
            selectedIds={selectedBrandIds}
            onSelectionChange={setSelectedBrandIds}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ======================================================
          BRAND MODAL
      ====================================================== */}

      <BrandModal
        isOpen={isModalOpen}
        existingBrandNames={brands.map((brand) => brand.name)}
        initialData={
          editingBrand
            ? {
                name: editingBrand.name,
                description: editingBrand.description
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleModalClose}
        onSave={handleSave}
        onImported={handleImported}
      />

      {/* ======================================================
          BRAND DETAILS MODAL
      ====================================================== */}

      <BrandDetailsModal
        brand={viewingBrand}
        onClose={() => setViewingBrand(null)}
      />
    </div>
  )
}

export default BrandsPage

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/* ==========================================================
   SORT BRANDS
========================================================== */

function sortBrands(brands: BrandRecord[]): BrandRecord[] {
  return [...brands].sort((left, right) => left.name.localeCompare(right.name))
}

/* ==========================================================
   NORMALIZE TEXT
========================================================== */

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

/* ==========================================================
   BRAND SEARCH
========================================================== */

function brandMatchesSearch(brand: BrandRecord, normalizedSearch: string): boolean {
  return [brand.name, brand.description, brand.productCount.toString()]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}