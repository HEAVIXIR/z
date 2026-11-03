'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { StoreHeader } from '@/components/store/StoreHeader'
import { Hero } from '@/components/store/Hero'
import { CarSelector, type VehicleType } from '@/components/store/CarSelector'
import { CategoryChips } from '@/components/store/CategoryChips'
import { PartsGrid, type PartsFilters, type SortOption } from '@/components/store/PartsGrid'
import { PartDetailDialog } from '@/components/store/PartDetailDialog'
import { CartSheet } from '@/components/store/CartSheet'
import { CheckoutDialog } from '@/components/store/CheckoutDialog'
import { MyOrdersDialog } from '@/components/store/MyOrdersDialog'
import { WishlistDialog } from '@/components/store/WishlistDialog'
import { MechanicsDialog } from '@/components/store/MechanicsDialog'
import { StoreFooter } from '@/components/store/StoreFooter'
import { useStoreCart } from '@/lib/store-cart'
import type {
  Part,
  Category,
  Brand,
  CarModelGroup,
  Mechanic,
  CurrencyInfo,
  CouponValidation,
  EffectiveRate,
  Order,
} from '@/lib/store-types'

export const dynamic = "force-dynamic";

export default function StorePage() {
  // -- top-level state
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [parts, setParts] = useState<Part[]>([])
  const [partsLoading, setPartsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [carGroups, setCarGroups] = useState<CarModelGroup[]>([])
  const [mechanics, setMechanics] = useState<Mechanic[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<PartsFilters>({
    q: '',
    categoryId: '',
    brandId: '',
    sort: 'newest',
    onlyInStock: false,
    onlyDiscount: false,
  })

  const [vehicleType, setVehicleType] = useState<VehicleType>('PASSENGER')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // UI: dialogs / sheets
  const [openPart, setOpenPart] = useState<Part | null>(null)
  const [partDialogOpen, setPartDialogOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [mechanicsOpen, setMechanicsOpen] = useState(false)
  const [highlightOrder, setHighlightOrder] = useState<string | null>(null)

  const [coupon, setCoupon] = useState<CouponValidation | null>(null)

  // -- cart store
  const cartItems = useStoreCart((s) => s.items)
  const cartAddItem = useStoreCart((s) => s.addItem)
  const wishlistPartIds = useStoreCart((s) => s.wishlistPartIds)
  const customerPhone = useStoreCart((s) => s.customerPhone)

  const shippingUsd = 2 // flat fee

  // ---- bootstrap fetches
  useEffect(() => {
    fetch('/api/store/currency').then((r) => r.json()).then(setCurrency).catch(() => {})
    fetch('/api/store/categories').then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {})
    fetch('/api/store/brands').then((r) => r.json()).then((d) => setBrands(d.brands || [])).catch(() => {})
    fetch('/api/store/mechanics').then((r) => r.json()).then((d) => setMechanics(d.mechanics || [])).catch(() => {})
    fetch(`/api/store/car-models?type=${vehicleType}`).then((r) => r.json()).then((d) => setCarGroups(d.grouped || [])).catch(() => {})
  }, [])

  // ---- parts fetch (debounced search)
  useEffect(() => {
    const t = setTimeout(() => {
      setPartsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.brandId) params.set('brandId', filters.brandId)
      if (selectedModelId) params.set('carModelId', selectedModelId)
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.onlyInStock) params.set('onlyInStock', 'true')
      if (filters.onlyDiscount) params.set('onlyDiscount', 'true')

      fetch(`/api/store/parts?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setParts(d.parts || [])
          if (d.currency) setCurrency((c) => (c ? { ...c, ...d.currency } : c))
        })
        .catch(() => toast.error('خطا در بارگذاری قطعات'))
        .finally(() => setPartsLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery, filters, selectedModelId])

  // ---- refetch car models when vehicle type changes
  useEffect(() => {
    setSelectedBrand(''); setSelectedModelId(''); setSelectedYear(null)
    fetch(`/api/store/car-models?type=${vehicleType}`).then((r) => r.json()).then((d) => setCarGroups(d.grouped || [])).catch(() => {})
  }, [vehicleType])

  // ---- handle payment redirect callback (?payment=success&order=X)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const pay = url.searchParams.get('payment')
    const order = url.searchParams.get('order')
    if (pay === 'success') {
      toast.success('پرداخت با موفقیت انجام شد', {
        description: order ? `شماره سفارش: ${order}` : undefined,
      })
      if (order) {
        setHighlightOrder(order)
        setOrdersOpen(true)
      }
      url.searchParams.delete('payment')
      url.searchParams.delete('order')
      window.history.replaceState({}, '', url.toString())
    } else if (pay === 'failed') {
      toast.error('پرداخت ناموفق بود', {
        description: order ? `سفارش ${order}` : undefined,
      })
      url.searchParams.delete('payment')
      url.searchParams.delete('order')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // ---- wishlist sync on phone change
  useEffect(() => {
    if (!customerPhone) return
    fetch(`/api/store/wishlist?phone=${encodeURIComponent(customerPhone)}`)
      .then((r) => r.json())
      .then((d) => useStoreCart.getState().setWishlist(d.partIds || []))
      .catch(() => {})
  }, [customerPhone])

  // ---- actions
  const refreshRate = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/store/currency', { method: 'POST' })
      const d = await res.json()
      const fresh = await fetch('/api/store/currency').then((r) => r.json())
      setCurrency(fresh)
      if (d.ok) {
        toast.success('نرخ بروزرسانی شد', {
          description: `نرخ جدید: ${new Intl.NumberFormat('fa-IR').format(d.rate)} تومان (${d.status})`,
        })
      } else {
        toast.warning(d.message || 'دریافت نرخ ناموفق بود')
      }
    } catch {
      toast.error('خطا در بروزرسانی نرخ')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const addToCart = useCallback(
    (p: Part) => {
      const eff: EffectiveRate = currency
        ? { rate: currency.rate, marginPercent: currency.marginPercent, source: currency.source, date: currency.date }
        : { rate: 230000, marginPercent: 3, source: 'DEFAULT', date: '' }
      const withMargin = eff.rate * (1 + eff.marginPercent / 100)
      const priceIrr = Math.round(p.priceUsd * withMargin)
      cartAddItem({
        partId: p.id,
        name: p.name,
        nameFa: p.nameFa || p.name,
        sku: p.sku,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
        priceUsd: p.priceUsd,
        priceIrr,
        qty: 1,
        stock: p.stock,
      })
      setCartOpen(true)
      toast.success('به سبد اضافه شد', {
        description: p.nameFa || p.name,
      })
    },
    [cartAddItem, currency],
  )

  const toggleWishlist = useCallback(
    async (p: Part) => {
      const has = wishlistPartIds.includes(p.id)
      const action = has ? 'remove' : 'add'
      useStoreCart.getState().toggleWishlist(p.id)
      if (!customerPhone) {
        if (!has) toast.success('به علاقه‌مندی‌ها اضافه شد', { description: 'برای ذخیره دائمی، شماره موبایل خود را در «سفارش‌های من» وارد کنید.' })
        return
      }
      try {
        const res = await fetch('/api/store/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: customerPhone, partId: p.id, action }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'خطا')
        useStoreCart.getState().setWishlist(d.partIds || [])
        toast.success(has ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
      } catch (e) {
        useStoreCart.getState().toggleWishlist(p.id)
        toast.error((e as Error).message)
      }
    },
    [wishlistPartIds, customerPhone],
  )

  const removeWishlist = useCallback(
    async (p: Part) => {
      if (!customerPhone) {
        useStoreCart.getState().toggleWishlist(p.id)
        return
      }
      try {
        const res = await fetch('/api/store/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: customerPhone, partId: p.id, action: 'remove' }),
        })
        const d = await res.json()
        useStoreCart.getState().setWishlist(d.partIds || [])
      } catch {
        toast.error('خطا در حذف از علاقه‌مندی')
      }
    },
    [customerPhone],
  )

  const setFilter = useCallback(
    (f: Partial<PartsFilters>) => setFilters((cur) => ({ ...cur, ...f })),
    [],
  )

  const resetAll = useCallback(() => {
    setFilters({ q: '', categoryId: '', brandId: '', sort: 'newest', onlyInStock: false, onlyDiscount: false })
    setSearchQuery('')
    setSelectedBrand('')
    setSelectedModelId('')
    setSelectedYear(null)
  }, [])

  const featured = useMemo(() => parts.filter((p) => p.featured).slice(0, 6), [parts])

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b]">
      <StoreHeader
        currency={currency}
        refreshing={refreshing}
        onRefresh={refreshRate}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        cartCount={cartItems.reduce((s, i) => s + i.qty, 0)}
        wishlistCount={wishlistPartIds.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        onOpenOrders={() => setOrdersOpen(true)}
        onOpenMechanics={() => setMechanicsOpen(true)}
      />

      <main className="flex-1">
        <Hero
          featured={featured}
          currencyRate={currency?.rate || 0}
          onSelectPart={(p) => { setOpenPart(p); setPartDialogOpen(true) }}
          onSeeAll={() => document.getElementById('parts-section')?.scrollIntoView({ behavior: 'smooth' })}
          onOpenMechanics={() => setMechanicsOpen(true)}
        />

        <CarSelector
          groups={carGroups}
          vehicleType={vehicleType}
          selectedBrand={selectedBrand}
          selectedModelId={selectedModelId}
          selectedYear={selectedYear}
          onVehicleType={setVehicleType}
          onBrand={setSelectedBrand}
          onModel={setSelectedModelId}
          onYear={setSelectedYear}
          onClear={() => { setSelectedBrand(''); setSelectedModelId(''); setSelectedYear(null) }}
        />

        <CategoryChips
          categories={categories}
          selectedId={filters.categoryId}
          onSelect={(id) => setFilter({ categoryId: id })}
          onClear={() => setFilter({ categoryId: '' })}
        />

        <div id="parts-section" />
        <PartsGrid
          parts={parts}
          loading={partsLoading}
          filters={filters}
          setFilters={setFilter}
          categories={categories}
          brands={brands}
          totalCount={parts.length}
          onOpenPart={(p) => { setOpenPart(p); setPartDialogOpen(true) }}
          onAddToCart={addToCart}
          wishlistPartIds={wishlistPartIds}
          onToggleWishlist={toggleWishlist}
          resetAll={resetAll}
        />
      </main>

      <StoreFooter shopName="فروشگاه هویکس" shopPhone={currency ? '' : ''} />

      {/* Part detail dialog */}
      <PartDetailDialog
        part={openPart}
        open={partDialogOpen}
        onOpenChange={setPartDialogOpen}
        onAddToCart={addToCart}
        isWishlisted={openPart ? wishlistPartIds.includes(openPart.id) : false}
        onToggleWishlist={toggleWishlist}
        customerPhone={customerPhone}
      />

      {/* Cart sheet */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
        currency={currency}
        shippingUsd={shippingUsd}
        coupon={coupon}
        onCouponChange={setCoupon}
      />

      {/* Checkout dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={(v) => { setCheckoutOpen(v); if (!v) setCoupon(null) }}
        mechanics={mechanics}
        currency={currency}
        shippingUsd={shippingUsd}
        appliedCoupon={coupon}
        onClearCoupon={() => setCoupon(null)}
        onOrderCreated={(order: Order) => {
          setHighlightOrder(order.orderNumber)
          setOrdersOpen(true)
        }}
      />

      {/* My orders */}
      <MyOrdersDialog
        open={ordersOpen}
        onOpenChange={setOrdersOpen}
        highlightOrder={highlightOrder}
      />

      {/* Wishlist */}
      <WishlistDialog
        open={wishlistOpen}
        onOpenChange={setWishlistOpen}
        onAddToCart={addToCart}
        onRemoveWishlist={removeWishlist}
      />

      {/* Mechanics */}
      <MechanicsDialog
        open={mechanicsOpen}
        onOpenChange={setMechanicsOpen}
        mechanics={mechanics}
      />
    </div>
  )
}
