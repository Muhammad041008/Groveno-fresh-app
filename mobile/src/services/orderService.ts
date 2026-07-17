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

export async function getPickupPoints(): Promise<PickupPoint[]> {
  const res = await api.get('/api/pickup-points');
  return res.data.pickupPoints ?? res.data ?? [];
}

export async function placeHomeDelivery(data: {
  items: Array<{ product: string; name: string; price: number; qty: number; total: number }>;
  address: { society: string; tower: string; flat: string; instructions?: string };
  deliverySlot: string;
  clCode?: string;
  coinsToUse?: number;
  paymentMethod: string;
  specialInstructions?: string;
}): Promise<Order> {
  const res = await api.post('/api/orders/home-delivery', data);
  return res.data.order ?? res.data;
}

export async function placeExpressPickup(data: {
  items: Array<{ product: string; name: string; price: number; qty: number; total: number }>;
  pickupPointId: string;
  paymentMethod: string;
}): Promise<Order> {
  const res = await api.post('/api/orders/express-pickup', data);
  return res.data.order ?? res.data;
}

export async function getMyOrders(page = 1, limit = 20): Promise<Order[]> {
  const res = await api.get('/api/orders', { params: { page, limit } });
  return res.data.orders ?? res.data ?? [];
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
  const res = await api.get(`/api/cl/validate/${code}`);
  return res.data;
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
  await api.post(`/api/orders/${orderId}/location-update`, {
    lat,
    lng,
    distanceToHub,
  });
}

export async function markArrived(orderId: string): Promise<void> {
  await api.post(`/api/orders/${orderId}/arrived`);
}
