import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, MapPin, ShoppingBag, Plus } from 'lucide-react';
import clApi from '../../lib/clApi';
import { inr, fmtDate } from '../../lib/format.jsx';
import { StatusBadge } from '../../components/UI.jsx';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'delivered', label: 'Delivered' },
];

export default function CLOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await clApi.get('/cl/orders?limit=100');
    setOrders(data.orders);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const markDelivered = async (o) => {
    try {
      await clApi.put(`/cl/orders/${o.id}/deliver`);
      toast.success('Marked as delivered');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab === 'pending' && ['delivered', 'collected', 'cancelled', 'rejected'].includes(o.status)) return false;
      if (tab === 'delivered' && o.status !== 'delivered' && o.status !== 'collected') return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (o.customerName || o.userName || '').toLowerCase();
        if (!name.includes(q) && !o.orderNumber.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, tab, search]);

  return (
    <div className="p-4 pb-6" data-testid="cl-page-orders">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>My Orders</h1>
        <Link to="/cl/orders/bulk" className="btn-primary !py-1.5 !px-3 text-xs" data-testid="cl-btn-bulk">
          <Plus size={14} /> Bulk Order
        </Link>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          className="input pl-9" placeholder="Search by customer name…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          data-testid="cl-orders-search"
        />
      </div>

      <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-1.5 text-xs font-medium rounded-md transition ${tab === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            data-testid={`cl-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 text-center py-10">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">No orders</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((o) => {
            const pending = !['delivered', 'collected', 'cancelled', 'rejected'].includes(o.status);
            return (
              <div key={o.id} className="card p-3.5" data-testid={`cl-order-card-${o.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <Link to={`/cl/orders/${o.id}`} className="text-sm font-semibold text-brand-700">{o.orderNumber}</Link>
                    <div className="text-sm text-slate-800 font-medium truncate">{o.customerName || o.userName || 'Customer'}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1"><ShoppingBag size={11} /> {o.items?.length || 0} items</span>
                      <span>·</span>
                      <span>{fmtDate(o.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                {o.address?.line1 && (
                  <div className="text-[11px] text-slate-500 flex items-start gap-1 mb-2 leading-relaxed">
                    <MapPin size={11} className="mt-0.5 text-slate-400 shrink-0" />
                    <span className="truncate">{o.address.line1}{o.address.landmark ? `, ${o.address.landmark}` : ''}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <div>
                    <span className="text-sm font-semibold">{inr(o.total)}</span>
                    <span className="ml-2 text-[11px] text-green-700 font-medium">+{inr(o.clCommission)} commission</span>
                  </div>
                  {pending && (
                    <button
                      onClick={() => markDelivered(o)}
                      className="btn-primary !py-1.5 !px-3 !text-xs"
                      data-testid={`cl-deliver-${o.id}`}
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
