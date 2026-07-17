import { STATUS_STYLES } from '../lib/format.jsx';

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  return <span className={`badge ${s.bg} ${s.text}`} data-testid={`status-${status}`}>{s.label}</span>;
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

export function Stat({ label, value, icon: Icon, tint = 'brand', testid }) {
  const tintMap = {
    brand: 'bg-brand-50 text-brand-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="card p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-2xl font-semibold mt-1 text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
        </div>
        {Icon && (
          <div className={`h-10 w-10 rounded-lg grid place-items-center ${tintMap[tint]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-slate-600 font-medium">{title}</div>
      {subtitle && <div className="text-sm text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export function Loader() {
  return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;
}
