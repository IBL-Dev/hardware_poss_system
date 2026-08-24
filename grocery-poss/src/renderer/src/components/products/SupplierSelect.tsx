import React from 'react'
import { SearchableSelect } from '../common/SearchableSelect'
import type { SupplierRecord } from '../../../../shared/suppliers'

interface SupplierSelectProps {
  suppliers: SupplierRecord[]
  value: number | null
  onChange: (supplierId: number | null) => void
  onCreate?: (name: string) => Promise<SupplierRecord>
}

export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  suppliers,
  value,
  onChange,
  onCreate
}) => {
  const options = suppliers.map((sup) => ({ value: String(sup.id), label: sup.name }))

  const handleCreate = async (name: string): Promise<void> => {
    if (!onCreate) return

    const createdSupplier = await onCreate(name)
    onChange(createdSupplier.id)
  }

  return (
    <SearchableSelect
      options={options}
      value={value && value > 0 ? String(value) : ''}
      onChange={(nextValue) => onChange(nextValue ? Number(nextValue) : null)}
      placeholder="Select supplier (optional)"
      searchPlaceholder="Search supplier..."
      onCreateOption={onCreate ? handleCreate : undefined}
      createOptionLabel={(name) => `Add supplier "${name}"`}
    />
  )
}
