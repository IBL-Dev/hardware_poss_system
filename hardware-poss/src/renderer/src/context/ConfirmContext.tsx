import React, { createContext, useCallback, useContext, useState } from 'react'
import { ConfirmDialog, ConfirmVariant } from '../components/common/ConfirmDialog'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  onConfirm: () => void | Promise<void>
}

type ConfirmFn = (options: ConfirmOptions) => void

const ConfirmContext = createContext<ConfirmFn | null>(null)

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
  }, [])

  const handleCancel = useCallback(() => {
    if (isLoading) return
    setOptions(null)
  }, [isLoading])

  const handleConfirm = useCallback(async () => {
    if (!options) return
    setIsLoading(true)
    try {
      await options.onConfirm()
      setOptions(null)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={!!options}
        title={options?.title ?? ''}
        message={options?.message ?? ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
