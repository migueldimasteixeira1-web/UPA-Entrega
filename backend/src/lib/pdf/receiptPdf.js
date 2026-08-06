import PDFDocument from 'pdfkit';

function formatCpf(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return cpf || '—';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone || '—';
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('pt-BR');
}

function label(doc, text) {
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(text);
}

function value(doc, text) {
  doc.font('Helvetica').fillColor('#1e293b').text(text);
}

// Comprovante de registro do pedido — issue #40. Nunca contém o PIN: ele
// existe só no corpo do e-mail (issue #37), este documento é só a prova de
// que o pedido foi registrado, com os dados que já estão denormalizados no
// Order desde a criação (por isso não precisa de nenhum dado novo/migration
// e pode ser regerado a qualquer momento em vez de guardado em disco).
// `order` precisa vir com `items` e `createdBy` (ver ORDER_INCLUDE).
export function buildReceiptPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f4c65').text('UPA Entrega');
    doc.fontSize(12).font('Helvetica').fillColor('#475569').text('Comprovante de pedido');
    doc.moveDown(0.8);
    doc
      .strokeColor('#cbd5e1')
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(1);

    doc.fontSize(11);
    label(doc, `Número do pedido: ${order.orderNumber}`);
    label(doc, `Data/hora: ${formatDateTime(order.createdAt)}`);
    label(doc, `Atendente: ${order.createdBy?.name || '—'}`);

    doc.moveDown(1);
    doc.fontSize(13);
    label(doc, 'Paciente');
    doc.fontSize(11);
    value(doc, order.patientName);
    value(doc, `CPF: ${formatCpf(order.patientCpf)}`);
    value(doc, `Telefone: ${formatPhone(order.patientPhone)}`);

    doc.moveDown(1);
    doc.fontSize(13);
    label(doc, 'Endereço de entrega');
    doc.fontSize(11);
    value(doc, `${order.street}, ${order.number}${order.complement ? ` — ${order.complement}` : ''}`);
    value(doc, `${order.neighborhood} — ${order.city}/${order.state}`);
    if (order.zipCode) value(doc, `CEP: ${order.zipCode}`);
    if (order.referencePoint) value(doc, `Referência: ${order.referencePoint}`);

    doc.moveDown(1);
    doc.fontSize(13);
    label(doc, 'Medicamentos');
    doc.fontSize(11);
    for (const item of order.items || []) {
      value(doc, `${item.quantity}x ${item.medicationName} ${item.dosage} (${item.unit})`);
    }

    doc.moveDown(2);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(
        'Este comprovante não contém o código de confirmação de entrega (PIN) — ele foi enviado separadamente, no corpo do e-mail.'
      );

    doc.end();
  });
}
