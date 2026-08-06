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

function cpfCheckDigit(digits, length) {
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += Number(digits[i]) * (length + 1 - i);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function isValidCpfChecksum(digits) {
  // Sequências de um único dígito repetido "passam" no cálculo do dígito
  // verificador mas nunca são CPFs reais emitidos.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return (
    cpfCheckDigit(digits, 9) === Number(digits[9]) &&
    cpfCheckDigit(digits, 10) === Number(digits[10])
  );
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

  if (!isValidCpfChecksum(digits)) {
    throw new Error('CPF inválido');
  }

  return digits;
}
