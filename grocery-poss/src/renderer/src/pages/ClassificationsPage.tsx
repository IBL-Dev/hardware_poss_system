import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { DataTable, Column } from '../components/common/DataTable'
import { Loader } from '../components/common/Loader'
import { CategoryModal, CategoryFormData } from '../components/classifications/CategoryModal'
import { SupplierModal, SupplierFormData } from '../components/classifications/SupplierModal'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { categoriesApi } from '../api/categoriesApi'
import { suppliersApi } from '../api/suppliersApi'
import type {
  CategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput
} from '../../../shared/categories'
import type {
  SupplierRecord,
  CreateSupplierInput,
  UpdateSupplierInput
} from '../../../shared/suppliers'

type TabType = 'categories' | 'suppliers'

const ClassificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('categories')

  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null)

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null)

  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    if (activeTab === 'categories') {
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
    } else {
      suppliersApi
        .list()
        .then((loadedSuppliers) => {
          if (isActive) setSuppliers(loadedSuppliers)
        })
        .catch((error) => {
          if (isActive) toast.error(getErrorMessage(error))
        })
        .finally(() => {
          if (isActive) setIsLoading(false)
        })
    }

    return () => {
      isActive = false
    }
  }, [activeTab, toast])

  const categoryColumns: Column<CategoryRecord>[] = [
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

  const supplierColumns: Column<SupplierRecord>[] = [
    {
      key: 'name',
      header: 'SUPPLIER NAME',
      render: (item) => (
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {item.name}
        </span>
      )
    },
    { key: 'contactName', header: 'CONTACT', render: (item) => item.contactName || '-' },
    { key: 'phone', header: 'PHONE', render: (item) => item.phone || '-' },
    { key: 'email', header: 'EMAIL', render: (item) => item.email || '-' },
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
    if (activeTab === 'categories') {
      setEditingCategory(null)
      setIsCategoryModalOpen(true)
    } else {
      setEditingSupplier(null)
      setIsSupplierModalOpen(true)
    }
  }

  const handleCategoryEdit = (category: CategoryRecord): void => {
    setEditingCategory(category)
    setIsCategoryModalOpen(true)
  }

  const handleSupplierEdit = (supplier: SupplierRecord): void => {
    setEditingSupplier(supplier)
    setIsSupplierModalOpen(true)
  }

  const handleCategoryModalClose = (): void => {
    if (isSaving) return
    setIsCategoryModalOpen(false)
    setEditingCategory(null)
  }

  const handleSupplierModalClose = (): void => {
    if (isSaving) return
    setIsSupplierModalOpen(false)
    setEditingSupplier(null)
  }

  const handleCategorySave = async (data: CategoryFormData): Promise<void> => {
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
      setIsCategoryModalOpen(false)
      setEditingCategory(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSupplierSave = async (data: SupplierFormData): Promise<void> => {
    setIsSaving(true)
    try {
      if (editingSupplier) {
        const payload: UpdateSupplierInput = {
          name: data.name,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email,
          address: data.address
        }
        const updatedSupplier = await suppliersApi.update(editingSupplier.id, payload)
        setSuppliers((prev) =>
          sortSuppliers(prev.map((sup) => (sup.id === editingSupplier.id ? updatedSupplier : sup)))
        )
        toast.success(`"${data.name}" was updated successfully.`)
      } else {
        const payload: CreateSupplierInput = {
          name: data.name,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email,
          address: data.address
        }
        const createdSupplier = await suppliersApi.create(payload)
        setSuppliers((prev) => sortSuppliers([...prev, createdSupplier]))
        toast.success(`"${data.name}" was added successfully.`)
      }
      setIsSupplierModalOpen(false)
      setEditingSupplier(null)
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
      toast.success(`"${category.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleCategoryDelete = (category: CategoryRecord): void => {
    confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteCategory(category)
    })
  }

  const deleteSupplier = async (supplier: SupplierRecord): Promise<void> => {
    try {
      await suppliersApi.delete(supplier.id)
      setSuppliers((prev) => prev.filter((item) => item.id !== supplier.id))
      toast.success(`"${supplier.name}" was deleted successfully.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleSupplierDelete = (supplier: SupplierRecord): void => {
    confirm({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteSupplier(supplier)
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Classifications</h1>
          <p className="mt-1 text-[0.95rem] text-muted">Manage your categories and suppliers</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-[0.95rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover"
          onClick={handleAddClick}
        >
          <Plus size={18} />
          {activeTab === 'categories' ? 'Add Category' : 'Add Supplier'}
        </button>
      </div>

      <div className="mb-6 flex gap-4 border-b border-line">
        <button
          className={`pb-2 px-1 font-medium transition-colors border-b-2 ${
            activeTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`pb-2 px-1 font-medium transition-colors border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('suppliers')}
        >
          Suppliers
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <Loader label="Loading..." size="sm" />
        </div>
      ) : activeTab === 'categories' ? (
        categories.length === 0 ? (
          <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
            No categories found.
          </div>
        ) : (
          <DataTable
            columns={categoryColumns}
            data={categories}
            onEdit={handleCategoryEdit}
            onDelete={handleCategoryDelete}
          />
        )
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6 text-center text-muted">
          No suppliers found.
        </div>
      ) : (
        <DataTable
          columns={supplierColumns}
          data={suppliers}
          onEdit={handleSupplierEdit}
          onDelete={handleSupplierDelete}
        />
      )}

      <CategoryModal
        isOpen={isCategoryModalOpen}
        initialData={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleCategoryModalClose}
        onSave={handleCategorySave}
      />

      <SupplierModal
        isOpen={isSupplierModalOpen}
        initialData={
          editingSupplier
            ? {
                name: editingSupplier.name,
                contactName: editingSupplier.contactName,
                phone: editingSupplier.phone,
                email: editingSupplier.email,
                address: editingSupplier.address
              }
            : undefined
        }
        isSaving={isSaving}
        onClose={handleSupplierModalClose}
        onSave={handleSupplierSave}
      />
    </div>
  )
}

export default ClassificationsPage

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function sortCategories(items: CategoryRecord[]): CategoryRecord[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

function sortSuppliers(items: SupplierRecord[]): SupplierRecord[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}
