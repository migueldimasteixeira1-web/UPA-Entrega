import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Check, User, MapPin } from 'lucide-react';
import { api, ApiError, getErrorMessage } from '../lib/api';
import { maskCep, maskCpf, maskPhone, onlyDigits } from '../lib/masks';
import { fetchAddressByCep } from '../lib/viacep';
import { useToast } from '../lib/toast';
import Alert from '../components/Alert';
import { buttonClassName } from '../components/Button';
import PatientStep from './new-order/PatientStep';
import AddressStep from './new-order/AddressStep';
import MedicationsStep from './new-order/MedicationsStep';
import ReviewStep from './new-order/ReviewStep';

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
  newPatient: { name: '', phone: '', email: '' },
  selectedAddressId: '',
  addingNewAddress: false,
  newAddress: emptyNewAddress,
  internalNotes: '',
  patientNotes: '',
  items: [{ medicationId: '', presentationId: '', quantity: 1 }],
};

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
  const [editPatientForm, setEditPatientForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [editPatientError, setEditPatientError] = useState('');
  const [editingAddress, setEditingAddress] = useState(null);
  const [editAddressForm, setEditAddressForm] = useState(null);
  const [editAddressError, setEditAddressError] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: allMedications = [] } = useQuery({
    queryKey: ['medications', { active: true }],
    queryFn: () => api.getMedications({ active: 'true' }),
  });
  // Só medicamentos com pelo menos uma apresentação ativa aparecem pra
  // seleção — um medicamento sem nenhuma dosagem disponível não tem o que
  // escolher no segundo passo (dosagem).
  const medications = allMedications.filter((m) => m.presentations.some((p) => p.active));

  const mutation = useMutation({
    mutationFn: (data) => api.createOrder(data, prescriptionFile),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      navigate(`/pedidos/${order.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
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
      setEditPatientError(getErrorMessage(err)),
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
      setEditAddressError(getErrorMessage(err)),
  });

  const openEditPatient = () => {
    setEditPatientForm({
      name: form.patient.name,
      phone: maskPhone(form.patient.phone),
      email: form.patient.email || '',
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
  // Trocar de medicamento invalida a dosagem escolhida antes (era de outro
  // remédio) — auto-seleciona se só houver uma apresentação ativa, pra não
  // exigir um clique extra no caso mais comum.
  const updateItemMedication = (index, medicationId) => {
    const med = medications.find((m) => m.id === medicationId);
    const activePresentations = med?.presentations.filter((p) => p.active) || [];
    const presentationId = activePresentations.length === 1 ? activePresentations[0].id : '';
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, medicationId, presentationId } : item)),
    }));
  };
  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { medicationId: '', presentationId: '', quantity: 1 }] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const resetPatientSearch = () => {
    setForm((f) => ({
      ...f,
      cpf: '',
      patientMode: 'idle',
      patient: null,
      newPatient: { name: '', phone: '', email: '' },
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

  const getStepErrors = (targetStep) => {
    if (targetStep === 0) {
      const errors = {};
      const cpfDigits = onlyDigits(form.cpf);
      if (cpfDigits.length !== 11) errors.cpf = 'Informe um CPF válido com 11 dígitos';
      if (form.patientMode === 'new') {
        if (!form.newPatient.name.trim()) errors.name = 'Nome do paciente é obrigatório';
        const phoneDigits = onlyDigits(form.newPatient.phone);
        if (phoneDigits.length < 10) errors.phone = 'Informe um telefone válido com DDD';
        const email = form.newPatient.email.trim();
        if (!email) errors.email = 'E-mail é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido';
      }
      if (form.patientMode === 'idle') errors.cpf = errors.cpf || 'Aguarde a consulta do CPF';
      return errors;
    }

    if (targetStep === 1) {
      const errors = {};
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
      return errors;
    }

    if (targetStep === 2) {
      const errors = {};
      const validItems = form.items.filter((i) => i.medicationId && i.presentationId && Number(i.quantity) > 0);
      if (!validItems.length) errors.items = 'Selecione o medicamento e a dosagem de ao menos um item';
      return errors;
    }

    if (targetStep === 3) {
      const errors = {};
      if (!prescriptionFile) errors.prescription = 'Anexe a receita médica para confirmar o pedido';
      return errors;
    }

    return {};
  };

  const validateStep = () => {
    setError('');
    const errors = getStepErrors(step);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Revise os campos destacados antes de continuar.');
      return false;
    }
    return true;
  };

  // Feedback mais cedo do que "só ao clicar Próximo": revalida um único
  // campo ao perder o foco, sem tocar nos erros dos campos ainda não visitados.
  const handleFieldBlur = (fieldKey) => {
    const stepErrors = getStepErrors(step);
    setFieldErrors((prev) => ({ ...prev, [fieldKey]: stepErrors[fieldKey] }));
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
        .filter((i) => i.medicationId && i.presentationId)
        .map((i) => ({ medicationPresentationId: i.presentationId, quantity: Number(i.quantity) })),
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
        email: form.newPatient.email.trim() || undefined,
      };
      payload.address = addressPayload;
    }

    mutation.mutate(payload);
  };

  const selectedMeds = form.items
    .filter((i) => i.medicationId && i.presentationId)
    .map((i) => {
      const med = medications.find((m) => m.id === i.medicationId);
      const presentation = med?.presentations.find((p) => p.id === i.presentationId);
      return { id: i.presentationId, name: med?.name, dosage: presentation?.dosage, unit: presentation?.unit, quantity: i.quantity };
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
          <PatientStep
            form={form}
            fieldErrors={fieldErrors}
            cpfLookup={cpfLookup}
            handleCpfChange={handleCpfChange}
            updateNewPatient={updateNewPatient}
            onBlurField={handleFieldBlur}
            resetPatientSearch={resetPatientSearch}
            openEditPatient={openEditPatient}
            editPatientOpen={editPatientOpen}
            setEditPatientOpen={setEditPatientOpen}
            editPatientForm={editPatientForm}
            setEditPatientForm={setEditPatientForm}
            editPatientError={editPatientError}
            setEditPatientError={setEditPatientError}
            updatePatientMutation={updatePatientMutation}
          />
        )}

        {step === 1 && (
          <AddressStep
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            showNewAddressForm={showNewAddressForm}
            updateNewAddress={updateNewAddress}
            markAddressTouched={markAddressTouched}
            onBlurField={handleFieldBlur}
            handleCepChange={handleCepChange}
            cepLoading={cepLoading}
            cepMessage={cepMessage}
            streetFromCep={streetFromCep}
            openEditAddress={openEditAddress}
            editingAddress={editingAddress}
            setEditingAddress={setEditingAddress}
            editAddressForm={editAddressForm}
            setEditAddressForm={setEditAddressForm}
            editAddressError={editAddressError}
            setEditAddressError={setEditAddressError}
            updateAddressMutation={updateAddressMutation}
          />
        )}

        {step === 2 && (
          <MedicationsStep
            form={form}
            fieldErrors={fieldErrors}
            medications={medications}
            updateField={updateField}
            updateItemMedication={updateItemMedication}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
          />
        )}

        {step === 3 && (
          <ReviewStep
            form={form}
            showNewAddressForm={showNewAddressForm}
            selectedMeds={selectedMeds}
            selectedAddress={selectedAddress}
            prescriptionFile={prescriptionFile}
            onPrescriptionChange={setPrescriptionFile}
            prescriptionError={fieldErrors.prescription}
          />
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className={buttonClassName('ghost', 'md', 'w-full sm:w-auto text-slate-600 hover:bg-slate-100 disabled:opacity-40')}
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={buttonClassName('primary', 'md', 'w-full sm:w-auto px-6')}>
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className={buttonClassName('success', 'md', 'w-full sm:w-auto px-6')}
            >
              {mutation.isPending ? 'Salvando pedido...' : 'Criar pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
