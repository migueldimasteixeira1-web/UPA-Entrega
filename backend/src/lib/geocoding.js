const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Sem ORS_API_KEY configurada (issue #73 — grátis dentro da cota do ORS,
// mas precisa de cadastro), geocodificação vira no-op: endereço fica sem
// coordenada, dispatch cai pra ordem FIFO (ver routing/optimize.js). Nunca
// lança exceção — uma falha de geocodificação não pode travar o cadastro
// de paciente/endereço nem a criação de pedido.
function buildAddressText({ street, number, neighborhood, city, state, zipCode }) {
  return [
    street && number ? `${street}, ${number}` : street,
    neighborhood,
    city,
    state,
    zipCode,
  ]
    .filter(Boolean)
    .join(', ');
}

export async function geocodeAddress(address) {
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
