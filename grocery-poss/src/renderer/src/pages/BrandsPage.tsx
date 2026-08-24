import React, { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    const visibleBrandIds = new Set(filteredBrands.map((brand) => brand.id))

    setSelectedBrandIds((current) => {
      const next = current.filter((id) => visibleBrandIds.has(id))

      return next.length === current.length ? current : next
    })
  }, [filteredBrands])

  const columns: Column<BrandRecord>[] = [
    {
      key: 'name',
      header: 'BRAND NAME',
      render: (item) => (
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {item.name}
        </span>
      )
    },
    { key: 'description', header: 'DESCRIPTION', render: (item) => item.description || '-' },
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

  const handleAddClick = (): void => {
    setEditingBrand(null)
    setIsModalOpen(true)
  }

  const handleView = (brand: BrandRecord): void => {
    setViewingBrand(brand)
  }

  const handleEdit = (brand: BrandRecord): void => {
    setEditingBrand(brand)
    setIsModalOpen(true)
  }

  const handleModalClose = (): void => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingBrand(null)
  }

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

  const handleDelete = (brand: BrandRecord): void => {
    confirm({
      title: 'Delete Brand',
      message: `Are you sure you want to delete "${brand.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteBrand(brand)
    })
  }

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

  const handleImported = (createdBrands: BrandRecord[]): void => {
    setBrands((prev) => sortBrands([...prev, ...createdBrands]))
  }

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

  const handleResetFilters = (): void => {
    setBrandSearch('')
    setProductFilter('ALL')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Brands</h1>
          <p className="mt-1 text-[0.95rem] text-muted">Manage your product brands</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            className="flex items-center gap-2 rounded-md border border-danger/30 bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleDeleteSelected}
            disabled={selectedBrandIds.length === 0}
          >
            <Trash2 size={18} />
            {selectedBrandIds.length > 0
              ? `Delete Selected (${selectedBrandIds.length})`
              : 'Delete Selected'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleExportClick}
            disabled={isExporting || brands.length === 0}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add Brand
          </button>
        </div>
      </div>

      {!isLoading && brands.length > 0 && (
        <div className="mb-5 rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-muted">
              <Filter size={16} />
              Brand Filters
            </div>
            <span className="text-sm text-muted">
              Showing <span className="font-semibold text-ink">{filteredBrands.length}</span> of{' '}
              <span className="font-semibold text-ink">{brands.length}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.9fr_auto]">
            <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2.5 focus-within:border-primary">
              <Search size={17} className="shrink-0 text-faint" />
              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-faint"
                placeholder="Search brand name or description"
                value={brandSearch}
                onChange={(event) => setBrandSearch(event.target.value)}
              />
            </div>

            <select
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value as BrandProductFilter)}
            >
              <option value="ALL">All Product Status</option>
              <option value="WITH_PRODUCTS">With Products</option>
              <option value="WITHOUT_PRODUCTS">No Products</option>
            </select>

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
          <Loader label="Loading brands..." size="sm" />
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No brands found.
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No brands match the selected filters.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredBrands}
          selectedIds={selectedBrandIds}
          onSelectionChange={setSelectedBrandIds}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

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

      <BrandDetailsModal brand={viewingBrand} onClose={() => setViewingBrand(null)} />
    </div>
  )
}

export default BrandsPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function sortBrands(brands: BrandRecord[]): BrandRecord[] {
  return [...brands].sort((left, right) => left.name.localeCompare(right.name))
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function brandMatchesSearch(brand: BrandRecord, normalizedSearch: string): boolean {
  return [brand.name, brand.description, brand.productCount.toString()]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}
