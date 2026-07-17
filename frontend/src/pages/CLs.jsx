import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Pause } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader, EmptyState } from '../components/UI.jsx';
import { inr, fmtDate } from '../lib/format.jsx';

const STATUS_STYLES = {
  approved: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  rejected: 'bg-red-50 text-red-600',
  suspended: 'bg-slate-100 text-slate-600',
};

function styleFor(s) {
  return STATUS_STYLES[s] || 'bg-slate-100 text-slate-600';
}

export default function CLs() {
  const [cls, setCls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.append('status', statusFilter);
    p.append('limit', 100);
    const { data } = await api.get(`/admin/cls?${p.toString()}`);
    setCls(data.cls);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (cl, action) => {
    try {
      await api.put(`/admin/cls/${cl.id}/approve`, { action });
      toast.success(`CL ${action}d`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const renderTable = () => {
    if (loading) return <Loader />;
    if (cls.length === 0) return <EmptyState title="No CLs" />;
    return (
      <div className="card overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Code</th>
              <th className="table-th">Society</th>
              <th className="table-th">Orders</th>
              <th className="table-th">Earnings</th>
              <th className="table-th">Status</th>
              <th className="table-th">Joined</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cls.map((cl) => (
              <tr key={cl.id} className="hover:bg-slate-50" data-testid={`cl-row-${cl.id}`}>
                <td className="table-td font-medium">{cl.name}<div className="text-xs text-slate-500">{cl.phone}</div></td>
                <td className="table-td"><span className="font-mono font-semibold text-brand-700">{cl.clCode}</span></td>
                <td className="table-td">{cl.societyName}</td>
                <td className="table-td">{cl.totalOrders || 0}</td>
                <td className="table-td">{inr(cl.totalCommission || 0)}</td>
                <td className="table-td"><span className={`badge ${styleFor(cl.status)}`}>{cl.status}</span></td>
                <td className="table-td text-slate-500">{fmtDate(cl.createdAt)}</td>
                <td className="table-td text-right whitespace-nowrap">
                  {cl.status !== 'approved' && <button className="btn-ghost !p-2 !text-green-700" title="Approve" onClick={() => setStatus(cl, 'approve')} data-testid={`approve-${cl.id}`}><CheckCircle2 size={16} /></button>}
                  {cl.status !== 'rejected' && <button className="btn-ghost !p-2 !text-red-600" title="Reject" onClick={() => setStatus(cl, 'reject')} data-testid={`reject-${cl.id}`}><XCircle size={16} /></button>}
                  {cl.status === 'approved' && <button className="btn-ghost !p-2" title="Suspend" onClick={() => setStatus(cl, 'suspend')} data-testid={`suspend-${cl.id}`}><Pause size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-cls">
      <PageHeader title="Community Leaders" subtitle={`${cls.length} total`} />

      <div className="card p-4 mb-4 flex gap-3">
        <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="cls-status-filter">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {renderTable()}
    </div>
  );
}
