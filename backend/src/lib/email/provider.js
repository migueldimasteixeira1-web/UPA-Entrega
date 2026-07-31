import nodemailer from 'nodemailer';

// Abstração fina sobre o transporte de e-mail: qualquer provedor
// transacional (Resend, SES, Mailgun, um Gmail de testes) expõe uma
// interface SMTP, então nodemailer + SMTP evita prender o projeto a um SDK
// de fornecedor específico — trocar de provedor é só trocar as env vars.
//
// Sem SMTP_HOST configurado (ainda não há domínio/provedor definidos para
// este deploy — ver issue #35), cai num transporte "console": loga o
// e-mail em vez de falhar, para não travar o desenvolvimento nem a fila.
let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.SMTP_FROM || 'UPA Entrega <nao-responda@upa-entrega.local>';
  const client = getTransporter();

  if (!client) {
    console.log(`[email] SMTP não configurado — e-mail não enviado de verdade. Para: ${to} | Assunto: ${subject}`);
    return;
  }

  await client.sendMail({ from, to, subject, html });
}

// Só para os testes poderem resetar o transporte memoizado entre casos.
export function _resetTransporterForTests() {
  transporter = undefined;
}
