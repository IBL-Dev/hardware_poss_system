import { useState } from 'react'
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Monitor } from 'lucide-react'

interface ActivationPageProps {
  deviceId: string
  onActivated: () => void
}

export default function ActivationPage({ deviceId, onActivated }: ActivationPageProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await window.posAPI.activateDevice(code.trim())
      if (res.success && res.activated) {
        setSuccess('Device activated successfully! Redirecting to login...')
        setTimeout(() => {
          onActivated()
        }, 1500)
      } else {
        setError(res.message || 'Invalid activation code.')
      }
    } catch (err: any) {
      setError(err?.message || 'Activation failed due to network or server error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-linear-to-b from-[#f9f7f2] to-bg p-4">
      <div className="animate-slide-up w-full max-w-md rounded-xl border border-line bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={36} />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-ink">POS Device Activation</h1>
          <p className="text-sm text-muted">
            Enter your 16-character license activation code to unlock this POS terminal.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-line/60 bg-bg/50 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-muted mb-1">
            <Monitor size={14} /> Device Hardware ID:
          </div>
          <code className="block select-all font-mono text-[11px] text-ink break-all bg-card p-1.5 rounded border border-line">
            {deviceId}
          </code>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger/10 p-3.5 text-sm text-danger">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/10 p-3.5 text-sm text-success">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Activation Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="POS-XXXX-XXXX-XXXX"
              className="w-full rounded-lg border border-line bg-bg py-3 px-4 text-center font-mono text-lg tracking-widest text-ink uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Activating...
              </>
            ) : (
              'Activate POS System'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
