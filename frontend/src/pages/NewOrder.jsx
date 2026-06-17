import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  CreditCard,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCurrency } from '../lib/constants';
import {
  maskCep,
  maskCpf,
  maskCurrency,
  maskPhone,
  onlyDigits,
  parseCurrency,
} from '../lib/masks';
import { fetchAddressByCep } from '../lib/viacep';
import Alert from '../components/Alert';
import FormField, { inputClassName, readOnlyInputClassName } from '../components/FormField';

const STEPS = [
  { label: 'Dados do paciente', icon: ClipboardList },
  { label: 'Endereço', icon: Truck },
  { label: 'Medicamentos', icon: Plus },
  { label: 'Frete e observações', icon: CreditCard },
  { label: 'Revisão', icon: Check },
];

const emptyForm = {
  patientName: '',
  patientPhone: '',
  patientCpf: '',
  street: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  internalNotes: '',
  patientNotes: '',
  freightValue: '',
  items: [{ medicationId: '', quantity: 1 }],
};

function buildFullAddress(street, number) {
  return `${street.trim()}, ${number.trim()}`;
}

export default function NewOrder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState('');
  const [streetFromCep, setStreetFromCep] = useState(false);
  const [touchedAddressFields, setTouchedAddressFields] = useState(() => new Set());
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

  const markAddressTouched = (field) => {
    setTouchedAddressFields((prev) => new Set(prev).add(field));
  };

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { medicationId: '', quantity: 1 }] }));

  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const handleCepChange = async (rawValue) => {
    const masked = maskCep(rawValue);
    updateField('zipCode', masked);
    setCepMessage('');

    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const result = await fetchAddressByCep(digits);
      if (result?.error) {
        setCepMessage(result.error);
        setStreetFromCep(false);
        return;
      }

      setForm((current) => ({
        ...current,
        zipCode: masked,
        street: touchedAddressFields.has('street') ? current.street : result.address || current.street,
        neighborhood: touchedAddressFields.has('neighborhood') ? current.neighborhood : result.neighborhood || current.neighborhood,
        city: result.city || current.city,
        state: result.state || current.state,
      }));
      setStreetFromCep(!!result.address);
      setCepMessage('Rua, bairro, cidade e estado preenchidos pelo CEP. Informe número e complemento.');
    } catch {
      setCepMessage('Não foi possível consultar o CEP. Preencha a rua manualmente.');
      setStreetFromCep(false);
    } finally {
      setCepLoading(false);
    }
  };

  const validateStep = () => {
    setError('');
    const errors = {};

    if (step === 0) {
      if (!form.patientName.trim()) errors.patientName = 'Nome do paciente é obrigatório';
      const phoneDigits = onlyDigits(form.patientPhone);
      if (phoneDigits.length < 10) errors.patientPhone = 'Informe um telefone válido com DDD';
    }

    if (step === 1) {
      const cepDigits = onlyDigits(form.zipCode);
      if (cepDigits.length !== 8) errors.zipCode = 'Informe um CEP válido com 8 dígitos';
      if (!form.street.trim()) errors.street = 'Informe o CEP para preencher a rua';
      if (!form.addressNumber.trim()) errors.addressNumber = 'Número é obrigatório';
      if (!form.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
      if (!form.city.trim() || !form.state.trim()) {
        errors.zipCode = errors.zipCode || 'Consulte o CEP para preencher cidade e estado';
      }
    }

    if (step === 2) {
      const validItems = form.items.filter((i) => i.medicationId && Number(i.quantity) > 0);
      if (!validItems.length) errors.items = 'Selecione ao menos um medicamento';
    }

    if (step === 3) {
      const freight = parseCurrency(form.freightValue);
      if (!freight || freight <= 0) {
        errors.freightValue = 'Informe um valor de frete maior que zero';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Revise os campos destacados antes de continuar.');
      return false;
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
      patientName: form.patientName.trim(),
      patientPhone: onlyDigits(form.patientPhone),
      patientCpf: onlyDigits(form.patientCpf) || undefined,
      address: buildFullAddress(form.street, form.addressNumber),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zipCode: onlyDigits(form.zipCode) || undefined,
      referencePoint: form.complement.trim() || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
      patientNotes: form.patientNotes.trim() || undefined,
      freightValue: parseCurrency(form.freightValue),
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

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Novo pedido</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Cadastre a solicitação. O pedido nascerá aguardando pagamento do frete. Dados do Uber Flash só depois.
        </p>
      </div>

      <div className="mb-8">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div
            className="h-full bg-upa-800 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="hidden lg:grid lg:grid-cols-5 gap-2">
          {STEPS.map(({ label }, i) => (
            <div
              key={label}
              className={`rounded-xl px-2 py-2 text-center text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-upa-800 text-white shadow-sm'
                  : i < step
                    ? 'bg-upa-50 text-upa-800'
                    : 'bg-slate-50 text-slate-400'
              }`}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 mb-1 text-[11px]">
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <p className="leading-tight">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-sm font-medium text-upa-800 lg:hidden mt-2">
          Etapa {step + 1} de {STEPS.length}: {STEPS[step].label}
        </p>
      </div>

      {error && <Alert message={error} onDismiss={() => setError('')} className="mb-4" />}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <FormField label="Nome do paciente" required error={fieldErrors.patientName} htmlFor="patientName">
              <input
                id="patientName"
                value={form.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                className={inputClassName(fieldErrors.patientName)}
                autoComplete="name"
              />
            </FormField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="Telefone"
                required
                error={fieldErrors.patientPhone}
                hint="Formato: (00) 00000-0000"
                htmlFor="patientPhone"
              >
                <input
                  id="patientPhone"
                  value={form.patientPhone}
                  onChange={(e) => updateField('patientPhone', maskPhone(e.target.value))}
                  className={inputClassName(fieldErrors.patientPhone)}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </FormField>

              <FormField label="CPF" hint="Opcional — apenas números" htmlFor="patientCpf">
                <input
                  id="patientCpf"
                  value={form.patientCpf}
                  onChange={(e) => updateField('patientCpf', maskCpf(e.target.value))}
                  className={inputClassName()}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </FormField>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <FormField
              label="CEP"
              required
              loading={cepLoading}
              error={fieldErrors.zipCode}
              hint="Digite o CEP para preencher rua, bairro, cidade e estado."
              htmlFor="zipCode"
            >
              <input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => handleCepChange(e.target.value)}
                className={inputClassName(fieldErrors.zipCode, cepLoading ? 'pr-10' : '')}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </FormField>
            {cepMessage && (
              <p className={`text-xs ${cepMessage.includes('não') ? 'text-amber-700' : 'text-emerald-700'}`}>
                {cepMessage}
              </p>
            )}

            <FormField
              label="Rua"
              required
              error={fieldErrors.street}
              hint="Preenchida automaticamente pelo CEP."
              htmlFor="street"
            >
              <input
                id="street"
                value={form.street}
                readOnly={streetFromCep}
                onChange={(e) => {
                  if (streetFromCep) return;
                  markAddressTouched('street');
                  updateField('street', e.target.value);
                }}
                className={streetFromCep ? readOnlyInputClassName() : inputClassName(fieldErrors.street)}
                placeholder="Informe o CEP acima"
              />
            </FormField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Número" required error={fieldErrors.addressNumber} htmlFor="addressNumber">
                <input
                  id="addressNumber"
                  value={form.addressNumber}
                  onChange={(e) => updateField('addressNumber', e.target.value)}
                  className={inputClassName(fieldErrors.addressNumber)}
                  placeholder="Ex.: 123, s/n"
                />
              </FormField>

              <FormField label="Complemento" hint="Opcional — apto, bloco, casa..." htmlFor="complement">
                <input
                  id="complement"
                  value={form.complement}
                  onChange={(e) => updateField('complement', e.target.value)}
                  className={inputClassName()}
                  placeholder="Ex.: Casa, Bloco B"
                />
              </FormField>
            </div>

            <FormField label="Bairro" required error={fieldErrors.neighborhood} htmlFor="neighborhood">
              <input
                id="neighborhood"
                value={form.neighborhood}
                onChange={(e) => {
                  markAddressTouched('neighborhood');
                  updateField('neighborhood', e.target.value);
                }}
                className={inputClassName(fieldErrors.neighborhood)}
              />
            </FormField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Cidade" hint="Preenchida pelo CEP." htmlFor="city">
                <input
                  id="city"
                  value={form.city}
                  readOnly
                  className={readOnlyInputClassName()}
                  placeholder="—"
                />
              </FormField>

              <FormField label="Estado (UF)" hint="Preenchido pelo CEP." htmlFor="state">
                <input
                  id="state"
                  value={form.state}
                  readOnly
                  className={readOnlyInputClassName()}
                  placeholder="—"
                />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {fieldErrors.items && <p className="text-xs text-red-600">{fieldErrors.items}</p>}

            {form.items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 min-w-0 w-full">
                  <FormField label="Medicamento">
                    <select
                      value={item.medicationId}
                      onChange={(e) => updateItem(index, 'medicationId', e.target.value)}
                      className={inputClassName(false, 'bg-white')}
                    >
                      <option value="">Selecione...</option>
                      {medications.map((med) => (
                        <option key={med.id} value={med.id} disabled={med.quantity <= 0}>
                          {med.name} — {med.quantity} {med.unit}(s) disponível
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="w-full sm:w-24">
                  <FormField label="Qtd">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className={inputClassName()}
                    />
                  </FormField>
                </div>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center justify-center self-end min-h-11 min-w-11 p-3 text-red-500 hover:bg-red-50 rounded-xl"
                    aria-label="Remover medicamento"
                  >
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

            <FormField label="Observações internas" htmlFor="internalNotes">
              <textarea
                id="internalNotes"
                value={form.internalNotes}
                onChange={(e) => updateField('internalNotes', e.target.value)}
                rows={3}
                className={`${inputClassName()} resize-none`}
              />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FormField
              label="Valor do frete"
              required
              error={fieldErrors.freightValue}
              hint="O paciente paga apenas o frete. Medicamento é gratuito."
              htmlFor="freightValue"
            >
              <input
                id="freightValue"
                value={form.freightValue}
                onChange={(e) => updateField('freightValue', maskCurrency(e.target.value))}
                className={inputClassName(fieldErrors.freightValue)}
                placeholder="R$ 0,00"
                inputMode="numeric"
              />
            </FormField>

            <FormField label="Observação para o paciente" htmlFor="patientNotes">
              <textarea
                id="patientNotes"
                value={form.patientNotes}
                onChange={(e) => updateField('patientNotes', e.target.value)}
                rows={3}
                className={`${inputClassName()} resize-none`}
              />
            </FormField>

            <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900 space-y-2">
              <p className="font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 shrink-0" />
                Após criar, o pedido ficará aguardando pagamento do frete
              </p>
              <p className="text-amber-800/90">
                Copie a mensagem de pagamento e envie manualmente ao paciente. Os dados do Uber Flash serão registrados
                somente depois da confirmação do pagamento.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-upa-100 bg-upa-50/60 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-upa-800 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-upa-900">Pronto para registrar</p>
                <p className="text-sm text-upa-800/90 mt-1">
                  Status inicial: <strong>Aguardando pagamento do frete</strong>. Uber Flash será registrado depois.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Paciente</h3>
                <p className="font-medium">{form.patientName}</p>
                <p className="text-slate-500">{maskPhone(form.patientPhone)}</p>
                {form.patientCpf && <p className="text-slate-500 text-xs mt-1">CPF: {form.patientCpf}</p>}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Endereço</h3>
                <p>{buildFullAddress(form.street, form.addressNumber)}</p>
                {form.complement && (
                  <p className="text-slate-600 text-sm">Complemento: {form.complement}</p>
                )}
                <p className="text-slate-500">
                  {form.neighborhood}
                  {form.city ? ` · ${form.city}` : ''}
                  {form.state ? `/${form.state}` : ''}
                </p>
                {form.zipCode && <p className="text-slate-400 text-xs mt-1">CEP {form.zipCode}</p>}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Medicamentos</h3>
                {selectedMeds.map((m) => (
                  <p key={m.id}>{m.quantity}x {m.name}</p>
                ))}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Frete</h3>
                <p className="text-2xl font-bold text-emerald-800">{formatCurrency(parseCurrency(form.freightValue))}</p>
                <p className="text-emerald-700/80 text-xs mt-2">Medicamento sem custo para o paciente</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 shadow-sm"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {mutation.isPending ? 'Salvando pedido...' : 'Criar pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
