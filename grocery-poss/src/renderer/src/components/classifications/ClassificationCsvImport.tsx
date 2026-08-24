import React, { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { Loader } from '../common/Loader'
import { Spinner } from '../common/Spinner'
import { useToast } from '../../context/ToastContext'

export interface ClassificationImportInput {
  name: string
  description?: string
}

interface ClassificationCsvImportProps<TRecord extends { name: string }> {
  recordLabel: string
  recordLabelPlural: string
  nameHeaderAliases: string[]
  existingNames: string[]
  createRecord: (input: ClassificationImportInput) => Promise<TRecord>
  onImported: (createdRecords: TRecord[]) => void
  onClose: () => void
}

interface ParsedRow {
  rowNumber: number
  name: string
  input: ClassificationImportInput | null
  error: string | null
  status: 'pending' | 'imported' | 'failed'
}

interface RawRow {
  name: string
  description: string
}

const DESCRIPTION_HEADER_ALIASES = new Set(['description', 'details', 'detail', 'note', 'notes'])

export function ClassificationCsvImport<TRecord extends { name: string }>({
  recordLabel,
  recordLabelPlural,
  nameHeaderAliases,
  existingNames,
  createRecord,
  onImported,
  onClose
}: ClassificationCsvImportProps<TRecord>): React.JSX.Element {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()

  const readyCount = rows.filter(isImportableRow).length
  const skippedCount = rows.filter((row) => row.input === null).length
  const importedCount = rows.filter((row) => row.status === 'imported').length
  const labelLower = recordLabel.toLowerCase()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsedRows = buildRows(text, nameHeaderAliases, existingNames)
      setFileName(file.name)
      setRows(parsedRows)

      if (parsedRows.length === 0) {
        toast.error(`No ${labelLower} rows found in that file.`)
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

    const created: TRecord[] = []
    const nextRows = [...rows]

    for (const row of pendingRows) {
      const index = nextRows.findIndex((candidate) => candidate.rowNumber === row.rowNumber)

      try {
        const record = await createRecord(row.input)
        created.push(record)
        nextRows[index] = { ...row, status: 'imported' }
      } catch (error) {
        nextRows[index] = {
          ...row,
          status: 'failed',
          error: error instanceof Error ? error.message : `Failed to import this ${labelLower}.`
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
    if (created.length > 0 && failedCount === 0) {
      toast.success(`Imported ${created.length} ${labelLower}(s) successfully.`)
      onClose()
    } else if (created.length > 0) {
      toast.info(`Imported ${created.length} ${labelLower}(s), ${failedCount} failed.`)
    } else {
      toast.error(`None of the ${recordLabelPlural.toLowerCase()} could be imported.`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-dashed border-line-strong bg-bg p-5 text-center">
        <Upload size={24} className="mx-auto mb-2 text-muted" />
        <p className="mb-3 text-sm text-muted">
          Upload a CSV file in the same format as the exported {labelLower} CSV (Name is required).
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
              label={`Importing ${importProgress.done} of ${importProgress.total} ${labelLower}(s)...`}
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
                    ) : row.status === 'failed' || !row.input ? (
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">
                        {row.name || `Row ${row.rowNumber}`}
                      </div>
                      {row.input?.description && !row.error && (
                        <div className="truncate text-xs text-muted">{row.input.description}</div>
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
            {isImporting ? 'Importing...' : `Import ${readyCount} ${recordLabel}(s)`}
          </button>
        </>
      )}
    </div>
  )
}

function buildRows(
  csvText: string,
  nameHeaderAliases: string[],
  existingNames: string[]
): ParsedRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  const nameHeaders = new Set(nameHeaderAliases.map(normalizeHeader))
  const headerRow = table[0].map(normalizeHeader)
  const nameIndex = headerRow.findIndex((header) => nameHeaders.has(header))
  const descriptionIndex = headerRow.findIndex((header) => DESCRIPTION_HEADER_ALIASES.has(header))
  const hasHeader = nameIndex >= 0 || descriptionIndex >= 0
  const dataRows = hasHeader ? table.slice(1) : table
  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : 0
  const resolvedDescriptionIndex = descriptionIndex >= 0 ? descriptionIndex : 1
  const existingNameSet = new Set(existingNames.map(normalizeName))
  const seenNames = new Set<string>()

  return dataRows.map((cells, index) => {
    const rowNumber = hasHeader ? index + 2 : index + 1
    const raw: RawRow = {
      name: getCell(cells, resolvedNameIndex),
      description: getCell(cells, resolvedDescriptionIndex)
    }
    const { input, error } = validateRow(raw, existingNameSet, seenNames)

    if (input) {
      seenNames.add(normalizeName(input.name))
    }

    return {
      rowNumber,
      name: raw.name.trim(),
      input,
      error,
      status: 'pending'
    }
  })
}

function validateRow(
  raw: RawRow,
  existingNameSet: Set<string>,
  seenNames: Set<string>
): { input: ClassificationImportInput | null; error: string | null } {
  const name = raw.name.trim()
  if (!name) {
    return { input: null, error: 'Missing name.' }
  }

  const normalizedName = normalizeName(name)
  if (existingNameSet.has(normalizedName)) {
    return { input: null, error: 'This name already exists.' }
  }

  if (seenNames.has(normalizedName)) {
    return { input: null, error: 'Duplicate name in this file.' }
  }

  return {
    input: {
      name,
      description: raw.description.trim() || undefined
    },
    error: null
  }
}

function isImportableRow(row: ParsedRow): row is ParsedRow & { input: ClassificationImportInput } {
  return row.input !== null && row.status !== 'imported'
}

function getCell(cells: string[], index: number): string {
  return (cells[index] ?? '').trim()
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
