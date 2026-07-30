export function buildOrderAuditEntries(existing, body) {
  const entries = [];

  if (body.internalNotes !== undefined && (body.internalNotes?.trim() || null) !== existing.internalNotes) {
    entries.push({ action: 'Observação interna atualizada', details: 'Observação interna alterada' });
  }

  if (body.patientNotes !== undefined && (body.patientNotes?.trim() || null) !== existing.patientNotes) {
    entries.push({ action: 'Observação ao paciente atualizada', details: 'Observação ao paciente alterada' });
  }

  if (body.items !== undefined) {
    entries.push({ action: 'Medicamentos atualizados', details: 'Lista de medicamentos do pedido alterada' });
  }

  return entries;
}
