export function inr(n) {
  if (n == null || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDay(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const CHANNEL_LABEL = {
  home_delivery: 'Home Delivery',
  express_pickup: 'Express Pickup',
  cl_order: 'CL Order',
};

export const STATUS_STYLES = {
  placed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Placed' },
  confirmed: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Confirmed' },
  preparing: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Preparing' },
  packed: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Packed' },
  out_for_delivery: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Out for Delivery' },
  ready_for_pickup: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Ready for Pickup' },
  customer_on_way: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Customer on Way' },
  arrived: { bg: 'bg-red-50', text: 'text-red-700', label: 'Arrived' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Delivered' },
  collected: { bg: 'bg-green-50', text: 'text-green-700', label: 'Collected' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', label: 'Rejected' },
};

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  return <span className={`badge ${s.bg} ${s.text}`}>{s.label}</span>;
}

export function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = headers.map((h) => esc(h.label)).join(',');
  const body = rows.map((r) => headers.map((h) => esc(typeof h.get === 'function' ? h.get(r) : r[h.key])).join(',')).join('\n');
  return head + '\n' + body;
}

export function downloadCsv(name, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
