export function buildOrderAuditEntries(existing, body, updated) {
  const entries = [];

  if (body.patientName !== undefined && body.patientName.trim() !== existing.patientName) {
    entries.push({ action: 'Dados do paciente atualizados', details: 'Nome do paciente alterado' });
  }

  if (body.patientPhone !== undefined && body.patientPhone.trim() !== existing.patientPhone) {
    entries.push({ action: 'Telefone do paciente atualizado', details: 'Telefone alterado' });
  }

  if (body.patientCpf !== undefined && normalizeCpf(body.patientCpf) !== existing.patientCpf) {
    entries.push({ action: 'CPF do paciente atualizado', details: 'CPF alterado' });
  }

  const addressChanged =
    (body.address !== undefined && body.address.trim() !== existing.address) ||
    (body.neighborhood !== undefined && body.neighborhood.trim() !== existing.neighborhood) ||
    (body.city !== undefined && body.city.trim() !== existing.city) ||
    (body.state !== undefined && body.state.trim() !== existing.state) ||
    (body.zipCode !== undefined && (body.zipCode?.trim() || null) !== existing.zipCode);

  if (addressChanged) {
    entries.push({ action: 'Endereço atualizado', details: 'Endereço de entrega alterado' });
  }

  if (body.referencePoint !== undefined && (body.referencePoint?.trim() || null) !== existing.referencePoint) {
    entries.push({ action: 'Ponto de referência atualizado', details: 'Referência de entrega alterada' });
  }

  if (body.freightValue !== undefined && normalizeDecimal(body.freightValue) !== normalizeDecimal(existing.freightValue)) {
    entries.push({ action: 'Valor do frete atualizado', details: 'Valor do frete alterado' });
  }

  if (body.internalNotes !== undefined && (body.internalNotes?.trim() || null) !== existing.internalNotes) {
    entries.push({ action: 'Observação interna atualizada', details: 'Observação interna alterada' });
  }

  if (body.patientNotes !== undefined && (body.patientNotes?.trim() || null) !== existing.patientNotes) {
    entries.push({ action: 'Observação ao paciente atualizada', details: 'Observação ao paciente alterada' });
  }

  return entries;
}

export function buildUberFlashAuditEntries(existing, body) {
  const entries = [];
  const isFirstRegistration = existing.deliveryService !== 'UBER_FLASH';

  if (isFirstRegistration) {
    entries.push({
      action: 'Dados do Uber Flash registrados',
      details: 'Entrega registrada via Uber Flash',
    });
  } else {
    entries.push({
      action: 'Dados do Uber Flash atualizados',
      details: 'Informações do Uber Flash alteradas',
    });
  }

  const newPin = body.deliveryPin?.trim() || null;
  if (newPin !== (existing.deliveryPin || null)) {
    if (newPin && !existing.deliveryPin) {
      entries.push({ action: 'PIN do Uber Flash registrado', details: 'PIN informado pelo app Uber Flash' });
    } else if (newPin && existing.deliveryPin) {
      entries.push({ action: 'PIN do Uber Flash alterado', details: 'PIN atualizado' });
    }
  }

  const newLink = body.trackingLink?.trim() || null;
  if (newLink !== (existing.trackingLink || null)) {
    if (newLink && !existing.trackingLink) {
      entries.push({ action: 'Link de rastreio registrado', details: 'Link do Uber Flash adicionado' });
    } else if (newLink && existing.trackingLink) {
      entries.push({ action: 'Link de rastreio atualizado', details: 'Link do Uber Flash alterado' });
    }
  }

  const newNotes = body.deliveryNotes?.trim() || null;
  if (newNotes && newNotes !== (existing.deliveryNotes || '')) {
    entries.push({
      action: 'Observação da entrega registrada',
      details: 'Observações do Uber Flash atualizadas',
    });
  }

  return entries;
}

function normalizeCpf(cpf) {
  return cpf?.replace(/\D/g, '') || null;
}

function normalizeDecimal(value) {
  return Number(value).toFixed(2);
}
