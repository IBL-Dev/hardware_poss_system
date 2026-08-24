import type Database from 'better-sqlite3'
import type {
  SupplierRecord,
  SupplierVoucherRecord,
  SupplierVoucherStatus
} from '../../shared/suppliers'

interface SupplierRow {
  id: number
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  product_count: number
  created_at: string
  updated_at: string
}

interface SaveSupplierPersistence {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
}

interface SupplierVoucherRow {
  id: number
  voucher_number: string
  supplier_id: number | null
  supplier_name: string
  voucher_date: string
  amount: number
  status: SupplierVoucherStatus
  note: string
  created_at: string
  updated_at: string
}

interface SaveSupplierVoucherPersistence {
  voucher_number: string
  supplier_id: number | null
  supplier_name: string
  voucher_date: string
  amount: number
  status: SupplierVoucherStatus
  note: string
}

export class SupplierRepository {
  constructor(private readonly database: Database.Database) {}

  list(): SupplierRecord[] {
    const rows = this.database
      .prepare(supplierSelectSql('', 'ORDER BY s.name ASC'))
      .all() as SupplierRow[]

    return rows.map(mapSupplierRow)
  }

  findById(id: number): SupplierRecord | null {
    const row = this.database.prepare(supplierSelectSql('WHERE s.id = ?')).get(id) as
      SupplierRow | undefined

    return row ? mapSupplierRow(row) : null
  }

  findByName(name: string): SupplierRecord | null {
    const row = this.database
      .prepare(supplierSelectSql('WHERE lower(s.name) = lower(?)'))
      .get(name) as SupplierRow | undefined

    return row ? mapSupplierRow(row) : null
  }

  create(input: SaveSupplierPersistence): SupplierRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO suppliers (name, contact_name, phone, email, address)
          VALUES (@name, @contact_name, @phone, @email, @address)
        `
      )
      .run(input)

    return this.findSavedSupplier(Number(result.lastInsertRowid))
  }

  update(id: number, input: SaveSupplierPersistence): SupplierRecord {
    this.database
      .prepare(
        `
          UPDATE suppliers
          SET
            name = @name,
            contact_name = @contact_name,
            phone = @phone,
            email = @email,
            address = @address,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      )
      .run({ id, ...input })

    return this.findSavedSupplier(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
  }

  listVouchers(): SupplierVoucherRecord[] {
    const rows = this.database
      .prepare(supplierVoucherSelectSql('', 'ORDER BY sv.voucher_date DESC, sv.id DESC'))
      .all() as SupplierVoucherRow[]

    return rows.map(mapSupplierVoucherRow)
  }

  findVoucherById(id: number): SupplierVoucherRecord | null {
    const row = this.database.prepare(supplierVoucherSelectSql('WHERE sv.id = ?')).get(id) as
      SupplierVoucherRow | undefined

    return row ? mapSupplierVoucherRow(row) : null
  }

  findVoucherByNumber(voucherNumber: string): SupplierVoucherRecord | null {
    const row = this.database
      .prepare(supplierVoucherSelectSql('WHERE lower(sv.voucher_number) = lower(?)'))
      .get(voucherNumber) as SupplierVoucherRow | undefined

    return row ? mapSupplierVoucherRow(row) : null
  }

  createVoucher(input: SaveSupplierVoucherPersistence): SupplierVoucherRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO supplier_vouchers (
            voucher_number,
            supplier_id,
            supplier_name,
            voucher_date,
            amount,
            status,
            note
          )
          VALUES (
            @voucher_number,
            @supplier_id,
            @supplier_name,
            @voucher_date,
            @amount,
            @status,
            @note
          )
        `
      )
      .run(input)

    return this.findSavedVoucher(Number(result.lastInsertRowid))
  }

  updateVoucher(id: number, input: SaveSupplierVoucherPersistence): SupplierVoucherRecord {
    this.database
      .prepare(
        `
          UPDATE supplier_vouchers
          SET
            voucher_number = @voucher_number,
            supplier_id = @supplier_id,
            supplier_name = @supplier_name,
            voucher_date = @voucher_date,
            amount = @amount,
            status = @status,
            note = @note,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      )
      .run({ id, ...input })

    return this.findSavedVoucher(id)
  }

  deleteVoucher(id: number): void {
    this.database.prepare('DELETE FROM supplier_vouchers WHERE id = ?').run(id)
  }

  private findSavedSupplier(id: number): SupplierRecord {
    const supplier = this.findById(id)

    if (!supplier) {
      throw new Error('Supplier could not be found after saving.')
    }

    return supplier
  }

  private findSavedVoucher(id: number): SupplierVoucherRecord {
    const voucher = this.findVoucherById(id)

    if (!voucher) {
      throw new Error('Supplier voucher could not be found after saving.')
    }

    return voucher
  }
}

function supplierSelectSql(where = '', orderBy = ''): string {
  return `
    SELECT
      s.id,
      s.name,
      s.contact_name,
      s.phone,
      s.email,
      s.address,
      COUNT(p.id) AS product_count,
      s.created_at,
      s.updated_at
    FROM suppliers s
    LEFT JOIN products p ON p.supplier_id = s.id
    ${where}
    GROUP BY s.id
    ${orderBy}
  `
}

function mapSupplierRow(row: SupplierRow): SupplierRecord {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    productCount: row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function supplierVoucherSelectSql(where = '', orderBy = ''): string {
  return `
    SELECT
      sv.id,
      sv.voucher_number,
      sv.supplier_id,
      COALESCE(s.name, sv.supplier_name) AS supplier_name,
      sv.voucher_date,
      sv.amount,
      sv.status,
      sv.note,
      sv.created_at,
      sv.updated_at
    FROM supplier_vouchers sv
    LEFT JOIN suppliers s ON s.id = sv.supplier_id
    ${where}
    ${orderBy}
  `
}

function mapSupplierVoucherRow(row: SupplierVoucherRow): SupplierVoucherRecord {
  return {
    id: row.id,
    voucherNumber: row.voucher_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    voucherDate: row.voucher_date,
    amount: row.amount,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
