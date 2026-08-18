import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Demo Mode sentinel — matches the offline token set by authService.verifyOtpMock()
// when the backend is unreachable. Declared at the top so all functions below can
// reference it without hitting the temporal dead zone.
const DEMO_TOKEN = 'demo_jwt_groveno_offline';
// Demo CL code — only valid when the demo sentinel token is active
const DEMO_CL_CODE = 'CLDEMO123';

export interface OrderItem {
  product: string;
  name: string;
  price: number;
  qty: number;
  total: number;
  emoji?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  channel: 'home_delivery' | 'express_pickup' | 'cl_order';
  status: string;
  pickupStatus?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  pickupDiscount?: number;
  total: number;
  coinsEarned?: number;
  coinsUsed?: number;
  clCodeUsed?: string;
  paymentMethod?: string;
  isRated?: boolean;
  ratingSkipCount?: number;
  createdAt: string;
  deliverySlot?: string;
  address?: {
    society: string;
    tower: string;
    flat: string;
    instructions?: string;
  };
  pickupPoint?: {
    _id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  qrCode?: string;
}

export interface PickupPoint {
  _id: string;
  name: string;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  operatingHours: { open: string; close: string };
  isActive: boolean;
}

const DEMO_PICKUP_POINTS: PickupPoint[] = [
  {
    _id: 'pp1',
    name: 'Green Hub — Sector 21',
    address: 'Near Main Gate, Sector 21, Noida',
    latitude: 28.6139,
    longitude: 77.2090,
    operatingHours: { open: '4:00 PM', close: '8:00 PM' },
    isActive: true,
  },
  {
    _id: 'pp2',
    name: 'Fresh Point — Block A',
    address: 'Block A Community Centre, Sector 15',
    latitude: 28.6200,
    longitude: 77.2150,
    operatingHours: { open: '5:00 PM', close: '9:00 PM' },
    isActive: true,
  },
];

export async function getPickupPoints(): Promise<PickupPoint[]> {
  try {
    const res = await api.get('/api/pickup-points');
    const pts = res.data.pickupPoints ?? res.data ?? [];
    return pts.length > 0 ? pts : DEMO_PICKUP_POINTS;
  } catch {
    return DEMO_PICKUP_POINTS;
  }
}

// In-memory demo order store — survives tab switches within one app session
const DEMO_ORDER_STORE: Order[] = [];

/**
 * Generates a lightweight offline order for Demo Mode only.
 * total is passed in from the caller so My Orders / Order Success show the right amount.
 */
function makeDemoOrder(
  channel: 'home_delivery' | 'express_pickup' | 'cl_order',
  total: number
): Order {
  const suffix = Date.now().toString().slice(-6);
  const order: Order = {
    _id: `demo_order_${suffix}`,
    orderNumber: `GRV${suffix}`,
    channel,
    status: 'confirmed',
    items: [],
    subtotal: total,
    deliveryFee: channel === 'home_delivery' || channel === 'cl_order' ? (total >= 199 ? 0 : 30) : 30,
    packagingFee: 5,
    discount: channel === 'express_pickup' ? Math.round(total * 0.05) : 0,
    total,
    coinsEarned: 15,
    paymentMethod: 'cod',
    createdAt: new Date().toISOString(),
  };
  DEMO_ORDER_STORE.unshift(order);
  return order;
}

/**
 * Places a Home Delivery or CL order.
 * Payload matches the backend expandItems contract: items need productId + quantity.
 * In Demo Mode (demo_jwt_groveno_offline token), falls back to an offline order.
 * In production, propagates errors so they surface in the UI.
 */
export async function placeHomeDelivery(data: {
  items: Array<{ productId: string; quantity: number }>;
  address?: {
    line1: string;
    pincode: string;
    society?: string;
    tower?: string;
    flat?: string;
    instructions?: string;
  };
  deliverySlot: string;
  clCode?: string;
  coinsToUse?: number;
  paymentMethod: string;
  specialInstructions?: string;
  channel?: 'home_delivery' | 'cl_order';
  /** Grand total from the checkout screen; used only in Demo Mode fallback. */
  _demoTotal?: number;
}): Promise<Order> {
  try {
    const res = await api.post('/api/orders/home-delivery', data);
    return res.data.order ?? res.data;
  } catch (err) {
    const tok = await AsyncStorage.getItem('groveno_token');
    if (tok === DEMO_TOKEN) {
      console.warn('[Demo] placeHomeDelivery: backend unreachable — returning offline demo order');
      return makeDemoOrder(data.channel ?? 'home_delivery', data._demoTotal ?? 0);
    }
    // Production: surface the real error so it appears in Payment Failed alert
    console.error('[orderService] placeHomeDelivery failed:', (err as any)?.response?.data ?? err);
    throw err;
  }
}

/**
 * Places an Express Pickup order.
 * Payload matches the backend expandItems contract: items need productId + quantity.
 */
export async function placeExpressPickup(data: {
  items: Array<{ productId: string; quantity: number }>;
  pickupPointId: string;
  paymentMethod: string;
  _demoTotal?: number;
}): Promise<Order> {
  try {
    const res = await api.post('/api/orders/express-pickup', data);
    return res.data.order ?? res.data;
  } catch (err) {
    const tok = await AsyncStorage.getItem('groveno_token');
    if (tok === DEMO_TOKEN) {
      console.warn('[Demo] placeExpressPickup: backend unreachable — returning offline demo order');
      return makeDemoOrder('express_pickup', data._demoTotal ?? 0);
    }
    console.error('[orderService] placeExpressPickup failed:', (err as any)?.response?.data ?? err);
    throw err;
  }
}

export async function getMyOrders(page = 1, limit = 20): Promise<Order[]> {
  try {
    const res = await api.get('/api/orders', { params: { page, limit } });
    // Real backend response — return as-is (may be empty array for a new user)
    return res.data.orders ?? res.data ?? [];
  } catch (err) {
    const tok = await AsyncStorage.getItem('groveno_token');
    if (tok === DEMO_TOKEN) {
      // Demo Mode (backend unreachable) — return in-session demo orders
      return [...DEMO_ORDER_STORE];
    }
    // Production: surface the API error; do NOT return fake orders
    console.error('[orderService] getMyOrders failed:', (err as any)?.response?.data ?? err);
    throw err;
  }
}

export async function getOrderById(id: string): Promise<Order> {
  const res = await api.get(`/api/orders/${id}`);
  return res.data.order ?? res.data;
}

export async function getPendingRating(): Promise<Order | null> {
  try {
    const res = await api.get('/api/orders/pending-rating');
    return res.data.order ?? null;
  } catch {
    return null;
  }
}

export async function submitRating(
  orderId: string,
  ratings: Array<{ productId: string; stars: number; review?: string }>
): Promise<void> {
  await api.post(`/api/orders/${orderId}/rate`, { ratings });
}

export async function skipRating(orderId: string): Promise<void> {
  await api.post(`/api/orders/${orderId}/skip-rating`);
}

// Demo Mode sentinel and CL code are declared at the top of this file.

export async function validateClCode(code: string): Promise<{
  valid: boolean;
  clName?: string;
  society?: string;
  coinsToEarn?: number;
}> {
  // Demo Mode guard: CLDEMO123 works ONLY when the demo token is active.
  // In production the stored token will be a real JWT, so this block is never entered.
  if (code.toUpperCase() === DEMO_CL_CODE) {
    const storedToken = await AsyncStorage.getItem('groveno_token');
    if (storedToken === DEMO_TOKEN) {
      return {
        valid: true,
        clName: 'Demo Community Leader',
        society: 'Demo Society, Sector 21',
        coinsToEarn: 15,
      };
    }
    // Reached only in production — fall through to real API validation
  }

  try {
    const res = await api.get(`/api/cl/validate/${code}`);
    return res.data;
  } catch {
    return { valid: false };
  }
}

export async function startTracking(orderId: string): Promise<{
  hubLat: number;
  hubLng: number;
  hubAddress: string;
}> {
  const res = await api.post(`/api/orders/${orderId}/start-tracking`);
  return res.data;
}

export async function sendLocationUpdate(
  orderId: string,
  lat: number,
  lng: number,
  distanceToHub: number
): Promise<void> {
  await api.post(`/api/orders/${orderId}/location-update`, { lat, lng, distanceToHub });
}

export async function markArrived(orderId: string): Promise<void> {
  await api.post(`/api/orders/${orderId}/arrived`);
}
