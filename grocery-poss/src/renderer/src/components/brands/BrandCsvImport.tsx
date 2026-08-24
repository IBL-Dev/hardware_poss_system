import React from 'react'
import { ClassificationCsvImport } from '../classifications/ClassificationCsvImport'
import { brandsApi } from '../../api/brandsApi'
import type { BrandRecord } from '../../../../shared/brands'

interface BrandCsvImportProps {
  existingBrandNames: string[]
  onImported: (createdBrands: BrandRecord[]) => void
  onClose: () => void
}

export const BrandCsvImport: React.FC<BrandCsvImportProps> = ({
  existingBrandNames,
  onImported,
  onClose
}) => (
  <ClassificationCsvImport
    recordLabel="Brand"
    recordLabelPlural="Brands"
    nameHeaderAliases={['name', 'brand', 'brand name', 'product brand']}
    existingNames={existingBrandNames}
    createRecord={brandsApi.create}
    onImported={onImported}
    onClose={onClose}
  />
)
