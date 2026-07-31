import multer from 'multer';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB antes da compressão (issues #38/#39)
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function singleImageUpload(fieldName) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error('Formato de imagem inválido. Envie JPEG, PNG ou WebP.'));
      }
      cb(null, true);
    },
  }).single(fieldName);

  // multer não propaga erro pro error handler global quando usado assim —
  // sem isso, um arquivo grande demais ou de formato errado vira 500 em vez
  // de um 400 com mensagem legível.
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Erro ao processar o arquivo' });
      }
      next();
    });
  };
}

export const handlePrescriptionUpload = singleImageUpload('prescription');
export const handleDeliveryProofUpload = singleImageUpload('proof');

// POST /api/orders passa a ser multipart/form-data (arquivo + os demais
// campos como um único campo "data" em JSON) — reconstrói req.body a partir
// dele pra validateBody(createOrderSchema) continuar funcionando sem mudar
// de forma. confirm-delivery não precisa disso: "pin" é o único campo além
// do arquivo, então multer já entrega req.body.pin como texto direto.
export function parseMultipartOrderBody(req, res, next) {
  try {
    req.body = req.body?.data ? JSON.parse(req.body.data) : {};
    next();
  } catch {
    res.status(400).json({ error: 'Dados do pedido inválidos' });
  }
}
