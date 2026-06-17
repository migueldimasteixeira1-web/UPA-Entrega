import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { authenticate, requireAdmin } from './middleware/auth.js';
import { login, me, changePassword } from './routes/auth.routes.js';
import { listUsers, createUser, updateUser, resetPassword } from './routes/users.routes.js';
import {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  adjustStock,
} from './routes/medications.routes.js';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  confirmPayment,
  updateStatus,
  addNote,
  registerUberFlash,
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

app.get('/api/dashboard/stats', getDashboardStats);

app.get('/api/orders', listOrders);
app.get('/api/orders/:id', getOrder);
app.post('/api/orders', createOrder);
app.put('/api/orders/:id', updateOrder);
app.post('/api/orders/:id/confirm-payment', confirmPayment);
app.patch('/api/orders/:id/status', updateStatus);
app.post('/api/orders/:id/register-uber-flash', registerUberFlash);
app.post('/api/orders/:id/notes', addNote);

app.get('/api/medications', listMedications);
app.get('/api/medications/:id', getMedication);
app.post('/api/medications', createMedication);
app.put('/api/medications/:id', updateMedication);
app.post('/api/medications/:id/adjust-stock', adjustStock);

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
