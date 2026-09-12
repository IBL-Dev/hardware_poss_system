export const PRODUCT_UNITS = ['PCS', 'KG', 'G', 'L', 'M', 'FT', 'BOX', 'PACK', 'SET', 'ROLL', 'SHEET', 'BAG', 'TUBE', 'CAN', 'BOTTLE', 'DOZEN'] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export function isWeightUnit(unit: ProductUnit): boolean {
  return unit === 'KG' || unit === 'G'
}

export type ProductDiscountType = 'amount' | 'percent'

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
  discountType: ProductDiscountType
  discountAmount: number
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
  discountType?: ProductDiscountType
  discountAmount?: number
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
  discountType?: ProductDiscountType
  discountAmount?: number
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

export function isProductDiscountPercent(type: ProductDiscountType | undefined | null): boolean {
  return type === 'percent'
}

export function getProductDiscountLkr(
  product: Pick<ProductRecord, 'discountType' | 'discountAmount' | 'sellingPrice'>
): number {
  if (isProductDiscountPercent(product.discountType)) {
    return Math.round(product.sellingPrice * product.discountAmount) / 100
  }

  return product.discountAmount
}
