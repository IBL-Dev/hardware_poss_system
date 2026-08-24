import { app } from 'electron'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'

let database: Database.Database | null = null

const DATABASE_FILE_NAME = 'grocery-pos.db'
const DATABASE_FOLDER_NAME = 'Grocery POS'
const DATABASE_BUSY_TIMEOUT_MS = 5000

export function initializeDatabase(): Database.Database {
  if (database?.open) {
    return database
  }

  const databaseFolder = path.join(app.getPath('appData'), DATABASE_FOLDER_NAME)
  const databasePath = path.join(databaseFolder, DATABASE_FILE_NAME)

  try {
    fs.mkdirSync(databaseFolder, {
      recursive: true
    })

    ensureDirectoryIsWritable(databaseFolder)
    migrateExistingDatabaseFile(databasePath)

    database = openDatabaseWithRecovery(databasePath)

    database.pragma('foreign_keys = ON')
    database.pragma('busy_timeout = 5000')
    database.pragma('synchronous = NORMAL')
    database.pragma('wal_autocheckpoint = 1000')

    createDatabaseSchema(database)

    console.log('SQLite database connected successfully:', databasePath)

    return database
  } catch (error) {
    if (database?.open) {
      database.close()
    }

    database = null

    console.error('Failed to initialize SQLite database:', error)
    console.error('SQLite database path:', databasePath)

    throw error
  }
}

export function getDatabase(): Database.Database {
  if (!database?.open) {
    throw new Error('Database has not been initialized.')
  }

  return database
}

export function closeDatabase(): void {
  if (!database?.open) {
    database = null
    return
  }

  try {
    database.pragma('wal_checkpoint(TRUNCATE)')
  } catch (error) {
    console.warn('Could not checkpoint SQLite WAL before closing:', error)
  }

  database.close()
  database = null
}

function openDatabaseWithRecovery(databasePath: string): Database.Database {
  let connection: Database.Database | null = null

  try {
    connection = createDatabaseConnection(databasePath)
    enableWalMode(connection)

    return connection
  } catch (firstError) {
    if (connection?.open) {
      connection.close()
    }

    console.warn(
      'SQLite WAL initialization failed. Backing up and removing stale sidecar files before retrying:',
      firstError
    )

    backupAndRemoveSQLiteSidecarFiles(databasePath)

    connection = createDatabaseConnection(databasePath)

    try {
      enableWalMode(connection)
    } catch (walError) {
      console.warn(
        'SQLite WAL mode is still unavailable. Falling back to DELETE journal mode:',
        walError
      )

      const journalMode = connection.pragma('journal_mode = DELETE', {
        simple: true
      }) as string

      if (journalMode.toLowerCase() !== 'delete') {
        connection.close()
        throw new Error(
          `SQLite could not enable a writable journal mode. Current mode: ${journalMode}`
        )
      }
    }

    return connection
  }
}

function createDatabaseConnection(databasePath: string): Database.Database {
  const connection = new Database(databasePath)

  connection.pragma(`busy_timeout = ${DATABASE_BUSY_TIMEOUT_MS}`)

  return connection
}

function enableWalMode(connection: Database.Database): void {
  const journalMode = connection.pragma('journal_mode = WAL', {
    simple: true
  }) as string

  if (journalMode.toLowerCase() !== 'wal') {
    throw new Error(`SQLite could not enable WAL mode. Current mode: ${journalMode}`)
  }
}

function createDatabaseSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      contact_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS supplier_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT NOT NULL COLLATE NOCASE UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT NOT NULL DEFAULT '',
      voucher_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'PAID', 'CANCELLED')) DEFAULT 'PENDING',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(
    'CREATE INDEX IF NOT EXISTS supplier_vouchers_supplier_id_idx ON supplier_vouchers(supplier_id)'
  )
  database.exec(
    'CREATE INDEX IF NOT EXISTS supplier_vouchers_voucher_date_idx ON supplier_vouchers(voucher_date)'
  )

  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  ensureColumnDropped(database, 'brands', 'status')

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      unit TEXT NOT NULL DEFAULT 'PCS',
      buying_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  migrateProductsTable(database)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT NOT NULL UNIQUE,
      daily_bill_number INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL CHECK(
        payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAY', 'CREDIT')
      ),
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  ensureColumn(
    database,
    'sales',
    'discount_amount',
    'ALTER TABLE sales ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0'
  )
  ensureColumn(
    database,
    'sales',
    'daily_bill_number',
    'ALTER TABLE sales ADD COLUMN daily_bill_number INTEGER NOT NULL DEFAULT 0'
  )

  migrateSalesTable(database)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0
    )
  `)

  database.exec('CREATE INDEX IF NOT EXISTS sales_paid_at_idx ON sales(paid_at)')
  database.exec('CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items(sale_id)')

  ensureColumn(
    database,
    'sale_items',
    'discount_amount',
    'ALTER TABLE sale_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0'
  )
  ensureColumnDropped(database, 'sale_items', 'category_name')

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nic TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'STAFF')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      movement_type TEXT NOT NULL CHECK(
        movement_type IN ('OPENING_STOCK', 'ADJUSTMENT', 'SALE', 'RETURN')
      ),
      quantity_change INTEGER NOT NULL DEFAULT 0,
      previous_quantity INTEGER NOT NULL DEFAULT 0,
      new_quantity INTEGER NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL DEFAULT '',
      reference_id INTEGER,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(
    'CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON stock_movements(product_id)'
  )
  database.exec(
    'CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON stock_movements(created_at)'
  )

  seedAdminUser(database)
}

function seedAdminUser(database: Database.Database): void {
  const adminEmail = 'hani@gmail.com'
  const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)
  if (!existing) {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync('hani123', salt, 64).toString('hex')
    const passwordHash = `scrypt:${salt}:${hash}`
    database
      .prepare(
        `
      INSERT INTO users (name, nic, email, phone, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run('hani', '000000000V', adminEmail, '0000000000', 'ADMIN', passwordHash)
    console.log(`Seeded default admin user: ${adminEmail}`)
  }
}

function migrateSalesTable(database: Database.Database): void {
  // Add customer_id column for CREDIT sales
  ensureColumn(
    database,
    'sales',
    'customer_id',
    'ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL'
  )

  // Recreate the table to update the CHECK constraint for payment_method
  const hasCreditInCheck = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'")
    .get() as { sql: string }

  if (!hasCreditInCheck.sql.includes('CREDIT')) {
    database.exec(`
      CREATE TABLE sales_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number TEXT NOT NULL UNIQUE,
        daily_bill_number INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL CHECK(
          payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAY', 'CREDIT')
        ),
        subtotal REAL NOT NULL DEFAULT 0,
        tax REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        item_count INTEGER NOT NULL DEFAULT 0,
        paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL
      )
    `)

    database.exec(`
      INSERT INTO sales_new (
        id, sale_number, daily_bill_number, payment_method, subtotal, tax, discount_amount, total, item_count, paid_at, customer_id
      )
      SELECT 
        id, sale_number, daily_bill_number, payment_method, subtotal, tax, discount_amount, total, item_count, paid_at, customer_id 
      FROM sales
    `)

    database.exec('DROP TABLE sales')
    database.exec('ALTER TABLE sales_new RENAME TO sales')
    database.exec('CREATE INDEX IF NOT EXISTS sales_paid_at_idx ON sales(paid_at)')
  }
}

function migrateProductsTable(database: Database.Database): void {
  ensureColumn(database, 'products', 'sku', 'ALTER TABLE products ADD COLUMN sku TEXT')
  ensureColumn(
    database,
    'products',
    'brand',
    "ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT ''"
  )
  ensureColumn(
    database,
    'products',
    'brand_id',
    'ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL'
  )
  ensureColumn(
    database,
    'products',
    'category_id',
    'ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL'
  )
  ensureColumn(
    database,
    'products',
    'supplier_id',
    'ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL'
  )
  ensureColumn(
    database,
    'products',
    'unit',
    "ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'PCS'"
  )
  ensureColumn(
    database,
    'products',
    'reorder_level',
    'ALTER TABLE products ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 0'
  )
  ensureColumn(
    database,
    'products',
    'discount_percent',
    'ALTER TABLE products ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0'
  )
  ensureColumn(
    database,
    'products',
    'updated_at',
    "ALTER TABLE products ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"
  )

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
    ON products(sku)
    WHERE sku IS NOT NULL AND sku <> ''
  `)

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique
    ON products(barcode)
    WHERE barcode IS NOT NULL AND barcode <> ''
  `)

  backfillBrandsFromLegacyBrandText(database)
  ensureColumnDropped(database, 'products', 'status')
}

function backfillBrandsFromLegacyBrandText(database: Database.Database): void {
  const legacyBrandNames = database
    .prepare(
      `
        SELECT DISTINCT brand
        FROM products
        WHERE brand_id IS NULL
          AND brand IS NOT NULL
          AND trim(brand) <> ''
      `
    )
    .all() as Array<{ brand: string }>

  if (legacyBrandNames.length === 0) {
    return
  }

  const insertBrand = database.prepare(
    'INSERT INTO brands (name) VALUES (?) ON CONFLICT(name) DO NOTHING'
  )
  const linkProducts = database.prepare(`
    UPDATE products
    SET brand_id = (
      SELECT id
      FROM brands
      WHERE lower(brands.name) = lower(?)
    )
    WHERE brand_id IS NULL
      AND lower(brand) = lower(?)
  `)

  const backfill = database.transaction((names: string[]) => {
    for (const name of names) {
      const trimmedName = name.trim()

      if (!trimmedName) {
        continue
      }

      insertBrand.run(trimmedName)
      linkProducts.run(trimmedName, trimmedName)
    }
  })

  backfill(legacyBrandNames.map((row) => row.brand))
}

function ensureColumn(
  database: Database.Database,
  tableName: string,
  columnName: string,
  addColumnSql: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string
  }>
  const hasColumn = columns.some((column) => column.name === columnName)

  if (!hasColumn) {
    database.exec(addColumnSql)
  }
}

function ensureColumnDropped(
  database: Database.Database,
  tableName: string,
  columnName: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string
  }>
  const hasColumn = columns.some((column) => column.name === columnName)

  if (!hasColumn) {
    return
  }

  try {
    database.exec(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`)
  } catch (error) {
    console.warn(`Could not drop column ${tableName}.${columnName}:`, error)
  }
}

function migrateExistingDatabaseFile(targetDatabasePath: string): void {
  if (fs.existsSync(targetDatabasePath)) {
    const targetSize = fs.statSync(targetDatabasePath).size

    if (targetSize > 0) {
      return
    }

    fs.rmSync(targetDatabasePath, {
      force: true
    })
  }

  const sourceDatabasePath = findNewestExistingDatabasePath(targetDatabasePath)

  if (!sourceDatabasePath) {
    return
  }

  fs.mkdirSync(path.dirname(targetDatabasePath), {
    recursive: true
  })

  createConsistentDatabaseCopy(sourceDatabasePath, targetDatabasePath)

  console.log('Migrated existing SQLite database to permanent path:', targetDatabasePath)
}

function findNewestExistingDatabasePath(targetDatabasePath: string): string | null {
  const appDataPath = app.getPath('appData')
  const targetPath = path.resolve(targetDatabasePath)
  const uniqueCandidatePaths = Array.from(
    new Set([
      path.join(app.getPath('userData'), 'database', DATABASE_FILE_NAME),
      path.join(appDataPath, 'grocery-pos', 'database', DATABASE_FILE_NAME),
      path.join(appDataPath, 'grocery-poss', 'database', DATABASE_FILE_NAME),
      path.join(appDataPath, 'GroceryPOS', 'database', DATABASE_FILE_NAME),
      path.join(appDataPath, 'GroceryPOS', DATABASE_FILE_NAME),
      path.join(appDataPath, 'Grocery POS', 'database', DATABASE_FILE_NAME),
      path.join(appDataPath, DATABASE_FOLDER_NAME, DATABASE_FILE_NAME)
    ])
  )

  return (
    uniqueCandidatePaths
      .filter((candidatePath) => path.resolve(candidatePath) !== targetPath)
      .filter((candidatePath) => fs.existsSync(candidatePath))
      .filter((candidatePath) => fs.statSync(candidatePath).isFile())
      .filter((candidatePath) => fs.statSync(candidatePath).size > 0)
      .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0] ?? null
  )
}

function createConsistentDatabaseCopy(
  sourceDatabasePath: string,
  targetDatabasePath: string
): void {
  let sourceDatabase: Database.Database | null = null

  try {
    sourceDatabase = new Database(sourceDatabasePath, {
      fileMustExist: true
    })

    sourceDatabase.pragma(`busy_timeout = ${DATABASE_BUSY_TIMEOUT_MS}`)

    const escapedTargetPath = targetDatabasePath.replaceAll("'", "''")

    sourceDatabase.exec(`VACUUM INTO '${escapedTargetPath}'`)
  } catch (error) {
    fs.rmSync(targetDatabasePath, {
      force: true
    })

    throw new Error(
      `Failed to migrate the existing SQLite database from "${sourceDatabasePath}" to "${targetDatabasePath}". ${formatUnknownError(error)}`
    )
  } finally {
    if (sourceDatabase?.open) {
      sourceDatabase.close()
    }
  }
}

function backupAndRemoveSQLiteSidecarFiles(databasePath: string): void {
  const sidecarPaths = [
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    `${databasePath}-journal`
  ].filter((sidecarPath) => fs.existsSync(sidecarPath))

  if (sidecarPaths.length === 0) {
    return
  }

  const recoveryFolder = path.join(
    path.dirname(databasePath),
    'recovery-backups',
    createFileSafeTimestamp()
  )

  fs.mkdirSync(recoveryFolder, {
    recursive: true
  })

  for (const sidecarPath of sidecarPaths) {
    const backupPath = path.join(recoveryFolder, path.basename(sidecarPath))

    fs.copyFileSync(sidecarPath, backupPath)
    fs.rmSync(sidecarPath, {
      force: true
    })
  }

  console.warn('Backed up stale SQLite sidecar files to:', recoveryFolder)
}

function ensureDirectoryIsWritable(directoryPath: string): void {
  const testFilePath = path.join(
    directoryPath,
    `.sqlite-write-test-${process.pid}-${Date.now()}.tmp`
  )

  try {
    fs.writeFileSync(testFilePath, 'write-test', {
      encoding: 'utf8'
    })
  } catch (error) {
    throw new Error(
      `The SQLite database folder is not writable: "${directoryPath}". ${formatUnknownError(error)}`
    )
  } finally {
    fs.rmSync(testFilePath, {
      force: true
    })
  }
}

function createFileSafeTimestamp(): string {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
