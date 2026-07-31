import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authenticate, requireAdmin, requireRole } from './middleware/auth.js';
import { handlePrescriptionUpload, handleDeliveryProofUpload, parseMultipartOrderBody } from './middleware/upload.js';
import { login, me, changePassword } from './routes/auth.routes.js';
import { listUsers, listCouriers, createUser, updateUser, resetPassword } from './routes/users.routes.js';
import {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
} from './routes/medications.routes.js';
import {
  getPatientByCpf,
  getPatient,
  createPatient,
  updatePatient,
  addPatientAddress,
  updateAddress,
} from './routes/patients.routes.js';
import {
  listRoutes,
  getRoute,
  getMyRoutes,
  createRoute,
} from './routes/routes.routes.js';
import {
  listOrders,
  exportOrdersCsv,
  listOrderHistory,
  getOrder,
  createOrder,
  updateOrder,
  updateStatus,
  confirmDelivery,
  verifyDeliveryPin,
  addNote,
  resendConfirmationEmail,
  getPrescriptionUrl,
  getDeliveryProofUrl,
  getPublicOrder,
  getDashboardStats,
} from './routes/orders.routes.js';
import {
  validateBody,
  loginSchema,
  createOrderSchema,
  updateOrderSchema,
  updateStatusSchema,
  confirmDeliverySchema,
  addNoteSchema,
  createPatientSchema,
  updatePatientSchema,
  createAddressSchema,
  updateAddressSchema,
  createRouteSchema,
  createMedicationSchema,
  updateMedicationSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from './lib/schemas.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const IS_DEV = process.env.NODE_ENV !== 'production';

function parseCorsOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  return new Set([...defaults, ...fromEnv]);
}

function isPrivateLanOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (parseCorsOrigins().has(origin)) return true;
  // Dev: permite celular/outro host na LAN contra o Vite (:5173).
  return IS_DEV && isPrivateLanOrigin(origin);
}

export function createApp({ loginRateLimit, confirmDeliveryRateLimit, resendEmailRateLimit } = {}) {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'UPA Entrega API' });
  });

  // Public routes (somente leitura)
  app.get('/api/public/orders/:token', getPublicOrder);

  // Login sem limite de tentativas seria um alvo fácil de força bruta.
  const loginLimiter = rateLimit({
    windowMs: loginRateLimit?.windowMs ?? 15 * 60 * 1000,
    limit: loginRateLimit?.limit ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
  });

  // Auth
  app.post('/api/auth/login', loginLimiter, validateBody(loginSchema), login);
  app.get('/api/auth/me', authenticate, me);
  app.post('/api/auth/change-password', authenticate, changePassword);

  // O PIN de entrega tem só 6 dígitos (1M combinações) — sem limite de
  // tentativas, quem tiver uma conta ENTREGADOR poderia forçar bruta o PIN de
  // um pedido em vez de exigir que o paciente o informe.
  const confirmDeliveryLimiter = rateLimit({
    windowMs: confirmDeliveryRateLimit?.windowMs ?? 15 * 60 * 1000,
    limit: confirmDeliveryRateLimit?.limit ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de confirmação. Tente novamente em alguns minutos.' },
  });

  // Reenvio manual do e-mail de confirmação — não deve virar um jeito de
  // martelar a caixa de entrada do paciente nem de sondar o worker.
  const resendEmailLimiter = rateLimit({
    windowMs: resendEmailRateLimit?.windowMs ?? 15 * 60 * 1000,
    limit: resendEmailRateLimit?.limit ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de reenvio. Tente novamente em alguns minutos.' },
  });

  // Protected routes
  app.use('/api', authenticate);

  app.get('/api/dashboard/stats', requireRole('ADMIN', 'OPERADOR'), getDashboardStats);

  app.get('/api/orders', requireRole('ADMIN', 'OPERADOR'), listOrders);
  // Precisa vir antes de /api/orders/:id, senão "report" seria lido como id.
  app.get('/api/orders/report', requireRole('ADMIN', 'OPERADOR'), exportOrdersCsv);
  // Visão cruzada entre pedidos ("quem mudou o quê") — só Admin.
  app.get('/api/orders/history', requireAdmin, listOrderHistory);
  app.get('/api/orders/:id', requireRole('ADMIN', 'OPERADOR'), getOrder);
  app.get('/api/orders/:id/prescription', requireRole('ADMIN', 'OPERADOR'), getPrescriptionUrl);
  app.get('/api/orders/:id/delivery-proof', requireRole('ADMIN', 'OPERADOR'), getDeliveryProofUrl);
  app.post(
    '/api/orders',
    requireRole('ADMIN', 'OPERADOR'),
    handlePrescriptionUpload,
    parseMultipartOrderBody,
    validateBody(createOrderSchema),
    createOrder
  );
  app.put('/api/orders/:id', requireRole('ADMIN', 'OPERADOR'), validateBody(updateOrderSchema), updateOrder);
  app.patch('/api/orders/:id/status', requireRole('ADMIN', 'OPERADOR'), validateBody(updateStatusSchema), updateStatus);
  // Verifica o PIN sem finalizar a entrega — dá feedback real antes de
  // liberar a etapa de foto no app do entregador. Mesma instância de
  // confirmDeliveryLimiter (não uma nova com a mesma config): as tentativas
  // aqui e em confirm-delivery consomem o mesmo orçamento por IP, senão
  // esta rota vira uma segunda superfície de força bruta pro PIN.
  app.post(
    '/api/orders/:id/verify-pin',
    confirmDeliveryLimiter,
    requireRole('ADMIN', 'ENTREGADOR'),
    validateBody(confirmDeliverySchema),
    verifyDeliveryPin
  );
  app.post(
    '/api/orders/:id/confirm-delivery',
    confirmDeliveryLimiter,
    requireRole('ADMIN', 'ENTREGADOR'),
    handleDeliveryProofUpload,
    validateBody(confirmDeliverySchema),
    confirmDelivery
  );
  app.post('/api/orders/:id/notes', requireRole('ADMIN', 'OPERADOR'), validateBody(addNoteSchema), addNote);
  app.post(
    '/api/orders/:id/resend-email',
    resendEmailLimiter,
    requireRole('ADMIN', 'OPERADOR'),
    resendConfirmationEmail
  );

  app.get('/api/patients/by-cpf/:cpf', requireRole('ADMIN', 'OPERADOR'), getPatientByCpf);
  app.get('/api/patients/:id', requireRole('ADMIN', 'OPERADOR'), getPatient);
  app.post('/api/patients', requireRole('ADMIN', 'OPERADOR'), validateBody(createPatientSchema), createPatient);
  app.put('/api/patients/:id', requireRole('ADMIN', 'OPERADOR'), validateBody(updatePatientSchema), updatePatient);
  app.post(
    '/api/patients/:id/addresses',
    requireRole('ADMIN', 'OPERADOR'),
    validateBody(createAddressSchema),
    addPatientAddress
  );
  app.put(
    '/api/patients/:id/addresses/:addressId',
    requireRole('ADMIN', 'OPERADOR'),
    validateBody(updateAddressSchema),
    updateAddress
  );

  app.get('/api/couriers', requireRole('ADMIN', 'OPERADOR'), listCouriers);

  app.get('/api/delivery-routes', requireRole('ADMIN', 'OPERADOR'), listRoutes);
  app.get('/api/delivery-routes/mine', requireRole('ADMIN', 'ENTREGADOR'), getMyRoutes);
  app.get('/api/delivery-routes/:id', requireRole('ADMIN', 'OPERADOR'), getRoute);
  app.post('/api/delivery-routes', requireRole('ADMIN', 'OPERADOR'), validateBody(createRouteSchema), createRoute);

  app.get('/api/medications', requireRole('ADMIN', 'OPERADOR'), listMedications);
  app.get('/api/medications/:id', requireRole('ADMIN', 'OPERADOR'), getMedication);
  app.post(
    '/api/medications',
    requireRole('ADMIN', 'OPERADOR'),
    validateBody(createMedicationSchema),
    createMedication
  );
  app.put(
    '/api/medications/:id',
    requireRole('ADMIN', 'OPERADOR'),
    validateBody(updateMedicationSchema),
    updateMedication
  );

  app.get('/api/users', requireAdmin, listUsers);
  app.post('/api/users', requireAdmin, validateBody(createUserSchema), createUser);
  app.put('/api/users/:id', requireAdmin, validateBody(updateUserSchema), updateUser);
  app.post('/api/users/:id/reset-password', requireAdmin, validateBody(resetPasswordSchema), resetPassword);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  return app;
}
