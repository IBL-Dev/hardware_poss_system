export interface NameDescriptionRecord {
  name: string
  description: string
}

export function downloadNameDescriptionCsv(
  records: NameDescriptionRecord[],
  filePrefix: string
): { saved: true } {
  const csvText = buildNameDescriptionCsv(records)
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${filePrefix}-export-${createDateStamp()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return { saved: true }
}

function buildNameDescriptionCsv(records: NameDescriptionRecord[]): string {
  const header = ['Name', 'Description']
  const rows = records.map((record) => [record.name, record.description])

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function createDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
