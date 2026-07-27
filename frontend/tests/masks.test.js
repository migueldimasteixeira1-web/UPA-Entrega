import { describe, it, expect } from 'vitest';
import { onlyDigits, maskCpf, maskPhone, maskCep, formatCpfDisplay, buildMapsUrl } from '../src/lib/masks';

describe('onlyDigits', () => {
  it('strips everything that is not a digit', () => {
    expect(onlyDigits('(22) 99999-8888')).toBe('22999998888');
    expect(onlyDigits('111.222.333-44')).toBe('11122233344');
    expect(onlyDigits('')).toBe('');
  });
});

describe('maskCpf', () => {
  it('formats digits progressively as ###.###.###-##', () => {
    expect(maskCpf('111')).toBe('111');
    expect(maskCpf('111222')).toBe('111.222');
    expect(maskCpf('11122233344')).toBe('111.222.333-44');
  });

  it('truncates beyond 11 digits', () => {
    expect(maskCpf('111222333445566')).toBe('111.222.333-44');
  });
});

describe('maskPhone', () => {
  it('formats a landline-length number', () => {
    expect(maskPhone('2233334444')).toBe('(22) 3333-4444');
  });

  it('formats a mobile-length number', () => {
    expect(maskPhone('22999998888')).toBe('(22) 99999-8888');
  });
});

describe('maskCep', () => {
  it('inserts the dash after 5 digits', () => {
    expect(maskCep('28905')).toBe('28905');
    expect(maskCep('28905000')).toBe('28905-000');
  });
});

describe('formatCpfDisplay', () => {
  it('masks a raw CPF', () => {
    expect(formatCpfDisplay('11122233344')).toBe('111.222.333-44');
  });

  it('passes through an already-masked (backend-redacted) CPF untouched', () => {
    expect(formatCpfDisplay('***.***.333-**')).toBe('***.***.333-**');
  });

  it('returns empty string for empty input', () => {
    expect(formatCpfDisplay('')).toBe('');
  });
});

describe('buildMapsUrl', () => {
  it('builds a Google Maps search URL from address parts', () => {
    const url = buildMapsUrl({
      street: 'Rua do Comércio',
      number: '78',
      neighborhood: 'Centro',
      city: 'Cabo Frio',
      state: 'RJ',
      zipCode: '28905010',
    });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Rua do Comércio, 78, Centro, Cabo Frio - RJ, 28905010')
    );
  });

  it('omits missing parts instead of leaving empty commas', () => {
    const url = buildMapsUrl({ street: 'Rua X', number: '10', neighborhood: '', city: '', state: '', zipCode: '' });
    expect(url).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua X, 10')}`);
  });
});
