import { ElectronAPI } from '@electron-toolkit/preload'
import type { BrandApi } from '../shared/brands'
import type { CustomerApi } from '../shared/customers'
import type { ProductApi } from '../shared/products'
import type { ReceiptApi } from '../shared/receipt'
import type { ReportsApi } from '../shared/reports'
import type { SalesApi } from '../shared/sales'
import type { UserApi } from '../shared/users'

import { LicenseApi } from '../shared/license'

interface AppApi {
  brands: BrandApi
  customers: CustomerApi
  products: ProductApi
  receipt: ReceiptApi
  reports: ReportsApi
  sales: SalesApi
  users: UserApi
  license: LicenseApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
    posAPI: LicenseApi
  }
}
