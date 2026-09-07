import React from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastProps {
  type: ToastType
  message: string
  onDismiss: () => void
}

const iconByType = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }

const colorByType: Record<ToastType, string> = {
  success: 'border-success text-success',
  error: 'border-danger text-danger',
  info: 'border-primary text-primary',
  warning: 'border-warning text-warning'
}

export const Toast: React.FC<ToastProps> = ({ type, message, onDismiss }) => {
  const Icon = iconByType[type]

  return (
    <div
      className={`animate-slide-up flex w-80 items-start gap-3 rounded-md border-l-4 bg-card p-4 shadow-lg ${colorByType[type]}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-[0.9rem] text-ink">{message}</p>
      <button className="shrink-0 text-muted transition-colors hover:text-ink" onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  )
}
