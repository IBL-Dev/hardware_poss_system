import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, LogIn, Lock, User, AlertCircle, Loader2 } from 'lucide-react'

const ACCOUNT_LOCKED_MESSAGE = 'This account has been locked. Please contact support.'
const ACCOUNT_VERIFY_FAILED_MESSAGE =
  'Could not verify account status. Please check your internet connection or contact support.'
const CURRENT_USER_STORAGE_KEY = 'grocery-pos-current-user'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingLicense, setCheckingLicense] = useState(true)
  const [loginBlocked, setLoginBlocked] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function checkAccountStatus() {
      try {
        const license = await window.posAPI.checkLicense()
        if (!isMounted) return

        if (license.status === 'DISABLED') {
          setLoginBlocked(true)
          setErrorMessage(ACCOUNT_LOCKED_MESSAGE)
          return
        }

        if (!license.allowed || license.status !== 'ACTIVE') {
          setLoginBlocked(true)
          setErrorMessage(license.message || ACCOUNT_VERIFY_FAILED_MESSAGE)
          return
        }

        setLoginBlocked(false)
        setErrorMessage(null)
      } catch {
        if (!isMounted) return
        setLoginBlocked(true)
        setErrorMessage(ACCOUNT_VERIFY_FAILED_MESSAGE)
      } finally {
        if (isMounted) {
          setCheckingLicense(false)
        }
      }
    }

    checkAccountStatus()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginBlocked) return

    setLoading(false)
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await window.posAPI.login(username, password)
      if (res.success) {
        if (res.user) {
          window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(res.user))
        }
        navigate('/dashboard')
      } else {
        window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
        setErrorMessage(res.message || 'Login failed.')
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Login failed due to unexpected error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-linear-to-b from-[#f9f7f2] to-bg p-4">
      <div className="animate-slide-up w-full max-w-100 rounded-lg border border-line bg-card p-10 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-18 w-18 items-center justify-center rounded-full bg-success/10">
            <ShoppingCart size={40} className="text-success" />
          </div>
          <h1 className="mb-1.5 text-[26px] font-bold text-ink">Grocery POS</h1>
          <p className="text-sm text-muted">Sign in to manage your store</p>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger/10 p-3.5 text-sm text-danger">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="username">
              Username or Email
            </label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-3.5 text-faint" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-line bg-bg py-3 pr-4 pl-10.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-150 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,148,0.12)]"
                placeholder="Enter username or email"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="password">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3.5 text-faint" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-line bg-bg py-3 pr-4 pl-10.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-150 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,148,0.12)]"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || checkingLicense || loginBlocked}
            className="mt-2.5 flex h-11.5 w-full items-center justify-center gap-2 rounded-md bg-success text-base font-semibold text-white transition-colors hover:bg-success-hover disabled:opacity-50"
          >
            {loading || checkingLicense ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            {checkingLicense ? 'Checking...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
