import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  User,
  MapPin,
  ClipboardList,
  UserPlus,
  UserCheck,
  Pencil,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { ADDRESS_LABELS } from '../lib/constants';
import { maskCep, maskCpf, maskPhone, onlyDigits } from '../lib/masks';
import { fetchAddressByCep } from '../lib/viacep';
import { useToast } from '../lib/toast';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import FormField, { inputClassName, readOnlyInputClassName } from '../components/FormField';
import QuantityStepper from '../components/QuantityStepper';

const FIXED_ADDRESS_LABELS = ADDRESS_LABELS.filter((l) => l !== 'Outro');

const STEPS = [
  { label: 'Paciente', icon: User },
  { label: 'Endereço', icon: MapPin },
  { label: 'Medicamentos', icon: Plus },
  { label: 'Revisão', icon: Check },
];

const emptyNewAddress = {
  label: 'Residência',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

const emptyForm = {
  cpf: '',
  patientMode: 'idle', // idle | existing | new
  patient: null,
  newPatient: { name: '', phone: '' },
  selectedAddressId: '',
  addingNewAddress: false,
  newAddress: emptyNewAddress,
  internalNotes: '',
  patientNotes: '',
  items: [{ medicationId: '', quantity: 1 }],
};

function buildFullAddress(street, number) {
  return `${street?.trim() || ''}, ${number?.trim() || ''}`;
}

export default function NewOrder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [cpfLookup, setCpfLookup] = useState({ status: 'idle' });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState('');
  const [streetFromCep, setStreetFromCep] = useState(false);
  const [touchedAddressFields, setTouchedAddressFields] = useState(() => new Set());
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({ name: '', phone: '', notes: '' });
  const [editPatientError, setEditPatientError] = useState('');
  const [editingAddress, setEditingAddress] = useState(null);
  const [editAddressForm, setEditAddressForm] = useState(null);
  const [editAddressError, setEditAddressError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', { active: true }],
    queryFn: () => api.getMedications({ active: 'true' }),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.createOrder(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      navigate(`/pedidos/${order.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro ao criar pedido. Tente novamente.'),
  });

  const updatePatientMutation = useMutation({
    mutationFn: (data) => api.updatePatient(form.patient.id, data),
    onSuccess: (updatedPatient) => {
      setForm((f) => ({ ...f, patient: { ...updatedPatient, addresses: f.patient.addresses } }));
      setEditPatientOpen(false);
      setEditPatientError('');
      showToast('Dados do paciente atualizados');
    },
    onError: (err) =>
      setEditPatientError(err instanceof ApiError ? err.message : 'Erro ao atualizar paciente'),
  });

  const updateAddressMutation = useMutation({
    mutationFn: (data) => api.updatePatientAddress(form.patient.id, editingAddress.id, data),
    onSuccess: (updatedAddress) => {
      setForm((f) => ({
        ...f,
        patient: {
          ...f.patient,
          addresses: f.patient.addresses.map((a) => (a.id === updatedAddress.id ? updatedAddress : a)),
        },
      }));
      setEditingAddress(null);
      setEditAddressError('');
      showToast('Endereço atualizado');
    },
    onError: (err) =>
      setEditAddressError(err instanceof ApiError ? err.message : 'Erro ao atualizar endereço'),
  });

  const openEditPatient = () => {
    setEditPatientForm({
      name: form.patient.name,
      phone: maskPhone(form.patient.phone),
      notes: form.patient.notes || '',
    });
    setEditPatientError('');
    setEditPatientOpen(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddress(addr);
    setEditAddressForm({
      label: addr.label,
      zipCode: addr.zipCode ? maskCep(addr.zipCode) : '',
      street: addr.street,
      number: addr.number,
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      referencePoint: addr.referencePoint || '',
    });
    setEditAddressError('');
  };

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateNewPatient = (field, value) =>
    setForm((f) => ({ ...f, newPatient: { ...f.newPatient, [field]: value } }));
  const updateNewAddress = (field, value) =>
    setForm((f) => ({ ...f, newAddress: { ...f.newAddress, [field]: value } }));

  const markAddressTouched = (field) => setTouchedAddressFields((prev) => new Set(prev).add(field));

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { medicationId: '', quantity: 1 }] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const resetPatientSearch = () => {
    setForm((f) => ({
      ...f,
      cpf: '',
      patientMode: 'idle',
      patient: null,
      newPatient: { name: '', phone: '' },
      selectedAddressId: '',
      addingNewAddress: false,
      newAddress: emptyNewAddress,
    }));
    setCpfLookup({ status: 'idle' });
    setStreetFromCep(false);
    setCepMessage('');
  };

  const handleCpfChange = async (rawValue) => {
    const masked = maskCpf(rawValue);
    updateField('cpf', masked);

    const digits = onlyDigits(masked);
    if (digits.length !== 11) {
      setCpfLookup({ status: 'idle' });
      setForm((f) => ({ ...f, patientMode: 'idle', patient: null }));
      return;
    }

    setCpfLookup({ status: 'loading' });
    try {
      const patient = await api.getPatientByCpf(digits);
      setForm((f) => ({
        ...f,
        patientMode: 'existing',
        patient,
        selectedAddressId: patient.addresses[0]?.id || '',
        addingNewAddress: patient.addresses.length === 0,
      }));
      setCpfLookup({ status: 'found' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setForm((f) => ({ ...f, patientMode: 'new', patient: null }));
        setCpfLookup({ status: 'not_found' });
      } else {
        setCpfLookup({ status: 'error' });
      }
    }
  };

  const handleCepChange = async (rawValue) => {
    const masked = maskCep(rawValue);
    updateNewAddress('zipCode', masked);
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
        newAddress: {
          ...current.newAddress,
          zipCode: masked,
          street: touchedAddressFields.has('street') ? current.newAddress.street : result.address || current.newAddress.street,
          neighborhood: touchedAddressFields.has('neighborhood')
            ? current.newAddress.neighborhood
            : result.neighborhood || current.newAddress.neighborhood,
          city: result.city || current.newAddress.city,
          state: result.state || current.newAddress.state,
        },
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

  const showNewAddressForm = form.patientMode === 'new' || form.addingNewAddress;

  const validateStep = () => {
    setError('');
    const errors = {};

    if (step === 0) {
      const cpfDigits = onlyDigits(form.cpf);
      if (cpfDigits.length !== 11) errors.cpf = 'Informe um CPF válido com 11 dígitos';
      if (form.patientMode === 'new') {
        if (!form.newPatient.name.trim()) errors.name = 'Nome do paciente é obrigatório';
        const phoneDigits = onlyDigits(form.newPatient.phone);
        if (phoneDigits.length < 10) errors.phone = 'Informe um telefone válido com DDD';
      }
      if (form.patientMode === 'idle') errors.cpf = errors.cpf || 'Aguarde a consulta do CPF';
    }

    if (step === 1) {
      if (showNewAddressForm) {
        const cepDigits = onlyDigits(form.newAddress.zipCode);
        if (cepDigits.length !== 8) errors.zipCode = 'Informe um CEP válido com 8 dígitos';
        if (!form.newAddress.street.trim()) errors.street = 'Informe o CEP para preencher a rua';
        if (!form.newAddress.number.trim()) errors.number = 'Número é obrigatório';
        if (!form.newAddress.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
        if (!form.newAddress.city.trim() || !form.newAddress.state.trim()) {
          errors.zipCode = errors.zipCode || 'Consulte o CEP para preencher cidade e estado';
        }
      } else if (!form.selectedAddressId) {
        errors.selectedAddressId = 'Selecione um endereço de entrega';
      }
    }

    if (step === 2) {
      const validItems = form.items.filter((i) => i.medicationId && Number(i.quantity) > 0);
      if (!validItems.length) errors.items = 'Selecione ao menos um medicamento';
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

    const addressPayload = showNewAddressForm
      ? {
          label: form.newAddress.label.trim() || 'Endereço',
          street: form.newAddress.street.trim(),
          number: form.newAddress.number.trim(),
          complement: form.newAddress.complement.trim() || undefined,
          neighborhood: form.newAddress.neighborhood.trim(),
          city: form.newAddress.city.trim(),
          state: form.newAddress.state.trim(),
          zipCode: onlyDigits(form.newAddress.zipCode) || undefined,
        }
      : undefined;

    const payload = {
      internalNotes: form.internalNotes.trim() || undefined,
      patientNotes: form.patientNotes.trim() || undefined,
      items: form.items
        .filter((i) => i.medicationId)
        .map((i) => ({ medicationId: i.medicationId, quantity: Number(i.quantity) })),
    };

    if (form.patientMode === 'existing') {
      payload.patientId = form.patient.id;
      if (showNewAddressForm) {
        payload.address = addressPayload;
      } else {
        payload.addressId = form.selectedAddressId;
      }
    } else {
      payload.patient = {
        name: form.newPatient.name.trim(),
        phone: onlyDigits(form.newPatient.phone),
        cpf: onlyDigits(form.cpf),
      };
      payload.address = addressPayload;
    }

    mutation.mutate(payload);
  };

  const selectedMeds = form.items
    .filter((i) => i.medicationId)
    .map((i) => {
      const med = medications.find((m) => m.id === i.medicationId);
      return { ...med, quantity: i.quantity };
    });

  const selectedAddress = form.patient?.addresses?.find((a) => a.id === form.selectedAddressId);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Novo pedido</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Entrega gratuita feita por entregador da UPA. Um PIN de confirmação será gerado automaticamente.
        </p>
      </div>

      <div className="mb-8">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div
            className="h-full bg-upa-800 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="hidden lg:grid lg:grid-cols-4 gap-2">
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
            <FormField
              label="CPF do paciente"
              required
              loading={cpfLookup.status === 'loading'}
              error={fieldErrors.cpf}
              hint="Digite o CPF para buscar o cadastro do paciente."
              htmlFor="cpf"
            >
              <input
                id="cpf"
                value={form.cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                className={inputClassName(fieldErrors.cpf, cpfLookup.status === 'loading' ? 'pr-10' : '')}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
              />
            </FormField>

            {cpfLookup.status === 'found' && form.patient && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-900">Paciente encontrado</p>
                    <p className="text-sm text-emerald-800 mt-1">{form.patient.name}</p>
                    <p className="text-sm text-emerald-700/90">{maskPhone(form.patient.phone)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={resetPatientSearch}
                      className="text-xs text-emerald-800 underline hover:text-emerald-950"
                    >
                      Buscar outro
                    </button>
                    <button
                      type="button"
                      onClick={openEditPatient}
                      className="inline-flex items-center gap-1 text-xs text-emerald-800 underline hover:text-emerald-950"
                    >
                      <Pencil className="w-3 h-3" /> Editar dados
                    </button>
                  </div>
                </div>
              </div>
            )}

            {cpfLookup.status === 'not_found' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-upa-100 bg-upa-50/60 p-4 flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-upa-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-upa-900">
                    Nenhum paciente encontrado com este CPF. Preencha os dados abaixo para cadastrar.
                  </p>
                </div>

                <FormField label="Nome do paciente" required error={fieldErrors.name} htmlFor="patientName">
                  <input
                    id="patientName"
                    value={form.newPatient.name}
                    onChange={(e) => updateNewPatient('name', e.target.value)}
                    className={inputClassName(fieldErrors.name)}
                    autoComplete="name"
                  />
                </FormField>

                <FormField
                  label="Telefone"
                  required
                  error={fieldErrors.phone}
                  hint="Formato: (00) 00000-0000"
                  htmlFor="patientPhone"
                >
                  <input
                    id="patientPhone"
                    value={form.newPatient.phone}
                    onChange={(e) => updateNewPatient('phone', maskPhone(e.target.value))}
                    className={inputClassName(fieldErrors.phone)}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                </FormField>
              </div>
            )}

            {cpfLookup.status === 'error' && (
              <Alert message="Erro ao consultar CPF. Tente novamente." />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {form.patientMode === 'existing' && form.patient.addresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Endereços cadastrados</p>
                {fieldErrors.selectedAddressId && (
                  <p className="text-xs text-red-600">{fieldErrors.selectedAddressId}</p>
                )}
                {form.patient.addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      !form.addingNewAddress && form.selectedAddressId === addr.id
                        ? 'border-upa-400 bg-upa-50/60 ring-1 ring-upa-200'
                        : 'border-slate-200 hover:border-upa-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={!form.addingNewAddress && form.selectedAddressId === addr.id}
                      onChange={() =>
                        setForm((f) => ({ ...f, selectedAddressId: addr.id, addingNewAddress: false }))
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{addr.label}</p>
                      <p className="text-sm text-slate-600">
                        {addr.street}, {addr.number}
                        {addr.complement ? ` — ${addr.complement}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {addr.neighborhood}, {addr.city}/{addr.state}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditAddress(addr);
                      }}
                      className="inline-flex items-center justify-center min-h-9 min-w-9 shrink-0 rounded-lg text-slate-400 hover:text-upa-700 hover:bg-white"
                      aria-label={`Editar endereço ${addr.label}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, addingNewAddress: !f.addingNewAddress }))}
                  className="inline-flex items-center gap-2 text-sm text-upa-700 font-medium hover:text-upa-900"
                >
                  <Plus className="w-4 h-4" />
                  {form.addingNewAddress ? 'Usar endereço cadastrado' : 'Adicionar novo endereço'}
                </button>
              </div>
            )}

            {showNewAddressForm && (
              <div className="space-y-4">
                <FormField label="Identificação do endereço" htmlFor="addressLabel">
                  <select
                    id="addressLabel"
                    value={FIXED_ADDRESS_LABELS.includes(form.newAddress.label) ? form.newAddress.label : 'Outro'}
                    onChange={(e) => updateNewAddress('label', e.target.value === 'Outro' ? '' : e.target.value)}
                    className={inputClassName(false, 'bg-white')}
                  >
                    {ADDRESS_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </FormField>

                {!FIXED_ADDRESS_LABELS.includes(form.newAddress.label) && (
                  <FormField label="Descreva o endereço" htmlFor="addressLabelCustom" hint="Ex.: Casa da vizinha">
                    <input
                      id="addressLabelCustom"
                      value={form.newAddress.label}
                      onChange={(e) => updateNewAddress('label', e.target.value)}
                      className={inputClassName()}
                      placeholder="Descrição do endereço"
                    />
                  </FormField>
                )}

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
                    value={form.newAddress.zipCode}
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

                <FormField label="Rua" required error={fieldErrors.street} hint="Preenchida automaticamente pelo CEP." htmlFor="street">
                  <input
                    id="street"
                    value={form.newAddress.street}
                    readOnly={streetFromCep}
                    onChange={(e) => {
                      if (streetFromCep) return;
                      markAddressTouched('street');
                      updateNewAddress('street', e.target.value);
                    }}
                    className={streetFromCep ? readOnlyInputClassName() : inputClassName(fieldErrors.street)}
                    placeholder="Informe o CEP acima"
                  />
                </FormField>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="Número" required error={fieldErrors.number} htmlFor="number">
                    <input
                      id="number"
                      value={form.newAddress.number}
                      onChange={(e) => updateNewAddress('number', e.target.value)}
                      className={inputClassName(fieldErrors.number)}
                      placeholder="Ex.: 123, s/n"
                    />
                  </FormField>

                  <FormField label="Complemento" hint="Opcional — apto, bloco, casa..." htmlFor="complement">
                    <input
                      id="complement"
                      value={form.newAddress.complement}
                      onChange={(e) => updateNewAddress('complement', e.target.value)}
                      className={inputClassName()}
                      placeholder="Ex.: Casa, Bloco B"
                    />
                  </FormField>
                </div>

                <FormField label="Bairro" required error={fieldErrors.neighborhood} htmlFor="neighborhood">
                  <input
                    id="neighborhood"
                    value={form.newAddress.neighborhood}
                    onChange={(e) => {
                      markAddressTouched('neighborhood');
                      updateNewAddress('neighborhood', e.target.value);
                    }}
                    className={inputClassName(fieldErrors.neighborhood)}
                  />
                </FormField>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="Cidade" hint="Preenchida pelo CEP." htmlFor="city">
                    <input id="city" value={form.newAddress.city} readOnly className={readOnlyInputClassName()} placeholder="—" />
                  </FormField>

                  <FormField label="Estado (UF)" hint="Preenchido pelo CEP." htmlFor="state">
                    <input id="state" value={form.newAddress.state} readOnly className={readOnlyInputClassName()} placeholder="—" />
                  </FormField>
                </div>
              </div>
            )}
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
                        <option key={med.id} value={med.id}>
                          {med.name} ({med.unit})
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="w-full sm:w-auto">
                  <FormField label="Qtd">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(next) => updateItem(index, 'quantity', next)}
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

            <FormField label="Observações internas" htmlFor="internalNotes" hint="Visível só para a equipe da UPA">
              <textarea
                id="internalNotes"
                value={form.internalNotes}
                onChange={(e) => updateField('internalNotes', e.target.value)}
                rows={3}
                className={`${inputClassName()} resize-none`}
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-upa-100 bg-upa-50/60 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-upa-800 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-upa-900">Pronto para registrar</p>
                <p className="text-sm text-upa-800/90 mt-1">
                  Status inicial: <strong>Pedido recebido</strong>. Um link de acompanhamento e um PIN de entrega serão gerados automaticamente.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Paciente
                </h3>
                <p className="font-medium">
                  {form.patientMode === 'existing' ? form.patient.name : form.newPatient.name}
                </p>
                <p className="text-slate-500">
                  {maskPhone(form.patientMode === 'existing' ? form.patient.phone : form.newPatient.phone)}
                </p>
                <p className="text-slate-500 text-xs mt-1">CPF: {form.cpf}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Endereço</h3>
                {showNewAddressForm ? (
                  <>
                    <p>{buildFullAddress(form.newAddress.street, form.newAddress.number)}</p>
                    {form.newAddress.complement && (
                      <p className="text-slate-600 text-sm">Complemento: {form.newAddress.complement}</p>
                    )}
                    <p className="text-slate-500">
                      {form.newAddress.neighborhood}
                      {form.newAddress.city ? ` · ${form.newAddress.city}` : ''}
                      {form.newAddress.state ? `/${form.newAddress.state}` : ''}
                    </p>
                  </>
                ) : (
                  selectedAddress && (
                    <>
                      <p className="text-xs text-slate-400 mb-1">{selectedAddress.label}</p>
                      <p>{buildFullAddress(selectedAddress.street, selectedAddress.number)}</p>
                      <p className="text-slate-500">
                        {selectedAddress.neighborhood} · {selectedAddress.city}/{selectedAddress.state}
                      </p>
                    </>
                  )
                )}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <h3 className="font-semibold text-slate-800 mb-2">Medicamentos</h3>
                {selectedMeds.map((m) => (
                  <p key={m.id}>{m.quantity}x {m.name}</p>
                ))}
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

      <Modal open={editPatientOpen} onClose={() => setEditPatientOpen(false)} title="Editar dados do paciente">
        <div className="space-y-4">
          {editPatientError && <Alert message={editPatientError} onDismiss={() => setEditPatientError('')} />}
          <FormField label="Nome" htmlFor="editPatientName">
            <input
              id="editPatientName"
              value={editPatientForm.name}
              onChange={(e) => setEditPatientForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClassName()}
            />
          </FormField>
          <FormField label="Telefone" htmlFor="editPatientPhone">
            <input
              id="editPatientPhone"
              value={editPatientForm.phone}
              onChange={(e) => setEditPatientForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
              className={inputClassName()}
              inputMode="tel"
            />
          </FormField>
          <FormField label="Observações" htmlFor="editPatientNotes">
            <textarea
              id="editPatientNotes"
              value={editPatientForm.notes}
              onChange={(e) => setEditPatientForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className={`${inputClassName()} resize-none`}
            />
          </FormField>
          <button
            type="button"
            onClick={() =>
              updatePatientMutation.mutate({
                name: editPatientForm.name.trim(),
                phone: onlyDigits(editPatientForm.phone),
                notes: editPatientForm.notes.trim() || null,
              })
            }
            disabled={!editPatientForm.name?.trim() || updatePatientMutation.isPending}
            className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 disabled:opacity-60"
          >
            {updatePatientMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </Modal>

      <Modal open={!!editingAddress} onClose={() => setEditingAddress(null)} title="Editar endereço">
        {editAddressForm && (
          <div className="space-y-4">
            {editAddressError && <Alert message={editAddressError} onDismiss={() => setEditAddressError('')} />}
            <FormField label="Identificação do endereço" htmlFor="editAddressLabel">
              <select
                id="editAddressLabel"
                value={FIXED_ADDRESS_LABELS.includes(editAddressForm.label) ? editAddressForm.label : 'Outro'}
                onChange={(e) =>
                  setEditAddressForm((f) => ({ ...f, label: e.target.value === 'Outro' ? '' : e.target.value }))
                }
                className={inputClassName(false, 'bg-white')}
              >
                {ADDRESS_LABELS.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </FormField>
            {!FIXED_ADDRESS_LABELS.includes(editAddressForm.label) && (
              <FormField label="Descreva o endereço" htmlFor="editAddressLabelCustom">
                <input
                  id="editAddressLabelCustom"
                  value={editAddressForm.label}
                  onChange={(e) => setEditAddressForm((f) => ({ ...f, label: e.target.value }))}
                  className={inputClassName()}
                />
              </FormField>
            )}
            <FormField label="Rua" htmlFor="editAddressStreet">
              <input
                id="editAddressStreet"
                value={editAddressForm.street}
                onChange={(e) => setEditAddressForm((f) => ({ ...f, street: e.target.value }))}
                className={inputClassName()}
              />
            </FormField>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Número" htmlFor="editAddressNumber">
                <input
                  id="editAddressNumber"
                  value={editAddressForm.number}
                  onChange={(e) => setEditAddressForm((f) => ({ ...f, number: e.target.value }))}
                  className={inputClassName()}
                />
              </FormField>
              <FormField label="Complemento" htmlFor="editAddressComplement">
                <input
                  id="editAddressComplement"
                  value={editAddressForm.complement}
                  onChange={(e) => setEditAddressForm((f) => ({ ...f, complement: e.target.value }))}
                  className={inputClassName()}
                />
              </FormField>
            </div>
            <FormField label="Bairro" htmlFor="editAddressNeighborhood">
              <input
                id="editAddressNeighborhood"
                value={editAddressForm.neighborhood}
                onChange={(e) => setEditAddressForm((f) => ({ ...f, neighborhood: e.target.value }))}
                className={inputClassName()}
              />
            </FormField>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Cidade" htmlFor="editAddressCity">
                <input
                  id="editAddressCity"
                  value={editAddressForm.city}
                  onChange={(e) => setEditAddressForm((f) => ({ ...f, city: e.target.value }))}
                  className={inputClassName()}
                />
              </FormField>
              <FormField label="Estado (UF)" htmlFor="editAddressState">
                <input
                  id="editAddressState"
                  value={editAddressForm.state}
                  onChange={(e) => setEditAddressForm((f) => ({ ...f, state: e.target.value }))}
                  className={inputClassName()}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() =>
                updateAddressMutation.mutate({
                  label: editAddressForm.label.trim() || 'Endereço',
                  street: editAddressForm.street.trim(),
                  number: editAddressForm.number.trim(),
                  complement: editAddressForm.complement.trim() || undefined,
                  neighborhood: editAddressForm.neighborhood.trim(),
                  city: editAddressForm.city.trim(),
                  state: editAddressForm.state.trim(),
                })
              }
              disabled={!editAddressForm.street?.trim() || updateAddressMutation.isPending}
              className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 disabled:opacity-60"
            >
              {updateAddressMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
