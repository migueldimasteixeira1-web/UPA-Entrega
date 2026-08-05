import prisma from '../lib/prisma.js';
import { validateCpf } from '../lib/validation.js';
import { geocodeAddress } from '../lib/geocoding.js';

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
    const { name, cpf, phone, email, notes } = req.body;

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
        email: email?.trim() || null,
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

export async function updatePatient(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, cpf, email, notes, active } = req.body;

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (active !== undefined) updateData.active = active;

    if (cpf !== undefined) {
      let cpfDigits;
      try {
        cpfDigits = validateCpf(cpf);
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }

      if (cpfDigits !== existing.cpf) {
        const cpfInUse = await prisma.patient.findUnique({ where: { cpf: cpfDigits } });
        if (cpfInUse) {
          return res.status(409).json({ error: 'Já existe um paciente cadastrado com este CPF' });
        }
        updateData.cpf = cpfDigits;
      }
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
      include: patientInclude,
    });

    res.json(patient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
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

    const trimmedStreet = street.trim();
    const trimmedNumber = number.trim();
    const trimmedNeighborhood = neighborhood.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedZipCode = zipCode?.trim() || null;
    const coords = await geocodeAddress({
      street: trimmedStreet,
      number: trimmedNumber,
      neighborhood: trimmedNeighborhood,
      city: trimmedCity,
      state: trimmedState,
      zipCode: trimmedZipCode,
    });

    const address = await prisma.address.create({
      data: {
        patientId: id,
        label: label?.trim() || 'Endereço',
        street: trimmedStreet,
        number: trimmedNumber,
        complement: complement?.trim() || null,
        neighborhood: trimmedNeighborhood,
        city: trimmedCity,
        state: trimmedState,
        zipCode: trimmedZipCode,
        referencePoint: referencePoint?.trim() || null,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
    });

    res.status(201).json(address);
  } catch (error) {
    console.error('Add patient address error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar endereço' });
  }
}

export async function updateAddress(req, res) {
  try {
    const { id, addressId } = req.params;
    const { label, street, number, complement, neighborhood, city, state, zipCode, referencePoint } = req.body;

    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.patientId !== id) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }

    const updateData = {};
    if (label !== undefined) updateData.label = label?.trim() || 'Endereço';
    if (street !== undefined) updateData.street = street.trim();
    if (number !== undefined) updateData.number = number.trim();
    if (complement !== undefined) updateData.complement = complement?.trim() || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (zipCode !== undefined) updateData.zipCode = zipCode?.trim() || null;
    if (referencePoint !== undefined) updateData.referencePoint = referencePoint?.trim() || null;

    // Só regeocodifica se algum campo de endereço de fato mudou — evita
    // chamada desnecessária quando a edição é só, por exemplo, o rótulo.
    // Se a nova geocodificação falhar, mantém a coordenada anterior em vez
    // de apagar um dado bom que já existia.
    const addressChanged = ['street', 'number', 'neighborhood', 'city', 'state', 'zipCode'].some(
      (field) => updateData[field] !== undefined
    );
    if (addressChanged) {
      const coords = await geocodeAddress({
        street: updateData.street ?? existing.street,
        number: updateData.number ?? existing.number,
        neighborhood: updateData.neighborhood ?? existing.neighborhood,
        city: updateData.city ?? existing.city,
        state: updateData.state ?? existing.state,
        zipCode: updateData.zipCode !== undefined ? updateData.zipCode : existing.zipCode,
      });
      if (coords) {
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
      }
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    res.json(address);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Erro ao atualizar endereço' });
  }
}
