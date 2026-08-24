import React from 'react'
import { SearchableSelect } from '../common/SearchableSelect'
import type { CategoryRecord } from '../../../../shared/categories'

interface CategorySelectProps {
  categories: CategoryRecord[]
  value: number
  onChange: (categoryId: number) => void
  onCreate?: (name: string) => Promise<CategoryRecord>
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  value,
  onChange,
  onCreate
}) => {
  const options = categories.map((cat) => ({ value: String(cat.id), label: cat.name }))

  const handleCreate = async (name: string): Promise<void> => {
    if (!onCreate) return

    const createdCategory = await onCreate(name)
    onChange(createdCategory.id)
  }

  return (
    <SearchableSelect
      options={options}
      value={value > 0 ? String(value) : ''}
      onChange={(nextValue) => onChange(Number(nextValue))}
      placeholder="Select category"
      searchPlaceholder="Search category..."
      onCreateOption={onCreate ? handleCreate : undefined}
      createOptionLabel={(name) => `Add category "${name}"`}
    />
  )
}
