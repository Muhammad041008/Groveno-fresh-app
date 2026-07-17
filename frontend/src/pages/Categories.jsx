import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Check } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader } from '../components/UI.jsx';

export default function Categories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/categories');
    setItems(data.categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    try {
      if (row.id) {
        await api.put(`/admin/categories/${row.id}`, row);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', row);
        toast.success('Category created');
      }
      setEditing(null); setCreating(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" data-testid="page-categories">
      <PageHeader title="Categories" subtitle={`${items.length} categories`}
        right={<button className="btn-primary" onClick={() => setCreating(true)} data-testid="btn-add-category"><Plus size={16} /> Add Category</button>}
      />

      {creating && (
        <RowEditor initial={{ name: '', slug: '', icon: '', sortOrder: items.length + 1, isActive: true }}
          onSave={save} onCancel={() => setCreating(false)} />
      )}

      {loading ? <Loader /> : (
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th w-16">Icon</th>
                <th className="table-th">Name</th>
                <th className="table-th">Slug</th>
                <th className="table-th w-24">Sort</th>
                <th className="table-th w-24">Active</th>
                <th className="table-th text-right"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                editing?.id === c.id
                  ? <RowEditor key={c.id} initial={c} onSave={save} onCancel={() => setEditing(null)} inline />
                  : (
                    <tr key={c.id} className="hover:bg-slate-50" data-testid={`cat-row-${c.id}`}>
                      <td className="table-td text-xl">{c.icon || '🥗'}</td>
                      <td className="table-td font-medium">{c.name}</td>
                      <td className="table-td text-slate-500">{c.slug}</td>
                      <td className="table-td">{c.sortOrder}</td>
                      <td className="table-td">
                        <span className={`badge ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {c.isActive ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <button className="btn-ghost !p-2" onClick={() => setEditing(c)} data-testid={`edit-cat-${c.id}`}>
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowEditor({ initial, onSave, onCancel, inline }) {
  const [row, setRow] = useState(initial);
  const set = (k, v) => setRow((r) => ({ ...r, [k]: v }));
  const Content = (
    <tr className="bg-brand-50/40">
      <td className="table-td"><input className="input !py-1 !px-2 w-14 text-center" value={row.icon || ''}
        onChange={(e) => set('icon', e.target.value)} placeholder="🥗" /></td>
      <td className="table-td"><input className="input !py-1" value={row.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" data-testid="cat-input-name" /></td>
      <td className="table-td"><input className="input !py-1" value={row.slug || ''} onChange={(e) => set('slug', e.target.value)} placeholder="slug" /></td>
      <td className="table-td"><input type="number" className="input !py-1 w-20" value={row.sortOrder || 0} onChange={(e) => set('sortOrder', Number(e.target.value))} /></td>
      <td className="table-td">
        <button type="button" onClick={() => set('isActive', !row.isActive)}
          className={`relative h-5 w-9 rounded-full ${row.isActive ? 'bg-brand-500' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${row.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="table-td text-right whitespace-nowrap">
        <button className="btn-ghost !p-2 !text-green-700" onClick={() => onSave(row)} data-testid="cat-save"><Check size={15} /></button>
        <button className="btn-ghost !p-2" onClick={onCancel}><X size={15} /></button>
      </td>
    </tr>
  );

  if (inline) return Content;
  return (
    <div className="card mb-4 overflow-hidden">
      <table className="min-w-full"><tbody>{Content}</tbody></table>
    </div>
  );
}
