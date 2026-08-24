import React from 'react'
import { ClassificationCsvImport } from './ClassificationCsvImport'
import { categoriesApi } from '../../api/categoriesApi'
import type { CategoryRecord } from '../../../../shared/categories'

interface CategoryCsvImportProps {
  existingCategoryNames: string[]
  onImported: (createdCategories: CategoryRecord[]) => void
  onClose: () => void
}

export const CategoryCsvImport: React.FC<CategoryCsvImportProps> = ({
  existingCategoryNames,
  onImported,
  onClose
}) => (
  <ClassificationCsvImport
    recordLabel="Category"
    recordLabelPlural="Categories"
    nameHeaderAliases={[
      'name',
      'category',
      'categories',
      'category name',
      'product category',
      'catagory',
      'catogary',
      'catogarti',
      'categary'
    ]}
    existingNames={existingCategoryNames}
    createRecord={categoriesApi.create}
    onImported={onImported}
    onClose={onClose}
  />
)
