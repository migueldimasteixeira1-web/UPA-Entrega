import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCurrency } from '../lib/constants';
import Alert from '../components/Alert';

const STEPS = [
  'Dados do paciente',
  'Endereço',
  'Medicamentos',
  'Frete e observações',
  'Revisão',
];

const emptyForm = {
  patientName: '',
  patientPhone: '',
  patientCpf: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  referencePoint: '',
  internalNotes: '',
  patientNotes: '',
  freightValue: '',
  items: [{ medicationId: '', quantity: 1 }],
};

export default function NewOrder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', { active: true }],
    queryFn: () => api.getMedications({ active: 'true' }),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.createOrder(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      navigate(`/pedidos/${order.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao criar pedido. Tente novamente.'),
  });

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { medicationId: '', quantity: 1 }] }));

  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!form.patientName.trim() || !form.patientPhone.trim()) {
        setError('Nome e telefone são obrigatórios');
        return false;
      }
    }
    if (step === 1) {
      if (!form.address.trim() || !form.neighborhood.trim()) {
        setError('Endereço e bairro são obrigatórios');
        return false;
      }
    }
    if (step === 2) {
      const validItems = form.items.filter((i) => i.medicationId && i.quantity > 0);
      if (!validItems.length) {
        setError('Selecione ao menos um medicamento');
        return false;
      }
    }
    if (step === 3) {
      if (!form.freightValue || Number(form.freightValue) < 0) {
        setError('Informe o valor do frete');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    if (!validateStep()) return;

    mutation.mutate({
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      patientCpf: form.patientCpf,
      address: form.address,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      referencePoint: form.referencePoint,
      internalNotes: form.internalNotes,
      patientNotes: form.patientNotes,
      freightValue: Number(form.freightValue),
      items: form.items
        .filter((i) => i.medicationId)
        .map((i) => ({ medicationId: i.medicationId, quantity: Number(i.quantity) })),
    });
  };

  const selectedMeds = form.items
    .filter((i) => i.medicationId)
    .map((i) => {
      const med = medications.find((m) => m.id === i.medicationId);
      return { ...med, quantity: i.quantity };
    });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Novo pedido</h1>
        <p className="text-slate-500 mt-1">Cadastre a solicitação. Dados do Uber Flash serão registrados depois do pagamento.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className={`hidden sm:flex flex-1 items-center ${i < STEPS.length - 1 ? 'mr-2' : ''}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  i <= step ? 'bg-upa-800 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-upa-800' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm font-medium text-upa-800 sm:hidden">Etapa {step + 1}: {STEPS[step]}</p>
        <p className="text-sm text-slate-500 hidden sm:block text-center mt-2">{STEPS[step]}</p>
      </div>

      {error && <Alert message={error} onDismiss={() => setError('')} className="mb-4" />}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do paciente *</label>
              <input
                value={form.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone *</label>
                <input
                  value={form.patientPhone}
                  onChange={(e) => updateField('patientPhone', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF (opcional)</label>
                <input
                  value={form.patientCpf}
                  onChange={(e) => updateField('patientCpf', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endereço completo *</label>
              <input
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro *</label>
                <input
                  value={form.neighborhood}
                  onChange={(e) => updateField('neighborhood', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                <input
                  value={form.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <input
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ponto de referência</label>
              <input
                value={form.referencePoint}
                onChange={(e) => updateField('referencePoint', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-upa-500 focus:ring-2 focus:ring-upa-100 outline-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medicamento</label>
                  <select
                    value={item.medicationId}
                    onChange={(e) => updateItem(index, 'medicationId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
                  >
                    <option value="">Selecione...</option>
                    {medications.map((med) => (
                      <option key={med.id} value={med.id} disabled={med.quantity <= 0}>
                        {med.name} — {med.quantity} {med.unit}(s) disponível
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
                  />
                </div>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 text-sm text-upa-700 font-medium hover:text-upa-900"
            >
              <Plus className="w-4 h-4" /> Adicionar medicamento
            </button>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observações internas</label>
              <textarea
                value={form.internalNotes}
                onChange={(e) => updateField('internalNotes', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 resize-none"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor do frete (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.freightValue}
                onChange={(e) => updateField('freightValue', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500"
              />
              <p className="text-xs text-slate-500 mt-1">O paciente paga apenas o frete. Medicamento é gratuito.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observação para o paciente</label>
              <textarea
                value={form.patientNotes}
                onChange={(e) => updateField('patientNotes', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 resize-none"
              />
            </div>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
              Após criar o pedido, copie a mensagem de pagamento e envie manualmente ao paciente. Os dados do Uber Flash serão registrados somente depois da confirmação do pagamento.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Paciente</h3>
                <p>{form.patientName}</p>
                <p className="text-slate-500">{form.patientPhone}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Endereço</h3>
                <p>{form.address}</p>
                <p className="text-slate-500">{form.neighborhood}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Medicamentos</h3>
                {selectedMeds.map((m) => (
                  <p key={m.id}>{m.quantity}x {m.name}</p>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Frete</h3>
                <p className="text-lg font-bold text-upa-800">{formatCurrency(form.freightValue)}</p>
                <p className="text-slate-500 text-xs mt-1">Status inicial: Aguardando pagamento do frete</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {mutation.isPending ? 'Salvando...' : 'Criar pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
