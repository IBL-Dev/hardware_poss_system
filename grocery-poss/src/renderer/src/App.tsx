import { useEffect, useState } from 'react'
import {
  HashRouter as Router,
  Routes as SwitchRoutes,
  Route as SingleRoute,
  useNavigate as useNav
} from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ActivationPage from './pages/ActivationPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import ProductsPage from './pages/ProductsPage'
import BrandsPage from './pages/BrandsPage'
import CategoriesPage from './pages/CategoriesPage'
import SuppliersPage from './pages/SuppliersPage'
import ReportsPage from './pages/ReportsPage'
import SalesPage from './pages/SalesPage'
import SalesHistoryPage from './pages/SalesHistoryPage'
import CreditBillsPage from './pages/CreditBillsPage'
import MainLayout from './components/layout/MainLayout'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { Loader2 } from 'lucide-react'

function AppContent(): React.JSX.Element {
  const navigate = useNav()
  const [loading, setLoading] = useState(true)
  const [activated, setActivated] = useState(false)
  const [deviceId, setDeviceId] = useState('')

  const checkDeviceStatus = async () => {
    try {
      const info = await window.posAPI.getDeviceInfo()
      setDeviceId(info.deviceId)
      setActivated(info.activated)
    } catch {
      setActivated(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDeviceStatus()

    const cleanup = window.posAPI.onLicenseDisabled(() => {
      window.posAPI.logout()
      window.localStorage.removeItem('grocery-pos-current-user')
      setActivated(true)
      navigate('/')
    })

    return () => {
      cleanup()
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-muted">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!activated) {
    return <ActivationPage deviceId={deviceId} onActivated={() => setActivated(true)} />
  }

  return (
    <SwitchRoutes>
      <SingleRoute path="/" element={<LoginPage />} />
      <SingleRoute
        path="/dashboard"
        element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/users"
        element={
          <MainLayout>
            <UsersPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/categories"
        element={
          <MainLayout>
            <CategoriesPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/suppliers"
        element={
          <MainLayout>
            <SuppliersPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/products"
        element={
          <MainLayout>
            <ProductsPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/brands"
        element={
          <MainLayout>
            <BrandsPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/reports"
        element={
          <MainLayout>
            <ReportsPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/sales"
        element={
          <MainLayout>
            <SalesPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/sales-history"
        element={
          <MainLayout>
            <SalesHistoryPage />
          </MainLayout>
        }
      />
      <SingleRoute
        path="/credit-bills"
        element={
          <MainLayout>
            <CreditBillsPage />
          </MainLayout>
        }
      />
    </SwitchRoutes>
  )
}

function App(): React.JSX.Element {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <AppContent />
        </Router>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
