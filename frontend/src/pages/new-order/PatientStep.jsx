import { UserPlus, UserCheck, Pencil } from 'lucide-react';
import { maskPhone, onlyDigits } from '../../lib/masks';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import FormField, { inputClassName } from '../../components/FormField';

export default function PatientStep({
  form,
  fieldErrors,
  cpfLookup,
  handleCpfChange,
  updateNewPatient,
  resetPatientSearch,
  openEditPatient,
  editPatientOpen,
  setEditPatientOpen,
  editPatientForm,
  setEditPatientForm,
  editPatientError,
  setEditPatientError,
  updatePatientMutation,
}) {
  return (
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

      {cpfLookup.status === 'error' && <Alert message="Erro ao consultar CPF. Tente novamente." />}

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
    </div>
  );
}
