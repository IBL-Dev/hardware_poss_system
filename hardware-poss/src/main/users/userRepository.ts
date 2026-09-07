import type Database from 'better-sqlite3'
import type { UserRecord, UserRole } from '../../shared/users'

interface UserRow {
  id: number
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  created_at: string
  updated_at: string
}

interface CreateUserPersistence {
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  passwordHash: string
}

interface UpdateUserPersistence {
  name: string
  nic: string
  email: string
  phone: string
  role: UserRole
  passwordHash?: string
}

export class UserRepository {
  constructor(private readonly database: Database.Database) {}

  list(): UserRecord[] {
    const rows = this.database
      .prepare(
        `
          SELECT id, name, nic, email, phone, role, created_at, updated_at
          FROM users
          ORDER BY created_at DESC, id DESC
        `
      )
      .all() as UserRow[]

    return rows.map(mapUserRow)
  }

  findById(id: number): UserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, name, nic, email, phone, role, created_at, updated_at
          FROM users
          WHERE id = ?
        `
      )
      .get(id) as UserRow | undefined

    return row ? mapUserRow(row) : null
  }

  findByUsernameOrEmail(username: string): { user: UserRecord; passwordHash: string } | null {
    const row = this.database
      .prepare(
        `
          SELECT id, name, nic, email, phone, role, password_hash, created_at, updated_at
          FROM users
          WHERE lower(email) = lower(?) OR lower(name) = lower(?)
          LIMIT 1
        `
      )
      .get(username, username) as (UserRow & { password_hash: string }) | undefined

    if (!row) {
      return null
    }

    return {
      user: mapUserRow(row),
      passwordHash: row.password_hash
    }
  }

  findByEmail(email: string): UserRecord | null {
    return this.findByUniqueColumn('email', email)
  }

  findByNic(nic: string): UserRecord | null {
    return this.findByUniqueColumn('nic', nic)
  }

  findByPhone(phone: string): UserRecord | null {
    return this.findByUniqueColumn('phone', phone)
  }

  create(input: CreateUserPersistence): UserRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO users (name, nic, email, phone, role, password_hash)
          VALUES (@name, @nic, @email, @phone, @role, @passwordHash)
        `
      )
      .run(input)

    return this.findSavedUser(Number(result.lastInsertRowid))
  }

  update(id: number, input: UpdateUserPersistence): UserRecord {
    if (input.passwordHash) {
      this.database
        .prepare(
          `
            UPDATE users
            SET
              name = @name,
              nic = @nic,
              email = @email,
              phone = @phone,
              role = @role,
              password_hash = @passwordHash,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
          `
        )
        .run({ id, ...input })
    } else {
      this.database
        .prepare(
          `
            UPDATE users
            SET
              name = @name,
              nic = @nic,
              email = @email,
              phone = @phone,
              role = @role,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
          `
        )
        .run({ id, ...input })
    }

    return this.findSavedUser(id)
  }

  delete(id: number): void {
    this.database.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  private findByUniqueColumn(column: 'email' | 'nic' | 'phone', value: string): UserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, name, nic, email, phone, role, created_at, updated_at
          FROM users
          WHERE ${column} = ?
        `
      )
      .get(value) as UserRow | undefined

    return row ? mapUserRow(row) : null
  }

  private findSavedUser(id: number): UserRecord {
    const user = this.findById(id)

    if (!user) {
      throw new Error('User could not be found after saving.')
    }

    return user
  }
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    nic: row.nic,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
