export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function maskCpf(value = '') {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value = '') {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{0,2})/, digits.length ? '($1' : '')
      .replace(/\((\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  return digits
    .replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    .replace(/(-\d{4})\d+?$/, '$1');
}

export function maskCep(value = '') {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpfDisplay(value = '') {
  if (!value) return '';
  if (value.includes('*')) return value;
  return maskCpf(value);
}
