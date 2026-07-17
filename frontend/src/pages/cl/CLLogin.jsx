import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';
import { useCLAuth } from '../../lib/clAuth.jsx';

export default function CLLogin() {
  const [email, setEmail] = useState('cl@groveno.com');
  const [password, setPassword] = useState('CL@123');
  const [loading, setLoading] = useState(false);
  const { login } = useCLAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/cl/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 grid place-items-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-brand-500 grid place-items-center text-white shadow-lg mb-3">
            <Leaf size={30} />
          </div>
          <div className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Groveno Fresh</div>
          <div className="text-sm text-brand-700 -mt-0.5 font-medium">Community Leader Panel</div>
        </div>

        <form onSubmit={onSubmit} className="card p-7" data-testid="cl-login-form">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-5">Log in to manage your community orders.</p>

          <div className="mb-4">
            <label className="label block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="input pl-9" data-testid="cl-login-email" placeholder="you@example.com" />
            </div>
          </div>
          <div className="mb-6">
            <label className="label block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="input pl-9" data-testid="cl-login-password" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base" data-testid="cl-login-submit">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-4 text-xs text-slate-400 text-center">
            Default: cl@groveno.com / CL@123
          </div>
        </form>
      </div>
    </div>
  );
}
