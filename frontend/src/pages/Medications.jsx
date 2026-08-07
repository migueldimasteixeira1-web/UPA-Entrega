import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pill, Search, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { MEDICATION_UNITS } from '../lib/constants';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { SkeletonTableRows } from '../components/Skeleton';
import { buttonClassName } from '../components/Button';

const emptyMed = { name: '', notes: '', active: true };
const emptyPresentation = { dosage: '', unit: 'unidade', active: true };
const PAGE_SIZE = 15;

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
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyMed);
  const [createError, setCreateError] = useState('');

  // Medicamento aberto no modal de detalhe (objeto vindo da lista) — os
  // dados de verdade exibidos são sempre relidos de `medications` (ver
  // `detailMedFresh`), esse estado só guarda qual id está aberto.
  const [detailMed, setDetailMed] = useState(null);
  const [detailForm, setDetailForm] = useState(emptyMed);
  const [detailError, setDetailError] = useState('');

  // Apresentação sendo criada/editada dentro do modal de detalhe — 'new',
  // o objeto da apresentação, ou null (formulário fechado). Fica inline no
  // mesmo modal em vez de abrir um segundo Modal por cima: dois Modal
  // simultâneos disputariam o mesmo listener de Escape.
  const [presentationEditing, setPresentationEditing] = useState(null);
  const [presentationForm, setPresentationForm] = useState(emptyPresentation);
  const [presentationFormError, setPresentationFormError] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => api.getMedications(),
  });

  const invalidateMedications = () => queryClient.invalidateQueries({ queryKey: ['medications'] });

  const filteredMedications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return medications;
    return medications.filter((med) => med.name.toLowerCase().includes(term));
  }, [medications, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMedications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedMedications = filteredMedications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const updateSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Depois de salvar uma apresentação a lista é invalidada e refeita — o
  // modal de detalhe continua aberto, então relê os dados atuais daquele
  // medicamento em vez de ficar com a cópia antiga em `detailMed`.
  const detailMedFresh = detailMed ? medications.find((m) => m.id === detailMed.id) || detailMed : null;

  const createMutation = useMutation({
    mutationFn: (data) => api.createMedication(data),
    onSuccess: () => {
      invalidateMedications();
      showToast('Medicamento criado');
      setCreateOpen(false);
      setCreateForm(emptyMed);
      setCreateError('');
    },
    onError: (err) => setCreateError(getErrorMessage(err)),
  });

  const updateMedMutation = useMutation({
    mutationFn: (data) => api.updateMedication(detailMed.id, data),
    onSuccess: () => {
      invalidateMedications();
      showToast('Medicamento atualizado');
      setDetailError('');
    },
    onError: (err) => setDetailError(getErrorMessage(err)),
  });

  const savePresentationMutation = useMutation({
    mutationFn: (data) =>
      presentationEditing && presentationEditing !== 'new'
        ? api.updateMedicationPresentation(detailMed.id, presentationEditing.id, data)
        : api.createMedicationPresentation(detailMed.id, data),
    onSuccess: () => {
      invalidateMedications();
      showToast(presentationEditing !== 'new' ? 'Apresentação atualizada' : 'Apresentação criada');
      setPresentationEditing(null);
      setPresentationForm(emptyPresentation);
      setPresentationFormError('');
    },
    onError: (err) => setPresentationFormError(getErrorMessage(err)),
  });

  const openCreate = () => {
    setCreateForm(emptyMed);
    setCreateError('');
    setCreateOpen(true);
  };

  const openDetail = (med) => {
    setDetailMed(med);
    setDetailForm({ name: med.name, notes: med.notes || '', active: med.active });
    setDetailError('');
    setPresentationEditing(null);
    setPresentationFormError('');
  };

  const closeDetail = () => setDetailMed(null);

  const openNewPresentation = () => {
    setPresentationEditing('new');
    setPresentationForm(emptyPresentation);
    setPresentationFormError('');
  };

  const openEditPresentation = (presentation) => {
    setPresentationEditing(presentation);
    setPresentationForm({ dosage: presentation.dosage, unit: presentation.unit, active: presentation.active });
    setPresentationFormError('');
  };

  const cancelPresentationForm = () => {
    setPresentationEditing(null);
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
        <button type="button" onClick={openCreate} className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}>
          <Plus className="w-4 h-4" /> Novo medicamento
        </button>
      </div>

      {!isLoading && medications.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Buscar medicamento por nome..."
            className="w-full sm:max-w-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-upa-500 focus:ring-2 focus:ring-upa-100"
          />
        </div>
      )}

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
      ) : filteredMedications.length === 0 ? (
        <EmptyState icon={Search} title={`Nenhum medicamento encontrado para "${searchTerm.trim()}"`} className="bg-white py-16" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedMedications.map((med) => {
              const activeCount = med.presentations.filter((p) => p.active).length;
              return (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => openDetail(med)}
                  className="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-start gap-2.5 hover:border-upa-300 transition-colors min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-upa-50 shrink-0">
                    <Pill className="w-4 h-4 text-upa-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{med.name}</p>
                    <div className="flex flex-col items-start gap-1 mt-1">
                      <StatusPill active={med.active} />
                      <span className="text-xs text-slate-400">
                        {activeCount === 0 ? 'Nenhuma apresentação ativa' : `${activeCount} apresentação(ões) ativa(s)`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">
                Página {currentPage} de {totalPages} · {filteredMedications.length} medicamento(s)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={buttonClassName('secondary', 'sm')}
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={buttonClassName('secondary', 'sm')}
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); }}
        title="Novo medicamento"
      >
        <div className="space-y-4">
          {createError && <Alert message={createError} onDismiss={() => setCreateError('')} />}
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Ex.: Amoxicilina"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="Opcional"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            Medicamento ativo
          </label>
          <button
            type="button"
            onClick={() => createMutation.mutate(createForm)}
            disabled={!createForm.name.trim() || createMutation.isPending}
            className={buttonClassName('primary', 'md', 'w-full')}
          >
            {createMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <Modal open={!!detailMed} onClose={closeDetail} title={detailMedFresh?.name || 'Medicamento'} size="lg">
        {detailMedFresh && (
          <div className="space-y-6">
            {detailError && <Alert message={detailError} onDismiss={() => setDetailError('')} />}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  value={detailForm.name}
                  onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea
                  value={detailForm.notes}
                  onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
                  placeholder="Opcional"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={detailForm.active}
                  onChange={(e) => setDetailForm({ ...detailForm, active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Medicamento ativo
              </label>
              <button
                type="button"
                onClick={() => updateMedMutation.mutate(detailForm)}
                disabled={!detailForm.name.trim() || updateMedMutation.isPending}
                className={buttonClassName('secondary', 'md', 'w-full')}
              >
                {updateMedMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>

            <div className="pt-5 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Apresentações</h3>

              {detailMedFresh.presentations.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma apresentação cadastrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {detailMedFresh.presentations.map((p) => (
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
                          onClick={() => openEditPresentation(p)}
                          className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-upa-50"
                          aria-label={`Editar apresentação ${p.dosage}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {presentationEditing ? (
                <div className="rounded-xl border border-upa-100 bg-upa-50/40 p-3 space-y-3">
                  {presentationFormError && (
                    <Alert message={presentationFormError} onDismiss={() => setPresentationFormError('')} />
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Dosagem *</label>
                    <input
                      value={presentationForm.dosage}
                      onChange={(e) => setPresentationForm({ ...presentationForm, dosage: e.target.value })}
                      placeholder="Ex.: 500mg"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-upa-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unidade</label>
                    <select
                      value={presentationForm.unit}
                      onChange={(e) => setPresentationForm({ ...presentationForm, unit: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white"
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
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelPresentationForm}
                      className={buttonClassName('secondary', 'sm', 'flex-1')}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => savePresentationMutation.mutate(presentationForm)}
                      disabled={!presentationForm.dosage.trim() || savePresentationMutation.isPending}
                      className={buttonClassName('primary', 'sm', 'flex-1')}
                    >
                      {savePresentationMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openNewPresentation}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-upa-700 hover:text-upa-900 px-1 py-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova apresentação
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
