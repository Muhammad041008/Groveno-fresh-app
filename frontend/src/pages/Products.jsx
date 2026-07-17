import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Loader, EmptyState } from '../components/UI.jsx';
import { inr } from '../lib/format.jsx';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (catFilter) params.append('category', catFilter);
    params.append('limit', 50);
    const [pRes, cRes] = await Promise.all([
      api.get(`/products?${params.toString()}`),
      api.get('/categories'),
    ]);
    setProducts(pRes.data.products);
    setCategories(cRes.data.categories);
    setLoading(false);
  };

  useEffect(() => { load();  }, [catFilter]);
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
     
  }, [search]);

  const toggleStock = async (p) => {
    const first = p.variants?.[0];
    if (!first) return;
    const newStock = first.stock > 0 ? 0 : 100;
    await api.put(`/admin/products/${p.id}`, {
      variants: p.variants.map((v) => ({ ...v, stock: newStock })),
    });
    toast.success(newStock ? 'In stock' : 'Out of stock');
    load();
  };

  const del = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await api.delete(`/admin/products/${p.id}`);
    toast.success('Product deleted');
    load();
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="page-products">
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'}`}
        right={
          <Link to="/products/new" className="btn-primary" data-testid="btn-add-product">
            <Plus size={16} /> Add Product
          </Link>
        }
      />

      <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            className="input pl-9" placeholder="Search products…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            data-testid="products-search"
          />
        </div>
        <select
          value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="input max-w-xs" data-testid="products-category-filter"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      {loading ? <Loader /> : products.length === 0 ? (
        <EmptyState title="No products found" subtitle="Try adjusting the filters or add a new product." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">Category</th>
                <th className="table-th">Price</th>
                <th className="table-th">MRP</th>
                <th className="table-th">Stock</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const v = p.variants?.[0] || {};
                const inStock = (p.variants || []).some((x) => x.stock > 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-50" data-testid={`product-row-${p.id}`}>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]
                          ? <img src={p.images[0]} className="h-10 w-10 rounded-lg object-cover" alt="" />
                          : <div className="h-10 w-10 rounded-lg bg-brand-50 grid place-items-center text-lg">🥗</div>}
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.variants?.length || 0} variants</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{p.categoryName || p.category?.name || '—'}</td>
                    <td className="table-td font-medium">{inr(v.price)}</td>
                    <td className="table-td text-slate-500 line-through">{inr(v.mrp)}</td>
                    <td className="table-td">
                      <button
                        onClick={() => toggleStock(p)}
                        className={`badge ${inStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                        data-testid={`toggle-stock-${p.id}`}
                      >
                        {inStock ? 'In stock' : 'Out of stock'}
                      </button>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/products/${p.id}`} className="btn-ghost !p-2" data-testid={`edit-${p.id}`}>
                          <Pencil size={15} />
                        </Link>
                        <button onClick={() => del(p)} className="btn-ghost !p-2 !text-red-600" data-testid={`delete-${p.id}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
