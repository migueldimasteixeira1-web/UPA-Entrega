import { describe, it, expect } from 'vitest';
import { validateCpf } from '../src/lib/validation.js';

describe('validateCpf', () => {
  it('accepts a CPF with a valid check digit', () => {
    expect(validateCpf('111.222.333-96')).toBe('11122233396');
  });

  it('rejects a CPF with an invalid check digit', () => {
    expect(() => validateCpf('11122233344')).toThrow('CPF inválido');
  });

  it('rejects repeated-digit sequences even though they pass the check-digit math', () => {
    expect(() => validateCpf('11111111111')).toThrow('CPF inválido');
    expect(() => validateCpf('00000000000')).toThrow('CPF inválido');
  });

  it('rejects a CPF with the wrong number of digits', () => {
    expect(() => validateCpf('123456789')).toThrow('11 dígitos');
  });

  it('throws when required and CPF is missing', () => {
    expect(() => validateCpf('')).toThrow('obrigatório');
  });

  it('returns null when not required and CPF is missing', () => {
    expect(validateCpf('', { required: false })).toBeNull();
  });
});
