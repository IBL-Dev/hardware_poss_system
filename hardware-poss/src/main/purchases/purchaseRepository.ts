import type Database from 'better-sqlite3'
import type {
  PurchaseFilters,
  PurchaseItemRecord,
  PurchasePaymentMethod,
  PurchasePaymentRecord,
  PurchasePayTermUnit,
  PurchaseRecord,
  PurchaseReturnFilters,
  PurchaseReturnItemRecord,
  PurchaseReturnRecord,
  PurchaseStatus,
  PurchaseSupplierType
} from '../../shared/purchases'

interface PurchaseRow {
  id: number
  purchase_number: string
  supplier_id: number | null
  supplier_name: string
  supplier_type: PurchaseSupplierType
  contact_id: string
  mobile_no: string
  email: string
  address: string
  status: PurchaseStatus
  business_location: string
  pay_term_value: number
  pay_term_unit: PurchasePayTermUnit
  attachment_path: string
  invoice_pdf_path: string
  advance_balance: number
  payment_method: PurchasePaymentMethod
  paid_on: string
  subtotal: number
  discount_amount: number
  total: number
  item_count: number
  created_at: string
  updated_at: string
}

interface PurchaseItemRow {
  id: number
  purchase_id: number
  product_id: number | null
  sku: string
  product_name: string
  unit_price: number
  quantity: number
  line_total: number
}

interface PurchasePaymentRow {
  id: number
  purchase_id: number
  amount: number
  payment_method: PurchasePaymentMethod
  paid_on: string
  note: string
  created_at: string
}

interface PurchaseReturnRow {
  id: number
  return_number: string
  purchase_id: number | null
  purchase_number: string
  supplier_id: number | null
  supplier_name: string
  business_location: string
  return_date: string
  reason: string
  subtotal: number
  total: number
  item_count: number
  created_at: string
  updated_at: string
}

interface PurchaseReturnItemRow {
  id: number
  return_id: number
  product_id: number | null
  sku: string
  product_name: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface SavePurchaseItemInput {
  productId: number
  sku: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface SavePurchasePaymentInput {
  amount: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  note: string
}

export interface SavePurchaseInput {
  purchaseNumber: string
  supplierId: number | null
  supplierName: string
  supplierType: PurchaseSupplierType
  contactId: string
  mobileNo: string
  email: string
  address: string
  status: PurchaseStatus
  businessLocation: string
  payTermValue: number
  payTermUnit: PurchasePayTermUnit
  attachmentPath: string
  invoicePdfPath: string
  advanceBalance: number
  paymentMethod: PurchasePaymentMethod
  paidOn: string
  subtotal: number
  discountAmount: number
  total: number
  itemCount: number
  items: SavePurchaseItemInput[]
  payments: SavePurchasePaymentInput[]
}

export interface SavePurchaseReturnInput {
  returnNumber: string
  purchaseId: number | null
  purchaseNumber: string
  supplierId: number | null
  supplierName: string
  businessLocation: string
  returnDate: string
  reason: string
  subtotal: number
  total: number
  itemCount: number
  items: Array<{
    productId: number
    sku: string
    productName: string
    unitPrice: number
    quantity: number
    lineTotal: number
  }>
}

export class PurchaseRepository {
  constructor(private readonly database: Database.Database) {}

  list(filters: PurchaseFilters = {}): PurchaseRecord[] {
    const { whereSql, params } = buildPurchaseWhereClause(filters)
    const rows = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.purchase_number,
            p.supplier_id,
            COALESCE(s.name, p.supplier_name) AS supplier_name,
            p.supplier_type,
            p.contact_id,
            p.mobile_no,
            p.email,
            p.address,
            p.status,
            p.business_location,
            p.pay_term_value,
            p.pay_term_unit,
            p.attachment_path,
            p.invoice_pdf_path,
            p.advance_balance,
            p.payment_method,
            p.paid_on,
            p.subtotal,
            p.discount_amount,
            p.total,
            p.item_count,
            p.created_at,
            p.updated_at
          FROM purchases p
          LEFT JOIN suppliers s ON s.id = p.supplier_id
          ${whereSql}
          ORDER BY datetime(p.created_at) DESC, p.id DESC
        `
      )
      .all(params) as PurchaseRow[]

    return this.withRelations(rows)
  }

  findById(id: number): PurchaseRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.purchase_number,
            p.supplier_id,
            COALESCE(s.name, p.supplier_name) AS supplier_name,
            p.supplier_type,
            p.contact_id,
            p.mobile_no,
            p.email,
            p.address,
            p.status,
            p.business_location,
            p.pay_term_value,
            p.pay_term_unit,
            p.attachment_path,
            p.invoice_pdf_path,
            p.advance_balance,
            p.payment_method,
            p.paid_on,
            p.subtotal,
            p.discount_amount,
            p.total,
            p.item_count,
            p.created_at,
            p.updated_at
          FROM purchases p
          LEFT JOIN suppliers s ON s.id = p.supplier_id
          WHERE p.id = ?
        `
      )
      .get(id) as PurchaseRow | undefined

    return row ? this.withRelations([row])[0] : null
  }

  findByNumber(purchaseNumber: string): PurchaseRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.purchase_number,
            p.supplier_id,
            COALESCE(s.name, p.supplier_name) AS supplier_name,
            p.supplier_type,
            p.contact_id,
            p.mobile_no,
            p.email,
            p.address,
            p.status,
            p.business_location,
            p.pay_term_value,
            p.pay_term_unit,
            p.attachment_path,
            p.invoice_pdf_path,
            p.advance_balance,
            p.payment_method,
            p.paid_on,
            p.subtotal,
            p.discount_amount,
            p.total,
            p.item_count,
            p.created_at,
            p.updated_at
          FROM purchases p
          LEFT JOIN suppliers s ON s.id = p.supplier_id
          WHERE lower(p.purchase_number) = lower(?)
        `
      )
      .get(purchaseNumber) as PurchaseRow | undefined

    return row ? this.withRelations([row])[0] : null
  }

  create(input: SavePurchaseInput): PurchaseRecord {
    const createPurchase = this.database.transaction((purchase: SavePurchaseInput) => {
      const result = this.database
        .prepare(
          `
            INSERT INTO purchases (
              purchase_number,
              supplier_id,
              supplier_name,
              supplier_type,
              contact_id,
              mobile_no,
              email,
              address,
              status,
              business_location,
              pay_term_value,
              pay_term_unit,
              attachment_path,
              invoice_pdf_path,
              advance_balance,
              payment_method,
              paid_on,
              subtotal,
              discount_amount,
              total,
              item_count
            )
            VALUES (
              @purchaseNumber,
              @supplierId,
              @supplierName,
              @supplierType,
              @contactId,
              @mobileNo,
              @email,
              @address,
              @status,
              @businessLocation,
              @payTermValue,
              @payTermUnit,
              @attachmentPath,
              @invoicePdfPath,
              @advanceBalance,
              @paymentMethod,
              @paidOn,
              @subtotal,
              @discountAmount,
              @total,
              @itemCount
            )
          `
        )
        .run(purchase)

      const purchaseId = Number(result.lastInsertRowid)
      const insertItem = this.database.prepare(`
        INSERT INTO purchase_items (
          purchase_id,
          product_id,
          sku,
          product_name,
          unit_price,
          quantity,
          line_total
        )
        VALUES (
          @purchaseId,
          @productId,
          @sku,
          @productName,
          @unitPrice,
          @quantity,
          @lineTotal
        )
      `)
      const insertPayment = this.database.prepare(`
        INSERT INTO purchase_payments (
          purchase_id,
          amount,
          payment_method,
          paid_on,
          note
        )
        VALUES (
          @purchaseId,
          @amount,
          @paymentMethod,
          @paidOn,
          @note
        )
      `)

      for (const item of purchase.items) {
        insertItem.run({ purchaseId, ...item })
      }

      for (const payment of purchase.payments) {
        insertPayment.run({ purchaseId, ...payment })
      }

      if (purchase.status === 'RECEIVED') {
        const findStock = this.database.prepare('SELECT stock_quantity FROM products WHERE id = ?')
        const increaseStock = this.database.prepare(`
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
            'PURCHASE',
            @quantityChange,
            @previousQuantity,
            @newQuantity,
            'PURCHASE',
            @purchaseId,
            @note
          )
        `)

        for (const item of purchase.items) {
          const stock = findStock.get(item.productId) as { stock_quantity: number } | undefined
          const previousQuantity = stock?.stock_quantity ?? 0
          const newQuantity = previousQuantity + item.quantity

          increaseStock.run(item)
          insertStockMovement.run({
            productId: item.productId,
            quantityChange: item.quantity,
            previousQuantity,
            newQuantity,
            purchaseId,
            note: `Stocked in ${purchase.purchaseNumber}`
          })
        }
      }

      return purchaseId
    })

    return this.findSavedPurchase(createPurchase(input))
  }

  delete(id: number): void {
    const deletePurchase = this.database.transaction((purchaseId: number) => {
      const purchase = this.database
        .prepare('SELECT purchase_number, status FROM purchases WHERE id = ?')
        .get(purchaseId) as { purchase_number: string; status: PurchaseStatus } | undefined

      if (!purchase) {
        throw new Error('Purchase not found.')
      }

      if (purchase.status === 'RECEIVED') {
        const items = this.database
          .prepare(
            `
              SELECT product_id, quantity
              FROM purchase_items
              WHERE purchase_id = ? AND product_id IS NOT NULL
            `
          )
          .all(purchaseId) as Array<{ product_id: number; quantity: number }>

        const findStock = this.database.prepare('SELECT stock_quantity FROM products WHERE id = ?')
        const reduceStock = this.database.prepare(`
          UPDATE products
          SET
            stock_quantity = stock_quantity - @quantity,
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
            'ADJUSTMENT',
            @quantityChange,
            @previousQuantity,
            @newQuantity,
            'PURCHASE_DELETED',
            @purchaseId,
            @note
          )
        `)

        for (const item of items) {
          const stock = findStock.get(item.product_id) as { stock_quantity: number } | undefined
          const previousQuantity = stock?.stock_quantity ?? 0
          const newQuantity = Math.max(0, previousQuantity - item.quantity)

          reduceStock.run(item)
          insertStockMovement.run({
            productId: item.product_id,
            quantityChange: -item.quantity,
            previousQuantity,
            newQuantity,
            purchaseId,
            note: `Stock removed from deleted purchase ${purchase.purchase_number}`
          })
        }
      }

      this.database.prepare('DELETE FROM purchases WHERE id = ?').run(purchaseId)
    })

    deletePurchase(id)
  }

  listReturns(filters: PurchaseReturnFilters = {}): PurchaseReturnRecord[] {
    const { whereSql, params } = buildPurchaseReturnWhereClause(filters)
    const rows = this.database
      .prepare(
        `
          SELECT
            pr.id,
            pr.return_number,
            pr.purchase_id,
            pr.purchase_number,
            pr.supplier_id,
            COALESCE(s.name, pr.supplier_name) AS supplier_name,
            pr.business_location,
            pr.return_date,
            pr.reason,
            pr.subtotal,
            pr.total,
            pr.item_count,
            pr.created_at,
            pr.updated_at
          FROM purchase_returns pr
          LEFT JOIN suppliers s ON s.id = pr.supplier_id
          ${whereSql}
          ORDER BY datetime(pr.return_date) DESC, pr.id DESC
        `
      )
      .all(params) as PurchaseReturnRow[]

    return this.withReturnItems(rows)
  }

  findReturnById(id: number): PurchaseReturnRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            pr.id,
            pr.return_number,
            pr.purchase_id,
            pr.purchase_number,
            pr.supplier_id,
            COALESCE(s.name, pr.supplier_name) AS supplier_name,
            pr.business_location,
            pr.return_date,
            pr.reason,
            pr.subtotal,
            pr.total,
            pr.item_count,
            pr.created_at,
            pr.updated_at
          FROM purchase_returns pr
          LEFT JOIN suppliers s ON s.id = pr.supplier_id
          WHERE pr.id = ?
        `
      )
      .get(id) as PurchaseReturnRow | undefined

    return row ? this.withReturnItems([row])[0] : null
  }

  findReturnByNumber(returnNumber: string): PurchaseReturnRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            pr.id,
            pr.return_number,
            pr.purchase_id,
            pr.purchase_number,
            pr.supplier_id,
            COALESCE(s.name, pr.supplier_name) AS supplier_name,
            pr.business_location,
            pr.return_date,
            pr.reason,
            pr.subtotal,
            pr.total,
            pr.item_count,
            pr.created_at,
            pr.updated_at
          FROM purchase_returns pr
          LEFT JOIN suppliers s ON s.id = pr.supplier_id
          WHERE lower(pr.return_number) = lower(?)
        `
      )
      .get(returnNumber) as PurchaseReturnRow | undefined

    return row ? this.withReturnItems([row])[0] : null
  }

  createReturn(input: SavePurchaseReturnInput): PurchaseReturnRecord {
    const createReturn = this.database.transaction((purchaseReturn: SavePurchaseReturnInput) => {
      const result = this.database
        .prepare(
          `
            INSERT INTO purchase_returns (
              return_number,
              purchase_id,
              purchase_number,
              supplier_id,
              supplier_name,
              business_location,
              return_date,
              reason,
              subtotal,
              total,
              item_count
            )
            VALUES (
              @returnNumber,
              @purchaseId,
              @purchaseNumber,
              @supplierId,
              @supplierName,
              @businessLocation,
              @returnDate,
              @reason,
              @subtotal,
              @total,
              @itemCount
            )
          `
        )
        .run(purchaseReturn)

      const returnId = Number(result.lastInsertRowid)
      const insertItem = this.database.prepare(`
        INSERT INTO purchase_return_items (
          return_id,
          product_id,
          sku,
          product_name,
          unit_price,
          quantity,
          line_total
        )
        VALUES (
          @returnId,
          @productId,
          @sku,
          @productName,
          @unitPrice,
          @quantity,
          @lineTotal
        )
      `)
      const findStock = this.database.prepare('SELECT stock_quantity FROM products WHERE id = ?')
      const reduceStock = this.database.prepare(`
        UPDATE products
        SET
          stock_quantity = stock_quantity - @quantity,
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
          'PURCHASE_RETURN',
          @quantityChange,
          @previousQuantity,
          @newQuantity,
          'PURCHASE_RETURN',
          @returnId,
          @note
        )
      `)

      for (const item of purchaseReturn.items) {
        const stock = findStock.get(item.productId) as { stock_quantity: number } | undefined
        const previousQuantity = stock?.stock_quantity ?? 0

        if (previousQuantity < item.quantity) {
          throw new Error(
            `Only ${previousQuantity} item(s) available to return for "${item.productName}".`
          )
        }

        insertItem.run({ returnId, ...item })
        reduceStock.run(item)
        insertStockMovement.run({
          productId: item.productId,
          quantityChange: -item.quantity,
          previousQuantity,
          newQuantity: previousQuantity - item.quantity,
          returnId,
          note: `Returned in ${purchaseReturn.returnNumber}`
        })
      }

      return returnId
    })

    return this.findSavedReturn(createReturn(input))
  }

  deleteReturn(id: number): void {
    const deleteReturn = this.database.transaction((returnId: number) => {
      const purchaseReturn = this.database
        .prepare('SELECT return_number FROM purchase_returns WHERE id = ?')
        .get(returnId) as { return_number: string } | undefined

      if (!purchaseReturn) {
        throw new Error('Purchase return not found.')
      }

      const items = this.database
        .prepare(
          `
            SELECT product_id, quantity
            FROM purchase_return_items
            WHERE return_id = ? AND product_id IS NOT NULL
          `
        )
        .all(returnId) as Array<{ product_id: number; quantity: number }>

      const findStock = this.database.prepare('SELECT stock_quantity FROM products WHERE id = ?')
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
          'PURCHASE_RETURN_DELETED',
          @returnId,
          @note
        )
      `)

      for (const item of items) {
        const stock = findStock.get(item.product_id) as { stock_quantity: number } | undefined
        const previousQuantity = stock?.stock_quantity ?? 0
        const newQuantity = previousQuantity + item.quantity

        restoreStock.run(item)
        insertStockMovement.run({
          productId: item.product_id,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity,
          returnId,
          note: `Stock restored from deleted return ${purchaseReturn.return_number}`
        })
      }

      this.database.prepare('DELETE FROM purchase_returns WHERE id = ?').run(returnId)
    })

    deleteReturn(id)
  }

  private withRelations(rows: PurchaseRow[]): PurchaseRecord[] {
    if (rows.length === 0) {
      return []
    }

    const itemsByPurchaseId = new Map<number, PurchaseItemRecord[]>()
    const paymentsByPurchaseId = new Map<number, PurchasePaymentRecord[]>()
    const placeholders = rows.map(() => '?').join(', ')

    const itemRows = this.database
      .prepare(
        `
          SELECT id, purchase_id, product_id, sku, product_name, unit_price, quantity, line_total
          FROM purchase_items
          WHERE purchase_id IN (${placeholders})
          ORDER BY id ASC
        `
      )
      .all(rows.map((row) => row.id)) as PurchaseItemRow[]

    for (const itemRow of itemRows) {
      const items = itemsByPurchaseId.get(itemRow.purchase_id) ?? []
      items.push(mapPurchaseItemRow(itemRow))
      itemsByPurchaseId.set(itemRow.purchase_id, items)
    }

    const paymentRows = this.database
      .prepare(
        `
          SELECT id, purchase_id, amount, payment_method, paid_on, note, created_at
          FROM purchase_payments
          WHERE purchase_id IN (${placeholders})
          ORDER BY id ASC
        `
      )
      .all(rows.map((row) => row.id)) as PurchasePaymentRow[]

    for (const paymentRow of paymentRows) {
      const payments = paymentsByPurchaseId.get(paymentRow.purchase_id) ?? []
      payments.push(mapPurchasePaymentRow(paymentRow))
      paymentsByPurchaseId.set(paymentRow.purchase_id, payments)
    }

    return rows.map((row) =>
      mapPurchaseRow(
        row,
        itemsByPurchaseId.get(row.id) ?? [],
        paymentsByPurchaseId.get(row.id) ?? []
      )
    )
  }

  private withReturnItems(rows: PurchaseReturnRow[]): PurchaseReturnRecord[] {
    if (rows.length === 0) {
      return []
    }

    const itemsByReturnId = new Map<number, PurchaseReturnItemRecord[]>()
    const placeholders = rows.map(() => '?').join(', ')

    const itemRows = this.database
      .prepare(
        `
          SELECT id, return_id, product_id, sku, product_name, unit_price, quantity, line_total
          FROM purchase_return_items
          WHERE return_id IN (${placeholders})
          ORDER BY id ASC
        `
      )
      .all(rows.map((row) => row.id)) as PurchaseReturnItemRow[]

    for (const itemRow of itemRows) {
      const items = itemsByReturnId.get(itemRow.return_id) ?? []
      items.push(mapPurchaseReturnItemRow(itemRow))
      itemsByReturnId.set(itemRow.return_id, items)
    }

    return rows.map((row) => mapPurchaseReturnRow(row, itemsByReturnId.get(row.id) ?? []))
  }

  private findSavedPurchase(id: number): PurchaseRecord {
    const purchase = this.findById(id)

    if (!purchase) {
      throw new Error('Purchase could not be found after saving.')
    }

    return purchase
  }

  private findSavedReturn(id: number): PurchaseReturnRecord {
    const purchaseReturn = this.findReturnById(id)

    if (!purchaseReturn) {
      throw new Error('Purchase return could not be found after saving.')
    }

    return purchaseReturn
  }
}

function buildPurchaseWhereClause(filters: PurchaseFilters): {
  whereSql: string
  params: unknown[]
} {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.status && filters.status !== 'ALL') {
    clauses.push('p.status = ?')
    params.push(filters.status)
  }

  if (filters.dateFrom) {
    clauses.push("date(p.created_at, 'localtime') >= date(?)")
    params.push(filters.dateFrom)
  }

  if (filters.dateTo) {
    clauses.push("date(p.created_at, 'localtime') <= date(?)")
    params.push(filters.dateTo)
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`
    clauses.push(`
      (
        p.purchase_number LIKE ?
        OR p.status LIKE ?
        OR p.business_location LIKE ?
        OR COALESCE(s.name, p.supplier_name) LIKE ?
        OR EXISTS (
          SELECT 1
          FROM purchase_items pi
          WHERE pi.purchase_id = p.id
            AND (
              pi.product_name LIKE ?
              OR pi.sku LIKE ?
            )
        )
      )
    `)
    params.push(search, search, search, search, search, search)
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  }
}

function buildPurchaseReturnWhereClause(filters: PurchaseReturnFilters): {
  whereSql: string
  params: unknown[]
} {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.dateFrom) {
    clauses.push('date(pr.return_date) >= date(?)')
    params.push(filters.dateFrom)
  }

  if (filters.dateTo) {
    clauses.push('date(pr.return_date) <= date(?)')
    params.push(filters.dateTo)
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`
    clauses.push(`
      (
        pr.return_number LIKE ?
        OR pr.business_location LIKE ?
        OR COALESCE(s.name, pr.supplier_name) LIKE ?
        OR pr.purchase_number LIKE ?
        OR EXISTS (
          SELECT 1
          FROM purchase_return_items pri
          WHERE pri.return_id = pr.id
            AND (
              pri.product_name LIKE ?
              OR pri.sku LIKE ?
            )
        )
      )
    `)
    params.push(search, search, search, search, search, search)
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  }
}

function mapPurchaseRow(
  row: PurchaseRow,
  items: PurchaseItemRecord[],
  payments: PurchasePaymentRecord[]
): PurchaseRecord {
  return {
    id: row.id,
    purchaseNumber: row.purchase_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierType: row.supplier_type,
    contactId: row.contact_id,
    mobileNo: row.mobile_no,
    email: row.email,
    address: row.address,
    status: row.status,
    businessLocation: row.business_location,
    payTermValue: row.pay_term_value,
    payTermUnit: row.pay_term_unit,
    attachmentPath: row.attachment_path,
    invoicePdfPath: row.invoice_pdf_path,
    advanceBalance: row.advance_balance,
    paymentMethod: row.payment_method,
    paidOn: row.paid_on,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    total: row.total,
    itemCount: row.item_count,
    items,
    payments,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPurchaseItemRow(row: PurchaseItemRow): PurchaseItemRecord {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    sku: row.sku,
    productName: row.product_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    lineTotal: row.line_total
  }
}

function mapPurchasePaymentRow(row: PurchasePaymentRow): PurchasePaymentRecord {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    paidOn: row.paid_on,
    note: row.note,
    createdAt: row.created_at
  }
}

function mapPurchaseReturnRow(
  row: PurchaseReturnRow,
  items: PurchaseReturnItemRecord[]
): PurchaseReturnRecord {
  return {
    id: row.id,
    returnNumber: row.return_number,
    purchaseId: row.purchase_id,
    purchaseNumber: row.purchase_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    businessLocation: row.business_location,
    returnDate: row.return_date,
    reason: row.reason,
    subtotal: row.subtotal,
    total: row.total,
    itemCount: row.item_count,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPurchaseReturnItemRow(row: PurchaseReturnItemRow): PurchaseReturnItemRecord {
  return {
    id: row.id,
    returnId: row.return_id,
    productId: row.product_id,
    sku: row.sku,
    productName: row.product_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    lineTotal: row.line_total
  }
}
