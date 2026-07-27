import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { authenticate, requireAdmin, requireRole } from './middleware/auth.js';
import { login, me, changePassword } from './routes/auth.routes.js';
import { listUsers, createUser, updateUser, resetPassword } from './routes/users.routes.js';
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
  addPatientAddress,
} from './routes/patients.routes.js';
import {
  listRoutes,
  getRoute,
  getMyRoutes,
  createRoute,
} from './routes/routes.routes.js';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateStatus,
  confirmDelivery,
  addNote,
  getPublicOrder,
  getDashboardStats,
} from './routes/orders.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:5173'], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'UPA Entrega API' });
});

// Public routes (somente leitura)
app.get('/api/public/orders/:token', getPublicOrder);

// Auth
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticate, me);
app.post('/api/auth/change-password', authenticate, changePassword);

// Protected routes
app.use('/api', authenticate);

app.get('/api/dashboard/stats', requireRole('ADMIN', 'OPERADOR'), getDashboardStats);

app.get('/api/orders', requireRole('ADMIN', 'OPERADOR'), listOrders);
app.get('/api/orders/:id', requireRole('ADMIN', 'OPERADOR'), getOrder);
app.post('/api/orders', requireRole('ADMIN', 'OPERADOR'), createOrder);
app.put('/api/orders/:id', requireRole('ADMIN', 'OPERADOR'), updateOrder);
app.patch('/api/orders/:id/status', requireRole('ADMIN', 'OPERADOR'), updateStatus);
app.post('/api/orders/:id/confirm-delivery', requireRole('ADMIN', 'ENTREGADOR'), confirmDelivery);
app.post('/api/orders/:id/notes', requireRole('ADMIN', 'OPERADOR'), addNote);

app.get('/api/patients/by-cpf/:cpf', requireRole('ADMIN', 'OPERADOR'), getPatientByCpf);
app.get('/api/patients/:id', requireRole('ADMIN', 'OPERADOR'), getPatient);
app.post('/api/patients', requireRole('ADMIN', 'OPERADOR'), createPatient);
app.post('/api/patients/:id/addresses', requireRole('ADMIN', 'OPERADOR'), addPatientAddress);

app.get('/api/delivery-routes', requireRole('ADMIN', 'OPERADOR'), listRoutes);
app.get('/api/delivery-routes/mine', requireRole('ADMIN', 'ENTREGADOR'), getMyRoutes);
app.get('/api/delivery-routes/:id', requireRole('ADMIN', 'OPERADOR'), getRoute);
app.post('/api/delivery-routes', requireRole('ADMIN', 'OPERADOR'), createRoute);

app.get('/api/medications', requireRole('ADMIN', 'OPERADOR'), listMedications);
app.get('/api/medications/:id', requireRole('ADMIN', 'OPERADOR'), getMedication);
app.post('/api/medications', requireRole('ADMIN', 'OPERADOR'), createMedication);
app.put('/api/medications/:id', requireRole('ADMIN', 'OPERADOR'), updateMedication);

app.get('/api/users', requireAdmin, listUsers);
app.post('/api/users', requireAdmin, createUser);
app.put('/api/users/:id', requireAdmin, updateUser);
app.post('/api/users/:id/reset-password', requireAdmin, resetPassword);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UPA Entrega API running on port ${PORT}`);
});
