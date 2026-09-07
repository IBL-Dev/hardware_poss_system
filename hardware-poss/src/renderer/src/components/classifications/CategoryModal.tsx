import React, { useState } from 'react'
import { X } from 'lucide-react'
import { CategoryCsvImport } from './CategoryCsvImport'
import { Spinner } from '../common/Spinner'
import type { CategoryRecord } from '../../../../shared/categories'

export interface CategoryFormData {
  name: string
  description: string
}

interface CategoryModalProps {
  isOpen: boolean
  initialData?: CategoryFormData
  existingCategoryNames?: string[]
  isSaving?: boolean
  onClose: () => void
  onSave: (data: CategoryFormData) => void
  onImported?: (createdCategories: CategoryRecord[]) => void
}

const emptyForm: CategoryFormData = { name: '', description: '' }

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  initialData,
  existingCategoryNames = [],
  isSaving = false,
  onClose,
  onSave,
  onImported
}) => {
  if (!isOpen) return null

  return (
    <CategoryModalContent
      key={initialData ? initialData.name : 'new-category'}
      initialData={initialData}
      existingCategoryNames={existingCategoryNames}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
      onImported={onImported}
    />
  )
}

const CategoryModalContent: React.FC<Omit<CategoryModalProps, 'isOpen'>> = ({
  initialData,
  existingCategoryNames = [],
  isSaving = false,
  onClose,
  onSave,
  onImported
}) => {
  const [form, setForm] = useState<CategoryFormData>(initialData ?? emptyForm)
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const canUploadCsv = !initialData && Boolean(onImported)
  const isValid = form.name.trim().length > 0

  const handleSave = (): void => {
    if (!isValid) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,34rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-bold text-ink">
            {initialData ? 'Edit Category' : 'Add Category'}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        {canUploadCsv && (
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

        {canUploadCsv && activeTab === 'csv' && onImported ? (
          <CategoryCsvImport
            existingCategoryNames={existingCategoryNames}
            onImported={onImported}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Category Name</label>
                <input
                  type="text"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="e.g. Vegetables"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Description</label>
                <textarea
                  className="min-h-20 resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="Short description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
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
