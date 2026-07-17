import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../lib/api';
import { PageHeader, Loader } from '../components/UI.jsx';
import { inr, CHANNEL_LABEL, downloadCsv, toCsv } from '../lib/format.jsx';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

export default function Reports() {
  const [revenue, setRevenue] = useState(null);
  const [qr, setQr] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, q, o] = await Promise.all([
        api.get('/admin/reports/revenue'),
        api.get('/admin/reports/qr-analytics'),
        api.get('/admin/orders?limit=500'),
      ]);
      setRevenue(r.data);
      setQr(q.data);
      setOrders(o.data.orders);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;

  const revBars = (revenue.byChannel || []).map((x) => ({
    channel: CHANNEL_LABEL[x._id] || x._id,
    revenue: x.revenue,
    orders: x.orders,
  }));

  // Top 10 products by frequency across orders
  const productAgg = new Map();
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const key = it.productId + '|' + it.name;
    const prev = productAgg.get(key) || { name: it.name, qty: 0, revenue: 0 };
    prev.qty += it.quantity || 0;
    prev.revenue += it.subtotal || 0;
    productAgg.set(key, prev);
  }));
  const topProducts = Array.from(productAgg.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Top 5 CLs by commission
  const topCLs = [...(qr.cls || [])].sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0)).slice(0, 5);

  // QR scans total
  const qrPie = [
    { name: 'Poster', value: qr.totals?.poster || 0 },
    { name: 'WhatsApp', value: qr.totals?.whatsapp || 0 },
    { name: 'Standee', value: qr.totals?.standee || 0 },
    { name: 'Other', value: qr.totals?.other || 0 },
  ];
  const totalScans = qrPie.reduce((a, x) => a + x.value, 0);

  const exportCsv = () => {
    const rows = orders.map((o) => ({
      order: o.orderNumber, channel: CHANNEL_LABEL[o.channel], user: o.userName || o.customerName,
      total: o.total, status: o.status, placed: o.createdAt,
    }));
    const csv = toCsv(rows, [
      { label: 'Order #', key: 'order' },
      { label: 'Channel', key: 'channel' },
      { label: 'Customer', key: 'user' },
      { label: 'Total', key: 'total' },
      { label: 'Status', key: 'status' },
      { label: 'Placed', key: 'placed' },
    ]);
    downloadCsv(`groveno-orders-${Date.now()}.csv`, csv);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-reports">
      <PageHeader
        title="Reports"
        subtitle={`Total revenue: ${inr(revenue.totalRevenue || 0)}`}
        right={<button className="btn-primary" onClick={exportCsv} data-testid="btn-export-csv"><Download size={16} /> Export CSV</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={16} /> Revenue by Channel</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={revBars}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">QR Scan Analytics</h3>
          <div className="text-xs text-slate-500 mb-2">Total scans: {totalScans}</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={qrPie} innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                  {qrPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Top 10 Products</h3>
          <table className="min-w-full">
            <thead><tr><th className="table-th">Product</th><th className="table-th">Qty</th><th className="table-th text-right">Revenue</th></tr></thead>
            <tbody>
              {topProducts.length === 0 && <tr><td colSpan={3} className="table-td text-slate-400 text-center py-6">No data</td></tr>}
              {topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{p.name}</td>
                  <td className="table-td">{p.qty}</td>
                  <td className="table-td text-right">{inr(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Top 5 Community Leaders</h3>
          <table className="min-w-full">
            <thead><tr><th className="table-th">CL</th><th className="table-th">Code</th><th className="table-th text-right">Orders</th></tr></thead>
            <tbody>
              {topCLs.length === 0 && <tr><td colSpan={3} className="table-td text-slate-400 text-center py-6">No data</td></tr>}
              {topCLs.map((c) => (
                <tr key={c._id || c.clCode} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{c.name}<div className="text-xs text-slate-500">{c.societyName}</div></td>
                  <td className="table-td font-mono text-brand-700">{c.clCode}</td>
                  <td className="table-td text-right">{c.totalOrders || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
