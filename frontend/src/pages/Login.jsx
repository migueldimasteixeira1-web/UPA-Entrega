import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import { buttonClassName } from '../components/Button';
import AppBrand, { MunicipalityBrand } from '../components/AppBrand';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-upa-50 via-white to-slate-100 flex flex-col items-center justify-center px-4 py-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 w-80 h-80 rounded-full bg-upa-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-upa-300/30 blur-3xl"
      />

      <div className="relative w-full max-w-md flex flex-col items-center gap-6 sm:gap-8">
        <AppBrand variant="login" subtitle="Acesso restrito à equipe da unidade de saúde" />

        <div className="w-full bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/80 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-upa-600 via-upa-800 to-upa-900" />
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-800">Entrar no sistema</h2>
              <p className="text-slate-500 mt-1 text-sm">Use suas credenciais de operador ou administrador</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none transition-all"
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={buttonClassName('primary', 'md', 'w-full focus:ring-4 focus:ring-upa-100')}
              >
                {loading ? 'Entrando...' : 'Acessar sistema'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Sistema interno da unidade de saúde — acesso autorizado apenas
        </p>

        <MunicipalityBrand className="pt-2" logoClassName="h-9 w-auto max-w-[180px]" />
      </div>
    </div>
  );
}
