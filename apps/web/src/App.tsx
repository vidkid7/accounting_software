import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/Layout';
import Login from './routes/auth/Login';
import Dashboard from './routes/dashboard/Dashboard';
import Products from './routes/inventory/Products';
import Warehouses from './routes/inventory/Warehouses';
import Invoices from './routes/sales/Invoices';
import Customers from './routes/sales/Customers';
import Bills from './routes/purchase/Bills';
import Vendors from './routes/purchase/Vendors';
import Accounts from './routes/accounting/Accounts';
import Bank from './routes/accounting/Bank';
import Expenses from './routes/accounting/Expenses';
import Assets from './routes/accounting/Assets';
import Fx from './routes/accounting/Fx';
import Pos from './routes/sales/Pos';
import Branches from './routes/company/Branches';
import Integrations from './routes/integrations/Integrations';
import Reports from './routes/reports/Reports';
import TrialBalance from './routes/accounting/TrialBalance';

function Bootstrap() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const setAuth = useAuth((s) => s.setAuth);
  // Rehydrate the user profile from a persisted token (page reload / new tab).
  useEffect(() => {
    if (token && !user) {
      setAuth(token, null);
    }
  }, [token, user, setAuth]);
  return null;
}

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Bootstrap />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory/products" element={<Products />} />
        <Route path="inventory/warehouses" element={<Warehouses />} />
        <Route path="sales/invoices" element={<Invoices />} />
        <Route path="sales/customers" element={<Customers />} />
        <Route path="sales/pos" element={<Pos />} />
        <Route path="purchase/bills" element={<Bills />} />
        <Route path="purchase/vendors" element={<Vendors />} />
        <Route path="accounting/accounts" element={<Accounts />} />
        <Route path="accounting/bank" element={<Bank />} />
        <Route path="accounting/expenses" element={<Expenses />} />
        <Route path="accounting/assets" element={<Assets />} />
        <Route path="accounting/fx" element={<Fx />} />
        <Route path="company/branches" element={<Branches />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="accounting/trial-balance" element={<TrialBalance />} />
      </Route>
    </Routes>
    </>
  );
}
