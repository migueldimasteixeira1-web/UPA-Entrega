import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminEmail = 'admin@upa.local';
  const adminPassword = 'Admin@123';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Administrador UPA',
        email: adminEmail,
        password: await hashPassword(adminPassword),
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin criado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('ℹ️  Admin já existe');
  }

  const operatorEmail = 'operador@upa.local';
  const existingOperator = await prisma.user.findUnique({ where: { email: operatorEmail } });

  if (!existingOperator) {
    await prisma.user.create({
      data: {
        name: 'Operador UPA',
        email: operatorEmail,
        password: await hashPassword('Operador@123'),
        role: 'OPERADOR',
      },
    });
    console.log(`✅ Operador criado: ${operatorEmail} / Operador@123`);
  }

  const medications = [
    { name: 'Dipirona 500mg', description: 'Analgésico e antitérmico', unit: 'comprimido', quantity: 200, minStock: 30 },
    { name: 'Paracetamol 750mg', description: 'Analgésico e antitérmico', unit: 'comprimido', quantity: 150, minStock: 25 },
    { name: 'Ibuprofeno 600mg', description: 'Anti-inflamatório', unit: 'comprimido', quantity: 80, minStock: 20 },
    { name: 'Losartana 50mg', description: 'Anti-hipertensivo', unit: 'comprimido', quantity: 120, minStock: 20 },
    { name: 'Metformina 850mg', description: 'Antidiabético', unit: 'comprimido', quantity: 100, minStock: 15 },
    { name: 'Omeprazol 20mg', description: 'Protetor gástrico', unit: 'cápsula', quantity: 90, minStock: 15 },
    { name: 'Amoxicilina 500mg', description: 'Antibiótico', unit: 'cápsula', quantity: 8, minStock: 10 },
    { name: 'Salbutamol Spray', description: 'Broncodilatador', unit: 'frasco', quantity: 15, minStock: 5 },
  ];

  for (const med of medications) {
    const exists = await prisma.medication.findFirst({ where: { name: med.name } });
    if (!exists) {
      await prisma.medication.create({ data: med });
    }
  }

  console.log('✅ Medicamentos de exemplo criados');
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
