const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Coordenada da unidade de saúde (Av. Vítor Rocha, 410 - Parque Burle, Cabo
// Frio - RJ, 28913-000), geocodificada uma única vez — ponto de partida e
// retorno de toda otimização de rota (issue #73). Nível de precisão de rua
// (não do número exato), suficiente pra distância entre paradas urbanas;
// refinar se algum dia a precisão do número virar relevante.
export const ORIGIN_COORDINATES = { latitude: -22.8833241, longitude: -42.0441878 };

// VROOM (motor por trás do endpoint de otimização do ORS) resolve o
// problema do caixeiro-viajante: dado um ponto de partida/retorno fixo (a
// unidade de saúde) e uma lista de paradas, devolve a ordem de visita que
// minimiza o deslocamento total. Sem ORS_API_KEY, com menos de 2 paradas
// geocodificadas, ou em caso de falha da API, retorna null — quem chama
// cai pra ordem FIFO (a mesma ordem recebida), nunca bloqueia o despacho.
export async function optimizeDeliverySequence(stops) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  const geocoded = stops.filter((s) => s.latitude != null && s.longitude != null);
  if (geocoded.length < 2) return null;

  const origin = [ORIGIN_COORDINATES.longitude, ORIGIN_COORDINATES.latitude];
  const body = {
    jobs: geocoded.map((s, index) => ({ id: index, location: [s.longitude, s.latitude] })),
    vehicles: [{ id: 1, profile: 'driving-car', start: origin, end: origin }],
  };

  try {
    const res = await fetch(new URL('/optimization', ORS_BASE_URL), {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[routing] ORS optimization retornou ${res.status}`);
      return null;
    }

    const data = await res.json();
    const steps = data.routes?.[0]?.steps?.filter((s) => s.type === 'job') || [];
    if (steps.length !== geocoded.length) return null;

    const orderedIds = steps.map((s) => geocoded[s.job].id);
    // Endereços sem coordenada (geocodificação falhou) não entram no
    // cálculo — vão pro fim, na ordem em que já estavam (critério de
    // aceite da #73: falha de geocodificação não pode travar o despacho).
    const ungeocodedIds = stops.filter((s) => s.latitude == null || s.longitude == null).map((s) => s.id);

    return [...orderedIds, ...ungeocodedIds];
  } catch (error) {
    console.error('[routing] Erro ao otimizar sequência de entrega:', error);
    return null;
  }
}
