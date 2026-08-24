import type Database from 'better-sqlite3'
import type { CategoryRecord } from '../../shared/categories'

interface CategoryRow {
  id: number
  name: string
  description: string
  product_count: number
  created_at: string
  updated_at: string
}

interface SaveCategoryPersistence {
  name: string
  description: string
}

export class CategoryRepository {
  constructor(private readonly database: Database.Database) {}

  list(): CategoryRecord[] {
    const rows = this.database
      .prepare(categorySelectSql('', 'ORDER BY c.name ASC'))
      .all() as CategoryRow[]

    return rows.map(mapCategoryRow)
  }

  findById(id: number): CategoryRecord | null {
    const row = this.database.prepare(categorySelectSql('WHERE c.id = ?')).get(id) as
      CategoryRow | undefined

    return row ? mapCategoryRow(row) : null
  }

  findByName(name: string): CategoryRecord | null {
    const row = this.database
      .prepare(categorySelectSql('WHERE lower(c.name) = lower(?)'))
      .get(name) as CategoryRow | undefined

    return row ? mapCategoryRow(row) : null
  }

  create(input: SaveCategoryPersistence): CategoryRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO categories (name, description)
          VALUES (@name, @description)
        `
      )
      .run(input)

    return this.findSavedCategory(Number(result.lastInsertRowid))
  }

  update(id: number, input: SaveCategoryPersistence): CategoryRecord {
    this.database
      .prepare(
        `
          UPDATE categories
          SET
            name = @name,
            description = @description,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      )
      .run({ id, ...input })

    return this.findSavedCategory(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }

  private findSavedCategory(id: number): CategoryRecord {
    const category = this.findById(id)

    if (!category) {
      throw new Error('Category could not be found after saving.')
    }

    return category
  }
}

function categorySelectSql(where = '', orderBy = ''): string {
  return `
    SELECT
      c.id,
      c.name,
      c.description,
      COUNT(p.id) AS product_count,
      c.created_at,
      c.updated_at
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    ${where}
    GROUP BY c.id
    ${orderBy}
  `
}

function mapCategoryRow(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    productCount: row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
