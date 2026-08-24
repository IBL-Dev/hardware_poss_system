import type Database from 'better-sqlite3'
import type { SaleItemRecord, SalePaymentMethod, SaleRecord } from '../../shared/sales'

interface SaleRow {
  id: number
  sale_number: string
  daily_bill_number: number
  payment_method: SalePaymentMethod
  subtotal: number
  tax: number
  discount_amount: number
  total: number
  item_count: number
  paid_at: string
  customer_id: number | null
  customer_name: string | null
}

interface SaleItemRow {
  id: number
  sale_id: number
  product_id: number | null
  sku: string
  product_name: string
  unit_price: number
  quantity: number
  discount_amount: number
  line_total: number
}

interface SaveSaleInput {
  saleNumber: string
  paymentMethod: SalePaymentMethod
  subtotal: number
  tax: number
  discountAmount: number
  total: number
  itemCount: number
  customerId?: number | null
  items: Array<{
    productId: number
    sku: string
    productName: string
    unitPrice: number
    quantity: number
    discountAmount: number
    lineTotal: number
  }>
}

interface SaleQueryFilters {
  search?: string
  paymentMethod?: SalePaymentMethod | 'ALL'
  dateFrom?: string
  dateTo?: string
}

export class SaleRepository {
  constructor(private readonly database: Database.Database) {}

  list(filters: SaleQueryFilters = {}): SaleRecord[] {
    const { whereSql, params } = buildSaleWhereClause(filters)
    const rows = this.database
      .prepare(
        `
          SELECT
            s.id,
            s.sale_number,
            s.daily_bill_number,
            s.payment_method,
            s.subtotal,
            s.tax,
            s.discount_amount,
            s.total,
            s.item_count,
            s.paid_at,
            s.customer_id,
            c.name as customer_name
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          ${whereSql}
          ORDER BY datetime(s.paid_at) DESC, s.id DESC
        `
      )
      .all(params) as SaleRow[]

    return this.withItems(rows)
  }

  findById(id: number): SaleRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            s.id,
            s.sale_number,
            s.daily_bill_number,
            s.payment_method,
            s.subtotal,
            s.tax,
            s.discount_amount,
            s.total,
            s.item_count,
            s.paid_at,
            s.customer_id,
            c.name as customer_name
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.id = ?
        `
      )
      .get(id) as SaleRow | undefined

    return row ? this.withItems([row])[0] : null
  }

  create(input: SaveSaleInput): SaleRecord {
    const createSale = this.database.transaction((sale: SaveSaleInput) => {
      const result = this.database
        .prepare(
          `
            INSERT INTO sales (
              sale_number,
              daily_bill_number,
              payment_method,
              subtotal,
              tax,
              discount_amount,
              total,
              item_count,
              customer_id
            )
            VALUES (
              @saleNumber,
              @dailyBillNumber,
              @paymentMethod,
              @subtotal,
              @tax,
              @discountAmount,
              @total,
              @itemCount,
              @customerId
            )
          `
        )
        .run({
          ...sale,
          dailyBillNumber: getNextDailyBillNumber(this.database)
        })

      const saleId = Number(result.lastInsertRowid)
      const insertItem = this.database.prepare(`
        INSERT INTO sale_items (
          sale_id,
          product_id,
          sku,
          product_name,
          unit_price,
          quantity,
          discount_amount,
          line_total
        )
        VALUES (
          @saleId,
          @productId,
          @sku,
          @productName,
          @unitPrice,
          @quantity,
          @discountAmount,
          @lineTotal
        )
      `)
      const reduceStock = this.database.prepare(`
        UPDATE products
        SET
          stock_quantity = stock_quantity - @quantity,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @productId
      `)
      const findStock = this.database.prepare(`
        SELECT stock_quantity
        FROM products
        WHERE id = ?
      `)
      const insertStockMovement = this.database.prepare(`
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
          'SALE',
          @quantityChange,
          @previousQuantity,
          @newQuantity,
          'SALE',
          @saleId,
          @note
        )
      `)

      for (const item of sale.items) {
        const stock = findStock.get(item.productId) as { stock_quantity: number } | undefined
        const previousQuantity = stock?.stock_quantity ?? 0
        const newQuantity = previousQuantity - item.quantity

        insertItem.run({ saleId, ...item })
        reduceStock.run(item)
        insertStockMovement.run({
          productId: item.productId,
          quantityChange: -item.quantity,
          previousQuantity,
          newQuantity,
          saleId,
          note: `Sold in ${sale.saleNumber}`
        })
      }

      return saleId
    })

    return this.findSavedSale(createSale(input))
  }

  returnItem(saleId: number, itemId: number, quantity: number): SaleRecord | null {
    const returnItemTx = this.database.transaction(
      (params: { saleId: number; itemId: number; quantity: number }) => {
        const sale = this.database
          .prepare('SELECT sale_number, subtotal, tax, discount_amount FROM sales WHERE id = ?')
          .get(params.saleId) as
          | { sale_number: string; subtotal: number; tax: number; discount_amount: number }
          | undefined

        if (!sale) {
          throw new Error('Sale not found.')
        }

        const item = this.database
          .prepare(
            `
              SELECT id, product_id, quantity, unit_price, discount_amount, line_total
              FROM sale_items
              WHERE id = ? AND sale_id = ?
            `
          )
          .get(params.itemId, params.saleId) as
          | {
              id: number
              product_id: number | null
              quantity: number
              unit_price: number
              discount_amount: number
              line_total: number
            }
          | undefined

        if (!item) {
          throw new Error('Sale item not found.')
        }

        if (params.quantity <= 0 || params.quantity > item.quantity) {
          throw new Error(`Return quantity must be between 1 and ${item.quantity}.`)
        }

        const reduction = roundMoney((item.line_total / item.quantity) * params.quantity)
        const discountReduction = roundMoney(
          (item.discount_amount / item.quantity) * params.quantity
        )

        if (item.product_id !== null) {
          const stock = this.database
            .prepare('SELECT stock_quantity FROM products WHERE id = ?')
            .get(item.product_id) as { stock_quantity: number } | undefined
          const previousQuantity = stock?.stock_quantity ?? 0
          const newQuantity = previousQuantity + params.quantity

          this.database
            .prepare(
              `
                UPDATE products
                SET
                  stock_quantity = stock_quantity + @quantity,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = @productId
              `
            )
            .run({ productId: item.product_id, quantity: params.quantity })

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
                  'RETURN',
                  @quantityChange,
                  @previousQuantity,
                  @newQuantity,
                  'SALE_ITEM_RETURN',
                  @saleId,
                  @note
                )
              `
            )
            .run({
              productId: item.product_id,
              quantityChange: params.quantity,
              previousQuantity,
              newQuantity,
              saleId: params.saleId,
              note: `Returned ${params.quantity} item(s) from sale ${sale.sale_number}`
            })
        }

        if (params.quantity === item.quantity) {
          this.database.prepare('DELETE FROM sale_items WHERE id = ?').run(item.id)
        } else {
          this.database
            .prepare(
              `
                UPDATE sale_items
                SET
                  quantity = quantity - @quantity,
                  discount_amount = discount_amount - @discountReduction,
                  line_total = line_total - @reduction
                WHERE id = @itemId
              `
            )
            .run({ itemId: item.id, quantity: params.quantity, discountReduction, reduction })
        }

        const remaining = this.database
          .prepare('SELECT COUNT(*) as count FROM sale_items WHERE sale_id = ?')
          .get(params.saleId) as { count: number }

        if (remaining.count === 0) {
          this.database.prepare('DELETE FROM sales WHERE id = ?').run(params.saleId)
          return null
        }

        const taxRatio = sale.subtotal > 0 ? sale.tax / sale.subtotal : 0
        const newSubtotal = roundMoney(sale.subtotal - reduction)
        const newTax = roundMoney(newSubtotal * taxRatio)
        const newDiscountAmount = roundMoney(Math.min(sale.discount_amount, newSubtotal + newTax))
        const newTotal = roundMoney(newSubtotal + newTax - newDiscountAmount)

        this.database
          .prepare(
            `
              UPDATE sales
              SET
                subtotal = @subtotal,
                tax = @tax,
                discount_amount = @discountAmount,
                total = @total,
                item_count = item_count - @quantity
              WHERE id = @saleId
            `
          )
          .run({
            saleId: params.saleId,
            subtotal: newSubtotal,
            tax: newTax,
            discountAmount: newDiscountAmount,
            total: newTotal,
            quantity: params.quantity
          })

        return params.saleId
      }
    )

    const resultId = returnItemTx({ saleId, itemId, quantity })

    return resultId ? this.findSavedSale(resultId) : null
  }

  delete(id: number): void {
    const deleteSale = this.database.transaction((saleId: number) => {
      const sale = this.database
        .prepare('SELECT sale_number FROM sales WHERE id = ?')
        .get(saleId) as { sale_number: string } | undefined

      if (!sale) {
        throw new Error('Sale not found.')
      }

      const items = this.database
        .prepare(
          `
            SELECT product_id, quantity
            FROM sale_items
            WHERE sale_id = ? AND product_id IS NOT NULL
          `
        )
        .all(saleId) as Array<{ product_id: number; quantity: number }>

      const findStock = this.database.prepare(`
        SELECT stock_quantity
        FROM products
        WHERE id = ?
      `)
      const restoreStock = this.database.prepare(`
        UPDATE products
        SET
          stock_quantity = stock_quantity + @quantity,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @productId
      `)
      const insertStockMovement = this.database.prepare(`
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
          'RETURN',
          @quantityChange,
          @previousQuantity,
          @newQuantity,
          'SALE_DELETED',
          @saleId,
          @note
        )
      `)

      for (const item of items) {
        const stock = findStock.get(item.product_id) as { stock_quantity: number } | undefined
        const previousQuantity = stock?.stock_quantity ?? 0
        const newQuantity = previousQuantity + item.quantity

        restoreStock.run({ productId: item.product_id, quantity: item.quantity })
        insertStockMovement.run({
          productId: item.product_id,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity,
          saleId,
          note: `Restocked from deleted sale ${sale.sale_number}`
        })
      }

      this.database.prepare('DELETE FROM sales WHERE id = ?').run(saleId)
    })

    deleteSale(id)
  }

  private withItems(rows: SaleRow[]): SaleRecord[] {
    if (rows.length === 0) {
      return []
    }

    const itemsBySaleId = new Map<number, SaleItemRecord[]>()
    const placeholders = rows.map(() => '?').join(', ')
    const itemRows = this.database
      .prepare(
        `
          SELECT
            id,
            sale_id,
            product_id,
            sku,
            product_name,
            unit_price,
            quantity,
            discount_amount,
            line_total
          FROM sale_items
          WHERE sale_id IN (${placeholders})
          ORDER BY id ASC
        `
      )
      .all(rows.map((row) => row.id)) as SaleItemRow[]

    for (const itemRow of itemRows) {
      const items = itemsBySaleId.get(itemRow.sale_id) ?? []
      items.push(mapSaleItemRow(itemRow))
      itemsBySaleId.set(itemRow.sale_id, items)
    }

    return rows.map((row) => mapSaleRow(row, itemsBySaleId.get(row.id) ?? []))
  }

  private findSavedSale(id: number): SaleRecord {
    const sale = this.findById(id)

    if (!sale) {
      throw new Error('Sale could not be found after saving.')
    }

    return sale
  }
}

function buildSaleWhereClause(filters: SaleQueryFilters): { whereSql: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
    clauses.push('s.payment_method = ?')
    params.push(filters.paymentMethod)
  }

  if (filters.dateFrom) {
    clauses.push("date(s.paid_at, 'localtime') >= date(?)")
    params.push(filters.dateFrom)
  }

  if (filters.dateTo) {
    clauses.push("date(s.paid_at, 'localtime') <= date(?)")
    params.push(filters.dateTo)
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`
    clauses.push(`
      (
        s.sale_number LIKE ?
        OR CAST(s.daily_bill_number AS TEXT) LIKE ?
        OR EXISTS (
          SELECT 1
          FROM sale_items si
          WHERE si.sale_id = s.id
            AND (
              si.product_name LIKE ?
              OR si.sku LIKE ?
            )
        )
      )
    `)
    params.push(search, search, search, search)
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  }
}

function mapSaleRow(row: SaleRow, items: SaleItemRecord[]): SaleRecord {
  return {
    id: row.id,
    saleNumber: row.sale_number,
    dailyBillNumber: row.daily_bill_number,
    paymentMethod: row.payment_method,
    subtotal: row.subtotal,
    tax: row.tax,
    discountAmount: row.discount_amount,
    total: row.total,
    itemCount: row.item_count,
    paidAt: row.paid_at,
    items,
    customerId: row.customer_id,
    customerName: row.customer_name
  }
}

function mapSaleItemRow(row: SaleItemRow): SaleItemRecord {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    sku: row.sku,
    productName: row.product_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    discountAmount: row.discount_amount,
    lineTotal: row.line_total
  }
}

function getNextDailyBillNumber(database: Database.Database): number {
  const row = database
    .prepare(
      `
        SELECT COALESCE(MAX(daily_bill_number), 0) + 1 AS next_bill_number
        FROM sales
        WHERE date(paid_at, 'localtime') = date('now', 'localtime')
          AND daily_bill_number > 0
      `
    )
    .get() as { next_bill_number: number } | undefined

  return row?.next_bill_number ?? 1
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
