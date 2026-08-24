import type Database from 'better-sqlite3'
import type { BrandRecord } from '../../shared/brands'

interface BrandRow {
  id: number
  name: string
  description: string
  product_count: number
  created_at: string
  updated_at: string
}

interface SaveBrandPersistence {
  name: string
  description: string
}

export class BrandRepository {
  constructor(private readonly database: Database.Database) {}

  list(): BrandRecord[] {
    const rows = this.database
      .prepare(brandSelectSql('', 'ORDER BY b.name ASC'))
      .all() as BrandRow[]

    return rows.map(mapBrandRow)
  }

  findById(id: number): BrandRecord | null {
    const row = this.database.prepare(brandSelectSql('WHERE b.id = ?')).get(id) as
      BrandRow | undefined

    return row ? mapBrandRow(row) : null
  }

  findByName(name: string): BrandRecord | null {
    const row = this.database
      .prepare(brandSelectSql('WHERE lower(b.name) = lower(?)'))
      .get(name) as BrandRow | undefined

    return row ? mapBrandRow(row) : null
  }

  create(input: SaveBrandPersistence): BrandRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO brands (name, description)
          VALUES (@name, @description)
        `
      )
      .run(input)

    return this.findSavedBrand(Number(result.lastInsertRowid))
  }

  update(id: number, input: SaveBrandPersistence): BrandRecord {
    this.database
      .prepare(
        `
          UPDATE brands
          SET
            name = @name,
            description = @description,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      )
      .run({ id, ...input })

    return this.findSavedBrand(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM brands WHERE id = ?').run(id)
  }

  private findSavedBrand(id: number): BrandRecord {
    const brand = this.findById(id)

    if (!brand) {
      throw new Error('Brand could not be found after saving.')
    }

    return brand
  }
}

function brandSelectSql(where = '', orderBy = ''): string {
  return `
    SELECT
      b.id,
      b.name,
      b.description,
      COUNT(p.id) AS product_count,
      b.created_at,
      b.updated_at
    FROM brands b
    LEFT JOIN products p ON p.brand_id = b.id
    ${where}
    GROUP BY b.id
    ${orderBy}
  `
}

function mapBrandRow(row: BrandRow): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    productCount: row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
