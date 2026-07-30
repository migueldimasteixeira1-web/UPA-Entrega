import { z } from 'zod';
import { MEDICATION_UNITS } from './constants.js';

// z.string().min(1) alone gives a generic "expected string, received
// undefined" message when the field is entirely missing (not just empty).
// Coercing missing/null to '' first means the friendly `message` always
// fires, whether the field was omitted or sent blank.
function requiredString(message, minLength = 1) {
  return z.preprocess(
    (v) => (v === undefined || v === null ? '' : v),
    z.string().trim().min(minLength, message)
  );
}

// Same idea but without trimming — for passwords, where leading/trailing
// spaces are part of the value, not incidental whitespace.
function requiredRaw(message, minLength = 1) {
  return z.preprocess((v) => (v === undefined || v === null ? '' : v), z.string().min(minLength, message));
}

const unitSchema = z
  .string()
  .trim()
  .refine((v) => MEDICATION_UNITS.includes(v), { message: 'Unidade inválida' });

const orderItemSchema = z.object({
  medicationId: requiredString('Medicamento inválido'),
  quantity: z.coerce
    .number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero'),
});

const newPatientSchema = z.object({
  name: requiredString('Nome do paciente é obrigatório'),
  phone: requiredString('Informe um telefone válido com DDD', 10),
  cpf: requiredString('CPF é obrigatório'),
});

const newAddressSchema = z.object({
  label: z.string().trim().optional(),
  street: requiredString('Rua é obrigatória'),
  number: requiredString('Número é obrigatório'),
  complement: z.string().trim().optional().nullable(),
  neighborhood: requiredString('Bairro é obrigatório'),
  city: requiredString('Cidade é obrigatória'),
  state: requiredString('Estado é obrigatório'),
  zipCode: z.string().trim().optional().nullable(),
  referencePoint: z.string().trim().optional().nullable(),
});

export const createOrderSchema = z
  .object({
    patientId: z.string().trim().min(1).optional(),
    patient: newPatientSchema.optional(),
    addressId: z.string().trim().min(1).optional(),
    address: newAddressSchema.optional(),
    items: z.array(orderItemSchema).min(1, 'Informe ao menos um medicamento'),
    internalNotes: z.string().trim().optional().nullable(),
    patientNotes: z.string().trim().optional().nullable(),
  })
  .refine((data) => Boolean(data.patientId || data.patient), {
    message: 'Informe o paciente (cadastrado ou novo)',
    path: ['patientId'],
  })
  .refine((data) => Boolean(data.addressId || data.address), {
    message: 'Informe o endereço (cadastrado ou novo)',
    path: ['addressId'],
  });

export const updateOrderSchema = z.object({
  internalNotes: z.string().trim().optional().nullable(),
  patientNotes: z.string().trim().optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Informe ao menos um medicamento').optional(),
});

export const updateStatusSchema = z.object({
  status: requiredString('Status é obrigatório'),
  cancelReason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const confirmDeliverySchema = z.object({
  pin: requiredString('Informe o PIN de confirmação'),
});

export const addNoteSchema = z.object({
  note: requiredString('Observação é obrigatória'),
});

export const createPatientSchema = z.object({
  name: requiredString('Nome e telefone são obrigatórios'),
  phone: requiredString('Nome e telefone são obrigatórios'),
  cpf: requiredString('CPF é obrigatório'),
  notes: z.string().trim().optional().nullable(),
});

export const updatePatientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  cpf: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
});

export const createAddressSchema = newAddressSchema;
export const updateAddressSchema = newAddressSchema.partial();

export const createMedicationSchema = z.object({
  name: requiredString('Nome é obrigatório'),
  unit: unitSchema.optional(),
  active: z.boolean().optional(),
});

export const updateMedicationSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  unit: unitSchema.optional(),
  active: z.boolean().optional(),
});

export const createRouteSchema = z.object({
  courierId: requiredString('Selecione um entregador'),
  orderIds: z.array(requiredString('Pedido inválido')).min(1, 'Selecione ao menos um pedido'),
});

export const createUserSchema = z.object({
  name: requiredString('Nome, e-mail e senha são obrigatórios'),
  email: requiredString('Nome, e-mail e senha são obrigatórios'),
  password: requiredRaw('Senha deve ter no mínimo 6 caracteres', 6),
  role: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  role: z.string().optional(),
  active: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: requiredRaw('Nova senha deve ter no mínimo 6 caracteres', 6),
});

export const loginSchema = z.object({
  email: requiredString('E-mail e senha são obrigatórios'),
  password: requiredRaw('E-mail e senha são obrigatórios'),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Dados inválidos';
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}
