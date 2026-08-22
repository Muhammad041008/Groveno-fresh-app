import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Pause, UserPlus, X } from 'lucide-react';
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

const EMPTY_FORM = { name: '', phone: '', email: '', password: '', societyName: '' };

export default function CLs() {
  const [cls, setCls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/admin/cls', form);
      toast.success('Community Leader created and approved');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create CL');
    } finally {
      setAdding(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Community Leaders" subtitle={`${cls.length} total`} />
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
          data-testid="add-cl-btn"
        >
          <UserPlus size={16} />
          Add Community Leader
        </button>
      </div>

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

      {/* ── Add CL Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="add-cl-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-slate-800">Add Community Leader</h2>
              <button onClick={() => setShowAdd(false)} className="btn-ghost !p-2" data-testid="close-add-cl-modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4" data-testid="add-cl-form">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  data-testid="cl-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    data-testid="cl-phone-input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="priya@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    data-testid="cl-email-input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Society / Area Name</label>
                <input
                  className="input"
                  placeholder="e.g. Green Valley Apartments, Sector 21"
                  value={form.societyName}
                  onChange={(e) => setForm({ ...form, societyName: e.target.value })}
                  required
                  data-testid="cl-society-input"
                />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="cl-password-input"
                />
                <p className="text-xs text-slate-500 mt-1">The CL can change this from their profile.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="btn-ghost flex-1"
                  onClick={() => setShowAdd(false)}
                  data-testid="cancel-add-cl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={adding}
                  data-testid="submit-add-cl"
                >
                  {adding ? 'Creating…' : 'Create & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
