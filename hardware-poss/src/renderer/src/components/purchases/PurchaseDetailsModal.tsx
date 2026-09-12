import React, { useState } from 'react'
import { Download, FileText, RotateCcw, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { purchasesApi } from '../../api/purchasesApi'
import { formatLkr } from '../../utils/currency'
import type {
  PurchasePaymentMethod,
  PurchasePayTermUnit,
  PurchaseRecord,
  PurchaseReturnRecord,
  PurchaseStatus,
  PurchaseSupplierType
} from '../../../../shared/purchases'

interface PurchaseDetailsModalProps {
  purchase: PurchaseRecord | null
  onClose: () => void
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  purchase,
  onClose
}) => {
  const toast = useToast()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadReceipt = async (): Promise<void> => {
    if (!purchase || isDownloading) return

    setIsDownloading(true)
    try {
      const result = await purchasesApi.downloadReceipt(purchase.id)

      if (result.saved && result.filePath) {
        toast.success(`Purchase receipt downloaded to ${result.filePath}`)
      } else {
        toast.info('Purchase receipt download cancelled.')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDownloading(false)
    }
  }

  if (!purchase) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,46rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-xl font-bold text-ink">{purchase.purchaseNumber}</h3>
            <p className="mt-1 text-sm text-muted">{purchase.supplierName || 'No supplier'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-bg px-3 text-sm font-semibold text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleDownloadReceipt}
              disabled={isDownloading}
            >
              <Download size={15} />
              {isDownloading ? 'Downloading...' : 'Download Receipt'}
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Status" value={formatPurchaseStatus(purchase.status)} />
          <Detail label="Supplier Type" value={formatSupplierType(purchase.supplierType)} />
          <Detail label="Contact ID" value={purchase.contactId || '-'} />
          <Detail label="Mobile No." value={purchase.mobileNo || '-'} />
          <Detail label="Email" value={purchase.email || '-'} />
          <Detail label="Address" value={purchase.address || '-'} />
          <Detail label="Business Location" value={purchase.businessLocation || '-'} />
          <Detail
            label="Pay Term"
            value={formatPayTerm(purchase.payTermValue, purchase.payTermUnit)}
          />
          <Detail label="Created" value={formatDateTime(purchase.createdAt)} />
        </div>

        {(purchase.attachmentPath || purchase.invoicePdfPath) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {purchase.attachmentPath && (
              <Detail label="Attachment" value={purchase.attachmentPath} />
            )}
            {purchase.invoicePdfPath && (
              <Detail label="Invoice PDF" value={purchase.invoicePdfPath} />
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-md border border-line">
          <TableHeader icon={<FileText size={14} />} title="Purchase Items" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="border-b border-line p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    Product
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Qty
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Price
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-hover">
                    <td className="border-b border-line p-3">
                      <span className="font-medium text-ink">{item.productName}</span>
                      {item.sku && <span className="ml-1.5 text-xs text-muted">{item.sku}</span>}
                    </td>
                    <td className="border-b border-line p-3 text-right text-ink">
                      {item.quantity}
                    </td>
                    <td className="border-b border-line p-3 text-right text-ink">
                      {formatLkr(item.unitPrice)}
                    </td>
                    <td className="border-b border-line p-3 text-right font-semibold text-ink">
                      {formatLkr(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1.5 bg-bg p-4 text-sm">
            <Totals label="Subtotal" value={formatLkr(purchase.subtotal)} />
            <Totals label="Discount" value={`- ${formatLkr(purchase.discountAmount)}`} muted />
            <Totals label="Advance Balance" value={formatLkr(purchase.advanceBalance)} muted />
            <Totals label="Total" value={formatLkr(purchase.total)} strong />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line">
          <TableHeader
            icon={<FileText size={14} />}
            title={`Payments (${purchase.payments.length})`}
          />
          {purchase.payments.length === 0 ? (
            <EmptyRow text="No payment records." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-bg">
                      <th className="border-b border-line p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                        Date
                      </th>
                      <th className="border-b border-line p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                        Method
                      </th>
                      <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.payments.map((payment) => (
                      <tr key={payment.id} className="transition-colors hover:bg-hover">
                        <td className="border-b border-line p-3 text-ink">
                          {formatDateOnly(payment.paidOn)}
                        </td>
                        <td className="border-b border-line p-3 text-ink">
                          {formatPaymentMethod(payment.paymentMethod)}
                        </td>
                        <td className="border-b border-line p-3 text-right font-semibold text-ink">
                          {formatLkr(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {purchase.payments.length > 0 && (
                <div className="bg-bg px-3 py-1.5 text-xs text-muted">
                  {purchase.payments.some((payment) => payment.note) &&
                    purchase.payments.map(
                      (payment) =>
                        payment.note && (
                          <div key={payment.id} className="py-0.5">
                            {payment.note}
                          </div>
                        )
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface PurchaseReturnDetailsModalProps {
  purchaseReturn: PurchaseReturnRecord | null
  onClose: () => void
}

export const PurchaseReturnDetailsModal: React.FC<PurchaseReturnDetailsModalProps> = ({
  purchaseReturn,
  onClose
}) => {
  if (!purchaseReturn) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-ink/35 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-[min(94vw,42rem)] flex-col gap-5 overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-xl font-bold text-ink">
              {purchaseReturn.returnNumber}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {purchaseReturn.supplierName || 'No supplier'}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Return Date" value={formatDateOnly(purchaseReturn.returnDate)} />
          <Detail label="Business Location" value={purchaseReturn.businessLocation || '-'} />
          <Detail label="Linked Purchase" value={purchaseReturn.purchaseNumber || '-'} />
          <Detail label="Created" value={formatDateTime(purchaseReturn.createdAt)} />
        </div>

        <div className="overflow-hidden rounded-md border border-line">
          <TableHeader icon={<RotateCcw size={14} />} title="Returned Items" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="border-b border-line p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    Product
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Qty
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Price
                  </th>
                  <th className="border-b border-line p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseReturn.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-hover">
                    <td className="border-b border-line p-3">
                      <span className="font-medium text-ink">{item.productName}</span>
                      {item.sku && <span className="ml-1.5 text-xs text-muted">{item.sku}</span>}
                    </td>
                    <td className="border-b border-line p-3 text-right text-ink">
                      {item.quantity}
                    </td>
                    <td className="border-b border-line p-3 text-right text-ink">
                      {formatLkr(item.unitPrice)}
                    </td>
                    <td className="border-b border-line p-3 text-right font-semibold text-ink">
                      {formatLkr(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end bg-bg p-4 text-sm">
            <div className="flex items-center justify-between gap-8">
              <span className="text-muted">Return Total</span>
              <span className="text-base font-bold text-ink">
                {formatLkr(purchaseReturn.total)}
              </span>
            </div>
          </div>
        </div>

        {purchaseReturn.reason && (
          <div className="rounded-md border border-line bg-bg p-4">
            <div className="text-xs font-semibold uppercase text-muted">Reason</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-ink">{purchaseReturn.reason}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md border border-line bg-bg p-3">
    <div className="text-xs font-semibold uppercase text-muted">{label}</div>
    <div className="mt-1 break-words text-sm text-ink">{value}</div>
  </div>
)

const TableHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 border-b border-line bg-bg px-4 py-3">
    <span className="text-primary">{icon}</span>
    <span className="text-sm font-bold text-ink">{title}</span>
  </div>
)

const Totals: React.FC<{ label: string; value: string; strong?: boolean; muted?: boolean }> = ({
  label,
  value,
  strong = false,
  muted = false
}) => (
  <div className="flex items-center justify-end gap-8">
    <span className={muted ? 'text-muted' : 'font-medium text-ink'}>{label}</span>
    <span
      className={`min-w-24 text-right ${strong ? 'text-base font-bold text-primary' : 'font-semibold text-ink'}`}
    >
      {value}
    </span>
  </div>
)

const EmptyRow: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-8 text-center text-sm text-muted">{text}</div>
)

function formatPurchaseStatus(status: PurchaseStatus): string {
  const labels: Record<PurchaseStatus, string> = {
    RECEIVED: 'Received',
    PENDING: 'Pending',
    ORDERED: 'Ordered'
  }

  return labels[status]
}

function formatSupplierType(type: PurchaseSupplierType): string {
  return type === 'BUSINESS' ? 'Business' : 'Individual'
}

function formatPayTerm(value: number, unit: PurchasePayTermUnit): string {
  if (value <= 0) return '-'

  return `${value} ${unit === 'MONTHS' ? (value === 1 ? 'month' : 'months') : value === 1 ? 'day' : 'days'}`
}

function formatPaymentMethod(method: PurchasePaymentMethod): string {
  return method
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function formatDateOnly(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatDateTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
