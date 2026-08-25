import {
  HashRouter as Router,
  Routes as SwitchRoutes,
  Route as SingleRoute
} from 'react-router-dom'
import LoginPage from './pages/LoginPage'
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

function AppContent(): React.JSX.Element {
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
