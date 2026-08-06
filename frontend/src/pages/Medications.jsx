import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pill, Edit2 } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { MEDICATION_UNITS } from '../lib/constants';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { SkeletonTableRows } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

const emptyMed = { name: '', active: true };
const emptyPresentation = { dosage: '', unit: 'unidade', active: true };

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export default function Medications() {
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState(emptyMed);
  const [medFormError, setMedFormError] = useState('');

  // presentationTarget: o Medicamento dono da apresentação sendo criada/editada.
  const [presentationTarget, setPresentationTarget] = useState(null);
  const [editingPresentation, setEditingPresentation] = useState(null);
  const [presentationForm, setPresentationForm] = useState(emptyPresentation);
  const [presentationFormError, setPresentationFormError] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => api.getMedications(),
  });

  const invalidateMedications = () => queryClient.invalidateQueries({ queryKey: ['medications'] });

  const saveMedMutation = useMutation({
    mutationFn: (data) =>
      editingMed ? api.updateMedication(editingMed.id, data) : api.createMedication(data),
    onSuccess: () => {
      invalidateMedications();
      showToast(editingMed ? 'Medicamento atualizado' : 'Medicamento criado');
      setMedModalOpen(false);
      setEditingMed(null);
      setMedForm(emptyMed);
      setMedFormError('');
    },
    onError: (err) => setMedFormError(getErrorMessage(err)),
  });

  const savePresentationMutation = useMutation({
    mutationFn: (data) =>
      editingPresentation
        ? api.updateMedicationPresentation(presentationTarget.id, editingPresentation.id, data)
        : api.createMedicationPresentation(presentationTarget.id, data),
    onSuccess: () => {
      invalidateMedications();
      showToast(editingPresentation ? 'Apresentação atualizada' : 'Apresentação criada');
      setPresentationTarget(null);
      setEditingPresentation(null);
      setPresentationForm(emptyPresentation);
      setPresentationFormError('');
    },
    onError: (err) =>
      setPresentationFormError(getErrorMessage(err)),
  });

  const openCreateMed = () => {
    setEditingMed(null);
    setMedForm(emptyMed);
    setMedFormError('');
    setMedModalOpen(true);
  };

  const openEditMed = (med) => {
    setEditingMed(med);
    setMedFormError('');
    setMedForm({ name: med.name, active: med.active });
    setMedModalOpen(true);
  };

  const openCreatePresentation = (med) => {
    setPresentationTarget(med);
    setEditingPresentation(null);
    setPresentationForm(emptyPresentation);
    setPresentationFormError('');
  };

  const openEditPresentation = (med, presentation) => {
    setPresentationTarget(med);
    setEditingPresentation(presentation);
    setPresentationFormError('');
    setPresentationForm({ dosage: presentation.dosage, unit: presentation.unit, active: presentation.active });
  };

  const closePresentationModal = () => {
    setPresentationTarget(null);
    setEditingPresentation(null);
    setPresentationFormError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de medicamentos</h1>
          <p className="text-slate-500 mt-1">
            Cada medicamento pode ter várias apresentações (dosagens diferentes). O controle de estoque é feito pela farmácia da unidade de saúde, fora deste sistema.
          </p>
        </div>
        <button type="button" onClick={openCreateMed} className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}>
          <Plus className="w-4 h-4" /> Novo medicamento
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <SkeletonTableRows rows={5} columns={1} />
            </tbody>
          </table>
        </div>
      ) : medications.length === 0 ? (
        <EmptyState icon={Pill} title="Nenhum medicamento cadastrado" className="bg-white py-16" />
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-upa-50 shrink-0">
                    <Pill className="w-5 h-5 text-upa-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{med.name}</p>
                    <StatusPill active={med.active} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditMed(med)}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-upa-50 shrink-0"
                  aria-label={`Editar ${med.name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pl-1 space-y-2">
                {med.presentations.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma apresentação cadastrada ainda.</p>
                ) : (
                  med.presentations.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700">
                        {p.dosage} <span className="text-slate-400">· {p.unit}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill active={p.active} />
                        <button
                          type="button"
                          onClick={() => openEditPresentation(med, p)}
                          className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-upa-50"
                          aria-label={`Editar apresentação ${p.dosage} de ${med.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => openCreatePresentation(med)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-upa-700 hover:text-upa-900 px-1 py-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova apresentação
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={medModalOpen}
        onClose={() => { setMedModalOpen(false); setEditingMed(null); setMedFormError(''); }}
        title={editingMed ? 'Editar medicamento' : 'Novo medicamento'}
      >
        <div className="space-y-4">
          {medFormError && <Alert message={medFormError} onDismiss={() => setMedFormError('')} />}
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              value={medForm.name}
              onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
              placeholder="Ex.: Amoxicilina"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={medForm.active}
              onChange={(e) => setMedForm({ ...medForm, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            Medicamento ativo
          </label>
          <button
            type="button"
            onClick={() => saveMedMutation.mutate(medForm)}
            disabled={!medForm.name.trim() || saveMedMutation.isPending}
            className={buttonClassName('primary', 'md', 'w-full')}
          >
            {saveMedMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!presentationTarget}
        onClose={closePresentationModal}
        title={
          editingPresentation
            ? `Editar apresentação — ${presentationTarget?.name}`
            : `Nova apresentação — ${presentationTarget?.name}`
        }
      >
        <div className="space-y-4">
          {presentationFormError && <Alert message={presentationFormError} onDismiss={() => setPresentationFormError('')} />}
          <div>
            <label className="block text-sm font-medium mb-1">Dosagem *</label>
            <input
              value={presentationForm.dosage}
              onChange={(e) => setPresentationForm({ ...presentationForm, dosage: e.target.value })}
              placeholder="Ex.: 500mg"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidade</label>
            <select
              value={presentationForm.unit}
              onChange={(e) => setPresentationForm({ ...presentationForm, unit: e.target.value })}
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
              checked={presentationForm.active}
              onChange={(e) => setPresentationForm({ ...presentationForm, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            Apresentação ativa
          </label>
          <button
            type="button"
            onClick={() => savePresentationMutation.mutate(presentationForm)}
            disabled={!presentationForm.dosage.trim() || savePresentationMutation.isPending}
            className={buttonClassName('primary', 'md', 'w-full')}
          >
            {savePresentationMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
