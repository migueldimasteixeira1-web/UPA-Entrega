import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { generateOrderNumber, generateRouteNumber, generateDeliveryPin } from '../src/lib/constants.js';

const prisma = new PrismaClient();

async function ensureUser({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Usuário já existe: ${email}`);
    return existing;
  }
  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password), role },
  });
  console.log(`✅ Usuário criado: ${email} / ${password} (${role})`);
  return user;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  const admin = await ensureUser({
    name: 'Administrador UPA',
    email: 'admin@upa.local',
    password: 'Admin@123',
    role: 'ADMIN',
  });

  await ensureUser({
    name: 'Operador UPA',
    email: 'operador@upa.local',
    password: 'Operador@123',
    role: 'OPERADOR',
  });

  const courier = await ensureUser({
    name: 'Carlos Entregador',
    email: 'entregador@upa.local',
    password: 'Entregador@123',
    role: 'ENTREGADOR',
  });

  const medicationNames = [
    { name: 'Dipirona 500mg', unit: 'comprimido' },
    { name: 'Paracetamol 750mg', unit: 'comprimido' },
    { name: 'Ibuprofeno 600mg', unit: 'comprimido' },
    { name: 'Losartana 50mg', unit: 'comprimido' },
    { name: 'Metformina 850mg', unit: 'comprimido' },
    { name: 'Omeprazol 20mg', unit: 'cápsula' },
    { name: 'Amoxicilina 500mg', unit: 'cápsula' },
    { name: 'Salbutamol Spray', unit: 'frasco' },
  ];

  const medications = [];
  for (const med of medicationNames) {
    let record = await prisma.medication.findFirst({ where: { name: med.name } });
    if (!record) {
      record = await prisma.medication.create({ data: med });
    }
    medications.push(record);
  }
  console.log('✅ Catálogo de medicamentos pronto');

  async function ensurePatient({ name, cpf, phone, addresses }) {
    let patient = await prisma.patient.findUnique({ where: { cpf } });
    if (patient) {
      console.log(`ℹ️  Paciente já existe: ${name}`);
      return prisma.patient.findUnique({ where: { cpf }, include: { addresses: true } });
    }
    patient = await prisma.patient.create({
      data: {
        name,
        cpf,
        phone,
        addresses: { create: addresses },
      },
      include: { addresses: true },
    });
    console.log(`✅ Paciente criado: ${name}`);
    return patient;
  }

  const maria = await ensurePatient({
    name: 'Maria da Silva Santos',
    cpf: '11122233344',
    phone: '22999990001',
    addresses: [
      {
        label: 'Residência',
        street: 'Rua das Palmeiras',
        number: '120',
        neighborhood: 'Braga',
        city: 'Cabo Frio',
        state: 'RJ',
        zipCode: '28908000',
      },
    ],
  });

  const joao = await ensurePatient({
    name: 'João Pereira Costa',
    cpf: '55566677788',
    phone: '22999990002',
    addresses: [
      {
        label: 'Residência',
        street: 'Avenida Litorânea',
        number: '450',
        complement: 'Apto 302',
        neighborhood: 'Centro',
        city: 'Cabo Frio',
        state: 'RJ',
        zipCode: '28905000',
      },
      {
        label: 'Trabalho',
        street: 'Rua do Comércio',
        number: '78',
        neighborhood: 'Centro',
        city: 'Cabo Frio',
        state: 'RJ',
        zipCode: '28905010',
      },
    ],
  });

  const ordersCount = await prisma.order.count();
  if (ordersCount > 0) {
    console.log('ℹ️  Já existem pedidos, pulando criação de pedidos de exemplo');
    console.log('🌱 Seed concluído!');
    return;
  }

  async function createOrder({ patient, address, items, status, internalNotes }) {
    const orderNumber = await generateOrderNumber(prisma);
    const order = await prisma.order.create({
      data: {
        orderNumber,
        patientId: patient.id,
        addressId: address.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientCpf: patient.cpf,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        referencePoint: address.referencePoint,
        internalNotes,
        deliveryPin: generateDeliveryPin(),
        status: 'PEDIDO_RECEBIDO',
        createdById: admin.id,
        items: {
          create: items.map((item) => ({
            medicationId: item.medication.id,
            medicationName: item.medication.name,
            unit: item.medication.unit,
            quantity: item.quantity,
          })),
        },
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        userId: admin.id,
        action: 'Pedido criado',
        toStatus: 'PEDIDO_RECEBIDO',
        details: `Pedido ${orderNumber} registrado`,
      },
    });

    if (status === 'PEDIDO_RECEBIDO') return order;

    return prisma.order.update({ where: { id: order.id }, data: { status } });
  }

  const order1 = await createOrder({
    patient: maria,
    address: maria.addresses[0],
    items: [{ medication: medications[0], quantity: 2 }],
    status: 'PEDIDO_RECEBIDO',
  });

  const order2 = await createOrder({
    patient: joao,
    address: joao.addresses[0],
    items: [{ medication: medications[3], quantity: 1 }, { medication: medications[5], quantity: 1 }],
    status: 'SEPARADO',
    internalNotes: 'Receita anexada no prontuário',
  });

  const order3 = await createOrder({
    patient: maria,
    address: maria.addresses[0],
    items: [{ medication: medications[1], quantity: 1 }],
    status: 'AGUARDANDO_SAIDA',
  });

  const order4 = await createOrder({
    patient: joao,
    address: joao.addresses[1],
    items: [{ medication: medications[6], quantity: 1 }],
    status: 'AGUARDANDO_SAIDA',
  });

  const routeNumber = await generateRouteNumber(prisma);
  const route = await prisma.route.create({
    data: {
      routeNumber,
      courierId: courier.id,
      createdById: admin.id,
      status: 'EM_ANDAMENTO',
      orders: {
        connect: [{ id: order4.id }],
      },
    },
  });

  await prisma.order.update({
    where: { id: order4.id },
    data: { status: 'EM_ROTA', routeId: route.id, routeSequence: 0 },
  });

  await prisma.orderHistory.create({
    data: {
      orderId: order4.id,
      userId: admin.id,
      action: 'Pedido em rota',
      fromStatus: 'AGUARDANDO_SAIDA',
      toStatus: 'EM_ROTA',
      details: `Vinculado à rota ${routeNumber} (${courier.name})`,
    },
  });

  const order5 = await createOrder({
    patient: joao,
    address: joao.addresses[0],
    items: [{ medication: medications[2], quantity: 2 }],
    status: 'ENTREGUE',
  });

  await prisma.order.update({
    where: { id: order5.id },
    data: { deliveredAt: new Date(), deliveredById: courier.id },
  });

  await prisma.orderHistory.create({
    data: {
      orderId: order5.id,
      userId: courier.id,
      action: 'Pedido entregue',
      toStatus: 'ENTREGUE',
      details: 'Entrega confirmada com PIN',
    },
  });

  console.log('✅ Pedidos de exemplo criados (order1..order5)');
  console.log('🌱 Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
