import { onlyDigits } from './masks.js';

export async function fetchAddressByCep(cep) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new Error('Falha ao consultar CEP');
  }

  const data = await response.json();
  if (data.erro) {
    return { error: 'CEP não encontrado. Verifique o número ou preencha manualmente.' };
  }

  return {
    address: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    state: data.uf || '',
  };
}
