import prisma from '../prisma.js';
import { sendEmail } from './provider.js';

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = Number(process.env.EMAIL_WORKER_INTERVAL_MS) || 10_000;
const BATCH_SIZE = 20;

// Processa um lote de e-mails pendentes/com falha (até MAX_ATTEMPTS). Cada
// linha é tratada de forma independente — uma falha não bloqueia as outras.
// Exportado separado do setInterval para os testes chamarem diretamente,
// sem depender de tempo real passando.
export async function processPendingEmails() {
  const pending = await prisma.emailNotification.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  for (const notification of pending) {
    try {
      await sendEmail({ to: notification.to, subject: notification.subject, html: notification.html });
      await prisma.emailNotification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
    } catch (error) {
      await prisma.emailNotification.update({
        where: { id: notification.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, lastError: String(error.message || error) },
      });
    }
  }

  return pending.length;
}

let intervalHandle;

export function startEmailWorker() {
  if (intervalHandle) return intervalHandle;
  intervalHandle = setInterval(() => {
    processPendingEmails().catch((error) => console.error('Email worker error:', error));
  }, POLL_INTERVAL_MS);
  return intervalHandle;
}

export function stopEmailWorker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = undefined;
}
