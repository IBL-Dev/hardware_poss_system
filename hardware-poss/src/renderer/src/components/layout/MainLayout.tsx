import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FileBarChart,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Tag,
  Users,
  FolderTree,
  Truck,
  Keyboard,
  CreditCard
} from 'lucide-react'
import { CashDrawerModal } from '../sales/CashDrawerModal'
import {
  ShortcutRegistry,
  matchAltKey,
  matchCtrlKey,
  matchKey,
  type ShortcutCommand
} from '../../shortcuts/shortcutRegistry'
import { emitPosShortcutEvent, type PosShortcutEvent } from '../../shortcuts/posShortcutEvents'
import { useToast } from '../../context/ToastContext'

interface MainLayoutProps {
  children: React.ReactNode
}

const CASH_DRAWER_SERIAL_CODE = '223351'
const AUTO_LOGOUT_HOUR = 12
const AUTO_LOGOUT_MINUTE = 0
const AUTO_LOGOUT_SECOND = 0
const CURRENT_USER_STORAGE_KEY = 'grocery-pos-current-user'

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCashDrawer, setShowCashDrawer] = useState(false)
  const shortcutButtonRef = useRef<HTMLButtonElement | null>(null)
  const shortcutDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isActive = true

    const logoutTimer = window.setTimeout(() => {
      if (!isActive) return

      void window.posAPI.logout().finally(() => {
        if (!isActive) return

        window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
        toast.info('You were logged out automatically at 12:00 PM.')
        navigate('/')
      })
    }, getNextNoonLogoutDelay())

    return () => {
      isActive = false
      window.clearTimeout(logoutTimer)
    }
  }, [navigate, toast])

  const shortcutCommands = useMemo<ShortcutCommand[]>(() => {
    const navigateToSales = (): void => {
      navigate('/sales')
    }

    const navigateToSalesAndEmit = (event: PosShortcutEvent): void => {
      navigateToSales()
      window.setTimeout(() => emitPosShortcutEvent(event), 100)
    }

    const logShortcut = (label: string) => (): void => {
      console.log(`Shortcut triggered: ${label}`)
    }

    return [
      {
        id: 'f1',
        display: 'F1',
        label: 'Search The Product',
        matches: matchKey('F1'),
        execute: () => navigateToSalesAndEmit('pos:focus-product-search')
      },
      {
        id: 'f4',
        display: 'F4',
        label: 'Select For Product Discount',
        matches: matchKey('F4'),
        execute: () => navigateToSalesAndEmit('pos:focus-product-discount')
      },

      {
        id: 'f8',
        display: 'F8',
        label: 'Hold the Invoice',
        matches: matchKey('F8'),
        execute: () => navigateToSalesAndEmit('pos:hold-invoice')
      },
      {
        id: 'alt-h',
        display: 'Alt + H',
        label: 'Select Held Invoice',
        matches: matchAltKey('H'),
        execute: () => navigateToSalesAndEmit('pos:open-held-invoices')
      },
      {
        id: 'alt-p',
        display: 'Alt + P',
        label: 'Select Payment Type to Cash',
        matches: matchAltKey('P'),
        execute: () => navigateToSalesAndEmit('pos:select-payment-cash')
      },
      {
        id: 'alt-c',
        display: 'Alt + C',
        label: 'Select Payment Type to CARD',
        matches: matchAltKey('C'),
        execute: () => navigateToSalesAndEmit('pos:select-payment-card')
      },

      {
        id: 'ctrl-o',
        display: 'Ctrl + O',
        label: 'Open Cash Drawer',
        matches: matchCtrlKey('O'),
        execute: () => setShowCashDrawer(true)
      },
      {
        id: 'enter',
        display: 'Enter',
        label: 'Add Item to Invoice',
        matches: matchKey('ENTER'),
        execute: logShortcut('Add Item to Invoice')
      },
      {
        id: 'arrow-up',
        display: '↑',
        label: 'Increase quantity',
        matches: matchKey('ARROWUP'),
        execute: logShortcut('Increase quantity')
      },

      {
        id: 'arrow-down',
        display: '↓',
        label: 'Decrease Quantity',
        matches: matchKey('ARROWDOWN'),
        execute: logShortcut('Decrease Quantity')
      }
    ]
  }, [navigate])

  useEffect(() => {
    const registry = new ShortcutRegistry()
    shortcutCommands.forEach((command) => registry.register(command))

    const onKeyDown = (event: KeyboardEvent): void => {
      registry.handle(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcutCommands])

  useEffect(() => {
    if (!showShortcuts) return

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      const target = event.target

      if (
        target instanceof Node &&
        (shortcutButtonRef.current?.contains(target) ||
          shortcutDropdownRef.current?.contains(target))
      ) {
        return
      }

      setShowShortcuts(false)
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
    }
  }, [showShortcuts])

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sales', label: 'Sales POS', icon: ShoppingCart },
    { path: '/sales-history', label: 'History', icon: ReceiptText },
    { path: '/credit-bills', label: 'Credit Bills', icon: CreditCard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/brands', label: 'Brands', icon: Tag },
    { path: '/categories', label: 'Categories', icon: FolderTree },
    { path: '/suppliers', label: 'Suppliers', icon: Truck },
    { path: '/reports', label: 'Reports', icon: FileBarChart }
  ]

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <header className="relative flex h-16 items-center bg-brand px-6 shadow-md">
        <div className="mr-10 flex items-center gap-2 text-[1.15rem] font-bold tracking-tight text-white">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>POS System</span>
        </div>
        <nav className="flex h-full gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex h-full items-center gap-2 border-b-2 px-4 text-[0.9rem] font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-white/8 text-white'
                    : 'border-transparent text-brand-muted hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-[0.95rem] font-medium text-white/90">
          <span>
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
          <button
            ref={shortcutButtonRef}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-white/90 transition-colors hover:text-primary"
            aria-label="Show keyboard shortcuts"
            aria-expanded={showShortcuts}
            onClick={() => setShowShortcuts((isOpen) => !isOpen)}
          >
            <Keyboard size={18} />
          </button>
        </div>
        {showShortcuts && (
          <div
            ref={shortcutDropdownRef}
            className="absolute right-6 top-20 z-10 w-80 rounded-md border border-white/20 bg-white/5 p-4 shadow-lg backdrop-blur-sm"
          >
            <h3 className="text-sm font-semibold mb-2 text-ink">Keyboard Shortcuts</h3>
            <ul className="text-xs text-ink/80 space-y-1">
              {shortcutCommands.map((command) => (
                <li key={command.id}>
                  <span className="font-medium text-ink">{command.display}</span>: {command.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <main className="flex-1 overflow-y-auto p-7">{children}</main>

      <CashDrawerModal
        isOpen={showCashDrawer}
        defaultSerialCode={CASH_DRAWER_SERIAL_CODE}
        onClose={() => setShowCashDrawer(false)}
      />
    </div>
  )
}

export default MainLayout

function getNextNoonLogoutDelay(now = new Date()): number {
  const nextLogout = new Date(now)
  nextLogout.setHours(AUTO_LOGOUT_HOUR, AUTO_LOGOUT_MINUTE, AUTO_LOGOUT_SECOND, 0)

  if (nextLogout.getTime() <= now.getTime()) {
    nextLogout.setDate(nextLogout.getDate() + 1)
  }

  return nextLogout.getTime() - now.getTime()
}
