import prisma from '../prisma.js';
import { sendEmail } from './provider.js';
import { EMAIL_TYPE } from './queue.js';
import { ORDER_INCLUDE } from '../orderSerializer.js';
import { buildReceiptPdf } from '../pdf/receiptPdf.js';

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = Number(process.env.EMAIL_WORKER_INTERVAL_MS) || 10_000;
const BATCH_SIZE = 20;

// O comprovante em PDF (issue #40) nunca é persistido — é regerado aqui a
// partir do pedido a cada tentativa de envio/reenvio, porque todo o conteúdo
// já é um snapshot imutável salvo no Order desde a criação (não precisa
// guardar o PDF em lugar nenhum). Só a confirmação inicial leva o anexo;
// notificações de andamento (separado/em rota/entregue) não repetem.
async function buildAttachments(notification) {
  if (notification.type !== EMAIL_TYPE.CONFIRMACAO_PEDIDO) return undefined;

  const order = await prisma.order.findUnique({ where: { id: notification.orderId }, include: ORDER_INCLUDE });
  if (!order) return undefined;

  const pdf = await buildReceiptPdf(order);
  return [{ filename: `comprovante-${order.orderNumber}.pdf`, content: pdf, contentType: 'application/pdf' }];
}

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
      const attachments = await buildAttachments(notification);
      await sendEmail({ to: notification.to, subject: notification.subject, html: notification.html, attachments });
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
