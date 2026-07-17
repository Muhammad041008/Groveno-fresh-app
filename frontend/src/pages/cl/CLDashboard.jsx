import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, ShoppingBag, IndianRupee, TrendingUp } from 'lucide-react';
import clApi from '../../lib/clApi';
import { inr, fmtDate, CHANNEL_LABEL } from '../../lib/format.jsx';
import { StatusBadge } from '../../components/UI.jsx';

export default function CLDashboard() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const { data } = await clApi.get('/cl/dashboard');
    setData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDelivered = async (o) => {
    try {
      await clApi.put(`/cl/orders/${o.id}/deliver`);
      toast.success(`Order ${o.orderNumber} delivered`);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (!data) return <div className="p-4 text-sm text-slate-400 text-center py-20">Loading…</div>;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todaysOrders = (data.recentOrders || []).filter((o) => new Date(o.createdAt) >= startOfDay);
  const todayCommission = todaysOrders.reduce((a, o) => a + (o.clCommission || 0), 0);
  const pending = (data.recentOrders || []).filter((o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'collected');
  const deliveredToday = (data.recentOrders || []).filter((o) => o.status === 'delivered' && o.deliveredAt && new Date(o.deliveredAt) >= startOfDay).length;

  return (
    <div className="p-4 pb-6" data-testid="cl-page-dashboard">
      <h1 className="text-xl font-semibold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Dashboard
      </h1>
      <p className="text-sm text-slate-500 mb-5">Your quick daily snapshot</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Today Orders" value={todaysOrders.length} icon={ShoppingBag} testid="cl-stat-today-orders" />
        <StatCard label="Today Earnings" value={inr(todayCommission)} icon={IndianRupee} tint="green" testid="cl-stat-today-earnings" />
        <StatCard label="Pending" value={data.stats.pendingOrders} icon={Clock} tint="amber" testid="cl-stat-pending" />
        <StatCard label="Delivered Today" value={deliveredToday} icon={CheckCircle2} tint="green" testid="cl-stat-delivered-today" />
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Total Earnings</div>
            <div className="text-2xl font-semibold text-brand-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {inr(data.stats.totalCommission || 0)}
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-brand-50 grid place-items-center text-brand-700">
            <TrendingUp size={19} />
          </div>
        </div>
        <div className="text-xs text-slate-500 flex justify-between">
          <span>{data.stats.totalOrders || 0} total orders</span>
          <span>5% commission rate</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-800">Recent Orders</h2>
        <Link to="/cl/orders" className="text-xs text-brand-700 font-medium">View all →</Link>
      </div>
      <div className="space-y-2">
        {(data.recentOrders || []).slice(0, 5).map((o) => (
          <div key={o.id} className="card p-3" data-testid={`cl-recent-${o.id}`}>
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/cl/orders/${o.id}`} className="text-sm font-medium text-brand-700">{o.orderNumber}</Link>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{o.customerName || o.userName || 'Customer'} · {o.items?.length || 0} items</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{inr(o.total)}</div>
                <div className="text-[11px] text-green-700">+{inr(o.clCommission)} comm.</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{fmtDate(o.createdAt)}</span>
              {o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'collected' && (
                <button onClick={() => markDelivered(o)} className="btn-primary !py-1 !px-3 !text-[11px]" data-testid={`cl-quick-deliver-${o.id}`}>
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        ))}
        {(!data.recentOrders || data.recentOrders.length === 0) && (
          <div className="card p-6 text-center text-slate-400 text-sm">No recent orders</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint = 'brand', testid }) {
  const tints = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="card p-3.5" data-testid={testid}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
        <div className={`h-7 w-7 rounded-lg grid place-items-center ${tints[tint]}`}><Icon size={14} /></div>
      </div>
      <div className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
    </div>
  );
}
