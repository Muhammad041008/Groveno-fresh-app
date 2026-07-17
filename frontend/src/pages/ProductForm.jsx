import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/UI.jsx';

const SIZES = ['small', 'medium', 'large'];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', category: '', images: [''],
    variants: SIZES.map((s) => ({ size: s, label: '', price: 0, mrp: 0, stock: 100, unit: 'kg' })),
    isExpress: true, isOrganic: false, isActive: true, tags: [],
    emoji: '🥗', badge: '', featured: false,
  });
  const [nutrition, setNutrition] = useState([{ label: 'Calories', value: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const cRes = await api.get('/categories');
      setCategories(cRes.data.categories);
      if (isEdit) {
        const { data } = await api.get(`/products/${id}`);
        const p = data.product;
        setForm({
          name: p.name, slug: p.slug, description: p.description || '',
          category: p.category?._id || p.category, images: p.images?.length ? p.images : [''],
          variants: p.variants?.length ? p.variants : form.variants,
          isExpress: p.isExpress, isOrganic: p.isOrganic, isActive: p.isActive, tags: p.tags || [],
          emoji: p.emoji || '🥗', badge: p.badge || '', featured: !!p.featured,
        });
      }
    })();
     
  }, [id]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setVariant = (idx, k, v) => setForm((f) => ({
    ...f, variants: f.variants.map((x, i) => i === idx ? { ...x, [k]: v } : x),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        variants: form.variants.map((v) => ({
          ...v, price: Number(v.price), mrp: Number(v.mrp), stock: Number(v.stock),
        })),
        images: form.images.filter(Boolean),
        nutrition,
      };
      if (isEdit) {
        await api.put(`/admin/products/${id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', payload);
        toast.success('Product created');
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" data-testid="page-product-form">
      <PageHeader
        title={isEdit ? 'Edit Product' : 'New Product'}
        right={
          <button onClick={() => navigate('/products')} className="btn-outline">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />
      <form onSubmit={submit} className="space-y-5">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label block">Name</label>
              <input className="input" required value={form.name}
                onChange={(e) => setField('name', e.target.value)} data-testid="pf-name" />
            </div>
            <div>
              <label className="label block">Category</label>
              <select className="input" required value={form.category}
                onChange={(e) => setField('category', e.target.value)} data-testid="pf-category">
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label block">Slug (optional)</label>
              <input className="input" value={form.slug}
                onChange={(e) => setField('slug', e.target.value)} placeholder="auto-generated" data-testid="pf-slug" />
            </div>
            <div>
              <label className="label block">Emoji / Badge</label>
              <div className="flex gap-2">
                <input className="input w-20" value={form.emoji}
                  onChange={(e) => setField('emoji', e.target.value)} data-testid="pf-emoji" />
                <input className="input" placeholder="Badge (e.g. NEW, HOT)" value={form.badge}
                  onChange={(e) => setField('badge', e.target.value)} data-testid="pf-badge" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label block">Description</label>
              <textarea className="input min-h-[100px]" value={form.description}
                onChange={(e) => setField('description', e.target.value)} data-testid="pf-description" />
            </div>
            <div className="md:col-span-2">
              <label className="label block">Image URL</label>
              <input className="input" value={form.images[0] || ''}
                onChange={(e) => setField('images', [e.target.value])} placeholder="https://..." data-testid="pf-image" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Variants</h3>
          <div className="space-y-3">
            {form.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-3 rounded-lg bg-slate-50">
                <div>
                  <label className="label block capitalize">{v.size}</label>
                  <input className="input" placeholder="Label (e.g. 500g)" value={v.label}
                    onChange={(e) => setVariant(i, 'label', e.target.value)} data-testid={`pf-variant-label-${i}`} />
                </div>
                <div>
                  <label className="label block">Price ₹</label>
                  <input type="number" className="input" required value={v.price}
                    onChange={(e) => setVariant(i, 'price', e.target.value)} data-testid={`pf-variant-price-${i}`} />
                </div>
                <div>
                  <label className="label block">MRP ₹</label>
                  <input type="number" className="input" required value={v.mrp}
                    onChange={(e) => setVariant(i, 'mrp', e.target.value)} data-testid={`pf-variant-mrp-${i}`} />
                </div>
                <div>
                  <label className="label block">Stock</label>
                  <input type="number" className="input" value={v.stock}
                    onChange={(e) => setVariant(i, 'stock', e.target.value)} data-testid={`pf-variant-stock-${i}`} />
                </div>
                <div>
                  <label className="label block">Unit</label>
                  <input className="input" value={v.unit}
                    onChange={(e) => setVariant(i, 'unit', e.target.value)} data-testid={`pf-variant-unit-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Nutrition (per serving)</h3>
          <div className="space-y-2">
            {nutrition.map((n, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input className="input" placeholder="Label"
                  value={n.label} onChange={(e) => setNutrition(nutrition.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} />
                <input className="input" placeholder="Value"
                  value={n.value} onChange={(e) => setNutrition(nutrition.map((x, k) => k === i ? { ...x, value: e.target.value } : x))} />
                <button type="button" className="btn-ghost !text-red-600 !p-2"
                  onClick={() => setNutrition(nutrition.filter((_, k) => k !== i))}><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn-outline text-xs" onClick={() => setNutrition([...nutrition, { label: '', value: '' }])}>
              <Plus size={14} /> Add row
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Flags</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Toggle label="Express Available" val={form.isExpress} onChange={(v) => setField('isExpress', v)} test="pf-isexpress" />
            <Toggle label="Organic" val={form.isOrganic} onChange={(v) => setField('isOrganic', v)} test="pf-isorganic" />
            <Toggle label="Featured" val={form.featured} onChange={(v) => setField('featured', v)} test="pf-featured" />
            <Toggle label="In Stock" val={form.isActive} onChange={(v) => setField('isActive', v)} test="pf-instock" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={() => navigate('/products')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving} data-testid="pf-submit">
            {saving ? 'Saving…' : (isEdit ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Toggle({ label, val, onChange, test }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 cursor-pointer" data-testid={test}>
      <span className="text-sm text-slate-700">{label}</span>
      <button type="button" onClick={() => onChange(!val)}
        className={`relative h-5 w-9 rounded-full transition ${val ? 'bg-brand-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}
