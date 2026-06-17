import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import Medications from './pages/Medications';
import Users from './pages/Users';
import PublicTracking from './pages/PublicTracking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route path="/acompanhar/:token" element={<PublicTracking />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="/pedidos/novo" element={<NewOrder />} />
                <Route path="/pedidos/:id" element={<OrderDetail />} />
                <Route path="/estoque" element={<Medications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute adminOnly />}>
              <Route element={<Layout />}>
                <Route path="/usuarios" element={<Users />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
