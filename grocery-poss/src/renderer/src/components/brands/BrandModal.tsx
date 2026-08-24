import React, { useState } from 'react'
import { X } from 'lucide-react'
import { BrandCsvImport } from './BrandCsvImport'
import { Spinner } from '../common/Spinner'
import type { BrandRecord } from '../../../../shared/brands'

export interface BrandFormData {
  name: string
  description: string
}

interface BrandModalProps {
  isOpen: boolean
  initialData?: BrandFormData
  existingBrandNames?: string[]
  isSaving?: boolean
  onClose: () => void
  onSave: (data: BrandFormData) => void
  onImported?: (createdBrands: BrandRecord[]) => void
}

const emptyForm: BrandFormData = { name: '', description: '' }

export const BrandModal: React.FC<BrandModalProps> = ({
  isOpen,
  initialData,
  existingBrandNames = [],
  isSaving = false,
  onClose,
  onSave,
  onImported
}) => {
  if (!isOpen) return null

  return (
    <BrandModalContent
      key={initialData ? initialData.name : 'new-brand'}
      initialData={initialData}
      existingBrandNames={existingBrandNames}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
      onImported={onImported}
    />
  )
}

const BrandModalContent: React.FC<Omit<BrandModalProps, 'isOpen'>> = ({
  initialData,
  existingBrandNames = [],
  isSaving = false,
  onClose,
  onSave,
  onImported
}) => {
  const [form, setForm] = useState<BrandFormData>(initialData ?? emptyForm)
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
            {initialData ? 'Edit Brand' : 'Add Brand'}
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
          <BrandCsvImport
            existingBrandNames={existingBrandNames}
            onImported={onImported}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.85rem] font-medium text-muted">Brand Name</label>
                <input
                  type="text"
                  className="rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  placeholder="e.g. Nestle"
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
