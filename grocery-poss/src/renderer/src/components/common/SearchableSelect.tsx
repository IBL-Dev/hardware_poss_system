import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  disabled?: boolean
  triggerClassName?: string
  ariaLabel?: string
  onCreateOption?: (label: string) => Promise<void> | void
  createOptionLabel?: (label: string) => string
}

const defaultTriggerClassName =
  'flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none focus:border-primary'

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Search...',
  disabled = false,
  triggerClassName = defaultTriggerClassName,
  ariaLabel,
  onCreateOption,
  createOptionLabel = (label) => `Add "${label}"`
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const selectedOption = options.find((option) => option.value === value) ?? null
  const trimmedQuery = query.trim()

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return options

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  const canCreateOption =
    Boolean(onCreateOption) &&
    trimmedQuery.length > 0 &&
    !options.some((option) => option.label.trim().toLowerCase() === trimmedQuery.toLowerCase())

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (event: MouseEvent): void => {
      const target = event.target

      if (target instanceof Node && containerRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    setQuery('')
    const focusTimeout = window.setTimeout(() => searchInputRef.current?.focus(), 0)

    return () => window.clearTimeout(focusTimeout)
  }, [isOpen])

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleCreateOption = async (): Promise<void> => {
    if (!onCreateOption || !canCreateOption || isCreating) return

    setIsCreating(true)
    try {
      await onCreateOption(trimmedQuery)
      setQuery('')
      setIsOpen(false)
    } catch {
      // The caller owns user-facing error handling.
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`${triggerClassName} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <span className={selectedOption ? 'text-ink' : 'text-faint'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-md border border-line bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={15} className="shrink-0 text-faint" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-faint"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="max-h-50 overflow-y-auto">
            {filteredOptions.length === 0 && !canCreateOption ? (
              <div className="px-3 py-2.5 text-sm text-muted">No results found.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`block w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-hover ${
                    option.value === value ? 'bg-primary/10 font-semibold text-primary' : 'text-ink'
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
            {canCreateOption && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleCreateOption}
                disabled={isCreating}
              >
                <Plus size={15} className="shrink-0" />
                {isCreating ? 'Adding...' : createOptionLabel(trimmedQuery)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
