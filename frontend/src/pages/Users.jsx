import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader, EmptyState } from '../components/UI.jsx';
import { inr, fmtDate } from '../lib/format.jsx';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const p = new URLSearchParams();
      if (search) p.append('search', search);
      p.append('limit', 50);
      const { data } = await api.get(`/admin/users?${p.toString()}`);
      setUsers(data.users);
      setTotal(data.total);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-users">
      <PageHeader title="Users" subtitle={`${total} user${total === 1 ? '' : 's'}`} />

      <div className="card p-4 mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-9" placeholder="Search by phone or name…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="users-search" />
        </div>
      </div>

      {loading ? <Loader /> : users.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Wallet</th>
                <th className="table-th">Coins</th>
                <th className="table-th">CL Orders</th>
                <th className="table-th">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                  <td className="table-td font-medium">
                    <Link to={`/users/${u.id}`} className="text-brand-700 hover:underline">{u.name || 'Unnamed'}</Link>
                  </td>
                  <td className="table-td">{u.phone}</td>
                  <td className="table-td">{inr(u.walletBalance || 0)}</td>
                  <td className="table-td">{u.coins || 0}</td>
                  <td className="table-td">{u.clOrderCount || 0}</td>
                  <td className="table-td text-slate-500">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
