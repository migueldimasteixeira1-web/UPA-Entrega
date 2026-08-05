const ORS_BASE_URL = 'https://api.openrouteservice.org';
const AWESOME_CEP_URL = 'https://cep.awesomeapi.com.br/json';

// Geocodificação nunca lança exceção — uma falha não pode travar o
// cadastro de paciente/endereço nem a criação de pedido.
//
// Estratégia em duas etapas, validada manualmente contra endereços reais
// de Cabo Frio (issue #73):
//
// 1. Por CEP (AwesomeAPI) — fonte principal. Não exige ORS_API_KEY (a
//    consulta de CEP não passa pelo ORS), 100 mil requisições/mês grátis
//    sem cadastro, e devolveu coordenada real e diferenciada por CEP nos
//    testes (inclusive fora de Cabo Frio). Como o CEP já é validado no
//    cadastro via ViaCEP, a maioria dos endereços tem um pra consultar.
// 2. Por texto — respaldo pra endereço sem CEP. Exige ORS_API_KEY. Usa só
//    rua+número+cidade+estado, deliberadamente SEM bairro nem CEP no texto
//    livre: incluir bairro+CEP juntos confundia o parser do ORS a ponto de
//    devolver, com confiança máxima, um endereço em Florianópolis/SC
//    (~800km de distância) pra uma rua de Cabo Frio. Rua não encontrada
//    cai pro centro da cidade (impreciso, mas nunca errado de cidade).
export async function geocodeAddress(address) {
  const byCep = await geocodeByCep(address.zipCode);
  if (byCep) return byCep;

  return geocodeByText(address);
}

async function geocodeByCep(zipCode) {
  const digits = (zipCode || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`${AWESOME_CEP_URL}/${digits}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.lat == null || data.lng == null) return null;

    return { latitude: Number(data.lat), longitude: Number(data.lng) };
  } catch (error) {
    console.error('[geocoding] Erro ao consultar CEP:', error);
    return null;
  }
}

function buildAddressText({ street, number, city, state }) {
  return [street && number ? `${street}, ${number}` : street, city, state].filter(Boolean).join(', ');
}

async function geocodeByText(address) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  const text = buildAddressText(address);
  if (!text) return null;

  try {
    const url = new URL('/geocode/search', ORS_BASE_URL);
    url.searchParams.set('text', text);
    url.searchParams.set('size', '1');
    url.searchParams.set('boundary.country', 'BRA');

    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      console.error(`[geocoding] ORS retornou ${res.status} para "${text}"`);
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) {
      console.log(`[geocoding] Nenhum resultado para "${text}"`);
      return null;
    }

    const [longitude, latitude] = feature.geometry.coordinates;
    return { latitude, longitude };
  } catch (error) {
    console.error('[geocoding] Erro ao geocodificar:', error);
    return null;
  }
}
