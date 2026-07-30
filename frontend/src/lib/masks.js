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

// O telefone salvo no sistema é sempre local (DDD + número, 10-11 dígitos,
// nunca com código de país) — por isso sempre prefixamos "55", sem tentar
// "detectar" se já tem: DDD 55 existe de verdade (Santa Maria/RS) e colidiria.
export function buildWhatsAppUrl(phone, text) {
  const digits = onlyDigits(phone);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

export function buildMapsUrl({ street, number, neighborhood, city, state, zipCode }) {
  const parts = [
    [street, number].filter(Boolean).join(', '),
    neighborhood,
    city && state ? `${city} - ${state}` : city || state,
    zipCode,
  ].filter(Boolean);

  const query = encodeURIComponent(parts.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
