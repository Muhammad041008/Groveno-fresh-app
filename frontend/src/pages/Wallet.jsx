import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/UI.jsx';
import { inr, fmtDate } from '../lib/format.jsx';

export default function Wallet() {
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const search = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?search=${encodeURIComponent(phone.trim())}&limit=1`);
      const u = data.users?.[0];
      if (!u) { toast.error('User not found'); setUser(null); return; }
      const detail = await api.get(`/admin/users/${u.id}`);
      setUser(detail.data.user);
      // Fetch wallet transactions via admin users list not available directly; we'll infer from user.walletBalance for now.
      // Use admin credit endpoint to credit, and rely on transactions via search-list endpoint added later.
      setTxns([]); // txns visible after credits happen in this session (best-effort)
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const credit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/admin/users/${user.id}/credit-wallet`, { amount: Number(amount), description: desc || 'Admin credit' });
      toast.success('Credited');
      setUser({ ...user, walletBalance: data.balance });
      setTxns([data.transaction, ...txns]);
      setAmount(''); setDesc('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" data-testid="page-wallet">
      <PageHeader title="Wallet" subtitle="Manage user wallet balances" />

      <div className="card p-5 mb-4">
        <label className="label block">Search user by phone or name</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="input pl-9" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+919999888877" data-testid="wallet-search" onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
          <button className="btn-primary" onClick={search} disabled={loading} data-testid="wallet-search-btn">Search</button>
        </div>
      </div>

      {user && (
        <>
          <div className="card p-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">User</div>
                <div className="text-lg font-semibold">{user.name || 'Unnamed'} · {user.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500 flex items-center gap-1 justify-end"><WalletIcon size={14} /> Wallet balance</div>
                <div className="text-3xl font-bold text-brand-700">{inr(user.walletBalance || 0)}</div>
              </div>
            </div>
          </div>

          <div className="card p-6 mb-4">
            <h4 className="font-semibold mb-3">Credit Wallet</h4>
            <form onSubmit={credit} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3">
              <input required type="number" min="1" className="input" placeholder="Amount ₹"
                value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="wallet-amount" />
              <input className="input" placeholder="Description"
                value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="wallet-desc" />
              <button className="btn-primary" disabled={saving} data-testid="wallet-credit-btn">
                {saving ? 'Crediting…' : 'Credit'}
              </button>
            </form>
          </div>

          {txns.length > 0 && (
            <div className="card p-6">
              <h4 className="font-semibold mb-3">Recent Transactions (this session)</h4>
              <div className="space-y-2">
                {txns.map((t, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg grid place-items-center ${t.type === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{t.description}</div>
                        <div className="text-xs text-slate-500">{fmtDate(t.createdAt)}</div>
                      </div>
                    </div>
                    <div className={`font-semibold ${t.type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>
                      {t.type === 'credit' ? '+' : '-'}{inr(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
