import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, IndianRupee, Users2, BadgeCheck, Zap, Truck, Home } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../lib/api';
import { Stat, PageHeader, Loader } from '../components/UI.jsx';
import { StatusBadge } from '../components/UI.jsx';
import { inr, CHANNEL_LABEL, fmtDate, fmtDay } from '../lib/format.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [chart, setChart] = useState([]);

  const loadAll = useCallback(async () => {
    const [dash, orders] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/orders?limit=8&page=1'),
    ]);
    setStats(dash.data);
    setRecent(orders.data.orders);
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), label: fmtDay(d), revenue: 0 });
    }
    const all = await api.get('/admin/orders?limit=200&page=1');
    all.data.orders.forEach((o) => {
      const d = new Date(o.deliveredAt || o.createdAt).toISOString().slice(0, 10);
      const row = days.find((x) => x.date === d);
      if (row && ['delivered', 'collected'].includes(o.status)) row.revenue += o.total || 0;
    });
    setChart(days);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!stats) return <Loader />;
  const cs = stats.channelStats || {};

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-dashboard">
      <PageHeader title="Dashboard" subtitle="Overview of your platform performance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Orders" value={stats.totalOrders} icon={ShoppingCart} tint="brand" testid="stat-total-orders" />
        <Stat label="Revenue" value={inr(stats.revenue)} icon={IndianRupee} tint="amber" testid="stat-revenue" />
        <Stat label="Total Users" value={stats.activeUsers} icon={Users2} tint="blue" testid="stat-users" />
        <Stat label="Active CLs" value={stats.activeCLs} icon={BadgeCheck} tint="purple" testid="stat-cls" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChannelCard title="Home Delivery" data={cs.home_delivery} icon={Home} />
        <ChannelCard title="Express Pickup" data={cs.express_pickup} icon={Zap} />
        <ChannelCard title="CL Orders" data={cs.cl_order} icon={Truck} />
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Revenue — Last 7 Days</h3>
            <p className="text-xs text-slate-500 mt-0.5">Delivered & collected orders</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Recent Orders</h3>
          <Link to="/orders" className="text-sm text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Order</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Channel</th>
                <th className="table-th">Total</th>
                <th className="table-th">Status</th>
                <th className="table-th">Placed</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="table-td font-medium">
                    <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="table-td">{o.userName || o.customerName || '—'}</td>
                  <td className="table-td">{CHANNEL_LABEL[o.channel]}</td>
                  <td className="table-td">{inr(o.total)}</td>
                  <td className="table-td"><StatusBadge status={o.status} /></td>
                  <td className="table-td text-slate-500">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
              {!recent.length && (
                <tr><td colSpan={6} className="table-td text-center text-slate-400 py-8">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ title, data, icon: Icon }) {
  const count = data?.count || 0;
  const revenue = data?.revenue || 0;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center">
          <Icon size={17} />
        </div>
        <div className="font-medium text-slate-800">{title}</div>
      </div>
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-xs text-slate-500">Orders</div>
          <div className="text-xl font-semibold text-slate-900">{count}</div>
        </div>
        <div className="border-l border-slate-100 pl-4">
          <div className="text-xs text-slate-500">Revenue</div>
          <div className="text-xl font-semibold text-slate-900">{inr(revenue)}</div>
        </div>
      </div>
    </div>
  );
}
