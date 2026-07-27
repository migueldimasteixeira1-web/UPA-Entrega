import prisma from '../lib/prisma.js';

export async function listMedications(req, res) {
  try {
    const { active, search } = req.query;

    const medications = await prisma.medication.findMany({
      where: {
        ...(active !== undefined && { active: active === 'true' }),
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { name: 'asc' },
    });

    res.json(medications);
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

    res.json(medication);
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

  return errors;
}

export async function createMedication(req, res) {
  try {
    const { name, unit, active } = req.body;

    const errors = validateMedicationPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const medication = await prisma.medication.create({
      data: {
        name: name.trim(),
        unit: unit?.trim() || 'unidade',
        active: active !== false,
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
    const { name, unit, active } = req.body;

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
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(medication);
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ error: 'Erro ao atualizar medicamento' });
  }
}
