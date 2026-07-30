import { beforeEach } from 'vitest';
import prisma from '../src/lib/prisma.js';

// Lista de tabelas vem do próprio Postgres, não hardcoded — um model novo no
// schema.prisma passa a ser truncado automaticamente, sem precisar lembrar
// de atualizar esta lista (foi exatamente esquecer disso, com DailyCounter,
// que mascarou um bug real de verdade num teste que "passava").
beforeEach(async () => {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  const quoted = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
});
