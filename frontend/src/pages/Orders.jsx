import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PageHeader, Loader, EmptyState, StatusBadge } from '../components/UI.jsx';
import { CHANNEL_LABEL, inr, fmtDate } from '../lib/format.jsx';

const STATUSES = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'collected', 'cancelled'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams();
    if (channel) p.append('channel', channel);
    if (status) p.append('status', status);
    p.append('page', page); p.append('limit', 25);
    setLoading(true);
    api.get(`/admin/orders?${p.toString()}`).then((r) => {
      setOrders(r.data.orders); setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [channel, status, page]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-orders">
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}`} />

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label block">Channel</label>
          <select className="input" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} data-testid="orders-channel-filter">
            <option value="">All</option>
            <option value="home_delivery">Home Delivery</option>
            <option value="express_pickup">Express Pickup</option>
            <option value="cl_order">CL Order</option>
          </select>
        </div>
        <div>
          <label className="label block">Status</label>
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} data-testid="orders-status-filter">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Loader /> : orders.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Order #</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Channel</th>
                <th className="table-th">Total</th>
                <th className="table-th">Status</th>
                <th className="table-th">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50" data-testid={`order-row-${o.id}`}>
                  <td className="table-td font-medium">
                    <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="table-td">{o.userName || o.customerName || '—'}<div className="text-xs text-slate-400">{o.userPhone}</div></td>
                  <td className="table-td">{CHANNEL_LABEL[o.channel]}</td>
                  <td className="table-td">{inr(o.total)}</td>
                  <td className="table-td"><StatusBadge status={o.status} /></td>
                  <td className="table-td text-slate-500">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 flex items-center justify-between text-sm">
            <div className="text-slate-500">Page {page}</div>
            <div className="flex gap-2">
              <button className="btn-outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn-outline" disabled={orders.length < 25} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
