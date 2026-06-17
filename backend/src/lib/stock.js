/**
 * Regras de estoque:
 * - Pedido criado / frete pago: não baixa estoque
 * - Aguardando retirada: baixa estoque e marca stockReserved = true
 * - Cancelado após baixa: devolve estoque
 * - Entregue: mantém baixa (sem devolução)
 */

import { parsePositiveInteger } from './validation.js';

function validateItemQuantity(item) {
  return parsePositiveInteger(item.quantity, 'Quantidade do item');
}

export async function checkStockAvailability(tx, items) {
  for (const item of items) {
    const quantity = validateItemQuantity(item);

    const med = await tx.medication.findUnique({ where: { id: item.medicationId } });
    if (!med || !med.active) {
      throw new Error('Medicamento inválido ou inativo');
    }
    if (med.quantity < quantity) {
      throw new Error(`Estoque insuficiente para ${med.name}. Disponível: ${med.quantity}`);
    }
  }
}

export async function reserveStock(tx, items) {
  await checkStockAvailability(tx, items);

  for (const item of items) {
    const quantity = validateItemQuantity(item);

    await tx.medication.update({
      where: { id: item.medicationId },
      data: { quantity: { decrement: quantity } },
    });
  }
}

export async function restoreStock(tx, items) {
  for (const item of items) {
    const quantity = validateItemQuantity(item);

    await tx.medication.update({
      where: { id: item.medicationId },
      data: { quantity: { increment: quantity } },
    });
  }
}
