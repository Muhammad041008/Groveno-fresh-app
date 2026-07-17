import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const [email, setEmail] = useState('admin@groveno.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand-500 grid place-items-center text-white shadow-md">
            <Leaf size={22} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Groveno Fresh</div>
            <div className="text-sm text-brand-700 -mt-0.5">Admin Panel</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-8" data-testid="login-form">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-6">Welcome back. Please enter your credentials.</p>

          <div className="mb-4">
            <label className="label block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                data-testid="login-email"
                placeholder="admin@groveno.com"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="label block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input pl-9"
                data-testid="login-password"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
            data-testid="login-submit"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-4 text-xs text-slate-400 text-center">
            Default: admin@groveno.com / Admin@123
          </div>
        </form>
      </div>
    </div>
  );
}
