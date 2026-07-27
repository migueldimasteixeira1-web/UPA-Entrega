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

export function validateCpf(cpf, { required = true } = {}) {
  const digits = (cpf || '').replace(/\D/g, '');

  if (!digits) {
    if (required) throw new Error('CPF é obrigatório');
    return null;
  }

  if (digits.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }

  return digits;
}
