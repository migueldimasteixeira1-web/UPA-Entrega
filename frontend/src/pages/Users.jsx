import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, User } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import { formatDate } from '../lib/constants';

const emptyUser = { name: '', email: '', password: '', role: 'OPERADOR' };

export default function Users() {
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [resetError, setResetError] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setForm(emptyUser);
      setFormError('');
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Erro ao criar usuário'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário'),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }) => api.resetPassword(id, password),
    onSuccess: () => {
      setResetModal(null);
      setNewPassword('');
      setResetError('');
    },
    onError: (err) => setResetError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de usuários</h1>
          <p className="text-slate-500 mt-1">Cadastro de operadores e administradores</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900"
        >
          <Plus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Criado em</th>
                  <th className="px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-upa-50 flex items-center justify-center">
                          {user.role === 'ADMIN' ? (
                            <Shield className="w-5 h-5 text-upa-700" />
                          ) : (
                            <User className="w-5 h-5 text-upa-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: user.id, data: { active: !user.active } })}
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setResetModal(user)}
                        className="text-sm text-upa-700 hover:underline"
                      >
                        Redefinir senha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setFormError(''); }} title="Novo usuário">
        <div className="space-y-4">
          {formError && <Alert message={formError} onDismiss={() => setFormError('')} />}
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perfil</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            >
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => createMutation.mutate(form)}
            disabled={!form.name || !form.email || !form.password || createMutation.isPending}
            className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium disabled:opacity-60"
          >
            {createMutation.isPending ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </Modal>

      <Modal open={!!resetModal} onClose={() => { setResetModal(null); setResetError(''); }} title="Redefinir senha">
        <div className="space-y-4">
          {resetError && <Alert message={resetError} onDismiss={() => setResetError('')} />}
          <p className="text-sm text-slate-600">
            Nova senha para <strong>{resetModal?.name}</strong>
          </p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            placeholder="Nova senha (mín. 6 caracteres)"
          />
          <button
            type="button"
            onClick={() => resetMutation.mutate({ id: resetModal.id, password: newPassword })}
            disabled={newPassword.length < 6 || resetMutation.isPending}
            className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium disabled:opacity-60"
          >
            {resetMutation.isPending ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
