import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Phone, MapPin, Package } from 'lucide-react';
import clApi from '../../lib/clApi';
import { inr, fmtDate } from '../../lib/format.jsx';
import { StatusBadge } from '../../components/UI.jsx';

function maskPhone(p) {
  if (!p) return '—';
  const digits = p.replace(/\D/g, '');
  if (digits.length < 6) return p;
  return digits.slice(0, 2) + 'XXX' + digits.slice(-5);
}

export default function CLOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    // We fetch via list and filter (no single-order endpoint for CL) — cheap and works
    const { data } = await clApi.get(`/cl/orders?limit=200`);
    const found = data.orders.find((o) => o.id === id);
    setOrder(found);
  };
  useEffect(() => { load();  }, [id]);

  const markDelivered = async () => {
    setSaving(true);
    try {
      const { data } = await clApi.put(`/cl/orders/${id}/deliver`);
      setOrder(data.order);
      toast.success('Marked as delivered');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (!order) return <div className="p-8 text-sm text-slate-400 text-center">Loading…</div>;
  const pending = !['delivered', 'collected', 'cancelled', 'rejected'].includes(order.status);

  return (
    <div className="p-4 pb-6" data-testid="cl-page-order-detail">
      <button onClick={() => navigate('/cl/orders')} className="btn-ghost !px-2 mb-3 -ml-2 text-sm text-slate-600" data-testid="cl-order-back">
        <ArrowLeft size={16} /> Back to orders
      </button>

      <div className="card p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-slate-900">{order.orderNumber}</div>
            <div className="text-[11px] text-slate-500">{fmtDate(order.createdAt)}</div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="text-sm font-semibold text-slate-900">{order.customerName || order.userName || 'Customer'}</div>
          {order.userPhone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Phone size={12} /> {maskPhone(order.userPhone)}
            </div>
          )}
        </div>
      </div>

      {order.address?.line1 && (
        <div className="card p-4 mb-3">
          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center gap-1.5"><MapPin size={12} /> Delivery Address</h4>
          <div className="text-sm text-slate-700 leading-relaxed">
            <div className="font-medium">{order.address.label || 'Address'}</div>
            <div>{order.address.line1}</div>
            {order.address.line2 && <div>{order.address.line2}</div>}
            <div>{order.address.city} {order.address.state} — {order.address.pincode}</div>
            {order.address.landmark && <div className="text-slate-500 text-xs">Landmark: {order.address.landmark}</div>}
          </div>
        </div>
      )}

      <div className="card p-4 mb-3">
        <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3 flex items-center gap-1.5"><Package size={12} /> Items ({order.items?.length || 0})</h4>
        <div className="space-y-2">
          {(order.items || []).map((it, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                {it.image ? <img src={it.image} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-brand-50 grid place-items-center text-sm">🥗</div>}
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-[11px] text-slate-500">{it.variantLabel || it.variantSize} × {it.quantity}</div>
                </div>
              </div>
              <div className="font-medium shrink-0">{inr(it.subtotal)}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Items Total</span><span>{inr(order.itemsTotal)}</span></div>
          {order.deliveryFee > 0 && <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{inr(order.deliveryFee)}</span></div>}
          <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{inr(order.total)}</span></div>
        </div>
      </div>

      <div className="card p-4 mb-4 border-brand-100 bg-brand-50/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-brand-800/70">Your commission (5%)</div>
            <div className="text-xl font-bold text-brand-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>{inr(order.clCommission)}</div>
          </div>
          <div className={`badge ${order.clCommissionCredited ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {order.clCommissionCredited ? 'Credited' : 'On delivery'}
          </div>
        </div>
      </div>

      {pending && (
        <button
          className="btn-primary w-full py-3 text-base"
          onClick={markDelivered} disabled={saving}
          data-testid="cl-detail-deliver-btn"
        >
          {saving ? 'Updating…' : 'Mark as Delivered'}
        </button>
      )}
    </div>
  );
}
