import { BrandRepository } from '../brands/brandRepository'
import {
  CreateProductInput,
  PRODUCT_UNITS,
  ProductRecord,
  ProductUnit,
  UpdateProductInput
} from '../../shared/products'
import { ProductRepository } from './productRepository'
import { CategoryRepository } from '../categories/categoryRepository'
import { SupplierRepository } from '../suppliers/supplierRepository'

interface NormalizedProductInput {
  sku: string | null
  barcode: string | null
  name: string
  brandId: number | null
  categoryId: number
  supplierId: number | null
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  reorderLevel: number
  discountPercent: number
}

export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly brands: BrandRepository,
    private readonly categories: CategoryRepository,
    private readonly suppliers: SupplierRepository
  ) {}

  listProducts(): ProductRecord[] {
    return this.products.list()
  }

  getProduct(id: number): ProductRecord {
    this.assertValidId(id, 'Product id')

    const product = this.products.findById(id)

    if (!product) {
      throw new Error('Product not found.')
    }

    return product
  }

  createProduct(input: CreateProductInput): ProductRecord {
    const product = this.normalizeCreateInput(input)
    this.assertBrandRequired(product.brandId)
    this.assertBrandExists(product.brandId)
    this.assertCategoryRequired(product.categoryId)
    this.assertCategoryExists(product.categoryId)
    this.assertSupplierExists(product.supplierId)
    this.assertUniqueProduct(product)

    return this.products.create(product)
  }

  updateProduct(id: number, input: UpdateProductInput): ProductRecord {
    this.assertValidId(id, 'Product id')

    const existingProduct = this.products.findById(id)

    if (!existingProduct) {
      throw new Error('Product not found.')
    }

    const product = this.normalizeUpdateInput(input, existingProduct)
    this.assertBrandRequired(product.brandId)
    this.assertBrandExists(product.brandId)
    this.assertCategoryRequired(product.categoryId)
    this.assertCategoryExists(product.categoryId)
    this.assertSupplierExists(product.supplierId)
    this.assertUniqueProduct(product, id)

    return this.products.update(id, product)
  }

  deleteProduct(id: number): void {
    this.assertValidId(id, 'Product id')

    if (!this.products.findById(id)) {
      throw new Error('Product not found.')
    }

    this.products.delete(id)
  }

  private normalizeCreateInput(input: CreateProductInput): NormalizedProductInput {
    return {
      sku: this.normalizeOptionalSku(input.sku),
      barcode: this.normalizeBarcode(input.barcode),
      name: this.normalizeRequiredText(input.name, 'Product name'),
      brandId: this.normalizeBrandId(input.brandId),
      categoryId: this.normalizeCategoryId(input.categoryId),
      supplierId: this.normalizeSupplierId(input.supplierId),
      unit: this.normalizeUnit(input.unit),
      buyingPrice: this.normalizeMoney(input.buyingPrice, 'Buying price'),
      sellingPrice: this.normalizeMoney(input.sellingPrice, 'Selling price'),
      stockQuantity: this.normalizeQuantity(input.stockQuantity, 'Stock quantity'),
      reorderLevel:
        input.reorderLevel === undefined
          ? 0
          : this.normalizeQuantity(input.reorderLevel, 'Reorder level'),
      discountPercent:
        input.discountPercent === undefined
          ? 0
          : this.normalizeDiscountPercent(input.discountPercent)
    }
  }

  private normalizeUpdateInput(
    input: UpdateProductInput,
    existingProduct: ProductRecord
  ): NormalizedProductInput {
    return {
      sku: input.sku === undefined ? existingProduct.sku : this.normalizeOptionalSku(input.sku),
      barcode:
        input.barcode === undefined
          ? existingProduct.barcode
          : this.normalizeBarcode(input.barcode),
      name:
        input.name === undefined
          ? existingProduct.name
          : this.normalizeRequiredText(input.name, 'Product name'),
      brandId:
        input.brandId === undefined
          ? existingProduct.brandId
          : this.normalizeBrandId(input.brandId),
      categoryId:
        input.categoryId === undefined
          ? existingProduct.categoryId
          : this.normalizeCategoryId(input.categoryId),
      supplierId:
        input.supplierId === undefined
          ? existingProduct.supplierId
          : this.normalizeSupplierId(input.supplierId),
      unit: input.unit === undefined ? existingProduct.unit : this.normalizeUnit(input.unit),
      buyingPrice:
        input.buyingPrice === undefined
          ? existingProduct.buyingPrice
          : this.normalizeMoney(input.buyingPrice, 'Buying price'),
      sellingPrice:
        input.sellingPrice === undefined
          ? existingProduct.sellingPrice
          : this.normalizeMoney(input.sellingPrice, 'Selling price'),
      stockQuantity:
        input.stockQuantity === undefined
          ? existingProduct.stockQuantity
          : this.normalizeQuantity(input.stockQuantity, 'Stock quantity'),
      reorderLevel:
        input.reorderLevel === undefined
          ? existingProduct.reorderLevel
          : this.normalizeQuantity(input.reorderLevel, 'Reorder level'),
      discountPercent:
        input.discountPercent === undefined
          ? existingProduct.discountPercent
          : this.normalizeDiscountPercent(input.discountPercent)
    }
  }

  private assertBrandRequired(brandId: number | null): void {
    if (brandId === null) {
      throw new Error('Brand is required.')
    }
  }

  private assertBrandExists(brandId: number | null): void {
    if (brandId !== null && !this.brands.findById(brandId)) {
      throw new Error('Brand not found.')
    }
  }

  private assertCategoryRequired(categoryId: number | null): void {
    if (categoryId === null) {
      throw new Error('Category is required.')
    }
  }

  private assertCategoryExists(categoryId: number): void {
    if (!this.categories.findById(categoryId)) {
      throw new Error('Category not found.')
    }
  }

  private assertSupplierExists(supplierId: number | null): void {
    if (supplierId !== null && !this.suppliers.findById(supplierId)) {
      throw new Error('Supplier not found.')
    }
  }

  private assertUniqueProduct(input: NormalizedProductInput, currentProductId?: number): void {
    if (input.sku) {
      this.assertUniqueField(this.products.findBySku(input.sku), currentProductId, 'Product code')
    }

    if (input.barcode) {
      this.assertUniqueField(
        this.products.findByBarcode(input.barcode),
        currentProductId,
        'Barcode'
      )
    }
  }

  private assertUniqueField(
    existingProduct: ProductRecord | null,
    currentProductId: number | undefined,
    fieldName: string
  ): void {
    if (existingProduct && existingProduct.id !== currentProductId) {
      throw new Error(`${fieldName} is already used by another product.`)
    }
  }

  private normalizeRequiredText(value: string | undefined, fieldName: string): string {
    const normalizedValue = value?.trim() ?? ''

    if (!normalizedValue) {
      throw new Error(`${fieldName} is required.`)
    }

    return normalizedValue
  }

  private normalizeBarcode(value: string | undefined): string | null {
    const normalizedValue = value?.trim() ?? ''

    return normalizedValue.length > 0 ? normalizedValue : null
  }

  private normalizeOptionalSku(value: string | undefined): string | null {
    const normalizedValue = value?.trim() ?? ''

    return normalizedValue.length > 0 ? normalizedValue.toUpperCase() : null
  }

  private normalizeBrandId(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null

    const normalizedValue = Number(value)
    this.assertValidId(normalizedValue, 'Brand')

    return normalizedValue
  }

  private normalizeCategoryId(value: number | null | undefined): number {
    if (value === null || value === undefined) return 0 // Will fail assertion later, but avoids crashes if something calls it wrong

    const normalizedValue = Number(value)
    this.assertValidId(normalizedValue, 'Category')

    return normalizedValue
  }

  private normalizeSupplierId(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null

    const normalizedValue = Number(value)
    this.assertValidId(normalizedValue, 'Supplier')

    return normalizedValue
  }

  private normalizeUnit(value: string | undefined): ProductUnit {
    if (PRODUCT_UNITS.includes(value as ProductUnit)) {
      return value as ProductUnit
    }

    throw new Error('Product unit is invalid.')
  }

  private normalizeMoney(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value)

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new Error(`${fieldName} must be zero or more.`)
    }

    return Math.round(normalizedValue * 100) / 100
  }

  private normalizeQuantity(value: number | undefined, fieldName: string): number {
    const normalizedValue = Number(value)

    if (!Number.isInteger(normalizedValue) || normalizedValue < 0) {
      throw new Error(`${fieldName} must be a whole number zero or more.`)
    }

    return normalizedValue
  }

  private normalizeDiscountPercent(value: number | undefined): number {
    const normalizedValue = Number(value)

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0 || normalizedValue > 100) {
      throw new Error('Discount must be between 0 and 100.')
    }

    return Math.round(normalizedValue * 100) / 100
  }

  private assertValidId(id: number, fieldName: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${fieldName} is invalid.`)
    }
  }
}
