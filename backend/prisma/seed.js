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
    name: 'Administrador SEDOM',
    email: 'admin@sedom.local',
    password: 'Admin@123',
    role: 'ADMIN',
  });

  await ensureUser({
    name: 'Operador SEDOM',
    email: 'operador@sedom.local',
    password: 'Operador@123',
    role: 'OPERADOR',
  });

  const courier = await ensureUser({
    name: 'Carlos Entregador',
    email: 'entregador@sedom.local',
    password: 'Entregador@123',
    role: 'ENTREGADOR',
  });

  // Medicamento (princípio ativo/nome) com uma ou mais apresentações
  // (dosagem + unidade) — Amoxicilina é o exemplo real de por que essa
  // separação existe: mesma substância, três dosagens diferentes, sem
  // recadastrar o nome pra cada uma.
  const catalog = [
    { name: 'Dipirona', presentations: [{ dosage: '500mg', unit: 'comprimido' }] },
    { name: 'Paracetamol', presentations: [{ dosage: '750mg', unit: 'comprimido' }] },
    { name: 'Ibuprofeno', presentations: [{ dosage: '600mg', unit: 'comprimido' }] },
    { name: 'Losartana', presentations: [{ dosage: '50mg', unit: 'comprimido' }] },
    { name: 'Metformina', presentations: [{ dosage: '850mg', unit: 'comprimido' }] },
    { name: 'Omeprazol', presentations: [{ dosage: '20mg', unit: 'cápsula' }] },
    {
      name: 'Amoxicilina',
      presentations: [
        { dosage: '250mg', unit: 'cápsula' },
        { dosage: '500mg', unit: 'cápsula' },
        { dosage: '875mg', unit: 'comprimido' },
      ],
    },
    { name: 'Salbutamol', presentations: [{ dosage: 'Spray', unit: 'frasco' }] },
    // Elenco ampliado de medicamentos comuns em unidades de saúde,
    // compatíveis com continuidade de tratamento/doenças crônicas — base
    // pra entrega domiciliar além dos itens de exemplo acima.
    { name: 'Ácido acetilsalicílico', presentations: [{ dosage: '100mg', unit: 'comprimido' }] },
    { name: 'Aciclovir', presentations: [{ dosage: '200mg', unit: 'comprimido' }] },
    {
      name: 'Albendazol',
      presentations: [
        { dosage: '400mg', unit: 'comprimido' },
        { dosage: '40mg/mL', unit: 'frasco' },
      ],
    },
    { name: 'Alendronato de sódio', presentations: [{ dosage: '70mg', unit: 'comprimido' }] },
    {
      name: 'Alopurinol',
      presentations: [
        { dosage: '100mg', unit: 'comprimido' },
        { dosage: '300mg', unit: 'comprimido' },
      ],
    },
    { name: 'Amitriptilina', presentations: [{ dosage: '25mg', unit: 'comprimido' }] },
    {
      name: 'Amlodipino',
      presentations: [
        { dosage: '5mg', unit: 'comprimido' },
        { dosage: '10mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Atenolol',
      presentations: [
        { dosage: '25mg', unit: 'comprimido' },
        { dosage: '50mg', unit: 'comprimido' },
        { dosage: '100mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Azitromicina',
      presentations: [
        { dosage: '500mg', unit: 'comprimido' },
        { dosage: '40mg/mL', unit: 'frasco' },
      ],
    },
    { name: 'Biperideno', presentations: [{ dosage: '2mg', unit: 'comprimido' }] },
    { name: 'Bromexina', presentations: [{ dosage: '0,8mg/mL', unit: 'frasco' }] },
    { name: 'Butilbrometo de escopolamina', presentations: [{ dosage: '10mg', unit: 'comprimido' }] },
    { name: 'Captopril', presentations: [{ dosage: '25mg', unit: 'comprimido' }] },
    {
      name: 'Carbamazepina',
      presentations: [
        { dosage: '200mg', unit: 'comprimido' },
        { dosage: '20mg/mL', unit: 'frasco' },
      ],
    },
    { name: 'Carbonato de cálcio', presentations: [{ dosage: '500mg', unit: 'comprimido' }] },
    { name: 'Carbonato de lítio', presentations: [{ dosage: '300mg', unit: 'comprimido' }] },
    {
      name: 'Cefalexina',
      presentations: [
        { dosage: '500mg', unit: 'cápsula' },
        { dosage: '50mg/mL', unit: 'frasco' },
      ],
    },
    { name: 'Cetirizina', presentations: [{ dosage: '10mg', unit: 'comprimido' }] },
    { name: 'Clomipramina', presentations: [{ dosage: '25mg', unit: 'comprimido' }] },
    { name: 'Clopidogrel', presentations: [{ dosage: '75mg', unit: 'comprimido' }] },
    { name: 'Clotrimazol', presentations: [{ dosage: '500mg', unit: 'comprimido' }] },
    { name: 'Colchicina', presentations: [{ dosage: '0,5mg', unit: 'comprimido' }] },
    {
      name: 'Dexametasona',
      presentations: [
        { dosage: '4mg', unit: 'comprimido' },
        { dosage: '0,5mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Dexclorfeniramina',
      presentations: [
        { dosage: '2mg', unit: 'comprimido' },
        { dosage: '0,4mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Diazepam',
      presentations: [
        { dosage: '5mg', unit: 'comprimido' },
        { dosage: '10mg', unit: 'comprimido' },
      ],
    },
    { name: 'Diclofenaco sódico', presentations: [{ dosage: '50mg', unit: 'comprimido' }] },
    { name: 'Digoxina', presentations: [{ dosage: '0,25mg', unit: 'comprimido' }] },
    { name: 'Dimenidrinato', presentations: [{ dosage: '50mg', unit: 'comprimido' }] },
    {
      name: 'Doxazosina',
      presentations: [
        { dosage: '2mg', unit: 'comprimido' },
        { dosage: '4mg', unit: 'comprimido' },
      ],
    },
    { name: 'Doxiciclina', presentations: [{ dosage: '100mg', unit: 'comprimido' }] },
    {
      name: 'Enalapril',
      presentations: [
        { dosage: '5mg', unit: 'comprimido' },
        { dosage: '10mg', unit: 'comprimido' },
        { dosage: '20mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Espironolactona',
      presentations: [
        { dosage: '25mg', unit: 'comprimido' },
        { dosage: '100mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Etinilestradiol + levonorgestrel',
      presentations: [{ dosage: '0,03mg + 0,15mg', unit: 'comprimido' }],
    },
    { name: 'Fenitoína', presentations: [{ dosage: '100mg', unit: 'cápsula' }] },
    {
      name: 'Fenobarbital',
      presentations: [
        { dosage: '100mg', unit: 'comprimido' },
        { dosage: '40mg/mL', unit: 'gotas' },
      ],
    },
    { name: 'Finasterida', presentations: [{ dosage: '5mg', unit: 'comprimido' }] },
    { name: 'Fluconazol', presentations: [{ dosage: '150mg', unit: 'cápsula' }] },
    { name: 'Fluoxetina', presentations: [{ dosage: '20mg', unit: 'cápsula' }] },
    { name: 'Furosemida', presentations: [{ dosage: '40mg', unit: 'comprimido' }] },
    {
      name: 'Gliclazida',
      presentations: [
        { dosage: '30mg', unit: 'comprimido' },
        { dosage: '60mg', unit: 'comprimido' },
      ],
    },
    { name: 'Glibenclamida', presentations: [{ dosage: '5mg', unit: 'comprimido' }] },
    {
      name: 'Haloperidol',
      presentations: [
        { dosage: '1mg', unit: 'comprimido' },
        { dosage: '5mg', unit: 'comprimido' },
        { dosage: '2mg/mL', unit: 'gotas' },
      ],
    },
    { name: 'Hidroclorotiazida', presentations: [{ dosage: '25mg', unit: 'comprimido' }] },
    { name: 'Ivermectina', presentations: [{ dosage: '6mg', unit: 'comprimido' }] },
    { name: 'Lactulose', presentations: [{ dosage: '667mg/mL', unit: 'frasco' }] },
    {
      name: 'Levodopa + benserazida',
      presentations: [
        { dosage: '100mg + 25mg', unit: 'comprimido' },
        { dosage: '200mg + 50mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Loratadina',
      presentations: [
        { dosage: '10mg', unit: 'comprimido' },
        { dosage: '1mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Mebendazol',
      presentations: [
        { dosage: '100mg', unit: 'comprimido' },
        { dosage: '20mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Metildopa',
      presentations: [
        { dosage: '250mg', unit: 'comprimido' },
        { dosage: '500mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Metoclopramida',
      presentations: [
        { dosage: '10mg', unit: 'comprimido' },
        { dosage: '4mg/mL', unit: 'gotas' },
      ],
    },
    {
      name: 'Metronidazol',
      presentations: [
        { dosage: '250mg', unit: 'comprimido' },
        { dosage: '400mg', unit: 'comprimido' },
      ],
    },
    { name: 'Naproxeno', presentations: [{ dosage: '500mg', unit: 'comprimido' }] },
    { name: 'Nitrofurantoína', presentations: [{ dosage: '100mg', unit: 'cápsula' }] },
    // Concentração real é em UI/mL (unidades internacionais), não mg/mL —
    // "mg/mL" não faz sentido pra nistatina. Unidade cadastral continua
    // "frasco" (mesmo padrão de Bromexina/Prednisolona), a concentração em
    // UI vai só no texto livre da dosagem.
    { name: 'Nistatina', presentations: [{ dosage: '100.000 UI/mL', unit: 'frasco' }] },
    { name: 'Noretisterona', presentations: [{ dosage: '0,35mg', unit: 'comprimido' }] },
    {
      name: 'Ondansetrona',
      presentations: [
        { dosage: '4mg', unit: 'comprimido' },
        { dosage: '8mg', unit: 'comprimido' },
      ],
    },
    { name: 'Permetrina', presentations: [{ dosage: '10mg/mL', unit: 'frasco' }] },
    { name: 'Prednisolona', presentations: [{ dosage: '3mg/mL', unit: 'frasco' }] },
    {
      name: 'Prednisona',
      presentations: [
        { dosage: '5mg', unit: 'comprimido' },
        { dosage: '20mg', unit: 'comprimido' },
      ],
    },
    { name: 'Prometazina', presentations: [{ dosage: '25mg', unit: 'comprimido' }] },
    { name: 'Propranolol', presentations: [{ dosage: '40mg', unit: 'comprimido' }] },
    { name: 'Sertralina', presentations: [{ dosage: '50mg', unit: 'comprimido' }] },
    {
      name: 'Simeticona',
      presentations: [
        { dosage: '40mg', unit: 'comprimido' },
        { dosage: '75mg/mL', unit: 'gotas' },
      ],
    },
    {
      name: 'Sinvastatina',
      presentations: [
        { dosage: '20mg', unit: 'comprimido' },
        { dosage: '40mg', unit: 'comprimido' },
      ],
    },
    {
      name: 'Sulfametoxazol + trimetoprima',
      presentations: [
        { dosage: '400mg + 80mg', unit: 'comprimido' },
        { dosage: '40mg/mL + 8mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Valproato de sódio',
      presentations: [
        { dosage: '250mg', unit: 'cápsula' },
        { dosage: '50mg/mL', unit: 'frasco' },
      ],
    },
    {
      name: 'Varfarina sódica',
      presentations: [
        { dosage: '2,5mg', unit: 'comprimido' },
        { dosage: '5mg', unit: 'comprimido' },
      ],
    },
  ];

  // Indexado por "Nome Dosagem" (ex.: "Amoxicilina 500mg") pra criar os
  // pedidos de exemplo abaixo sem depender de índice de array frágil.
  const presentationsByLabel = {};
  for (const med of catalog) {
    let medication = await prisma.medication.findFirst({ where: { name: med.name } });
    if (!medication) {
      medication = await prisma.medication.create({ data: { name: med.name } });
    }
    for (const p of med.presentations) {
      let presentation = await prisma.medicationPresentation.findFirst({
        where: { medicationId: medication.id, dosage: p.dosage },
      });
      if (!presentation) {
        presentation = await prisma.medicationPresentation.create({
          data: { medicationId: medication.id, dosage: p.dosage, unit: p.unit },
        });
      }
      presentationsByLabel[`${med.name} ${p.dosage}`] = { ...presentation, medicationName: med.name };
    }
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
    cpf: '11122233396',
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
    cpf: '55566677720',
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
        deliveryPinHash: await hashPassword(generateDeliveryPin()),
        status: 'PEDIDO_RECEBIDO',
        createdById: admin.id,
        items: {
          create: items.map((item) => ({
            medicationPresentationId: item.presentation.id,
            medicationName: item.presentation.medicationName,
            dosage: item.presentation.dosage,
            unit: item.presentation.unit,
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
    items: [{ presentation: presentationsByLabel['Dipirona 500mg'], quantity: 2 }],
    status: 'PEDIDO_RECEBIDO',
  });

  const order2 = await createOrder({
    patient: joao,
    address: joao.addresses[0],
    items: [
      { presentation: presentationsByLabel['Losartana 50mg'], quantity: 1 },
      { presentation: presentationsByLabel['Omeprazol 20mg'], quantity: 1 },
    ],
    status: 'SEPARADO',
    internalNotes: 'Receita anexada no prontuário',
  });

  const order3 = await createOrder({
    patient: maria,
    address: maria.addresses[0],
    items: [{ presentation: presentationsByLabel['Paracetamol 750mg'], quantity: 1 }],
    status: 'AGUARDANDO_SAIDA',
  });

  const order4 = await createOrder({
    patient: joao,
    address: joao.addresses[1],
    // Exemplo real da dosagem duplicada que motivou a separação: mesma
    // Amoxicilina, apresentação diferente do order5 abaixo.
    items: [{ presentation: presentationsByLabel['Amoxicilina 500mg'], quantity: 1 }],
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
    items: [{ presentation: presentationsByLabel['Amoxicilina 875mg'], quantity: 2 }],
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
