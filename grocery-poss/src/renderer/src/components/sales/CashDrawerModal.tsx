import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

interface CashDrawerModalProps {
  isOpen: boolean
  defaultSerialCode: string
  onClose: () => void
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  isOpen,
  defaultSerialCode,
  onClose
}) => {
  const toast = useToast()
  const [serialCode, setSerialCode] = useState('')
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSerialCode('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOpenDrawer = async (): Promise<void> => {
    const enteredCode = serialCode.trim()

    if (enteredCode !== defaultSerialCode.trim()) {
      setError('Invalid serial code. Please try again.')
      return
    }

    setIsOpening(true)
    setError('')

    try {
      const result = await window.api.receipt.openCashDrawer()

      if (result.success) {
        toast.success('Cash drawer opened.')
        onClose()
        return
      }

      setError(result.message ?? 'Cash drawer could not be opened.')
    } catch (catchError) {
      setError(
        catchError instanceof Error ? catchError.message : 'Cash drawer could not be opened.'
      )
    } finally {
      setIsOpening(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleOpenDrawer()
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-[min(92vw,24rem)] flex-col gap-5 rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-xl font-semibold text-ink">Open Cash Drawer</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-ink"
            aria-label="Close cash drawer popup"
          >
            <X size={16} />
          </button>
        </div>

        <label className="text-sm font-medium text-ink">Enter Serial Code</label>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          className="h-12 w-full rounded-md border border-line px-4 text-lg tracking-widest text-ink outline-none transition-colors focus:border-primary"
          placeholder="Serial code"
          value={serialCode}
          onChange={(event) => {
            setSerialCode(event.target.value)

            if (error) {
              setError('')
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}

        <div className="flex w-full gap-3">
          <button
            type="button"
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="flex-1 rounded-md bg-primary py-3 text-[0.95rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary/50"
            onClick={() => void handleOpenDrawer()}
            disabled={isOpening}
          >
            {isOpening ? 'Opening...' : 'Open Drawer'}
          </button>
        </div>
      </div>
    </div>
  )
}
