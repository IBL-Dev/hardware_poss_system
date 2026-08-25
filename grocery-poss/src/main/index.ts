import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerBrandHandlers } from './brands/brandIpc'
import { initializeDatabase } from './database'
import { registerProductHandlers } from './products/productIpc'
import { registerReceiptHandlers } from './receiptIpc'
import { registerReportHandlers } from './reports/reportIpc'
import { registerSaleHandlers } from './sales/saleIpc'
import { registerUserHandlers } from './users/userIpc'
import { registerCategoryHandlers } from './categories/categoryIpc'
import { registerSupplierHandlers } from './suppliers/supplierIpc'
import { registerCustomerHandlers } from './customers/customerIpc'
import { registerLicenseHandlers } from './licenseIpc'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  /*
   * Connect to SQLite and
   * create the required tables.
   */
  initializeDatabase()
  registerBrandHandlers()
  registerProductHandlers()
  registerReceiptHandlers()
  registerReportHandlers()
  registerSaleHandlers()
  registerUserHandlers()
  registerCategoryHandlers()
  registerSupplierHandlers()
  registerCustomerHandlers()
  registerLicenseHandlers()

  /*
   * Open the Electron window.
   */
  createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
