import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import OrderLabel from './pages/OrderLabel';
import DeliveryRoutes from './pages/DeliveryRoutes';
import MyDeliveries from './pages/MyDeliveries';
import Medications from './pages/Medications';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
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
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
            <OfflineBanner />
            <BrowserRouter>
              <Routes>
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                <Route path="/acompanhar/:token" element={<PublicTracking />} />

                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR']} />}>
                  <Route path="/pedidos/:id/etiqueta" element={<OrderLabel />} />
                  <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="/pedidos/novo" element={<NewOrder />} />
                    <Route path="/pedidos/:id" element={<OrderDetail />} />
                    <Route path="/rotas" element={<DeliveryRoutes />} />
                    <Route path="/medicamentos" element={<Medications />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route element={<Layout />}>
                    <Route path="/usuarios" element={<Users />} />
                    <Route path="/auditoria" element={<AuditLog />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ENTREGADOR']} />}>
                  <Route element={<Layout />}>
                    <Route path="/entregas" element={<MyDeliveries />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
