import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { CLAuthProvider, useCLAuth } from './lib/clAuth.jsx';
import Layout from './components/Layout.jsx';
import CLLayout from './components/CLLayout.jsx';

// Admin pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Categories from './pages/Categories.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import ExpressPickup from './pages/ExpressPickup.jsx';
import PickupPoints from './pages/PickupPoints.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';
import CLs from './pages/CLs.jsx';
import Wallet from './pages/Wallet.jsx';
import Reports from './pages/Reports.jsx';

// CL Panel pages
import CLLogin from './pages/cl/CLLogin.jsx';
import CLDashboard from './pages/cl/CLDashboard.jsx';
import CLOrders from './pages/cl/CLOrders.jsx';
import CLOrderDetail from './pages/cl/CLOrderDetail.jsx';
import CLBulkOrder from './pages/cl/CLBulkOrder.jsx';
import CLEarnings from './pages/cl/CLEarnings.jsx';
import CLQrCode from './pages/cl/CLQrCode.jsx';
import CLProfile from './pages/cl/CLProfile.jsx';

function AdminProtected({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function CLProtected({ children }) {
  const { token, loading } = useCLAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (!token) return <Navigate to="/cl/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <CLAuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/cl/login" element={<CLLogin />} />

          {/* CL Panel (mobile-first) */}
          <Route
            path="/cl"
            element={
              <CLProtected>
                <CLLayout />
              </CLProtected>
            }
          >
            <Route index element={<Navigate to="/cl/dashboard" replace />} />
            <Route path="dashboard" element={<CLDashboard />} />
            <Route path="orders" element={<CLOrders />} />
            <Route path="orders/bulk" element={<CLBulkOrder />} />
            <Route path="orders/:id" element={<CLOrderDetail />} />
            <Route path="earnings" element={<CLEarnings />} />
            <Route path="qr" element={<CLQrCode />} />
            <Route path="profile" element={<CLProfile />} />
          </Route>

          {/* Admin Panel */}
          <Route
            path="/"
            element={
              <AdminProtected>
                <Layout />
              </AdminProtected>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="express-pickup" element={<ExpressPickup />} />
            <Route path="pickup-points" element={<PickupPoints />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="community-leaders" element={<CLs />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </CLAuthProvider>
    </AuthProvider>
  );
}
