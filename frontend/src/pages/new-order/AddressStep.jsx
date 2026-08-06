import { Plus, Pencil } from 'lucide-react';
import { ADDRESS_LABELS } from '../../lib/constants';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import FormField, { inputClassName, readOnlyInputClassName } from '../../components/FormField';
import { buttonClassName } from '../../components/Button';

const FIXED_ADDRESS_LABELS = ADDRESS_LABELS.filter((l) => l !== 'Outro');

function AddressLabelField({ value, onChange, idPrefix }) {
  return (
    <>
      <FormField label="Identificação do endereço" htmlFor={`${idPrefix}Label`}>
        <select
          id={`${idPrefix}Label`}
          value={FIXED_ADDRESS_LABELS.includes(value) ? value : 'Outro'}
          onChange={(e) => onChange(e.target.value === 'Outro' ? '' : e.target.value)}
          className={inputClassName(false, 'bg-white')}
        >
          {ADDRESS_LABELS.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </FormField>

      {!FIXED_ADDRESS_LABELS.includes(value) && (
        <FormField label="Descreva o endereço" htmlFor={`${idPrefix}LabelCustom`} hint="Ex.: Casa da vizinha">
          <input
            id={`${idPrefix}LabelCustom`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName()}
            placeholder="Descrição do endereço"
          />
        </FormField>
      )}
    </>
  );
}

export default function AddressStep({
  form,
  setForm,
  fieldErrors,
  showNewAddressForm,
  updateNewAddress,
  markAddressTouched,
  handleCepChange,
  cepLoading,
  cepMessage,
  streetFromCep,
  neighborhoodFromCep,
  openEditAddress,
  editingAddress,
  setEditingAddress,
  editAddressForm,
  setEditAddressForm,
  editAddressError,
  setEditAddressError,
  updateAddressMutation,
  onBlurField,
}) {
  return (
    <div className="space-y-4">
      {form.patientMode === 'existing' && form.patient.addresses.length > 0 && (
        <div className="rounded-xl border border-slate-100 p-4 space-y-3">
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
                onChange={() => setForm((f) => ({ ...f, selectedAddressId: addr.id, addingNewAddress: false }))}
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
        <div className="rounded-xl border border-slate-100 p-4 space-y-4">
          <p className="text-sm font-medium text-slate-700">Novo endereço</p>

          <AddressLabelField
            value={form.newAddress.label}
            onChange={(v) => updateNewAddress('label', v)}
            idPrefix="address"
          />

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
              onBlur={() => onBlurField('zipCode')}
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
              onBlur={() => onBlurField('street')}
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
                onBlur={() => onBlurField('number')}
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

          <FormField
            label="Bairro"
            required
            error={fieldErrors.neighborhood}
            hint={neighborhoodFromCep ? 'Preenchido automaticamente pelo CEP.' : undefined}
            htmlFor="neighborhood"
          >
            <input
              id="neighborhood"
              value={form.newAddress.neighborhood}
              readOnly={neighborhoodFromCep}
              onChange={(e) => {
                if (neighborhoodFromCep) return;
                markAddressTouched('neighborhood');
                updateNewAddress('neighborhood', e.target.value);
              }}
              onBlur={() => onBlurField('neighborhood')}
              className={neighborhoodFromCep ? readOnlyInputClassName() : inputClassName(fieldErrors.neighborhood)}
              placeholder="Informe o CEP acima"
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

      <Modal open={!!editingAddress} onClose={() => setEditingAddress(null)} title="Editar endereço">
        {editAddressForm && (
          <div className="space-y-4">
            {editAddressError && <Alert message={editAddressError} onDismiss={() => setEditAddressError('')} />}
            <AddressLabelField
              value={editAddressForm.label}
              onChange={(v) => setEditAddressForm((f) => ({ ...f, label: v }))}
              idPrefix="editAddress"
            />
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
              className={buttonClassName('primary', 'md', 'w-full')}
            >
              {updateAddressMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
