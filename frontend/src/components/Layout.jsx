import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Pill,
  Users,
  LogOut,
  Menu,
  X,
  Plus,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/pedidos/novo', label: 'Novo pedido', icon: Plus },
  { to: '/estoque', label: 'Estoque', icon: Pill },
  { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-upa-800 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-upa-900 text-lg leading-tight">UPA Entrega</h1>
                  <p className="text-xs text-slate-500 hidden sm:block">Gestão de entregas de medicamentos</p>
                </div>
              </div>
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

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <nav className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {filteredNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-upa-50 text-upa-800' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
