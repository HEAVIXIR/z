/**
 * HEAVIX store — shared API types for the marketplace UI.
 *
 * These types describe the JSON shape returned by the PUBLIC store API
 * routes under `/api/store/*`. They are intentionally separate from
 * the HEAVIX main types (`@/lib/types`) so the store has ZERO coupling
 * to the listings domain.
 *
 * All numeric prices are received as `number` (the API serializes Float
 * fields via `Number()` before sending).
 */

export interface EffectiveRate {
  rate: number;
  marginPercent: number;
  source: "MANUAL" | "TELEGRAM" | "DEFAULT";
  date: string;
}

export interface CurrencyInfo extends EffectiveRate {
  lastAutoRate: number | null;
  lastAutoStatus: string | null;
  lastAutoFetchAt: string | null;
  autoUpdateEnabled: boolean;
  autoSource: string | null;
  defaultRate: number | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
  partsCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parentId?: string | null;
  children?: Category[];
  partCount?: number;
}

export interface CarModel {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
}

export interface CarModelGroup {
  brand: string;
  models: CarModel[];
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  customerName: string;
}

export interface Part {
  id: string;
  name: string;
  nameFa: string | null;
  sku: string;
  description?: string | null;
  priceUsd: number;
  priceIrr: number;
  priceIrrFormatted: string;
  oldPriceUsd?: number | null;
  oldPriceIrr?: number | null;
  oldPriceIrrFormatted?: string | null;
  discountPercent?: number | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  compatibleCars: unknown[];
  featured: boolean;
  views: number;
  soldCount: number;
  createdAt: string;
  brand: { id: string; name: string; country: string | null } | null;
  category: { id: string; name: string; slug: string };
  carModels: CarModel[];
  ratingAvg: number;
  ratingCount: number;
  wishlistCount?: number;
  reviews?: Review[];
}

export interface Mechanic {
  id: string;
  name: string;
  family: string;
  shopName: string | null;
  specialty: string | null;
  city: string | null;
  address: string | null;
  phone: string;
  rating: number;
  verified: boolean;
  totalOrders: number;
}

export interface OrderItem {
  id: string;
  partId: string;
  partNameSnapshot: string;
  quantity: number;
  unitPriceUsd: number;
  unitPriceIrr: number;
  lineTotalUsd: number;
  lineTotalIrr: number;
  part?: {
    id: string;
    name: string;
    nameFa: string | null;
    sku: string;
    images: string;
    active: boolean;
  } | null;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber?: string;
  amountIrr: number;
  amountUsd: number;
  method: string;
  status: string;
  gateway?: string | null;
  authority?: string | null;
  refId?: string | null;
  referenceCode?: string | null;
  payerName?: string | null;
  payerCard?: string | null;
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface Shipment {
  id: string;
  carrier: string;
  trackingCode: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotalUsd: number;
  shippingUsd: number;
  discountIrr: number;
  totalUsd: number;
  totalIrr: number;
  currencyRateAtOrder: number;
  marginPercentAtOrder: number;
  couponCode: string | null;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
  payments?: Payment[];
  shipment?: Shipment | null;
  mechanic?: {
    id: string;
    shopName: string | null;
    name: string;
    family: string;
    phone: string;
  } | null;
}

export interface CouponValidation {
  valid: boolean;
  code?: string;
  type?: string;
  value?: number;
  discountIrr?: number;
  subtotalIrr?: number;
  totalAfterDiscount?: number;
  error?: string;
}

export interface CreateOrderResponse {
  ok: boolean;
  order: Order;
}

export interface ManualPaymentResponse {
  ok: boolean;
  payment: Payment;
  message: string;
}

export interface GatewayRequestResponse {
  ok: boolean;
  authority: string;
  gatewayUrl: string;
  method: "ZARINPAL" | "MOCK";
  paymentId: string;
}
