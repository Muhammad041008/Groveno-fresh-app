import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, IndianRupee, QrCode, User, LogOut, Leaf } from 'lucide-react';
import { useCLAuth } from '../lib/clAuth.jsx';

const NAV = [
  { to: '/cl/dashboard', label: 'Home', icon: LayoutDashboard, testid: 'cl-nav-dashboard' },
  { to: '/cl/orders', label: 'Orders', icon: ClipboardList, testid: 'cl-nav-orders' },
  { to: '/cl/earnings', label: 'Earnings', icon: IndianRupee, testid: 'cl-nav-earnings' },
  { to: '/cl/qr', label: 'QR', icon: QrCode, testid: 'cl-nav-qr' },
  { to: '/cl/profile', label: 'Profile', icon: User, testid: 'cl-nav-profile' },
];

export default function CLLayout() {
  const { cl, logout } = useCLAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100" data-testid="cl-app-shell">
      <div className="mx-auto max-w-[480px] min-h-screen bg-slate-50 shadow-sm relative flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-500 grid place-items-center text-white">
              <Leaf size={16} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Groveno Fresh</div>
              <div className="text-[11px] text-brand-700 -mt-0.5">CL Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right leading-tight">
              <div className="text-[11px] text-slate-400">Hi,</div>
              <div className="text-sm font-medium text-slate-800 truncate max-w-[110px]">{cl?.name || 'CL'}</div>
            </div>
            <button
              onClick={() => { logout(); navigate('/cl/login'); }}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-600"
              data-testid="cl-btn-logout"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 grid grid-cols-5 z-30" data-testid="cl-bottom-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <n.icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{n.label}</span>
                  {isActive && <span className="h-0.5 w-6 bg-brand-500 rounded-full absolute bottom-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
