export const PRODUCT_UNITS = ['PCS', 'KG', 'G', 'L', 'ML', 'PACK', 'BOX', 'BOTTLE'] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export interface ProductRecord {
  id: number
  sku: string
  barcode: string | null
  name: string
  brandId: number | null
  brandName: string | null
  categoryId: number
  categoryName: string | null
  supplierId: number | null
  supplierName: string | null
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  reorderLevel: number
  discountPercent: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductInput {
  sku?: string
  barcode?: string
  name: string
  brandId: number
  categoryId?: number
  supplierId?: number | null
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  reorderLevel?: number
  discountPercent?: number
}

export interface UpdateProductInput {
  sku?: string
  barcode?: string
  name?: string
  brandId?: number | null
  categoryId?: number
  supplierId?: number | null
  unit?: ProductUnit
  buyingPrice?: number
  sellingPrice?: number
  stockQuantity?: number
  reorderLevel?: number
  discountPercent?: number
}

export interface ExportProductsCsvResult {
  saved: boolean
  filePath?: string
}

export interface ProductApi {
  list: () => Promise<ProductRecord[]>
  get: (id: number) => Promise<ProductRecord>
  create: (input: CreateProductInput) => Promise<ProductRecord>
  update: (id: number, input: UpdateProductInput) => Promise<ProductRecord>
  delete: (id: number) => Promise<void>
  exportCsv: () => Promise<ExportProductsCsvResult>
}
