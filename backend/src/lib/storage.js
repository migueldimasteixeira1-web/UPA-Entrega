import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

// MinIO self-hosted (S3-compatible) — não Postgres bytea, pensado pra não
// inflar o backup do banco e pra dar um caminho de migração direto pra S3
// real (mesma API) se um dia sair da VM única. Ver issue #38.
const BUCKET = process.env.S3_BUCKET || 'upa-entrega';

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  // MinIO não entende URL virtual-hosted-style (bucket.endpoint/...) por
  // padrão — precisa do estilo bucket-no-path (endpoint/bucket/...).
  forcePathStyle: true,
});

// MinIO não cria bucket sozinho. Chamado uma vez na subida do servidor
// (index.js) — idempotente, não falha se o bucket já existir. Retentativa
// curta porque no `docker compose up` o backend costuma subir antes do
// MinIO estar de fato aceitando conexões.
export async function ensureBucket(attempts = 5) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      try {
        await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      }
      return;
    } catch (error) {
      if (i === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// Redimensiona pro máximo de 1600px no lado maior, reencoda JPEG qualidade
// 80 (sharp já remove metadata/EXIF por padrão ao reencodar, a menos que
// .withMetadata() seja chamado — não é o caso aqui). Uma foto de celular de
// 4-6MB cai pra centenas de KB.
export async function compressImage(buffer) {
  return sharp(buffer)
    .rotate() // aplica a orientação do EXIF antes de removê-lo, senão a foto vira/deita
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function uploadImage(buffer, prefix) {
  const compressed = await compressImage(buffer);
  const key = `${prefix}/${randomUUID()}.jpg`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: compressed,
      ContentType: 'image/jpeg',
    })
  );

  return key;
}

// URL assinada de leitura, curta (5 min) — evita proxiar o arquivo inteiro
// pelo Node e evita gerar um link permanente que sobrevive fora de contexto.
export async function getSignedReadUrl(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
