import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pill, Edit2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { MEDICATION_UNITS } from '../lib/constants';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { SkeletonTableRows } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

const emptyMed = {
  name: '',
  unit: 'unidade',
  active: true,
};

export default function Medications() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMed);
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => api.getMedications(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? api.updateMedication(editing.id, data) : api.createMedication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      showToast(editing ? 'Medicamento atualizado' : 'Medicamento criado');
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
    setForm({ name: med.name, unit: med.unit, active: med.active });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de medicamentos</h1>
          <p className="text-slate-500 mt-1">
            Lista de nomes para agilizar o registro dos pedidos. O controle de estoque é feito pela farmácia da UPA, fora deste sistema.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}>
          <Plus className="w-4 h-4" /> Novo medicamento
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Medicamento</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Unidade</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 sm:px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTableRows rows={5} columns={4} />
              ) : (
                medications.map((med, index) => (
                  <tr
                    key={med.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                      index % 2 === 1 ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-upa-50">
                          <Pill className="w-5 h-5 text-upa-600" />
                        </div>
                        <p className="font-medium text-slate-800">{med.name}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-slate-600">{med.unit}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        med.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {med.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(med)}
                        className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-upa-50"
                        aria-label={`Editar ${med.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && medications.length === 0 && (
            <EmptyState icon={Pill} title="Nenhum medicamento cadastrado" className="m-4" />
          )}
        </div>
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
            <label className="block text-sm font-medium mb-1">Unidade</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-white"
            >
              {MEDICATION_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
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
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.name.trim() || saveMutation.isPending}
            className={buttonClassName('primary', 'md', 'w-full')}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
