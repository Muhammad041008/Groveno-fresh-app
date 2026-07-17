import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Wallet, Coins, Phone, User, MapPin } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader } from '../components/UI.jsx';
import { inr, fmtDate, CHANNEL_LABEL } from '../lib/format.jsx';
import { StatusBadge } from '../components/UI.jsx';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`/admin/users/${id}`);
    setData(data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const credit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/users/${id}/credit-wallet`, { amount: Number(amount), description: desc || 'Admin credit' });
      toast.success('Wallet credited');
      setAmount(''); setDesc('');
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (!data) return <Loader />;
  const { user, orders } = data;

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="page-user-detail">
      <PageHeader
        title={user.name || 'Unnamed user'}
        subtitle={user.phone}
        right={<button className="btn-outline" onClick={() => navigate('/users')}><ArrowLeft size={16} /> Back</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><div className="text-xs text-slate-500">Wallet</div><div className="text-lg font-semibold">{inr(user.walletBalance || 0)}</div></div>
              <div><div className="text-xs text-slate-500">Coins</div><div className="text-lg font-semibold">{user.coins || 0}</div></div>
              <div><div className="text-xs text-slate-500">CL Orders</div><div className="text-lg font-semibold">{user.clOrderCount || 0}</div></div>
              <div><div className="text-xs text-slate-500">Joined</div><div className="text-sm">{fmtDate(user.createdAt)}</div></div>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Recent Orders</h4>
            {orders.length === 0 ? <div className="text-sm text-slate-400 text-center py-6">No orders yet</div> : (
              <table className="min-w-full">
                <thead>
                  <tr><th className="table-th">Order</th><th className="table-th">Channel</th><th className="table-th">Total</th><th className="table-th">Status</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="table-td"><Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">{o.orderNumber}</Link></td>
                      <td className="table-td">{CHANNEL_LABEL[o.channel]}</td>
                      <td className="table-td">{inr(o.total)}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Wallet size={16} /> Credit Wallet</h4>
            <form onSubmit={credit} className="space-y-3">
              <div>
                <label className="label block">Amount ₹</label>
                <input required type="number" min="1" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="credit-amount" />
              </div>
              <div>
                <label className="label block">Description</label>
                <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Refund for order..." data-testid="credit-desc" />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={saving} data-testid="credit-submit">
                {saving ? 'Crediting…' : 'Credit ₹' + (amount || '0')}
              </button>
            </form>
          </div>

          <div className="card p-6">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><MapPin size={16} /> Addresses</h4>
            {user.addresses?.length ? user.addresses.map((a, i) => (
              <div key={a._id || `${a.pincode || 'addr'}-${i}`} className="text-sm border-b border-slate-100 py-2 last:border-0">
                <div className="font-medium">{a.label}</div>
                <div className="text-slate-500">{a.line1}, {a.city} - {a.pincode}</div>
              </div>
            )) : <div className="text-sm text-slate-400">No addresses saved</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
