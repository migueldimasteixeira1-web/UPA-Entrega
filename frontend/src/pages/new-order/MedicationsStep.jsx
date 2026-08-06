import { Plus, Trash2 } from 'lucide-react';
import FormField, { inputClassName } from '../../components/FormField';
import QuantityStepper from '../../components/QuantityStepper';
import MedicationCombobox from '../../components/MedicationCombobox';

export default function MedicationsStep({ form, fieldErrors, medications, updateField, updateItemMedication, updateItem, addItem, removeItem }) {
  return (
    <div className="space-y-4">
      {fieldErrors.items && <p className="text-xs text-red-600">{fieldErrors.items}</p>}

      {form.items.map((item, index) => {
        const selectedMedication = medications.find((m) => m.id === item.medicationId);
        const presentations = selectedMedication?.presentations.filter((p) => p.active) || [];

        return (
          <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0 w-full">
              <FormField label="Medicamento">
                <MedicationCombobox
                  medications={medications}
                  value={item.medicationId}
                  onChange={(medicationId) => updateItemMedication(index, medicationId)}
                />
              </FormField>
            </div>
            <div className="w-full sm:w-44">
              <FormField label="Dosagem">
                <select
                  value={item.presentationId}
                  onChange={(e) => updateItem(index, 'presentationId', e.target.value)}
                  disabled={!selectedMedication}
                  className={inputClassName(false) + ' bg-white disabled:bg-slate-50 disabled:text-slate-400'}
                >
                  <option value="">{selectedMedication ? 'Selecione' : '—'}</option>
                  {presentations.map((p) => (
                    <option key={p.id} value={p.id}>{p.dosage} ({p.unit})</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="w-full sm:w-auto">
              <FormField label="Qtd">
                <QuantityStepper value={item.quantity} onChange={(next) => updateItem(index, 'quantity', next)} />
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
        );
      })}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-2 text-sm text-upa-700 font-medium hover:text-upa-900"
      >
        <Plus className="w-4 h-4" /> Adicionar medicamento
      </button>

      <FormField label="Observações internas" htmlFor="internalNotes" hint="Visível só para a equipe da unidade de saúde">
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
  );
}
