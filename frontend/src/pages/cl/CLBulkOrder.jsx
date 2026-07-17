import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Users2 } from 'lucide-react';
import clApi from '../../lib/clApi';
import { inr } from '../../lib/format.jsx';

const emptyCustomer = () => ({
  customerName: '',
  address: { line1: '', city: '', pincode: '', landmark: '' },
  items: [{ productId: '', variantSize: 'medium', quantity: 1 }],
});

export default function CLBulkOrder() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([emptyCustomer()]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    clApi.get('/products?limit=100').then((r) => setProducts(r.data.products));
  }, []);

  const setC = (idx, patch) => setCustomers((cs) => cs.map((c, i) => i === idx ? { ...c, ...patch } : c));
  const setAddr = (idx, patch) => setC(idx, { address: { ...customers[idx].address, ...patch } });
  const setItem = (ci, ii, patch) => setC(ci, { items: customers[ci].items.map((it, i) => i === ii ? { ...it, ...patch } : it) });
  const addItem = (ci) => setC(ci, { items: [...customers[ci].items, { productId: '', variantSize: 'medium', quantity: 1 }] });
  const rmItem = (ci, ii) => setC(ci, { items: customers[ci].items.filter((_, i) => i !== ii) });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        orders: customers.map((c) => ({
          customerName: c.customerName.trim(),
          address: c.address,
          items: c.items.filter((it) => it.productId && it.quantity > 0),
        })),
      };
      if (payload.orders.some((o) => !o.customerName || !o.address.line1 || o.items.length === 0)) {
        toast.error('Please fill customer name, address, and at least one item for each customer.');
        setSaving(false);
        return;
      }
      const { data } = await clApi.post('/orders/cl-bulk', payload);
      toast.success(`Placed ${data.count} order${data.count === 1 ? '' : 's'}!`);
      navigate('/cl/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place orders');
    } finally { setSaving(false); }
  };

  const totalSpots = customers.length;
  const totalItems = customers.reduce((a, c) => a + c.items.reduce((s, it) => s + Number(it.quantity || 0), 0), 0);

  return (
    <div className="p-4 pb-6" data-testid="cl-page-bulk">
      <button onClick={() => navigate('/cl/orders')} className="btn-ghost !px-2 mb-2 -ml-2 text-sm text-slate-600">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Place Order for My Community</h1>
        <p className="text-sm text-slate-500 mt-0.5">Bulk-place orders on behalf of your society members. All orders will be tagged with your CL code automatically.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {customers.map((c, ci) => (
          <div key={ci} className="card p-4" data-testid={`cl-bulk-customer-${ci}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-bold">{ci + 1}</div>
                Customer {ci + 1}
              </div>
              {customers.length > 1 && (
                <button type="button" onClick={() => setCustomers(customers.filter((_, i) => i !== ci))} className="btn-ghost !p-1.5 !text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label block">Customer Name</label>
                <input required className="input" value={c.customerName} onChange={(e) => setC(ci, { customerName: e.target.value })}
                  placeholder="e.g. Priya Sharma" data-testid={`cl-bulk-name-${ci}`} />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input required className="input" placeholder="Address line 1 (e.g. Tower B, Flat 501)"
                  value={c.address.line1} onChange={(e) => setAddr(ci, { line1: e.target.value })} data-testid={`cl-bulk-addr-${ci}`} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="City" value={c.address.city} onChange={(e) => setAddr(ci, { city: e.target.value })} />
                  <input className="input" placeholder="Pincode" value={c.address.pincode} onChange={(e) => setAddr(ci, { pincode: e.target.value })} />
                </div>
                <input className="input" placeholder="Landmark / Notes" value={c.address.landmark} onChange={(e) => setAddr(ci, { landmark: e.target.value })} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="label !mb-0">Items</span>
                  <button type="button" onClick={() => addItem(ci)} className="text-xs text-brand-700 font-medium flex items-center gap-1">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {c.items.map((it, ii) => (
                    <div key={ii} className="grid grid-cols-[1fr_80px_60px_auto] gap-1.5" data-testid={`cl-bulk-item-${ci}-${ii}`}>
                      <select required className="input !py-1.5 text-sm"
                        value={it.productId} onChange={(e) => setItem(ci, ii, { productId: e.target.value })}>
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select className="input !py-1.5 text-sm" value={it.variantSize} onChange={(e) => setItem(ci, ii, { variantSize: e.target.value })}>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                      <input required type="number" min="1" className="input !py-1.5 text-sm text-center"
                        value={it.quantity} onChange={(e) => setItem(ci, ii, { quantity: Number(e.target.value) })} />
                      {c.items.length > 1 && (
                        <button type="button" onClick={() => rmItem(ci, ii)} className="btn-ghost !p-1.5 !text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setCustomers([...customers, emptyCustomer()])}
          className="btn-outline w-full py-2.5 text-sm border-dashed" data-testid="cl-bulk-add-customer">
          <Plus size={16} /> Add another customer
        </button>

        <div className="card p-4 bg-brand-50/50 border-brand-100">
          <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
            <Users2 size={15} className="text-brand-700" /> Summary
          </div>
          <div className="text-xs text-slate-600">{totalSpots} customer{totalSpots === 1 ? '' : 's'} · {totalItems} total item{totalItems === 1 ? '' : 's'}</div>
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={saving} data-testid="cl-bulk-submit">
          {saving ? 'Placing orders…' : `Place ${totalSpots} Order${totalSpots === 1 ? '' : 's'}`}
        </button>
      </form>
    </div>
  );
}
