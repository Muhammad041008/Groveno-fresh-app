import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, User, MapPin, Package, BadgeCheck, Coins } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader, StatusBadge } from '../components/UI.jsx';
import { CHANNEL_LABEL, inr, fmtDate } from '../lib/format.jsx';

const STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered',
  'ready_for_pickup', 'customer_on_way', 'arrived', 'collected', 'cancelled', 'rejected'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    // Admin endpoint doesn't have get-by-id, use orders list filter by orderNumber
    // Use admin/orders?limit=200 and find, or fetch via ownership... We'll fetch single via admin/orders and filter
    const { data } = await api.get(`/admin/orders?limit=200`);
    const o = data.orders.find((x) => x.id === id);
    setOrder(o);
  };
  useEffect(() => { load();  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/orders/${id}/status`, { status });
      setOrder(data.order);
      toast.success(`Status → ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  if (!order) return <Loader />;

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="page-order-detail">
      <PageHeader
        title={order.orderNumber}
        subtitle={CHANNEL_LABEL[order.channel]}
        right={<button className="btn-outline" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Back</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-sm text-slate-500">Placed {fmtDate(order.createdAt)}</span>
              </div>
              <select
                value={order.status} disabled={saving}
                onChange={(e) => updateStatus(e.target.value)}
                className="input max-w-[220px]" data-testid="order-status-dropdown"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><Package size={16} /> Items</h4>
              <div className="space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      {it.image ? <img src={it.image} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-brand-50 grid place-items-center">🥗</div>}
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-slate-500">{it.variantLabel || it.variantSize} × {it.quantity}</div>
                      </div>
                    </div>
                    <div className="font-medium">{inr(it.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4 space-y-1.5 text-sm">
              <Row label="Items Total" value={inr(order.itemsTotal)} />
              {order.deliveryFee > 0 && <Row label="Delivery Fee" value={inr(order.deliveryFee)} />}
              {order.expressCharge > 0 && <Row label="Express / Confirmation" value={inr(order.expressCharge)} />}
              {order.pickupDiscount > 0 && <Row label="Pickup Discount (5%)" value={`- ${inr(order.pickupDiscount)}`} className="text-green-700" />}
              {order.coinsUsed > 0 && <Row label={`Coins Redeemed (${order.coinsUsed})`} value={`- ${inr(order.coinsValue)}`} className="text-green-700" />}
              <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{inr(order.total)}</span></div>
            </div>
          </div>

          {order.address?.line1 && (
            <div className="card p-6">
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><MapPin size={16} /> Delivery Address</h4>
              <div className="text-sm text-slate-600 leading-relaxed">
                <div className="font-medium text-slate-800">{order.address.label || 'Address'}</div>
                <div>{order.address.line1}</div>
                {order.address.line2 && <div>{order.address.line2}</div>}
                <div>{order.address.city} {order.address.state} — {order.address.pincode}</div>
                {order.address.landmark && <div className="text-slate-400">Landmark: {order.address.landmark}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><User size={16} /> Customer</h4>
            <div className="text-sm">
              <div className="font-medium">{order.userName || order.customerName || '—'}</div>
              <div className="text-slate-500">{order.userPhone || '—'}</div>
            </div>
          </div>

          {(order.clCode || order.clId) && (
            <div className="card p-6">
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><BadgeCheck size={16} /> Community Leader</h4>
              <div className="text-sm">
                <div className="font-medium text-brand-700">{order.clCode}</div>
                <div className="text-slate-500">Commission: {inr(order.clCommission)}</div>
                <div className={`badge mt-2 ${order.clCommissionCredited ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {order.clCommissionCredited ? 'Credited' : 'Pending'}
                </div>
              </div>
            </div>
          )}

          <div className="card p-6">
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><Coins size={16} /> Coins</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Used</span><span className="font-medium">{order.coinsUsed || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Earned</span><span className="font-medium">{order.coinsEarned || 0}</span></div>
            </div>
          </div>

          {order.channel === 'express_pickup' && (
            <div className="card p-6">
              <h4 className="font-medium text-slate-800 mb-3">Pickup Info</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Hub</span><span>{order.pickupPointName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">OTP</span><span className="font-mono font-semibold">{order.pickupOtp}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Slot</span><span>{order.pickupTime || '—'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = '' }) {
  return <div className={`flex justify-between ${className}`}><span className="text-slate-500">{label}</span><span>{value}</span></div>;
}
