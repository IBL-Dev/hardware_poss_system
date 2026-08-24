import React from 'react'
import { Toast, ToastItem } from './Toast'

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed right-6 bottom-6 z-1100 flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}
