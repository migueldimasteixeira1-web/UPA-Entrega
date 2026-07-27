import prisma from '../lib/prisma.js';
import { validateCpf } from '../lib/validation.js';

const patientInclude = {
  addresses: { orderBy: { createdAt: 'asc' } },
};

export async function getPatientByCpf(req, res) {
  try {
    const cpf = validateCpf(req.params.cpf);

    const patient = await prisma.patient.findUnique({
      where: { cpf },
      include: patientInclude,
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    res.json(patient);
  } catch (error) {
    if (error.message?.includes('CPF')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Get patient by CPF error:', error);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
}

export async function getPatient(req, res) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: patientInclude,
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
}

export async function createPatient(req, res) {
  try {
    const { name, cpf, phone, notes } = req.body;

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    let cpfDigits;
    try {
      cpfDigits = validateCpf(cpf);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const existing = await prisma.patient.findUnique({ where: { cpf: cpfDigits } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe um paciente cadastrado com este CPF' });
    }

    const patient = await prisma.patient.create({
      data: {
        name: name.trim(),
        cpf: cpfDigits,
        phone: phone.trim(),
        notes: notes?.trim() || null,
      },
      include: patientInclude,
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar paciente' });
  }
}

function validateAddressPayload(body) {
  const required = ['street', 'number', 'neighborhood', 'city', 'state'];
  for (const field of required) {
    if (!body[field]?.toString().trim()) {
      throw new Error(`Campo de endereço obrigatório ausente: ${field}`);
    }
  }
}

export async function addPatientAddress(req, res) {
  try {
    const { id } = req.params;
    const { label, street, number, complement, neighborhood, city, state, zipCode, referencePoint } = req.body;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    try {
      validateAddressPayload(req.body);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const address = await prisma.address.create({
      data: {
        patientId: id,
        label: label?.trim() || 'Endereço',
        street: street.trim(),
        number: number.trim(),
        complement: complement?.trim() || null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode?.trim() || null,
        referencePoint: referencePoint?.trim() || null,
      },
    });

    res.status(201).json(address);
  } catch (error) {
    console.error('Add patient address error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar endereço' });
  }
}
