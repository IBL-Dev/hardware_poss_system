import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Boxes,
  Eye,
  EyeOff,
  Hammer,
  HardHat,
  Loader2,
  Lock,
  LogIn,
  PackageCheck,
  ShieldCheck,
  User,
  Wrench
} from 'lucide-react'

const CURRENT_USER_STORAGE_KEY = 'grocery-pos-current-user'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /* ==========================================================
     LOGIN
  ========================================================== */

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)

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
      setErrorMessage(error?.message || 'Login failed due to an unexpected error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f6f4]">
      {/* ======================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute -bottom-48 right-[-100px] h-[520px] w-[520px] rounded-full bg-slate-200/70 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)',
            backgroundSize: '38px 38px'
          }}
        />
      </div>

      {/* ======================================================
          LOGIN LAYOUT
      ====================================================== */}

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ====================================================
            LEFT SIDE
        ==================================================== */}

        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-950/80 via-slate-950 to-slate-900" />

          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '44px 44px'
            }}
          />

          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[70px] border-emerald-500/5" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full border-[85px] border-white/[0.025]" />

          {/* ==================================================
              BRAND
          ================================================== */}

          <div className="relative z-10 flex items-center gap-3 px-12 pt-10 xl:px-16">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
              <Wrench size={22} className="text-emerald-400" />
            </div>

            <div>
              <p className="text-base font-bold tracking-wide text-white">
                Hardware POS
              </p>

              <p className="text-xs font-medium text-slate-400">
                Store Management System
              </p>
            </div>
          </div>

          {/* ==================================================
              MAIN LEFT CONTENT
          ================================================== */}

          <div className="relative z-10 px-12 xl:px-16">
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 shadow-2xl shadow-emerald-950/30">
              <HardHat size={31} className="text-emerald-400" />
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
              Hardware Store Management
            </p>

            <h1 className="max-w-xl text-[2.65rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[3.2rem]">
              Manage your hardware business
              <span className="block text-emerald-400">
                with confidence.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-[0.95rem] leading-7 text-slate-400">
              Control sales, inventory, products and daily store operations
              from one reliable point-of-sale management platform.
            </p>

            {/* ==================================================
                FEATURE CARDS
            ================================================== */}

            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Boxes size={18} className="text-emerald-400" />
                </div>

                <p className="text-sm font-semibold text-white">
                  Inventory
                </p>

                <p className="mt-1 text-[0.7rem] leading-4 text-slate-500">
                  Track hardware stock
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <PackageCheck size={18} className="text-emerald-400" />
                </div>

                <p className="text-sm font-semibold text-white">
                  Products
                </p>

                <p className="mt-1 text-[0.7rem] leading-4 text-slate-500">
                  Organize store items
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Hammer size={18} className="text-emerald-400" />
                </div>

                <p className="text-sm font-semibold text-white">
                  Sales
                </p>

                <p className="mt-1 text-[0.7rem] leading-4 text-slate-500">
                  Fast POS operations
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              LEFT FOOTER
          ================================================== */}

          <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] px-12 py-7 xl:px-16">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-emerald-500" />
              Secure business management
            </div>

            <span className="text-xs text-slate-600">
              POS System
            </span>
          </div>
        </section>

        {/* ====================================================
            RIGHT SIDE
        ==================================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-[450px]">
            {/* ==================================================
                MOBILE BRAND
            ================================================== */}

            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-600/20">
                <Wrench size={21} className="text-white" />
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  Hardware POS
                </p>

                <p className="text-xs text-slate-500">
                  Store Management System
                </p>
              </div>
            </div>

            {/* ==================================================
                LOGIN HEADING
            ================================================== */}

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 lg:hidden">
                <HardHat size={24} className="text-emerald-600" />
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                Welcome Back
              </p>

              <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">
                Sign in to your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your credentials to access the hardware store
                management system.
              </p>
            </div>

            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />

                <span className="leading-5">
                  {errorMessage}
                </span>
              </div>
            )}

            {/* ==================================================
                LOGIN FORM
            ================================================== */}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* ==================================================
                  USERNAME
              ================================================== */}

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username or Email
                </label>

                <div className="group relative">
                  <User
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600"
                  />

                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* ==================================================
                  PASSWORD
              ================================================== */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="group relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* ==================================================
                  SIGN IN BUTTON
              ================================================== */}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* ==================================================
                SECURITY INFORMATION
            ================================================== */}

            <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              Authorized personnel access only
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}