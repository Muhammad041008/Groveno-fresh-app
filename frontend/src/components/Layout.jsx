import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBasket, Tags, ClipboardList, MapPin,
  Warehouse, Users2, BadgeCheck, Wallet, BarChart3, LogOut, Zap, Leaf
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testid: 'nav-dashboard' },
  { to: '/products', label: 'Products', icon: ShoppingBasket, testid: 'nav-products' },
  { to: '/categories', label: 'Categories', icon: Tags, testid: 'nav-categories' },
  { to: '/orders', label: 'Orders', icon: ClipboardList, testid: 'nav-orders' },
  { to: '/express-pickup', label: 'Express Pickup', icon: Zap, testid: 'nav-express-pickup' },
  { to: '/pickup-points', label: 'Pickup Points', icon: MapPin, testid: 'nav-pickup-points' },
  { to: '/users', label: 'Users', icon: Users2, testid: 'nav-users' },
  { to: '/community-leaders', label: 'Community Leaders', icon: BadgeCheck, testid: 'nav-cls' },
  { to: '/wallet', label: 'Wallet', icon: Wallet, testid: 'nav-wallet' },
  { to: '/reports', label: 'Reports', icon: BarChart3, testid: 'nav-reports' },
];

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col" data-testid="admin-sidebar">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-500 grid place-items-center text-white shadow-sm">
            <Leaf size={18} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>Groveno Fresh</div>
            <div className="text-xs text-brand-700">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 my-0.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="px-3 py-2 rounded-lg bg-slate-50 mb-2">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm font-medium text-slate-800 truncate">{admin?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
            data-testid="btn-logout"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
