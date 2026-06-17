import prisma from '../lib/prisma.js';

export async function listMedications(req, res) {
  try {
    const { active, search, lowStock } = req.query;

    const medications = await prisma.medication.findMany({
      where: {
        ...(active !== undefined && { active: active === 'true' }),
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
        ...(lowStock === 'true' && {
          active: true,
        }),
      },
      orderBy: { name: 'asc' },
    });

    const result = medications.map((med) => ({
      ...med,
      isLowStock: med.active && med.quantity <= med.minStock,
    }));

    const filtered = lowStock === 'true'
      ? result.filter((m) => m.isLowStock)
      : result;

    res.json(filtered);
  } catch (error) {
    console.error('List medications error:', error);
    res.status(500).json({ error: 'Erro ao listar medicamentos' });
  }
}

export async function getMedication(req, res) {
  try {
    const medication = await prisma.medication.findUnique({
      where: { id: req.params.id },
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medicamento não encontrado' });
    }

    res.json({
      ...medication,
      isLowStock: medication.active && medication.quantity <= medication.minStock,
    });
  } catch (error) {
    console.error('Get medication error:', error);
    res.status(500).json({ error: 'Erro ao buscar medicamento' });
  }
}

function validateMedicationPayload(body, { partial = false } = {}) {
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) {
      errors.push('Nome é obrigatório');
    }
  }

  if (!partial || body.unit !== undefined) {
    const unitValue = partial ? body.unit?.trim() : (body.unit?.trim() || 'unidade');
    if (!unitValue) {
      errors.push('Unidade é obrigatória');
    }
  }

  if (!partial || body.quantity !== undefined) {
    const quantityValue = body.quantity ?? (!partial ? 0 : undefined);
    const quantity = Number(quantityValue);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) {
      errors.push('Quantidade deve ser um número inteiro válido');
    } else if (quantity < 0) {
      errors.push('Quantidade não pode ser negativa');
    }
  }

  if (!partial || body.minStock !== undefined) {
    const minStockValue = body.minStock ?? (!partial ? 5 : undefined);
    const minStock = Number(minStockValue);
    if (!Number.isFinite(minStock) || !Number.isInteger(minStock)) {
      errors.push('Estoque mínimo deve ser um número inteiro válido');
    } else if (minStock < 0) {
      errors.push('Estoque mínimo não pode ser negativo');
    }
  }

  return errors;
}

export async function createMedication(req, res) {
  try {
    const { name, description, unit, quantity, minStock, active, notes } = req.body;

    const errors = validateMedicationPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const medication = await prisma.medication.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        unit: unit?.trim() || 'unidade',
        quantity: Number(quantity),
        minStock: Number(minStock ?? 5),
        active: active !== false,
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json(medication);
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ error: 'Erro ao criar medicamento' });
  }
}

export async function updateMedication(req, res) {
  try {
    const { id } = req.params;
    const { name, description, unit, quantity, minStock, active, notes } = req.body;

    const existing = await prisma.medication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Medicamento não encontrado' });
    }

    const errors = validateMedicationPayload(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const medication = await prisma.medication.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(active !== undefined && { active }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    res.json(medication);
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ error: 'Erro ao atualizar medicamento' });
  }
}

export async function adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined || adjustment === null || adjustment === '') {
      return res.status(400).json({ error: 'Ajuste de quantidade é obrigatório' });
    }

    const adjustmentValue = Number(adjustment);
    if (!Number.isFinite(adjustmentValue) || !Number.isInteger(adjustmentValue)) {
      return res.status(400).json({ error: 'Ajuste deve ser um número inteiro válido' });
    }

    const medication = await prisma.medication.findUnique({ where: { id } });
    if (!medication) {
      return res.status(404).json({ error: 'Medicamento não encontrado' });
    }

    const newQuantity = medication.quantity + adjustmentValue;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Quantidade não pode ficar negativa' });
    }

    const updated = await prisma.medication.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    res.json({ ...updated, adjustmentReason: reason || null });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Erro ao ajustar estoque' });
  }
}
