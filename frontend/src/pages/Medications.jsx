import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, Pill, Edit2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

const emptyMed = {
  name: '',
  description: '',
  unit: 'unidade',
  quantity: 0,
  minStock: 5,
  active: true,
  notes: '',
};

export default function Medications() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMed);
  const [showLowStock, setShowLowStock] = useState(false);
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications', { lowStock: showLowStock }],
    queryFn: () => api.getMedications(showLowStock ? { lowStock: 'true' } : {}),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? api.updateMedication(editing.id, data) : api.createMedication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setModalOpen(false);
      setEditing(null);
      setForm(emptyMed);
      setFormError('');
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Erro ao salvar medicamento'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMed);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (med) => {
    setEditing(med);
    setFormError('');
    setForm({
      name: med.name,
      description: med.description || '',
      unit: med.unit,
      quantity: med.quantity,
      minStock: med.minStock,
      active: med.active,
      notes: med.notes || '',
    });
    setModalOpen(true);
  };

  const lowStockCount = medications.filter((m) => m.isLowStock).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque de medicamentos</h1>
          <p className="text-slate-500 mt-1">Cadastro e controle de quantidades</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900"
        >
          <Plus className="w-4 h-4" /> Novo medicamento
        </button>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">{lowStockCount} medicamento(s) abaixo do estoque mínimo</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLowStock(!showLowStock)}
            className="text-sm font-medium text-amber-800 underline"
          >
            {showLowStock ? 'Ver todos' : 'Filtrar alertas'}
          </button>
        </div>
      )}

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
                  <th className="px-6 py-3 font-medium">Medicamento</th>
                  <th className="px-6 py-3 font-medium">Unidade</th>
                  <th className="px-6 py-3 font-medium">Quantidade</th>
                  <th className="px-6 py-3 font-medium">Mínimo</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id} className={`border-b border-slate-100 ${med.isLowStock ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${med.isLowStock ? 'bg-amber-100' : 'bg-upa-50'}`}>
                          <Pill className={`w-5 h-5 ${med.isLowStock ? 'text-amber-600' : 'text-upa-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{med.name}</p>
                          {med.description && <p className="text-xs text-slate-500">{med.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{med.unit}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${med.isLowStock ? 'text-amber-700' : 'text-slate-800'}`}>
                        {med.quantity}
                      </span>
                      {med.isLowStock && (
                        <span className="ml-2 text-xs text-amber-600">Baixo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{med.minStock}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        med.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {med.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(med)}
                        className="p-2 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-upa-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {medications.length === 0 && (
              <p className="text-center text-slate-400 py-12">Nenhum medicamento cadastrado</p>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setFormError(''); }}
        title={editing ? 'Editar medicamento' : 'Novo medicamento'}
      >
        <div className="space-y-4">
          {formError && <Alert message={formError} onDismiss={() => setFormError('')} />}
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Unidade</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estoque mín.</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            Medicamento ativo
          </label>
          <button
            type="button"
            onClick={() => saveMutation.mutate({
              ...form,
              quantity: Number(form.quantity),
              minStock: Number(form.minStock),
            })}
            disabled={!form.name.trim() || saveMutation.isPending}
            className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
