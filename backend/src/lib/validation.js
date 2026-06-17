export function parsePositiveDecimal(value, fieldLabel = 'Valor') {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldLabel} deve ser informado e não pode ser negativo`);
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldLabel} deve ser informado e não pode ser negativo`);
  }

  if (num < 0) {
    throw new Error(`${fieldLabel} deve ser informado e não pode ser negativo`);
  }

  if (num <= 0) {
    throw new Error(`${fieldLabel} deve ser maior que zero`);
  }

  return num;
}

export function parsePositiveInteger(value, fieldLabel = 'Quantidade') {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldLabel} é obrigatório`);
  }

  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new Error(`${fieldLabel} deve ser um número inteiro válido`);
  }

  if (num <= 0) {
    throw new Error(`${fieldLabel} deve ser maior que zero`);
  }

  return num;
}

export function parseNonNegativeInteger(value, fieldLabel) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldLabel} é obrigatório`);
  }

  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new Error(`${fieldLabel} deve ser um número inteiro válido`);
  }

  if (num < 0) {
    throw new Error(`${fieldLabel} não pode ser negativo`);
  }

  return num;
}

export function parseIntegerAdjustment(value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('Ajuste de quantidade é obrigatório');
  }

  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new Error('Ajuste deve ser um número inteiro válido');
  }

  return num;
}
