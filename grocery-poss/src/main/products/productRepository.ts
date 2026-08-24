import type Database from 'better-sqlite3'
import type { ProductRecord, ProductUnit } from '../../shared/products'

interface ProductRow {
  id: number
  sku: string
  barcode: string | null
  name: string
  brand_id: number | null
  brand_name: string | null
  category_id: number
  category_name: string | null
  supplier_id: number | null
  supplier_name: string | null
  unit: ProductUnit
  buying_price: number
  selling_price: number
  stock_quantity: number
  reorder_level: number
  discount_percent: number
  created_at: string
  updated_at: string
}

interface SaveProductPersistence {
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

export class ProductRepository {
  constructor(private readonly database: Database.Database) {}

  list(): ProductRecord[] {
    const rows = this.database
      .prepare(productSelectSql('ORDER BY p.created_at DESC, p.id DESC'))
      .all() as ProductRow[]

    return rows.map(mapProductRow)
  }

  findById(id: number): ProductRecord | null {
    const row = this.database.prepare(productSelectSql('WHERE p.id = ?')).get(id) as
      ProductRow | undefined

    return row ? mapProductRow(row) : null
  }

  findBySku(sku: string): ProductRecord | null {
    const row = this.database
      .prepare(productSelectSql('WHERE lower(p.sku) = lower(?)'))
      .get(sku) as ProductRow | undefined

    return row ? mapProductRow(row) : null
  }

  findByBarcode(barcode: string): ProductRecord | null {
    const row = this.database.prepare(productSelectSql('WHERE p.barcode = ?')).get(barcode) as
      ProductRow | undefined

    return row ? mapProductRow(row) : null
  }

  create(input: SaveProductPersistence): ProductRecord {
    const createProduct = this.database.transaction((product: SaveProductPersistence) => {
      const result = this.database
        .prepare(
          `
            INSERT INTO products (
              sku,
              barcode,
              name,
              brand_id,
              category_id,
              supplier_id,
              unit,
              buying_price,
              selling_price,
              stock_quantity,
              reorder_level,
              discount_percent
            )
            VALUES (
              @sku,
              @barcode,
              @name,
              @brandId,
              @categoryId,
              @supplierId,
              @unit,
              @buyingPrice,
              @sellingPrice,
              @stockQuantity,
              @reorderLevel,
              @discountPercent
            )
          `
        )
        .run(product)
      const productId = Number(result.lastInsertRowid)

      if (product.stockQuantity !== 0) {
        this.insertStockMovement({
          productId,
          movementType: 'OPENING_STOCK',
          quantityChange: product.stockQuantity,
          previousQuantity: 0,
          newQuantity: product.stockQuantity,
          referenceType: 'PRODUCT',
          referenceId: productId,
          note: 'Opening stock from product creation'
        })
      }

      return productId
    })

    return this.findSavedProduct(createProduct(input))
  }

  update(id: number, input: SaveProductPersistence): ProductRecord {
    const updateProduct = this.database.transaction(
      (productId: number, product: SaveProductPersistence) => {
        const current = this.database
          .prepare('SELECT stock_quantity FROM products WHERE id = ?')
          .get(productId) as { stock_quantity: number } | undefined

        if (!current) {
          throw new Error('Product not found.')
        }

        this.database
          .prepare(
            `
              UPDATE products
              SET
                sku = @sku,
                barcode = @barcode,
                name = @name,
                brand_id = @brandId,
                category_id = @categoryId,
                supplier_id = @supplierId,
                unit = @unit,
                buying_price = @buyingPrice,
                selling_price = @sellingPrice,
                stock_quantity = @stockQuantity,
                reorder_level = @reorderLevel,
                discount_percent = @discountPercent,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = @id
            `
          )
          .run({ id: productId, ...product })

        if (current.stock_quantity !== product.stockQuantity) {
          this.insertStockMovement({
            productId,
            movementType: 'ADJUSTMENT',
            quantityChange: product.stockQuantity - current.stock_quantity,
            previousQuantity: current.stock_quantity,
            newQuantity: product.stockQuantity,
            referenceType: 'PRODUCT',
            referenceId: productId,
            note: 'Stock adjusted from product update'
          })
        }
      }
    )

    updateProduct(id, input)

    return this.findSavedProduct(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM products WHERE id = ?').run(id)
  }

  private findSavedProduct(id: number): ProductRecord {
    const product = this.findById(id)

    if (!product) {
      throw new Error('Product could not be found after saving.')
    }

    return product
  }

  private insertStockMovement(input: {
    productId: number
    movementType: 'OPENING_STOCK' | 'ADJUSTMENT'
    quantityChange: number
    previousQuantity: number
    newQuantity: number
    referenceType: string
    referenceId: number
    note: string
  }): void {
    this.database
      .prepare(
        `
          INSERT INTO stock_movements (
            product_id,
            movement_type,
            quantity_change,
            previous_quantity,
            new_quantity,
            reference_type,
            reference_id,
            note
          )
          VALUES (
            @productId,
            @movementType,
            @quantityChange,
            @previousQuantity,
            @newQuantity,
            @referenceType,
            @referenceId,
            @note
          )
        `
      )
      .run(input)
  }
}

function productSelectSql(whereOrOrderBy = ''): string {
  return `
    SELECT
      p.id,
      COALESCE(p.sku, p.barcode, printf('P%05d', p.id)) AS sku,
      p.barcode,
      p.name,
      p.brand_id,
      b.name AS brand_name,
      p.category_id,
      c.name AS category_name,
      p.supplier_id,
      s.name AS supplier_name,
      p.unit,
      p.buying_price,
      p.selling_price,
      p.stock_quantity,
      p.reorder_level,
      p.discount_percent,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    ${whereOrOrderBy}
  `
}

function mapProductRow(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    unit: row.unit,
    buyingPrice: row.buying_price,
    sellingPrice: row.selling_price,
    stockQuantity: row.stock_quantity,
    reorderLevel: row.reorder_level,
    discountPercent: row.discount_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
