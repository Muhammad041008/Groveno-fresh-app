import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader } from '../components/UI.jsx';

export default function PickupPoints() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const empty = { name: '', address: '', city: '', state: '', pincode: '', lat: '', lng: '', contactPhone: '', openingHours: '6:00 AM - 10:00 PM', isActive: true };

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/admin/pickup-points');
    setItems(data.pickupPoints);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (row) => {
    try {
      const payload = { ...row, lat: Number(row.lat), lng: Number(row.lng) };
      if (row.id) await api.put(`/admin/pickup-points/${row.id}`, payload);
      else await api.post('/admin/pickup-points', payload);
      toast.success('Saved');
      setEditing(null); setCreating(false);
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (row) => {
    if (!confirm(`Deactivate "${row.name}"?`)) return;
    await api.put(`/admin/pickup-points/${row.id}`, { isActive: false });
    toast.success('Deactivated');
    load();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="page-pickup-points">
      <PageHeader title="Pickup Points" subtitle={`${items.length} points`}
        right={<button className="btn-primary" onClick={() => setCreating(true)} data-testid="btn-add-pp"><Plus size={16} /> Add Point</button>}
      />

      {creating && <PickupEditor initial={empty} onSave={save} onCancel={() => setCreating(false)} />}

      {loading ? <Loader /> : (
        <div className="space-y-3">
          {items.map((p) => (
            editing?.id === p.id
              ? <PickupEditor key={p.id} initial={p} onSave={save} onCancel={() => setEditing(null)} />
              : (
                <div key={p.id} className="card p-5 flex items-start justify-between" data-testid={`pp-row-${p.id}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{p.name}</span>
                      <span className={`badge ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">{p.address}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {p.city} · {p.pincode} · {p.contactPhone || '—'} · {p.openingHours}
                    </div>
                    <div className="text-xs text-slate-400">Lat: {p.lat}, Lng: {p.lng}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost !p-2" onClick={() => setEditing(p)} data-testid={`edit-pp-${p.id}`}><Pencil size={15} /></button>
                    <button className="btn-ghost !p-2 !text-red-600" onClick={() => del(p)} data-testid={`del-pp-${p.id}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              )
          ))}
        </div>
      )}
    </div>
  );
}

function PickupEditor({ initial, onSave, onCancel }) {
  const [row, setRow] = useState(initial);
  const set = (k, v) => setRow((r) => ({ ...r, [k]: v }));
  return (
    <div className="card p-5 mb-4 bg-brand-50/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div><label className="label block">Name</label><input className="input" value={row.name} onChange={(e) => set('name', e.target.value)} data-testid="pp-name" /></div>
        <div><label className="label block">Contact Phone</label><input className="input" value={row.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
        <div className="md:col-span-2"><label className="label block">Address</label><input className="input" value={row.address} onChange={(e) => set('address', e.target.value)} data-testid="pp-address" /></div>
        <div><label className="label block">City</label><input className="input" value={row.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div><label className="label block">Pincode</label><input className="input" value={row.pincode} onChange={(e) => set('pincode', e.target.value)} /></div>
        <div><label className="label block">Latitude</label><input className="input" value={row.lat} onChange={(e) => set('lat', e.target.value)} data-testid="pp-lat" /></div>
        <div><label className="label block">Longitude</label><input className="input" value={row.lng} onChange={(e) => set('lng', e.target.value)} data-testid="pp-lng" /></div>
        <div className="md:col-span-2"><label className="label block">Opening Hours</label><input className="input" value={row.openingHours} onChange={(e) => set('openingHours', e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel}><X size={15} /> Cancel</button>
        <button className="btn-primary" onClick={() => onSave(row)} data-testid="pp-save"><Check size={15} /> Save</button>
      </div>
    </div>
  );
}
