import React from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { Spinner } from './Spinner'

export type ConfirmVariant = 'danger' | 'primary'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex w-95 flex-col gap-5 rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
            }`}
          >
            {isDanger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div>
            <h3 className="m-0 text-lg font-bold text-ink">{title}</h3>
            <p className="mt-1 text-[0.9rem] text-muted">{message}</p>
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            className="flex-1 rounded-md border border-line bg-transparent py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-[0.95rem] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              isDanger ? 'bg-danger hover:bg-danger-hover' : 'bg-primary hover:bg-primary-hover'
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Spinner size={16} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
