import api from './api';

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

// Generates a realistic demo order when the backend is offline
function makeDemoOrder(
  channel: 'home_delivery' | 'express_pickup' | 'cl_order',
  items: Array<{ product: string; name: string; price: number; qty: number; total: number }>,
  total: number
): Order {
  const suffix = Date.now().toString().slice(-6);
  const order: Order = {
    _id: `demo_order_${suffix}`,
    orderNumber: `GRV${suffix}`,
    channel,
    status: 'confirmed',
    items: items.map((i) => ({ ...i, emoji: '🛒' })),
    subtotal: total,
    deliveryFee: channel === 'home_delivery' || channel === 'cl_order' ? (total >= 199 ? 0 : 30) : 30,
    packagingFee: 5,
    discount: channel === 'express_pickup' ? Math.round(total * 0.05) : 0,
    total,
    coinsEarned: 15,
    paymentMethod: 'cod',
    createdAt: new Date().toISOString(),
  };
  // Prepend so newest order appears first
  DEMO_ORDER_STORE.unshift(order);
  return order;
}

export async function placeHomeDelivery(data: {
  items: Array<{ product: string; name: string; price: number; qty: number; total: number }>;
  address: { society: string; tower: string; flat: string; instructions?: string };
  deliverySlot: string;
  clCode?: string;
  coinsToUse?: number;
  paymentMethod: string;
  specialInstructions?: string;
  channel?: 'home_delivery' | 'cl_order';
}): Promise<Order> {
  try {
    const res = await api.post('/api/orders/home-delivery', data);
    return res.data.order ?? res.data;
  } catch {
    return makeDemoOrder(
      data.channel ?? 'home_delivery',
      data.items,
      data.items.reduce((s, i) => s + i.total, 0)
    );
  }
}

export async function placeExpressPickup(data: {
  items: Array<{ product: string; name: string; price: number; qty: number; total: number }>;
  pickupPointId: string;
  paymentMethod: string;
}): Promise<Order> {
  try {
    const res = await api.post('/api/orders/express-pickup', data);
    return res.data.order ?? res.data;
  } catch {
    return makeDemoOrder('express_pickup', data.items, data.items.reduce((s, i) => s + i.total, 0));
  }
}

export async function getMyOrders(page = 1, limit = 20): Promise<Order[]> {
  try {
    const res = await api.get('/api/orders', { params: { page, limit } });
    const serverOrders = res.data.orders ?? res.data ?? [];
    // In demo mode the backend is offline — fall back to in-session demo orders
    return serverOrders.length > 0 ? serverOrders : [...DEMO_ORDER_STORE];
  } catch {
    return [...DEMO_ORDER_STORE];
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

export async function validateClCode(code: string): Promise<{
  valid: boolean;
  clName?: string;
  society?: string;
  coinsToEarn?: number;
}> {
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
