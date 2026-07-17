import { useEffect, useState, useCallback } from 'react';
import { Wallet, Clock, Lock } from 'lucide-react';
import clApi from '../../lib/clApi';
import { inr, fmtDate } from '../../lib/format.jsx';

export default function CLEarnings() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const { data } = await clApi.get('/cl/earnings');
    setData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="p-8 text-sm text-slate-400 text-center">Loading…</div>;

  const { summary, history, commissionRate } = data;

  return (
    <div className="p-4 pb-6" data-testid="cl-page-earnings">
      <h1 className="text-xl font-semibold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Earnings</h1>
      <p className="text-sm text-slate-500 mb-4">Track your commissions in real-time</p>

      {/* Total card */}
      <div className="rounded-2xl p-5 mb-3 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
        <div className="text-xs opacity-90 uppercase tracking-wider">Wallet Balance</div>
        <div className="text-3xl font-bold mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }} data-testid="cl-earn-balance">
          {inr(summary.walletBalance)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs opacity-90">
            All-time: <span className="font-semibold">{inr(summary.allTime)}</span>
          </div>
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">
            {(commissionRate * 100).toFixed(0)}% per order
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="Today" value={inr(summary.today)} testid="cl-earn-today" />
        <MiniStat label="This Week" value={inr(summary.thisWeek)} testid="cl-earn-week" />
        <MiniStat label="This Month" value={inr(summary.thisMonth)} testid="cl-earn-month" />
      </div>

      <button
        disabled
        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 flex items-center justify-center gap-2 mb-5"
        data-testid="cl-withdraw-btn"
      >
        <Lock size={14} /> Withdraw — Coming Soon
      </button>

      <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
        <Clock size={14} /> Recent Commissions
      </h2>

      {history.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">No earnings yet. Deliver an order to earn commission.</div>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {history.map((h) => (
            <div key={h._id} className="p-3.5 flex items-center justify-between" data-testid={`cl-earn-row-${h._id}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-brand-700">{h.orderNumber}</div>
                <div className="text-[11px] text-slate-500">{fmtDate(h.deliveredAt || h.createdAt)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Order value: {inr(h.total)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-700">+{inr(h.clCommission)}</div>
                <div className="text-[10px] text-slate-400">commission</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, testid }) {
  return (
    <div className="card p-2.5 text-center" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
