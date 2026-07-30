import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Users,
  LogOut,
  Menu,
  X,
  Plus,
  Route as RouteIcon,
  Truck,
  History,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppBrand from './AppBrand';
import { useAuth } from '../lib/auth';

const operatorNavItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/pedidos/novo', label: 'Novo pedido', icon: Plus },
  { to: '/rotas', label: 'Rotas', icon: RouteIcon },
  { to: '/medicamentos', label: 'Medicamentos', icon: Pill },
  { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
  { to: '/auditoria', label: 'Auditoria', icon: History, adminOnly: true },
];

const courierNavItems = [
  { to: '/entregas', label: 'Minhas entregas', icon: Truck, end: true },
];

export default function Layout() {
  const { user, logout, isAdmin, isEntregador } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = isEntregador ? courierNavItems : operatorNavItems;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-slate-100 shrink-0"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <AppBrand variant="header" showMunicipality />
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {filteredNav.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-upa-50 text-upa-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <div className="hidden sm:block text-right max-w-[140px] md:max-w-none">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'ENTREGADOR' ? 'Entregador' : 'Operador'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 top-14 sm:top-16 bg-slate-900/25 z-30 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            />
            <nav className="lg:hidden relative z-40 border-t border-slate-100 bg-white px-4 py-3 space-y-1 max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto">
              {filteredNav.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 min-h-11 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-upa-50 text-upa-800' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
