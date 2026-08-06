import { Check, ClipboardList, FileImage } from 'lucide-react';
import { maskPhone } from '../../lib/masks';
import { useObjectUrl } from '../../lib/useObjectUrl';

function buildFullAddress(street, number) {
  return `${street?.trim() || ''}, ${number?.trim() || ''}`;
}

export default function ReviewStep({
  form,
  showNewAddressForm,
  selectedMeds,
  selectedAddress,
  prescriptionFile,
  onPrescriptionChange,
  prescriptionError,
}) {
  const prescriptionPreviewUrl = useObjectUrl(prescriptionFile);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-upa-100 bg-upa-50/60 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-upa-800 text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-upa-900">Pronto para registrar</p>
          <p className="text-sm text-upa-800/90 mt-1">
            Status inicial: <strong>Pedido recebido</strong>. Um link de acompanhamento e um PIN de entrega serão
            gerados automaticamente.
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
            <p key={m.id}>{m.quantity}x {m.name} {m.dosage}</p>
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <FileImage className="w-4 h-4" /> Receita médica
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Obrigatória para confirmar o pedido. Foto ou imagem da receita (JPEG, PNG ou WebP).
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onPrescriptionChange(e.target.files[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-upa-50 file:text-upa-800 file:font-medium hover:file:bg-upa-100"
          />
          {prescriptionError && <p className="text-xs text-red-600 mt-2">{prescriptionError}</p>}
          {prescriptionPreviewUrl && (
            <img
              src={prescriptionPreviewUrl}
              alt="Prévia da receita"
              className="mt-3 max-h-48 rounded-lg border border-slate-200"
            />
          )}
        </div>
      </div>
    </div>
  );
}
