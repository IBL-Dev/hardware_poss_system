import React from 'react'
import { SearchableSelect } from '../common/SearchableSelect'
import type { BrandRecord } from '../../../../shared/brands'

interface BrandSelectProps {
  brands: BrandRecord[]
  value: number
  onChange: (brandId: number) => void
  onCreate?: (name: string) => Promise<BrandRecord>
}

export const BrandSelect: React.FC<BrandSelectProps> = ({ brands, value, onChange, onCreate }) => {
  const options = brands.map((brand) => ({ value: String(brand.id), label: brand.name }))

  const handleCreate = async (name: string): Promise<void> => {
    if (!onCreate) return

    const createdBrand = await onCreate(name)
    onChange(createdBrand.id)
  }

  return (
    <SearchableSelect
      options={options}
      value={value > 0 ? String(value) : ''}
      onChange={(nextValue) => onChange(Number(nextValue))}
      placeholder="Select brand"
      searchPlaceholder="Search brand..."
      onCreateOption={onCreate ? handleCreate : undefined}
      createOptionLabel={(name) => `Add brand "${name}"`}
    />
  )
}
