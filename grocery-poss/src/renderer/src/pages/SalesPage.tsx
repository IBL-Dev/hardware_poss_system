import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  ChevronDown,
  Check,
  Clock,
  CreditCard,
  Minus,
  PackageSearch,
  Plus,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2
} from 'lucide-react'
import { SearchableSelect } from '../components/common/SearchableSelect'
import { QuantityModal, type QuantitySelection } from '../components/sales/QuantityModal'
import { ReceiptModal } from '../components/sales/ReceiptModal'
import { onPosShortcutEvent } from '../shortcuts/posShortcutEvents'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { customersApi } from '../api/customersApi'
import { productsApi } from '../api/productsApi'
import { salesApi } from '../api/salesApi'
import { formatLkr } from '../utils/currency'
import type { CustomerRecord } from '../../../shared/customers'
import type { ProductRecord } from '../../../shared/products'
import type { SalePaymentMethod, SaleRecord } from '../../../shared/sales'

interface CartItem {
  id: number
  sku: string
  name: string
  price: number
  brand: string
  stockQuantity: number
  quantity: number
  discountAmount: number
}

interface HeldBill {
  id: string
  name: string
  items: CartItem[]
  paymentMethod: SalePaymentMethod
  discountAmount: number
  cashReceivedAmount: number
  customerId: number | null
  createdAt: string
  updatedAt: string
}

interface CurrentBillDraft {
  items: CartItem[]
  paymentMethod: SalePaymentMethod
  discountAmount: number
  cashReceivedAmount: number
  activeHeldBillId: string | null
  customerId: number | null
}

const HELD_BILLS_STORAGE_KEY = 'grocery-pos-held-bills'
const CURRENT_BILL_STORAGE_KEY = 'grocery-pos-current-bill'
const TAX_RATE = 0
const MAX_SEARCH_RESULTS = 12
const LOW_STOCK_ALERT_THRESHOLD = 5

const SalesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    () => loadCurrentBillDraft()?.customerId ?? null
  )
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [cart, setCart] = useState<CartItem[]>(() => loadCurrentBillDraft()?.items ?? [])
  const [heldBills, setHeldBills] = useState<HeldBill[]>(loadHeldBills)
  const [cashReceivedInput, setCashReceivedInput] = useState(() =>
    formatMoneyInput(loadCurrentBillDraft()?.cashReceivedAmount ?? 0)
  )
  const [selectedHeldBillId, setSelectedHeldBillId] = useState('')
  const [activeHeldBillId, setActiveHeldBillId] = useState<string | null>(
    () => loadCurrentBillDraft()?.activeHeldBillId ?? null
  )
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>(
    () => loadCurrentBillDraft()?.paymentMethod ?? 'CASH'
  )
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null)
  const [isHeldBillMenuOpen, setIsHeldBillMenuOpen] = useState(false)

  const heldBillMenuRef = useRef<HTMLDivElement | null>(null)
  const productSearchRef = useRef<HTMLInputElement | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const cashierName = getCurrentCashierName()

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + getCartItemGrossTotal(item), 0))
  const itemDiscountTotal = roundMoney(
    cart.reduce((sum, item) => sum + getCartItemDiscountAmount(item), 0)
  )
  const discountedSubtotal = Math.max(0, roundMoney(subtotal - itemDiscountTotal))
  const tax = roundMoney(discountedSubtotal * TAX_RATE)
  const grossTotal = roundMoney(discountedSubtotal + tax)
  const discountAmount = 0
  const total = grossTotal
  const cashReceivedAmount = paymentMethod === 'CASH' ? parseMoneyInput(cashReceivedInput) : total
  const effectiveCashReceivedAmount =
    paymentMethod === 'CASH' && cashReceivedInput.trim() ? cashReceivedAmount : total
  const hasCashReceivedError =
    paymentMethod === 'CASH' && cashReceivedInput.trim() !== '' && cashReceivedAmount < total
  const balanceAmount =
    paymentMethod === 'CASH' ? Math.max(0, roundMoney(effectiveCashReceivedAmount - total)) : 0
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const selectPaymentMethod = useCallback(
    (nextPaymentMethod: SalePaymentMethod): void => {
      if (completedSale) return

      setPaymentMethod(nextPaymentMethod)

      if (nextPaymentMethod !== 'CASH') {
        setCashReceivedInput('')
      }
    },
    [completedSale]
  )

  useEffect(() => {
    let isActive = true

    Promise.all([productsApi.list(), customersApi.list()])
      .then(([loadedProducts, loadedCustomers]) => {
        if (isActive) {
          setProducts(loadedProducts)
          setCustomers(loadedCustomers)
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [toast])

  useEffect(() => {
    const unsubscribes = [
      onPosShortcutEvent('pos:focus-product-search', () => {
        productSearchRef.current?.focus()
      }),
      onPosShortcutEvent('pos:focus-product-discount', () => {
        if (!isQtyModalOpen) {
          toast.info('Select a product first to enter a discount.')
        }
      }),
      onPosShortcutEvent('pos:open-held-invoices', () => {
        if (heldBills.length === 0) {
          toast.info('No held invoices found.')
          return
        }

        setSelectedHeldBillId((currentId) =>
          heldBills.some((bill) => bill.id === currentId) ? currentId : heldBills[0].id
        )
        setIsHeldBillMenuOpen(true)
      }),
      onPosShortcutEvent('pos:select-payment-cash', () => {
        selectPaymentMethod('CASH')
      }),
      onPosShortcutEvent('pos:select-payment-card', () => {
        selectPaymentMethod('CARD')
      })
    ]

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [heldBills, isQtyModalOpen, selectPaymentMethod, toast])

  useEffect(() => {
    saveHeldBills(heldBills)
  }, [heldBills])

  useEffect(() => {
    if (completedSale) {
      clearCurrentBillDraft()
      return
    }

    saveCurrentBillDraft({
      items: cart,
      paymentMethod,
      discountAmount,
      cashReceivedAmount:
        paymentMethod === 'CASH' && cashReceivedInput.trim() ? cashReceivedAmount : 0,
      activeHeldBillId,
      customerId: selectedCustomerId
    })
  }, [
    cart,
    paymentMethod,
    discountAmount,
    cashReceivedAmount,
    cashReceivedInput,
    activeHeldBillId,
    selectedCustomerId,
    completedSale
  ])

  const isHeldBillMenuVisible = isHeldBillMenuOpen && heldBills.length > 0

  useEffect(() => {
    if (!isHeldBillMenuVisible) return

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      const target = event.target

      if (target instanceof Node && heldBillMenuRef.current?.contains(target)) {
        return
      }

      setIsHeldBillMenuOpen(false)
    }

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsHeldBillMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isHeldBillMenuVisible])

  const sellableProducts = useMemo(() => {
    return products.filter((product) => {
      const existingQuantity = cart.find((item) => item.id === product.id)?.quantity ?? 0
      return product.stockQuantity - existingQuantity > 0
    })
  }, [products, cart])

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0
  const hasBrandFilter = selectedBrand.length > 0
  const hasActiveFilter = hasSearchQuery || hasBrandFilter

  const brandOptions = useMemo(() => {
    const names = new Set<string>()
    sellableProducts.forEach((product) => {
      if (product.brandName) names.add(product.brandName)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [sellableProducts])

  const matchingProducts = useMemo(() => {
    if (!hasActiveFilter) {
      return []
    }

    return sellableProducts.filter((product) => {
      if (hasBrandFilter && product.brandName !== selectedBrand) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      return [
        product.sku,
        product.barcode ?? '',
        product.name,
        product.brandName ?? '',
        product.sellingPrice.toString()
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearchQuery)
    })
  }, [normalizedSearchQuery, sellableProducts, hasBrandFilter, selectedBrand, hasActiveFilter])

  const visibleProducts = matchingProducts.slice(0, MAX_SEARCH_RESULTS)
  const activeIndex =
    visibleProducts.length > 0 ? Math.min(highlightedIndex, visibleProducts.length - 1) : -1
  const activeProduct = activeIndex >= 0 ? visibleProducts[activeIndex] : null
  const effectiveSelectedHeldBillId = heldBills.some((bill) => bill.id === selectedHeldBillId)
    ? selectedHeldBillId
    : (heldBills[0]?.id ?? '')
  const selectedHeldBill = effectiveSelectedHeldBillId
    ? (heldBills.find((bill) => bill.id === effectiveSelectedHeldBillId) ?? null)
    : null
  const activeHeldBill = activeHeldBillId
    ? (heldBills.find((bill) => bill.id === activeHeldBillId) ?? null)
    : null

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value)
    setHighlightedIndex(0)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      setSearchQuery('')
      setHighlightedIndex(0)
      return
    }

    if (visibleProducts.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) => (current + 1) % visibleProducts.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => (current <= 0 ? visibleProducts.length - 1 : current - 1))
      return
    }

    if (event.key === 'Enter' && activeProduct) {
      event.preventDefault()
      handleProductSelect(activeProduct)
    }
  }

  const handleProductSelect = (product: ProductRecord): void => {
    if (completedSale) {
      toast.error('Start a new bill before adding more products.')
      return
    }

    const existingQuantity = cart.find((item) => item.id === product.id)?.quantity ?? 0

    if (product.stockQuantity <= existingQuantity) {
      toast.error(`"${product.name}" is out of stock.`)
      return
    }

    setSelectedProduct(product)
    setIsQtyModalOpen(true)
  }

  const handleConfirmQuantity = (selection: QuantitySelection): void => {
    if (!selectedProduct) return

    const { quantity } = selection
    const existingQuantity = cart.find((item) => item.id === selectedProduct.id)?.quantity ?? 0
    const maxQuantity = Math.max(0, selectedProduct.stockQuantity - existingQuantity)

    if (quantity > maxQuantity) {
      toast.error(`Only ${maxQuantity} item(s) available for "${selectedProduct.name}".`)
      return
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === selectedProduct.id)
      const discountAmount = clampDiscountAmount(
        selection.discountAmount,
        selectedProduct.sellingPrice * quantity
      )

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === selectedProduct.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                discountAmount: clampDiscountAmount(
                  item.discountAmount + discountAmount,
                  item.price * (item.quantity + quantity)
                )
              }
            : item
        )
      }

      return [
        ...currentCart,
        {
          id: selectedProduct.id,
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          price: selectedProduct.sellingPrice,
          brand: selectedProduct.brandName ?? 'No Brand',
          stockQuantity: selectedProduct.stockQuantity,
          quantity,
          discountAmount
        }
      ]
    })

    setIsQtyModalOpen(false)
    setSelectedProduct(null)
    setSearchQuery('')
    setHighlightedIndex(0)
  }

  const handleQuantityModalClose = (): void => {
    setIsQtyModalOpen(false)
    setSelectedProduct(null)
  }

  const handleCartQuantityChange = (id: number, quantity: number): void => {
    if (completedSale) return

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== id) return item

        const nextQuantity = clampQuantity(quantity, item.stockQuantity)

        return {
          ...item,
          quantity: nextQuantity,
          discountAmount: clampDiscountAmount(item.discountAmount, item.price * nextQuantity)
        }
      })
    )
  }

  const handleRemoveItem = (id: number): void => {
    if (completedSale) return

    setCart((currentCart) => currentCart.filter((item) => item.id !== id))
  }

  const resetWorkingBill = useCallback((): void => {
    setCart([])
    setSearchQuery('')
    setHighlightedIndex(0)
    setCompletedSale(null)
    setPaymentMethod('CASH')
    setCashReceivedInput('')
    setSelectedCustomerId(null)
    setIsReceiptModalOpen(false)
    setActiveHeldBillId(null)
    setIsHeldBillMenuOpen(false)
  }, [])

  const handleHoldBill = useCallback((): void => {
    if (completedSale) {
      toast.error('Completed bills cannot be held.')
      return
    }

    if (cart.length === 0) {
      toast.error('Add products before holding a bill.')
      return
    }

    const now = new Date().toISOString()
    const currentHeldBill = activeHeldBillId
      ? heldBills.find((bill) => bill.id === activeHeldBillId)
      : null
    const heldBill: HeldBill = {
      id: currentHeldBill?.id ?? createHeldBillId(),
      name: currentHeldBill?.name ?? createHeldBillName(now),
      items: cart,
      paymentMethod,
      discountAmount,
      cashReceivedAmount:
        paymentMethod === 'CASH' && cashReceivedInput.trim() ? cashReceivedAmount : 0,
      customerId: selectedCustomerId,
      createdAt: currentHeldBill?.createdAt ?? now,
      updatedAt: now
    }

    setHeldBills((currentBills) => {
      const existingBill = currentBills.find((bill) => bill.id === heldBill.id)

      if (existingBill) {
        return currentBills.map((bill) => (bill.id === heldBill.id ? heldBill : bill))
      }

      return [heldBill, ...currentBills]
    })
    setIsHeldBillMenuOpen(false)
    resetWorkingBill()
    setSelectedHeldBillId(heldBill.id)
    toast.success(`${heldBill.name} was held. New bill started.`)
  }, [
    activeHeldBillId,
    cashReceivedAmount,
    cashReceivedInput,
    cart,
    completedSale,
    discountAmount,
    heldBills,
    paymentMethod,
    resetWorkingBill,
    toast
  ])

  useEffect(() => onPosShortcutEvent('pos:hold-invoice', handleHoldBill), [handleHoldBill])

  const handleResumeHeldBill = (billToResume?: HeldBill | null): void => {
    const heldBillToResume = billToResume ?? selectedHeldBill

    if (!heldBillToResume) {
      toast.error('Select a held bill first.')
      return
    }

    setIsHeldBillMenuOpen(false)

    const openHeldBill = (): void => {
      setCart(normalizeCartItems(heldBillToResume.items))
      setPaymentMethod(normalizeCheckoutPaymentMethod(heldBillToResume.paymentMethod))
      setCashReceivedInput(formatMoneyInput(heldBillToResume.cashReceivedAmount ?? 0))
      setSelectedCustomerId(heldBillToResume.customerId ?? null)
      setCompletedSale(null)
      setIsReceiptModalOpen(false)
      setSearchQuery('')
      setHighlightedIndex(0)
      setActiveHeldBillId(heldBillToResume.id)
      setSelectedHeldBillId(heldBillToResume.id)
      toast.success(`${heldBillToResume.name} loaded.`)
    }

    if (cart.length > 0 && !completedSale) {
      confirm({
        title: 'Open Held Bill',
        message:
          'Opening this held bill will replace the current bill on screen. Hold the current bill first if you need to save it.',
        confirmText: 'Open Bill',
        onConfirm: openHeldBill
      })
      return
    }

    openHeldBill()
  }

  const handleDeleteHeldBill = (billToDelete?: HeldBill | null): void => {
    const heldBillToDelete = billToDelete ?? selectedHeldBill

    if (!heldBillToDelete) {
      toast.error('Select a held bill first.')
      return
    }

    setIsHeldBillMenuOpen(false)

    confirm({
      title: 'Delete Held Bill',
      message: `Remove "${heldBillToDelete.name}" from held bills? This does not change products, stock, or paid sales.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        setHeldBills((currentBills) =>
          currentBills.filter((bill) => bill.id !== heldBillToDelete.id)
        )
        setSelectedHeldBillId((currentId) => (currentId === heldBillToDelete.id ? '' : currentId))

        if (activeHeldBillId === heldBillToDelete.id) {
          resetWorkingBill()
        }

        toast.success(`${heldBillToDelete.name} was removed.`)
      }
    })
  }

  const processCurrentBill = async (): Promise<SaleRecord | null> => {
    if (completedSale) return completedSale
    if (cart.length === 0 || isPaying) return null

    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      toast.error('A customer must be selected for CREDIT sales.')
      return null
    }

    setIsPaying(true)
    try {
      const savedSale = await salesApi.create({
        paymentMethod,
        discountAmount,
        customerId: selectedCustomerId,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          discountAmount: getCartItemDiscountAmount(item)
        }))
      })

      setCompletedSale(savedSale)
      setHeldBills((currentBills) =>
        activeHeldBillId
          ? currentBills.filter((bill) => bill.id !== activeHeldBillId)
          : currentBills
      )
      setSelectedHeldBillId((currentId) => (currentId === activeHeldBillId ? '' : currentId))
      setActiveHeldBillId(null)

      const lowStockProducts: Array<{ name: string; stockQuantity: number }> = []

      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const soldItem = savedSale.items.find((item) => item.productId === product.id)

          if (!soldItem) return product

          const newStockQuantity = Math.max(0, product.stockQuantity - soldItem.quantity)

          if (newStockQuantity <= LOW_STOCK_ALERT_THRESHOLD) {
            lowStockProducts.push({ name: product.name, stockQuantity: newStockQuantity })
          }

          return { ...product, stockQuantity: newStockQuantity }
        })
      )
      setIsReceiptModalOpen(true)
      toast.success(`Sale ${savedSale.saleNumber} was paid successfully.`)

      if (lowStockProducts.length > 0) {
        const summary = lowStockProducts
          .map((product) => `${product.name} (${product.stockQuantity} left)`)
          .join(', ')
        toast.warning(`Low stock alert: ${summary}`)
      }

      return savedSale
    } catch (error) {
      toast.error(getErrorMessage(error))
      return null
    } finally {
      setIsPaying(false)
    }
  }

  const handlePay = async (): Promise<void> => {
    if (completedSale) {
      setIsReceiptModalOpen(true)
      return
    }

    if (cart.length === 0 || isPaying) return

    if (hasCashReceivedError) {
      toast.error('Cash received cannot be less than the bill total.')
      return
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      toast.error('A customer must be selected for CREDIT sales.')
      return
    }

    setIsReceiptModalOpen(true)
  }

  const handleNewBill = (): void => {
    if (completedSale || cart.length === 0) {
      resetWorkingBill()
      return
    }

    confirm({
      title: 'Start New Bill',
      message: 'The current bill will be cleared. Hold it first if the customer will return.',
      confirmText: 'Start New',
      variant: 'danger',
      onConfirm: resetWorkingBill
    })
  }

  const selectedAvailableQuantity = selectedProduct
    ? Math.max(
        1,
        selectedProduct.stockQuantity -
          (cart.find((item) => item.id === selectedProduct.id)?.quantity ?? 0)
      )
    : 1

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-56px)] min-h-[42rem] flex-col gap-4 overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-line bg-white px-4 py-3 ring-0 transition-shadow focus-within:border-primary focus-within:shadow-md">
                <Search size={20} className="text-primary" />
                <input
                  ref={productSearchRef}
                  type="text"
                  className="min-w-0 flex-1 border-none bg-transparent text-base font-medium text-ink outline-none placeholder:text-faint"
                  placeholder="Search product code, barcode, name, brand, or price"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  disabled={Boolean(completedSale)}
                  autoFocus
                />
              </div>
              <SearchableSelect
                triggerClassName="flex w-44 shrink-0 items-center justify-between rounded-md border border-line bg-white px-3 py-3 text-sm font-semibold text-ink outline-none transition-shadow focus:border-primary focus:shadow-md disabled:bg-subtle disabled:text-muted"
                options={[
                  { value: '', label: 'All Brands' },
                  ...brandOptions.map((brandName) => ({ value: brandName, label: brandName }))
                ]}
                value={selectedBrand}
                onChange={setSelectedBrand}
                placeholder="All Brands"
                searchPlaceholder="Search brand..."
                disabled={Boolean(completedSale)}
                ariaLabel="Filter by brand"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-[0.8rem] text-muted">
              <span>
                {hasActiveFilter
                  ? `${matchingProducts.length} matching product(s)`
                  : `${sellableProducts.length} sellable product(s) available`}
              </span>
              {matchingProducts.length > MAX_SEARCH_RESULTS && (
                <span>Showing best {MAX_SEARCH_RESULTS}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.6fr] border-b border-line bg-subtle px-4 py-3 text-[0.78rem] font-semibold tracking-wide text-muted uppercase">
            <span>Product</span>
            <span>Brand</span>
            <span className="text-right">Price (LKR)</span>
            <span className="text-right">Stock</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <EmptyState text="Loading products..." />
            ) : !hasActiveFilter ? (
              <EmptyState text="Search or select a brand to start billing." />
            ) : visibleProducts.length === 0 ? (
              <EmptyState text="No matching products found." />
            ) : (
              visibleProducts.map((product, index) => {
                const isHighlighted = index === activeIndex

                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`grid w-full grid-cols-[1.3fr_0.8fr_0.7fr_0.6fr] items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 ${
                      isHighlighted
                        ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                        : 'bg-white hover:bg-hover'
                    }`}
                    onClick={() => handleProductSelect(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{product.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.72rem] font-semibold text-primary">
                          {product.sku}
                        </span>
                        {product.barcode && (
                          <span className="rounded-full border border-line-strong bg-subtle px-2 py-0.5 text-[0.72rem] font-semibold text-muted">
                            {product.barcode}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="truncate">
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        {product.brandName ?? 'No Brand'}
                      </span>
                    </span>
                    <span className="text-right font-semibold text-success">
                      {formatLkr(product.sellingPrice)}
                    </span>
                    <span className="text-right">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStockBadgeClass(
                          product
                        )}`}
                      >
                        {product.stockQuantity}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-card p-5 shadow-md">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[1.1rem] font-bold">
                <ShoppingCart size={22} className="text-success" />
                Current Bill
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[0.8rem] text-muted">
                <Clock size={14} />
                <span className="truncate">{activeHeldBill?.name ?? 'New bill'}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
              {cartItemCount} Items
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div ref={heldBillMenuRef} className="relative flex min-w-0">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-l-md border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-subtle disabled:text-faint"
                onClick={handleHoldBill}
                disabled={cart.length === 0 || Boolean(completedSale)}
              >
                <Save size={16} />
                <span className="truncate">Hold Bill</span>
              </button>
              <button
                type="button"
                className="flex w-10 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-primary/25 bg-primary/10 text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:border-line disabled:bg-subtle disabled:text-faint"
                onClick={() => setIsHeldBillMenuOpen((isOpen) => !isOpen)}
                disabled={heldBills.length === 0}
                title={heldBills.length === 0 ? 'No held bills' : 'Continue held bill'}
                aria-label={heldBills.length === 0 ? 'No held bills' : 'Continue held bill'}
                aria-haspopup="menu"
                aria-expanded={isHeldBillMenuVisible}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isHeldBillMenuVisible ? 'rotate-180' : ''}`}
                />
              </button>

              {isHeldBillMenuVisible && (
                <div
                  className="absolute top-full left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-line bg-white shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-line bg-subtle px-3 py-2 text-[0.72rem] font-semibold tracking-wide text-muted uppercase">
                    Held Bills
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {heldBills.map((bill) => {
                      const isOpen = bill.id === activeHeldBillId

                      return (
                        <div key={bill.id} className="flex border-b border-line last:border-b-0">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:bg-subtle disabled:text-faint"
                            onClick={() => handleResumeHeldBill(bill)}
                            disabled={isOpen}
                            role="menuitem"
                          >
                            <RefreshCw size={15} className="shrink-0 text-primary" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {bill.name}
                                {isOpen ? ' (Open)' : ''}
                              </span>
                              <span className="mt-0.5 block truncate text-[0.74rem] text-muted">
                                {formatHeldBillSummary(bill)}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="flex w-10 shrink-0 items-center justify-center border-l border-line text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            onClick={() => handleDeleteHeldBill(bill)}
                            aria-label={`Delete ${bill.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-hover"
              onClick={handleNewBill}
            >
              <PlusCircle size={16} />
              New Bill
            </button>
          </div>

          <div className="flex min-h-0 flex-2 flex-col gap-2.5 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted">
                <PackageSearch size={36} className="text-faint" />
                <span>No products in this bill.</span>
              </div>
            ) : (
              cart.map((item) => {
                const lineGrossTotal = getCartItemGrossTotal(item)
                const lineDiscountAmount = getCartItemDiscountAmount(item)
                const lineTotal = getCartItemLineTotal(item)

                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-line bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block truncate text-[0.95rem] font-semibold text-ink">
                          {item.name}
                        </span>
                        <span className="text-[0.8rem] text-muted">
                          {item.sku} - {item.brand}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rounded-sm p-1 text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:text-line-strong"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={Boolean(completedSale)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center overflow-hidden rounded-md border border-line bg-white">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:text-line-strong"
                          onClick={() => handleCartQuantityChange(item.id, item.quantity - 1)}
                          disabled={Boolean(completedSale)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          type="number"
                          min={0.001}
                          step="any"
                          max={item.stockQuantity}
                          className="h-9 w-14 border-x border-line text-center text-sm font-semibold text-ink outline-none disabled:bg-subtle disabled:text-muted"
                          value={item.quantity}
                          disabled={Boolean(completedSale)}
                          onChange={(event) =>
                            handleCartQuantityChange(
                              item.id,
                              event.target.value === '' ? 0 : Number(event.target.value)
                            )
                          }
                        />
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:text-line-strong"
                          onClick={() => handleCartQuantityChange(item.id, item.quantity + 1)}
                          disabled={Boolean(completedSale)}
                          aria-label={`Increase ${item.name}`}
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-[0.8rem] text-muted">
                          Each (LKR) {formatLkr(item.price)}
                        </div>
                        <div className="text-[0.8rem] text-muted">
                          Line (LKR) {formatLkr(lineGrossTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-t border-line pt-3">
                      <div className="text-[0.8rem] text-muted">Line Total</div>
                      <div className="text-right text-sm font-bold text-ink">
                        Total (LKR) {formatLkr(lineTotal)}
                      </div>
                      {lineDiscountAmount > 0 && (
                        <>
                          <div className="text-[0.78rem] text-success">Discount applied</div>
                          <div className="text-right text-[0.78rem] font-semibold text-success">
                            -{formatLkr(lineDiscountAmount)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-center gap-2.5 border-t border-line pt-4">
            <div className="flex justify-between text-[0.95rem] text-muted">
              <span>Subtotal (LKR)</span>
              <span>{formatLkr(subtotal)}</span>
            </div>
            {itemDiscountTotal > 0 && (
              <div className="flex justify-between text-[0.95rem] font-semibold text-success">
                <span>Item Discounts (LKR)</span>
                <span>-{formatLkr(itemDiscountTotal)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between text-[1.35rem] font-bold text-ink">
              <span>Net Total (LKR)</span>
              <span>{formatLkr(total)}</span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
              <button
                type="button"
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-bold transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-line bg-white text-muted hover:bg-hover hover:text-ink'
                }`}
                onClick={() => selectPaymentMethod('CASH')}
                disabled={Boolean(completedSale)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Banknote size={17} />
                  <span>Cash</span>
                </span>
                <Check
                  size={16}
                  className={paymentMethod === 'CASH' ? 'opacity-100' : 'opacity-0'}
                />
              </button>
              <button
                type="button"
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-bold transition-colors ${
                  paymentMethod === 'CARD'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-line bg-white text-muted hover:bg-hover hover:text-ink'
                }`}
                onClick={() => selectPaymentMethod('CARD')}
                disabled={Boolean(completedSale)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CreditCard size={17} />
                  <span>Card</span>
                </span>
                <Check
                  size={16}
                  className={paymentMethod === 'CARD' ? 'opacity-100' : 'opacity-0'}
                />
              </button>
              <button
                type="button"
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-bold transition-colors ${
                  paymentMethod === 'CREDIT'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-line bg-white text-muted hover:bg-hover hover:text-ink'
                }`}
                onClick={() => selectPaymentMethod('CREDIT')}
                disabled={Boolean(completedSale)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CreditCard size={17} />
                  <span>Credit</span>
                </span>
                <Check
                  size={16}
                  className={paymentMethod === 'CREDIT' ? 'opacity-100' : 'opacity-0'}
                />
              </button>
            </div>

            {paymentMethod === 'CREDIT' && (
              <div className="mt-2">
                <SearchableSelect
                  triggerClassName={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm font-semibold outline-none transition-shadow ${!selectedCustomerId ? 'border-danger/60 bg-danger/5 focus:border-danger focus:shadow-md' : 'border-line bg-white text-ink focus:border-primary focus:shadow-md'} disabled:bg-subtle disabled:text-muted`}
                  options={[
                    { value: '', label: 'Select a customer...' },
                    ...customers.map((c) => ({ value: c.id.toString(), label: c.name }))
                  ]}
                  value={selectedCustomerId?.toString() ?? ''}
                  onChange={(val) => setSelectedCustomerId(val ? Number(val) : null)}
                  placeholder="Select a customer..."
                  searchPlaceholder="Search customers..."
                  disabled={Boolean(completedSale)}
                  ariaLabel="Select customer for credit sale"
                />
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 rounded-md border border-line bg-subtle p-3">
                <label className="text-[0.9rem] font-semibold text-muted" htmlFor="cash-received">
                  Cash Received (LKR)
                </label>
                <input
                  id="cash-received"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`h-10 rounded-md border bg-white px-2 text-right text-sm font-bold text-ink outline-none transition-colors disabled:bg-subtle disabled:text-muted ${
                    hasCashReceivedError
                      ? 'border-danger focus:border-danger'
                      : 'border-line focus:border-primary'
                  }`}
                  placeholder={formatLkr(total)}
                  value={cashReceivedInput}
                  onChange={(event) => setCashReceivedInput(event.target.value)}
                  disabled={Boolean(completedSale)}
                />
                <div
                  className={
                    hasCashReceivedError
                      ? 'text-sm font-semibold text-danger'
                      : 'text-sm font-semibold text-muted'
                  }
                >
                  Balance
                </div>
                <div
                  className={
                    hasCashReceivedError
                      ? 'text-right text-sm font-bold text-danger'
                      : 'text-right text-sm font-bold text-success'
                  }
                >
                  {hasCashReceivedError ? 'Not enough' : formatLkr(balanceAmount)}
                </div>
              </div>
            )}

            <button
              className="mt-4 flex items-center justify-center gap-2.5 rounded-md bg-success py-3.5 text-lg font-bold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-success-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-faint disabled:hover:translate-y-0 disabled:hover:bg-line-strong"
              onClick={handlePay}
              disabled={cart.length === 0 || isPaying || hasCashReceivedError}
            >
              <CreditCard size={24} />
              {completedSale
                ? 'VIEW RECEIPT'
                : isPaying
                  ? 'SAVING...'
                  : `PREVIEW BILL (LKR) ${formatLkr(total)}`}
            </button>
          </div>
        </section>
      </div>

      <QuantityModal
        isOpen={isQtyModalOpen}
        productName={selectedProduct?.name || ''}
        unitPrice={selectedProduct?.sellingPrice ?? 0}
        initialQuantity={1}
        maxQuantity={selectedAvailableQuantity}
        unit={selectedProduct?.unit}
        onClose={handleQuantityModalClose}
        onConfirm={handleConfirmQuantity}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        cartItems={cart}
        subtotal={completedSale ? calculateSaleGrossSubtotal(completedSale.items) : subtotal}
        tax={completedSale?.tax ?? tax}
        discountAmount={completedSale?.discountAmount ?? discountAmount}
        total={completedSale?.total ?? total}
        cashReceivedAmount={effectiveCashReceivedAmount}
        balanceAmount={balanceAmount}
        saleNumber={completedSale?.saleNumber}
        dailyBillNumber={completedSale?.dailyBillNumber}
        paidAt={completedSale?.paidAt}
        paymentMethod={completedSale?.paymentMethod ?? paymentMethod}
        cashierName={cashierName}
        onProcessToBill={processCurrentBill}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={resetWorkingBill}
      />
    </div>
  )
}

export default SalesPage

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 text-center text-muted">
    <PackageSearch size={38} className="text-faint" />
    <span>{text}</span>
  </div>
)

function clampQuantity(value: number, maxQuantity: number): number {
  return Math.min(Math.max(0.001, value), Math.max(0.001, maxQuantity))
}

function clampDiscountAmount(value: number, maxAmount: number): number {
  if (!Number.isFinite(value) || value < 0) return 0

  return roundMoney(Math.min(value, Math.max(0, maxAmount)))
}

function normalizeCartItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    ...item,
    discountAmount: clampDiscountAmount(item.discountAmount ?? 0, item.price * item.quantity)
  }))
}

function normalizeCheckoutPaymentMethod(value: SalePaymentMethod | undefined): SalePaymentMethod {
  return value === 'CARD' ? 'CARD' : 'CASH'
}

function getCartItemGrossTotal(item: Pick<CartItem, 'price' | 'quantity'>): number {
  return roundMoney(item.price * item.quantity)
}

function getCartItemDiscountAmount(item: CartItem): number {
  return clampDiscountAmount(item.discountAmount ?? 0, getCartItemGrossTotal(item))
}

function getCartItemLineTotal(item: CartItem): number {
  return Math.max(0, roundMoney(getCartItemGrossTotal(item) - getCartItemDiscountAmount(item)))
}

function calculateSaleGrossSubtotal(items: SaleRecord['items']): number {
  return roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
}

function loadHeldBills(): HeldBill[] {
  try {
    const rawValue = localStorage.getItem(HELD_BILLS_STORAGE_KEY)
    if (!rawValue) return []

    const parsedValue: unknown = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) return []

    return parsedValue.filter(isHeldBill).map((bill) => ({
      ...bill,
      items: normalizeCartItems(bill.items),
      paymentMethod: normalizeCheckoutPaymentMethod(bill.paymentMethod),
      discountAmount: 0,
      cashReceivedAmount: bill.cashReceivedAmount ?? 0,
      customerId: bill.customerId ?? null
    }))
  } catch {
    return []
  }
}

function saveHeldBills(heldBills: HeldBill[]): void {
  try {
    localStorage.setItem(HELD_BILLS_STORAGE_KEY, JSON.stringify(heldBills))
  } catch {
    // Holding bills is a convenience feature; checkout must keep working if storage is unavailable.
  }
}

function loadCurrentBillDraft(): CurrentBillDraft | null {
  try {
    const rawValue = localStorage.getItem(CURRENT_BILL_STORAGE_KEY)
    if (!rawValue) return null

    const parsedValue: unknown = JSON.parse(rawValue)
    return isCurrentBillDraft(parsedValue)
      ? {
          ...parsedValue,
          items: normalizeCartItems(parsedValue.items),
          paymentMethod: normalizeCheckoutPaymentMethod(parsedValue.paymentMethod),
          discountAmount: 0,
          cashReceivedAmount: parsedValue.cashReceivedAmount ?? 0,
          customerId: parsedValue.customerId ?? null
        }
      : null
  } catch {
    return null
  }
}

function saveCurrentBillDraft(draft: CurrentBillDraft): void {
  try {
    if (
      draft.items.length === 0 &&
      !draft.activeHeldBillId &&
      draft.discountAmount === 0 &&
      draft.cashReceivedAmount === 0
    ) {
      localStorage.removeItem(CURRENT_BILL_STORAGE_KEY)
      return
    }

    localStorage.setItem(CURRENT_BILL_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Keeping the current bill across tab switches is a convenience feature; checkout must keep working if storage is unavailable.
  }
}

function clearCurrentBillDraft(): void {
  try {
    localStorage.removeItem(CURRENT_BILL_STORAGE_KEY)
  } catch {
    // Ignore storage errors when clearing.
  }
}

function isCurrentBillDraft(value: unknown): value is CurrentBillDraft {
  const draft = value as Partial<CurrentBillDraft>

  return (
    Array.isArray(draft.items) &&
    draft.items.every(isCartItem) &&
    isPaymentMethod(draft.paymentMethod) &&
    (draft.discountAmount === undefined || typeof draft.discountAmount === 'number') &&
    (draft.cashReceivedAmount === undefined || typeof draft.cashReceivedAmount === 'number') &&
    (draft.customerId === undefined ||
      draft.customerId === null ||
      typeof draft.customerId === 'number') &&
    (draft.activeHeldBillId === null || typeof draft.activeHeldBillId === 'string')
  )
}

function isHeldBill(value: unknown): value is HeldBill {
  const bill = value as Partial<HeldBill>

  return (
    typeof bill.id === 'string' &&
    typeof bill.name === 'string' &&
    Array.isArray(bill.items) &&
    bill.items.every(isCartItem) &&
    isPaymentMethod(bill.paymentMethod) &&
    (bill.discountAmount === undefined || typeof bill.discountAmount === 'number') &&
    (bill.cashReceivedAmount === undefined || typeof bill.cashReceivedAmount === 'number') &&
    (bill.customerId === undefined ||
      bill.customerId === null ||
      typeof bill.customerId === 'number') &&
    typeof bill.createdAt === 'string' &&
    typeof bill.updatedAt === 'string'
  )
}

function isCartItem(value: unknown): value is CartItem {
  const item = value as Partial<CartItem>

  return (
    typeof item.id === 'number' &&
    typeof item.sku === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.brand === 'string' &&
    typeof item.stockQuantity === 'number' &&
    typeof item.quantity === 'number' &&
    (item.discountAmount === undefined || typeof item.discountAmount === 'number')
  )
}

function isPaymentMethod(value: unknown): value is SalePaymentMethod {
  return (
    value === 'CASH' ||
    value === 'CARD' ||
    value === 'BANK_TRANSFER' ||
    value === 'MOBILE_PAY' ||
    value === 'CREDIT'
  )
}

function createHeldBillId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `held-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createHeldBillName(isoDate: string): string {
  return `Hold ${formatShortDate(isoDate)}`
}

function formatHeldBillSummary(bill: HeldBill): string {
  const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = roundMoney(bill.items.reduce((sum, item) => sum + getCartItemLineTotal(item), 0))
  const discountAmount = Math.min(bill.discountAmount ?? 0, subtotal * (1 + TAX_RATE))
  const total = subtotal * (1 + TAX_RATE) - discountAmount

  return `${itemCount} item(s) - Total (LKR) ${formatLkr(total)}`
}

function parseMoneyInput(value: string): number {
  if (value.trim() === '') return 0

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0

  return parsedValue
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function formatMoneyInput(value: number): string {
  return value > 0 ? value.toString() : ''
}

function getCurrentCashierName(): string {
  try {
    const rawValue = window.localStorage.getItem('grocery-pos-current-user')
    if (!rawValue) return 'CASHIER'

    const user = JSON.parse(rawValue) as { name?: unknown }

    return typeof user.name === 'string' && user.name.trim() ? user.name.trim() : 'CASHIER'
  } catch {
    return 'CASHIER'
  }
}

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function getStockBadgeClass(product: ProductRecord): string {
  if (product.stockQuantity === 0) {
    return 'border border-danger/20 bg-danger/10 text-danger'
  }

  if (product.stockQuantity <= product.reorderLevel) {
    return 'border border-warning/25 bg-warning/10 text-warning'
  }

  return 'border border-success/20 bg-success/10 text-success'
}
