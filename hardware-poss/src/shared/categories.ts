export interface CategoryRecord {
  id: number
  name: string
  description: string
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
}

export interface ExportCategoriesCsvResult {
  saved: boolean
  filePath?: string
}
