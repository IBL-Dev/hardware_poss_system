import React, { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { Loader } from '../common/Loader'
import { Spinner } from '../common/Spinner'
import { productsApi } from '../../api/productsApi'
import { brandsApi } from '../../api/brandsApi'
import { categoriesApi } from '../../api/categoriesApi'
import { useToast } from '../../context/ToastContext'
import { PRODUCT_UNITS } from '../../../../shared/products'
import type { BrandRecord } from '../../../../shared/brands'
import type { CategoryRecord } from '../../../../shared/categories'
import type { CreateProductInput, ProductRecord, ProductUnit } from '../../../../shared/products'

interface ProductCsvImportProps {
  brands: BrandRecord[]
  categories: CategoryRecord[]
  existingProductNames: string[]
  onImported: (createdProducts: ProductRecord[]) => void
  onClose: () => void
}

interface ProductImportDraft {
  sku?: string
  barcode?: string
  name: string
  brandName: string
  categoryName: string
  unit: ProductUnit
  buyingPrice: number
  sellingPrice: number
  stockQuantity: number
  reorderLevel: number
  discountPercent: number
}

interface ParsedRow {
  rowNumber: number
  name: string
  draft: ProductImportDraft | null
  error: string | null
  status: 'pending' | 'imported' | 'failed'
}

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  code: 'sku',
  sku: 'sku',
  barcode: 'barcode',
  'bar code': 'barcode',
  'product barcode': 'barcode',

  name: 'name',
  'product name': 'name',
  brand: 'brand',
  'brand name': 'brand',
  'product brand': 'brand',
  category: 'category',
  categories: 'category',
  catagory: 'category',
  catogary: 'category',
  catogarti: 'category',
  categary: 'category',
  'product category': 'category',
  unit: 'unit',
  'buying price': 'buyingPrice',
  buyingprice: 'buyingPrice',
  cost: 'buyingPrice',
  'selling price': 'sellingPrice',
  sellingprice: 'sellingPrice',
  price: 'sellingPrice',
  'discount %': 'discountPercent',
  discount: 'discountPercent',
  'discount percent': 'discountPercent',
  'stock quantity': 'stockQuantity',
  stockquantity: 'stockQuantity',
  stock: 'stockQuantity',
  quantity: 'stockQuantity',
  'reorder level': 'reorderLevel',
  reorderlevel: 'reorderLevel',
  reorder: 'reorderLevel'
}

interface RawRow {
  sku: string
  barcode: string

  name: string
  brand: string
  category: string
  unit: string
  buyingPrice: string
  sellingPrice: string
  discountPercent: string
  stockQuantity: string
  reorderLevel: string
}

export const ProductCsvImport: React.FC<ProductCsvImportProps> = ({
  brands,
  categories,
  existingProductNames,
  onImported,
  onClose
}) => {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()

  const readyCount = rows.filter(isImportableRow).length
  const skippedCount = rows.filter((row) => row.draft === null).length
  const importedCount = rows.filter((row) => row.status === 'imported').length

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsedRows = buildRows(text, existingProductNames)
      setFileName(file.name)
      setRows(parsedRows)

      if (parsedRows.length === 0) {
        toast.error('No product rows found in that file.')
      }
    } catch {
      toast.error('Could not read that CSV file.')
    }
  }

  const handleImport = async (): Promise<void> => {
    const pendingRows = rows.filter(isImportableRow)
    if (pendingRows.length === 0) return

    setIsImporting(true)
    setImportProgress({ done: 0, total: pendingRows.length })
    const created: ProductRecord[] = []
    const nextRows = [...rows]
    const brandMap = buildNameRecordMap(brands)
    const categoryMap = buildNameRecordMap(categories)
    let createdBrandCount = 0
    let createdCategoryCount = 0

    for (const row of pendingRows) {
      const index = nextRows.findIndex((candidate) => candidate.rowNumber === row.rowNumber)

      try {
        const { record: brand, created: brandCreated } = await getOrCreateBrand(
          row.draft.brandName,
          brandMap
        )
        const { record: category, created: categoryCreated } = await getOrCreateCategory(
          row.draft.categoryName,
          categoryMap
        )
        const product = await productsApi.create(
          toCreateProductInput(row.draft, brand.id, category.id)
        )

        if (brandCreated) createdBrandCount += 1
        if (categoryCreated) createdCategoryCount += 1
        created.push(product)
        nextRows[index] = { ...row, status: 'imported' }
      } catch (error) {
        nextRows[index] = {
          ...row,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to import this row.'
        }
      }

      setImportProgress((current) => ({ ...current, done: current.done + 1 }))
    }

    setRows(nextRows)
    setIsImporting(false)

    if (created.length > 0) {
      onImported(created)
    }

    const failedCount = pendingRows.length - created.length
    const classificationNote = formatClassificationImportNote(
      createdBrandCount,
      createdCategoryCount
    )
    if (created.length > 0 && failedCount === 0) {
      toast.success(`Imported ${created.length} product(s) successfully${classificationNote}.`)
    } else if (created.length > 0) {
      toast.info(
        `Imported ${created.length} product(s), ${failedCount} failed${classificationNote}.`
      )
    } else {
      toast.error('None of the products could be imported.')
    }

    if (created.length > 0 && failedCount === 0) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-dashed border-line-strong bg-bg p-5 text-center">
        <Upload size={24} className="mx-auto mb-2 text-muted" />
        <p className="mb-3 text-sm text-muted">
          Upload a CSV file in the same format as the exported product CSV (Name, Brand, and
          Category are required. Missing brands and categories will be created).
        </p>
        <button
          type="button"
          className="rounded-md border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-hover"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose CSV File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileName && <p className="mt-2 text-xs text-muted">Selected: {fileName}</p>}
      </div>

      {rows.length > 0 && (
        <>
          {isImporting ? (
            <Loader
              label={`Importing ${importProgress.done} of ${importProgress.total} product(s)...`}
              progress={
                importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  <span className="font-semibold text-success">{readyCount}</span> ready to import
                  {importedCount > 0 && (
                    <>
                      {' - '}
                      <span className="font-semibold text-success">{importedCount}</span> imported
                    </>
                  )}
                  {skippedCount > 0 && (
                    <>
                      {' - '}
                      <span className="font-semibold text-danger">{skippedCount}</span> skipped
                    </>
                  )}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border border-line">
                {rows.map((row) => (
                  <div
                    key={row.rowNumber}
                    className="flex items-start gap-2.5 border-b border-line px-3 py-2.5 text-sm last:border-b-0"
                  >
                    {row.status === 'imported' ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                    ) : row.status === 'failed' || !row.draft ? (
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">
                        {row.name || `Row ${row.rowNumber}`}
                      </div>
                      {row.draft && !row.error && (
                        <div className="text-xs text-muted">
                          {row.draft.brandName} - {row.draft.categoryName}
                        </div>
                      )}
                      {row.error && <div className="text-xs text-danger">{row.error}</div>}
                      {row.status === 'imported' && (
                        <div className="text-xs text-success">Imported</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleImport}
            disabled={isImporting || readyCount === 0}
          >
            {isImporting && <Spinner size={16} />}
            {isImporting ? 'Importing...' : `Import ${readyCount} Product(s)`}
          </button>
        </>
      )}
    </div>
  )
}

function buildRows(csvText: string, existingProductNames: string[]): ParsedRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  const headerRow = table[0].map(normalizeHeader)
  const columnIndexes: Partial<Record<keyof RawRow, number>> = {}
  headerRow.forEach((header, index) => {
    const field = HEADER_ALIASES[header]
    if (field) columnIndexes[field] = index
  })

  const dataRows = table.slice(1)
  const seenNames = new Set<string>()
  const existingNameSet = new Set(existingProductNames.map((name) => name.trim().toLowerCase()))

  return dataRows.map((cells, index) => {
    const rowNumber = index + 2
    const raw: RawRow = {
      sku: getCell(cells, columnIndexes.sku),
      barcode: getCell(cells, columnIndexes.barcode),
      name: getCell(cells, columnIndexes.name),
      brand: getCell(cells, columnIndexes.brand),
      category: getCell(cells, columnIndexes.category),
      unit: getCell(cells, columnIndexes.unit),
      buyingPrice: getCell(cells, columnIndexes.buyingPrice),
      sellingPrice: getCell(cells, columnIndexes.sellingPrice),
      discountPercent: getCell(cells, columnIndexes.discountPercent),
      stockQuantity: getCell(cells, columnIndexes.stockQuantity),
      reorderLevel: getCell(cells, columnIndexes.reorderLevel)
    }

    const { draft, error } = validateRow(raw, existingNameSet, seenNames)

    if (draft) {
      seenNames.add(raw.name.trim().toLowerCase())
    }

    return {
      rowNumber,
      name: raw.name.trim(),
      draft,
      error,
      status: 'pending'
    }
  })
}

function validateRow(
  raw: RawRow,
  existingNameSet: Set<string>,
  seenNames: Set<string>
): { draft: ProductImportDraft | null; error: string | null } {
  const name = raw.name.trim()
  if (!name) {
    return { draft: null, error: 'Missing product name.' }
  }

  const normalizedName = name.toLowerCase()
  if (existingNameSet.has(normalizedName)) {
    return { draft: null, error: 'A product with this name already exists.' }
  }
  if (seenNames.has(normalizedName)) {
    return { draft: null, error: 'Duplicate product name in this file.' }
  }

  const brandName = raw.brand.trim()
  if (!brandName) {
    return { draft: null, error: 'Missing brand.' }
  }

  const categoryName = raw.category.trim()
  if (!categoryName) {
    return { draft: null, error: 'Missing category.' }
  }

  const unitValue = raw.unit.trim().toUpperCase() || 'PCS'
  if (!PRODUCT_UNITS.includes(unitValue as ProductUnit)) {
    return { draft: null, error: `Unit "${raw.unit}" is not valid.` }
  }

  const buyingPrice = parseNonNegativeNumber(raw.buyingPrice)
  if (buyingPrice === null) {
    return { draft: null, error: 'Invalid buying price.' }
  }

  const sellingPrice = parseNonNegativeNumber(raw.sellingPrice)
  if (sellingPrice === null) {
    return { draft: null, error: 'Invalid selling price.' }
  }

  const stockQuantity = parseNonNegativeInteger(raw.stockQuantity)
  if (stockQuantity === null) {
    return { draft: null, error: 'Invalid stock quantity.' }
  }

  const discountPercent = raw.discountPercent.trim() ? parsePercentage(raw.discountPercent) : 0
  if (discountPercent === null) {
    return { draft: null, error: 'Invalid discount percentage.' }
  }

  const reorderLevel = raw.reorderLevel.trim() ? parseNonNegativeInteger(raw.reorderLevel) : 0
  if (reorderLevel === null) {
    return { draft: null, error: 'Invalid reorder level.' }
  }

  return {
    draft: {
      sku: raw.sku.trim() || undefined,
      barcode: raw.barcode.trim() || undefined,
      name,
      brandName,
      categoryName,
      unit: unitValue as ProductUnit,
      buyingPrice,
      sellingPrice,
      stockQuantity,
      reorderLevel,
      discountPercent
    },
    error: null
  }
}

function isImportableRow(row: ParsedRow): row is ParsedRow & { draft: ProductImportDraft } {
  return row.draft !== null && row.status !== 'imported'
}

function buildNameRecordMap<T extends { name: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [normalizeName(record.name), record]))
}

async function getOrCreateBrand(
  name: string,
  brandMap: Map<string, BrandRecord>
): Promise<{ record: BrandRecord; created: boolean }> {
  const key = normalizeName(name)
  const existingBrand = brandMap.get(key)
  if (existingBrand) return { record: existingBrand, created: false }

  try {
    const createdBrand = await brandsApi.create({ name })
    brandMap.set(key, createdBrand)
    return { record: createdBrand, created: true }
  } catch (error) {
    const refreshedBrand = (await brandsApi.list()).find(
      (brand) => normalizeName(brand.name) === key
    )
    if (refreshedBrand) {
      brandMap.set(key, refreshedBrand)
      return { record: refreshedBrand, created: false }
    }

    throw error
  }
}

async function getOrCreateCategory(
  name: string,
  categoryMap: Map<string, CategoryRecord>
): Promise<{ record: CategoryRecord; created: boolean }> {
  const key = normalizeName(name)
  const existingCategory = categoryMap.get(key)
  if (existingCategory) return { record: existingCategory, created: false }

  try {
    const createdCategory = await categoriesApi.create({ name })
    categoryMap.set(key, createdCategory)
    return { record: createdCategory, created: true }
  } catch (error) {
    const refreshedCategory = (await categoriesApi.list()).find(
      (category) => normalizeName(category.name) === key
    )
    if (refreshedCategory) {
      categoryMap.set(key, refreshedCategory)
      return { record: refreshedCategory, created: false }
    }

    throw error
  }
}

function toCreateProductInput(
  draft: ProductImportDraft,
  brandId: number,
  categoryId: number
): CreateProductInput {
  return {
    sku: draft.sku,
    barcode: draft.barcode,
    name: draft.name,
    brandId,
    categoryId,
    unit: draft.unit,
    buyingPrice: draft.buyingPrice,
    sellingPrice: draft.sellingPrice,
    stockQuantity: draft.stockQuantity,
    reorderLevel: draft.reorderLevel,
    discountPercent: draft.discountPercent
  }
}

function formatClassificationImportNote(brandCount: number, categoryCount: number): string {
  const parts: string[] = []
  if (brandCount > 0) parts.push(`${brandCount} new brand${brandCount === 1 ? '' : 's'}`)
  if (categoryCount > 0)
    parts.push(`${categoryCount} new categor${categoryCount === 1 ? 'y' : 'ies'}`)

  return parts.length > 0 ? `, with ${parts.join(' and ')}` : ''
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function getCell(cells: string[], index: number | undefined): string {
  if (index === undefined) return ''
  return (cells[index] ?? '').trim()
}

function parseNonNegativeNumber(value: string): number | null {
  if (value.trim().length === 0) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseNonNegativeInteger(value: string): number | null {
  if (value.trim().length === 0) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function parsePercentage(value: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }

    if (char === '\r') {
      i += 1
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }

    field += char
    i += 1
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0))
}
