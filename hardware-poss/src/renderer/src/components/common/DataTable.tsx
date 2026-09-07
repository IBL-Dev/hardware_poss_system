import React, { useEffect, useRef, useState } from 'react'
import { Edit2, Eye, Trash2 } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[]
  data: T[]
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  selectedIds?: T['id'][]
  onSelectionChange?: (ids: T['id'][]) => void
  showSelection?: boolean
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onView,
  onEdit,
  onDelete,
  selectedIds,
  onSelectionChange,
  showSelection = true
}: DataTableProps<T>): React.JSX.Element {
  const [internalSelectedRowIds, setInternalSelectedRowIds] = useState<Set<T['id']>>(new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)
  const isSelectionControlled = selectedIds !== undefined
  const selectedRowIds = isSelectionControlled
    ? new Set<T['id']>(selectedIds as T['id'][])
    : internalSelectedRowIds

  const hasRows = data.length > 0
  const allRowsSelected = hasRows && data.every((item) => selectedRowIds.has(item.id))
  const someRowsSelected = data.some((item) => selectedRowIds.has(item.id))

  useEffect(() => {
    const visibleIds = new Set(data.map((item) => item.id))

    if (isSelectionControlled) {
      const currentIds = (selectedIds ?? []) as T['id'][]
      const nextIds = currentIds.filter((id) => visibleIds.has(id))

      if (nextIds.length !== currentIds.length) {
        onSelectionChange?.(nextIds)
      }

      return
    }

    setInternalSelectedRowIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)))

      return next.size === current.size ? current : next
    })
  }, [data, isSelectionControlled, onSelectionChange, selectedIds])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someRowsSelected && !allRowsSelected
    }
  }, [allRowsSelected, someRowsSelected])

  const handleSelectAll = (): void => {
    updateSelectedRowIds(allRowsSelected ? new Set() : new Set(data.map((item) => item.id)))
  }

  const handleSelectRow = (itemId: T['id']): void => {
    const next = new Set(selectedRowIds)

    if (next.has(itemId)) {
      next.delete(itemId)
    } else {
      next.add(itemId)
    }

    updateSelectedRowIds(next)
  }

  const updateSelectedRowIds = (next: Set<T['id']>): void => {
    if (isSelectionControlled) {
      onSelectionChange?.([...next])
      return
    }

    setInternalSelectedRowIds(next)
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line bg-card shadow-md">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {showSelection && (
              <th className="w-12 border-b border-line bg-bg p-4 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allRowsSelected}
                  disabled={!hasRows}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-line bg-bg p-4 text-[0.78rem] font-semibold tracking-wide text-muted uppercase"
              >
                {col.header}
              </th>
            ))}
            {(onView || onEdit || onDelete) && (
              <th className="w-32 border-b border-line bg-bg p-4 text-center text-[0.78rem] font-semibold tracking-wide text-muted uppercase">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isSelected = selectedRowIds.has(item.id)

            return (
              <tr
                key={item.id}
                className={`transition-colors last:*:border-b-0 hover:bg-hover ${
                  isSelected ? 'bg-hover' : ''
                }`}
              >
                {showSelection && (
                  <td className="w-12 border-b border-line p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(item.id)}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="border-b border-line p-4">
                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                  </td>
                ))}
                {(onView || onEdit || onDelete) && (
                  <td className="w-32 border-b border-line p-4 text-center">
                    {onView && (
                      <button
                        type="button"
                        className="mx-0.5 rounded-sm p-1.5 text-muted transition-all hover:bg-hover hover:text-success"
                        onClick={() => onView(item)}
                        title="View details"
                        aria-label="View details"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        className="mx-0.5 rounded-sm p-1.5 text-muted transition-all hover:bg-hover hover:text-primary"
                        onClick={() => onEdit(item)}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="mx-0.5 rounded-sm p-1.5 text-muted transition-all hover:bg-hover hover:text-danger"
                        onClick={() => onDelete(item)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
