import type Database from 'better-sqlite3'
import type { CustomerRecord } from '../../shared/customers'

interface CustomerRow {
  id: number
  name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

interface SaveCustomerPersistence {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

export class CustomerRepository {
  constructor(private readonly database: Database.Database) {}

  list(): CustomerRecord[] {
    const rows = this.database
      .prepare(
        `
          SELECT id, name, phone, email, address, notes, created_at, updated_at
          FROM customers
          ORDER BY name ASC
        `
      )
      .all() as CustomerRow[]

    return rows.map(mapCustomerRow)
  }

  findById(id: number): CustomerRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, name, phone, email, address, notes, created_at, updated_at
          FROM customers
          WHERE id = ?
        `
      )
      .get(id) as CustomerRow | undefined

    return row ? mapCustomerRow(row) : null
  }

  findByName(name: string): CustomerRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, name, phone, email, address, notes, created_at, updated_at
          FROM customers
          WHERE lower(name) = lower(?)
        `
      )
      .get(name) as CustomerRow | undefined

    return row ? mapCustomerRow(row) : null
  }

  create(input: SaveCustomerPersistence): CustomerRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO customers (name, phone, email, address, notes)
          VALUES (@name, @phone, @email, @address, @notes)
        `
      )
      .run(input)

    return this.findSavedCustomer(Number(result.lastInsertRowid))
  }

  update(id: number, input: SaveCustomerPersistence): CustomerRecord {
    this.database
      .prepare(
        `
          UPDATE customers
          SET
            name = @name,
            phone = @phone,
            email = @email,
            address = @address,
            notes = @notes,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      )
      .run({ id, ...input })

    return this.findSavedCustomer(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM customers WHERE id = ?').run(id)
  }

  private findSavedCustomer(id: number): CustomerRecord {
    const customer = this.findById(id)

    if (!customer) {
      throw new Error('Customer could not be found after saving.')
    }

    return customer
  }
}

function mapCustomerRow(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
