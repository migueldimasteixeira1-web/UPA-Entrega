import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth, ApiError } from '../lib/auth';

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
      setError(err instanceof ApiError ? err.message : 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-upa-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-upa-700 to-upa-900" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">UPA Entrega</h1>
          <p className="text-lg text-blue-100 leading-relaxed max-w-md">
            Sistema interno para organização, registro e controle de entregas de medicamentos a domicílio.
          </p>
          <div className="mt-12 space-y-4 text-blue-100 text-sm">
            <p>✓ Controle operacional em tempo real</p>
            <p>✓ Histórico auditável de ações</p>
            <p>✓ Gestão de estoque integrada</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-upa-800 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-upa-900">UPA Entrega</h1>
              <p className="text-sm text-slate-500">Acesso restrito à equipe</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Entrar no sistema</h2>
              <p className="text-slate-500 mt-1">Use suas credenciais de operador ou administrador</p>
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
                className="w-full py-3 px-4 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 focus:ring-4 focus:ring-upa-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Acessar sistema'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Sistema interno da UPA — acesso autorizado apenas
          </p>
        </div>
      </div>
    </div>
  );
}
