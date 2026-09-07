export interface PrintReceiptInput {
  html: string
  text?: string
  printerName?: string
}

export interface PrintReceiptResult {
  success: boolean
  printerName?: string
  message?: string
}

export interface OpenCashDrawerResult {
  success: boolean
  printerName?: string
  message?: string
}

export interface ReceiptApi {
  printReceipt: (input: PrintReceiptInput) => Promise<PrintReceiptResult>
  openCashDrawer: (printerName?: string) => Promise<OpenCashDrawerResult>
}
