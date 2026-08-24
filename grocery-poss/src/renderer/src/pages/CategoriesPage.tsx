import React, { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { CategoryModal, CategoryFormData } from '../components/classifications/CategoryModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { categoriesApi } from '../api/categoriesApi'
import type {
  CategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput
} from '../../../shared/categories'

type CategoryProductFilter = 'ALL' | 'WITH_PRODUCTS' | 'WITHOUT_PRODUCTS'

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null)
  const [categorySearch, setCategorySearch] = useState('')
  const [productFilter, setProductFilter] = useState<CategoryProductFilter>('ALL')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])

  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    categoriesApi
      .list()
      .then((loadedCategories) => {
        if (isActive) setCategories(loadedCategories)
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

  const filteredCategories = useMemo(() => {
    const normalizedSearch = normalizeText(categorySearch)

    return categories.filter((category) => {
      if (productFilter === 'WITH_PRODUCTS' && category.productCount === 0) {
        return false
      }

      if (productFilter === 'WITHOUT_PRODUCTS' && category.productCount > 0) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return categoryMatchesSearch(category, normalizedSearch)
    })
  }, [categories, categorySearch, productFilter])

  const hasActiveFilters = categorySearch.trim().length > 0 || productFilter !== 'ALL'

  useEffect(() => {
    const visibleCategoryIds = new Set(filteredCategories.map((category) => category.id))

    setSelectedCategoryIds((current) => {
      const next = current.filter((id) => visibleCategoryIds.has(id))

      return next.length === current.length ? current : next
    })
  }, [filteredCategories])

  const columns: Column<CategoryRecord>[] = [
    {
      key: 'name',
      header: 'CATEGORY NAME',
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
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleEdit = (category: CategoryRecord): void => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleModalClose = (): void => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  const handleSave = async (data: CategoryFormData): Promise<void> => {
    setIsSaving(true)
    try {
      if (editingCategory) {
        const payload: UpdateCategoryInput = {
          name: data.name,
          description: data.description
        }
        const updatedCategory = await categoriesApi.update(editingCategory.id, payload)
        setCategories((prev) =>
          sortCategories(prev.map((cat) => (cat.id === editingCategory.id ? updatedCategory : cat)))
        )
        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateCategoryInput = {
          name: data.name,
          description: data.description
        }
        const createdCategory = await categoriesApi.create(payload)
        setCategories((prev) => sortCategories([...prev, createdCategory]))
        toast.success(`"${data.name}" was added successfully.`)
      }
      setIsModalOpen(false)
      setEditingCategory(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCategory = async (category: CategoryRecord): Promise<void> => {
    try {
      await categoriesApi.delete(category.id)
      setCategories((prev) => prev.filter((item) => item.id !== category.id))
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== category.id))
      toast.success(`"${category.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteCategories = async (categoriesToDelete: CategoryRecord[]): Promise<void> => {
    const deletedIds = new Set<number>()

    try {
      for (const category of categoriesToDelete) {
        await categoriesApi.delete(category.id)
        deletedIds.add(category.id)
      }

      setCategories((prev) => prev.filter((category) => !deletedIds.has(category.id)))
      setSelectedCategoryIds([])
      toast.success(`${categoriesToDelete.length} category(s) were deleted successfully.`)
    } catch (error) {
      if (deletedIds.size > 0) {
        setCategories((prev) => prev.filter((category) => !deletedIds.has(category.id)))
        setSelectedCategoryIds((prev) => prev.filter((id) => !deletedIds.has(id)))
      }

      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = (category: CategoryRecord): void => {
    confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteCategory(category)
    })
  }

  const handleDeleteSelected = (): void => {
    const categoriesToDelete = categories.filter((category) =>
      selectedCategoryIds.includes(category.id)
    )

    if (categoriesToDelete.length === 0) {
      return
    }

    confirm({
      title: 'Delete Selected Categories',
      message: `Are you sure you want to delete ${categoriesToDelete.length} selected category(s)? This action cannot be undone.`,
      confirmText: 'Delete Selected',
      variant: 'danger',
      onConfirm: () => deleteCategories(categoriesToDelete)
    })
  }

  const handleImported = (createdCategories: CategoryRecord[]): void => {
    setCategories((prev) => sortCategories([...prev, ...createdCategories]))
  }

  const exportCategoriesCsv = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const result = await categoriesApi.exportCsv()

      if (result.saved) {
        toast.success('Categories exported to CSV successfully.')
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
      title: 'Export Categories',
      message: `Export all ${categories.length} category(s) to a CSV file on this device?`,
      confirmText: 'Export',
      onConfirm: () => exportCategoriesCsv()
    })
  }

  const handleResetFilters = (): void => {
    setCategorySearch('')
    setProductFilter('ALL')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Categories</h1>
          <p className="mt-1 text-[0.95rem] text-muted">Manage your product categories</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            className="flex items-center gap-2 rounded-md border border-danger/30 bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleDeleteSelected}
            disabled={selectedCategoryIds.length === 0}
          >
            <Trash2 size={18} />
            {selectedCategoryIds.length > 0
              ? `Delete Selected (${selectedCategoryIds.length})`
              : 'Delete Selected'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleExportClick}
            disabled={isExporting || categories.length === 0}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover"
            onClick={handleAddClick}
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {!isLoading && categories.length > 0 && (
        <div className="mb-5 rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-muted">
              <Filter size={16} />
              Category Filters
            </div>
            <span className="text-sm text-muted">
              Showing <span className="font-semibold text-ink">{filteredCategories.length}</span> of{' '}
              <span className="font-semibold text-ink">{categories.length}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.9fr_auto]">
            <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2.5 focus-within:border-primary">
              <Search size={17} className="shrink-0 text-faint" />
              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-faint"
                placeholder="Search category name or description"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
              />
            </div>

            <select
              className="rounded-md border border-line bg-bg px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-primary"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value as CategoryProductFilter)}
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
          <Loader label="Loading categories..." size="sm" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No categories found.
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No categories match the selected filters.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCategories}
          selectedIds={selectedCategoryIds}
          onSelectionChange={setSelectedCategoryIds}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CategoryModal
        isOpen={isModalOpen}
        existingCategoryNames={categories.map((category) => category.name)}
        initialData={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleModalClose}
        onSave={handleSave}
        onImported={handleImported}
      />
    </div>
  )
}

export default CategoriesPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function sortCategories(items: CategoryRecord[]): CategoryRecord[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function categoryMatchesSearch(category: CategoryRecord, normalizedSearch: string): boolean {
  return [category.name, category.description, category.productCount.toString()]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}
