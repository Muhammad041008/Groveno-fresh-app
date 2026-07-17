import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Zap, MapPin, AlertTriangle, CheckCircle2, Timer, User, Phone } from 'lucide-react';
import api, { API_ROOT } from '../lib/api';
import { PageHeader, Loader, StatusBadge, EmptyState } from '../components/UI.jsx';
import { inr, fmtDate } from '../lib/format.jsx';

export default function ExpressPickup() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/admin/express-pickup/active');
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Open SSE for live updates
    const token = localStorage.getItem('groveno_admin_token');
    const es = new EventSource(`${API_ROOT}/api/stream/admin/express-pickup/stream?token=${token}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('snapshot', (e) => {
      const { orders } = JSON.parse(e.data);
      setOrders(orders);
    });
    es.addEventListener('location', (e) => {
      const p = JSON.parse(e.data);
      setOrders((os) => os.map((o) => o.id === p.orderId
        ? { ...o, locationPings: [...(o.locationPings || []), { lat: p.lat, lng: p.lng, distanceToHub: p.distanceToHub, ts: p.ts }] }
        : o));
    });
    es.addEventListener('status', (e) => {
      const p = JSON.parse(e.data);
      if (p.order?.channel === 'express_pickup') {
        setOrders((os) => {
          const exists = os.find((o) => o.id === p.orderId);
          if (exists) return os.map((o) => o.id === p.orderId ? { ...o, ...p.order } : o);
          // if new active order push it, otherwise ignore
          if (['confirmed', 'customer_on_way', 'arrived', 'ready_for_pickup'].includes(p.status)) {
            return [p.order, ...os];
          }
          return os.filter((o) => o.id !== p.orderId);
        });
        if (p.status === 'arrived') {
          toast.error(`🚨 ${p.order.orderNumber}: Customer ARRIVED`, { duration: 6000 });
        }
      }
    });
    es.addEventListener('arrived', () => {
      // handled via status above
    });
    es.addEventListener('created', (e) => {
      const { order } = JSON.parse(e.data);
      setOrders((os) => [order, ...os.filter((o) => o.id !== order.id)]);
      toast.success(`New pickup: ${order.orderNumber}`);
    });

    return () => es.close();
  }, []);

  const markReady = async (o) => {
    try {
      await api.put(`/admin/orders/${o.id}/status`, { status: 'ready_for_pickup' });
      toast.success('Marked ready');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const markCollected = async (o) => {
    try {
      const code = prompt(`Enter verification code (OTP: ${o.pickupOtp}):`, o.pickupOtp);
      if (code == null) return;
      await api.put(`/orders/${o.id}/collected`, { verificationCode: code });
      toast.success('Order collected');
      setOrders((os) => os.filter((x) => x.id !== o.id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-express-pickup">
      <PageHeader
        title="Express Pickup — Live"
        subtitle="Real-time customer location and pickup activity"
        right={
          <div className={`badge ${connected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
            {connected ? 'Live' : 'Connecting…'}
          </div>
        }
      />

      {loading ? <Loader /> : orders.length === 0 ? (
        <EmptyState title="No active pickup orders" subtitle="New orders will appear here in real-time." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((o) => <PickupCard key={o.id} order={o} onReady={markReady} onCollected={markCollected} />)}
        </div>
      )}
    </div>
  );
}

function PickupCard({ order, onReady, onCollected }) {
  const lastPing = order.locationPings?.[order.locationPings.length - 1];
  const dist = lastPing?.distanceToHub ?? null;
  const approaching = dist != null && dist <= 2 && dist > 0.3 && order.status === 'customer_on_way';
  const arrived = order.status === 'arrived';

  const bar = arrived ? 'border-red-400 bg-red-50' : approaching ? 'border-yellow-300 bg-yellow-50' : 'border-slate-100 bg-white';

  return (
    <div className={`card border-2 ${bar} p-5 transition`} data-testid={`pickup-card-${order.id}`}>
      {arrived && (
        <div className="mb-3 p-3 rounded-lg bg-red-100 border border-red-200 flex items-center gap-2 animate-pulse">
          <AlertTriangle size={18} className="text-red-600" />
          <span className="font-semibold text-red-700">Customer ARRIVED at hub!</span>
        </div>
      )}
      {approaching && (
        <div className="mb-3 p-3 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center gap-2">
          <Timer size={16} className="text-yellow-700" />
          <span className="font-medium text-yellow-800">Customer approaching — {dist.toFixed(2)} km away</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{order.orderNumber}</div>
          <div className="text-sm text-slate-500">{fmtDate(order.createdAt)}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="text-sm text-slate-700 space-y-1 mb-4">
        <div className="flex items-center gap-2"><User size={14} className="text-slate-400" /> {order.userName || 'Customer'} </div>
        {order.userPhone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {order.userPhone}</div>}
        <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {order.pickupPointName}</div>
        <div>OTP: <span className="font-mono font-semibold text-brand-700">{order.pickupOtp}</span> · Total: <span className="font-semibold">{inr(order.total)}</span></div>
        {dist != null && <div className="text-slate-500">Distance to hub: <span className="font-medium text-slate-700">{dist.toFixed(2)} km</span></div>}
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <button className="btn-outline flex-1" onClick={() => onReady(order)} data-testid={`btn-ready-${order.id}`}>
          <Zap size={15} /> Mark Ready
        </button>
        <button className="btn-primary flex-1" onClick={() => onCollected(order)} data-testid={`btn-collected-${order.id}`}>
          <CheckCircle2 size={15} /> Mark Collected
        </button>
      </div>
    </div>
  );
}
