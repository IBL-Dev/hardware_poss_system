import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoaderProps {
  label?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_STYLES: Record<NonNullable<LoaderProps['size']>, { ring: string; icon: number }> = {
  sm: { ring: 'h-10 w-10', icon: 20 },
  md: { ring: 'h-14 w-14', icon: 28 },
  lg: { ring: 'h-20 w-20', icon: 40 }
}

export const Loader: React.FC<LoaderProps> = ({ label, progress, size = 'md', className = '' }) => {
  const { ring, icon } = SIZE_STYLES[size]
  const hasProgress = typeof progress === 'number'
  const clampedProgress = hasProgress ? Math.min(100, Math.max(0, progress as number)) : 0

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div className={`relative flex items-center justify-center ${ring}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <Loader2 size={icon} className="animate-spin text-primary" />
      </div>
      {label && <div className="text-sm font-semibold text-ink">{label}</div>}
      {hasProgress && (
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}
