import React, { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Download,
  Filter,
  FolderTree,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react'
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

  /* ==========================================================
     LOAD CATEGORIES
  ========================================================== */

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    categoriesApi
      .list()
      .then((loadedCategories) => {
        if (isActive) {
          setCategories(loadedCategories)
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
     FILTERED CATEGORIES
  ========================================================== */

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

  const hasActiveFilters =
    categorySearch.trim().length > 0 || productFilter !== 'ALL'

  /* ==========================================================
     CLEAR HIDDEN SELECTIONS
  ========================================================== */

  useEffect(() => {
    const visibleCategoryIds = new Set(
      filteredCategories.map((category) => category.id)
    )

    setSelectedCategoryIds((current) => {
      const next = current.filter((id) => visibleCategoryIds.has(id))

      return next.length === current.length ? current : next
    })
  }, [filteredCategories])

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns: Column<CategoryRecord>[] = [
    {
      key: 'name',
      header: 'CATEGORY NAME',
      render: (item) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
            <FolderTree size={17} className="text-emerald-600" />
          </div>

          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-800">
              {item.name}
            </span>

            <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Product Category
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'DESCRIPTION',
      render: (item) => (
        <span className="block max-w-[460px] truncate text-sm leading-6 text-slate-500">
          {item.description || '-'}
        </span>
      )
    },
    {
      key: 'productCount',
      header: 'PRODUCTS',
      render: (item) =>
        item.productCount > 0 ? (
          <span className="inline-flex min-w-[76px] items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
            <Boxes size={13} />
            {item.productCount}
          </span>
        ) : (
          <span className="inline-flex min-w-[76px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
            0
          </span>
        )
    }
  ]

  /* ==========================================================
     ADD CATEGORY
  ========================================================== */

  const handleAddClick = (): void => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  /* ==========================================================
     EDIT CATEGORY
  ========================================================== */

  const handleEdit = (category: CategoryRecord): void => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  const handleModalClose = (): void => {
    if (isSaving) return

    setIsModalOpen(false)
    setEditingCategory(null)
  }

  /* ==========================================================
     SAVE CATEGORY
  ========================================================== */

  const handleSave = async (data: CategoryFormData): Promise<void> => {
    setIsSaving(true)

    try {
      if (editingCategory) {
        const payload: UpdateCategoryInput = {
          name: data.name,
          description: data.description
        }

        const updatedCategory = await categoriesApi.update(
          editingCategory.id,
          payload
        )

        setCategories((prev) =>
          sortCategories(
            prev.map((category) =>
              category.id === editingCategory.id
                ? updatedCategory
                : category
            )
          )
        )

        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateCategoryInput = {
          name: data.name,
          description: data.description
        }

        const createdCategory = await categoriesApi.create(payload)

        setCategories((prev) =>
          sortCategories([...prev, createdCategory])
        )

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

  /* ==========================================================
     DELETE CATEGORY
  ========================================================== */

  const deleteCategory = async (
    category: CategoryRecord
  ): Promise<void> => {
    try {
      await categoriesApi.delete(category.id)

      setCategories((prev) =>
        prev.filter((item) => item.id !== category.id)
      )

      setSelectedCategoryIds((prev) =>
        prev.filter((id) => id !== category.id)
      )

      toast.success(`"${category.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE MULTIPLE CATEGORIES
  ========================================================== */

  const deleteCategories = async (
    categoriesToDelete: CategoryRecord[]
  ): Promise<void> => {
    const deletedIds = new Set<number>()

    try {
      for (const category of categoriesToDelete) {
        await categoriesApi.delete(category.id)

        deletedIds.add(category.id)
      }

      setCategories((prev) =>
        prev.filter((category) => !deletedIds.has(category.id))
      )

      setSelectedCategoryIds([])

      toast.success(
        `${categoriesToDelete.length} category(s) were deleted successfully.`
      )
    } catch (error) {
      if (deletedIds.size > 0) {
        setCategories((prev) =>
          prev.filter((category) => !deletedIds.has(category.id))
        )

        setSelectedCategoryIds((prev) =>
          prev.filter((id) => !deletedIds.has(id))
        )
      }

      toast.error(getErrorMessage(error))
    }
  }

  /* ==========================================================
     DELETE CONFIRMATION
  ========================================================== */

  const handleDelete = (category: CategoryRecord): void => {
    confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteCategory(category)
    })
  }

  /* ==========================================================
     DELETE SELECTED
  ========================================================== */

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

  /* ==========================================================
     IMPORT CATEGORIES
  ========================================================== */

  const handleImported = (
    createdCategories: CategoryRecord[]
  ): void => {
    setCategories((prev) =>
      sortCategories([...prev, ...createdCategories])
    )
  }

  /* ==========================================================
     EXPORT CATEGORIES
  ========================================================== */

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

  /* ==========================================================
     RESET FILTERS
  ========================================================== */

  const handleResetFilters = (): void => {
    setCategorySearch('')
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
              <FolderTree size={21} className="text-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Categories
                </h1>

                {!isLoading && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {categories.length} Categories
                  </span>
                )}
              </div>

              <p className="mt-1 text-[0.92rem] text-slate-500">
                Organize hardware products into clear inventory categories
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleDeleteSelected}
              disabled={selectedCategoryIds.length === 0}
            >
              <Trash2 size={17} />

              {selectedCategoryIds.length > 0
                ? `Delete (${selectedCategoryIds.length})`
                : 'Delete Selected'}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleExportClick}
              disabled={isExporting || categories.length === 0}
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
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          FILTER SECTION
      ====================================================== */}

      {!isLoading && categories.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <Filter size={14} className="text-emerald-600" />
              </div>

              <h2 className="text-sm font-bold text-slate-800">
                Search & Filter
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Displaying</span>

              <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {filteredCategories.length}
              </span>

              <span>of</span>

              <span className="font-bold text-slate-700">
                {categories.length}
              </span>

              <span>categories</span>
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
                  placeholder="Search category name or description..."
                  value={categorySearch}
                  onChange={(event) =>
                    setCategorySearch(event.target.value)
                  }
                />
              </div>

              {/* ==================================================
                  PRODUCT STATUS FILTER
              ================================================== */}

              <div className="relative">
                <Boxes
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                />

                <select
                  className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                  value={productFilter}
                  onChange={(event) =>
                    setProductFilter(
                      event.target.value as CategoryProductFilter
                    )
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
          <Loader label="Loading categories..." size="sm" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
            <FolderTree size={27} className="text-emerald-600" />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            No categories available
          </h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Create categories to organize hardware products such as
            power tools, hand tools, plumbing, electrical items and
            building materials.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            onClick={handleAddClick}
          >
            <Plus size={17} />
            Add First Category
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <PackageSearch size={22} className="text-slate-400" />
          </div>

          <h3 className="font-bold text-slate-800">
            No matching categories
          </h3>

          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            No categories match your current search or product status
            filter.
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
              <FolderTree size={16} className="text-emerald-600" />

              <span className="text-sm font-bold text-slate-700">
                Hardware Categories
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {filteredCategories.length}{' '}
                categor{filteredCategories.length === 1 ? 'y' : 'ies'}
              </span>

              {selectedCategoryIds.length > 0 && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {selectedCategoryIds.length} selected
                </span>
              )}
            </div>
          </div>

          {/* ==================================================
              DATA TABLE
          ================================================== */}

          <DataTable
            columns={columns}
            data={filteredCategories}
            selectedIds={selectedCategoryIds}
            onSelectionChange={setSelectedCategoryIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ======================================================
          CATEGORY MODAL
      ====================================================== */}

      <CategoryModal
        isOpen={isModalOpen}
        existingCategoryNames={categories.map(
          (category) => category.name
        )}
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

/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

/* ==========================================================
   SORT CATEGORIES
========================================================== */

function sortCategories(
  items: CategoryRecord[]
): CategoryRecord[] {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}

/* ==========================================================
   NORMALIZE TEXT
========================================================== */

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

/* ==========================================================
   CATEGORY SEARCH
========================================================== */

function categoryMatchesSearch(
  category: CategoryRecord,
  normalizedSearch: string
): boolean {
  return [
    category.name,
    category.description,
    category.productCount.toString()
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedSearch)
}