-- O PIN deixa de ser guardado em texto puro. Pedidos existentes (dados de
-- seed/dev) recebem um hash vazio, que nunca vai bater com nenhum PIN real
-- em confirmDelivery — aceitável neste momento porque não há dado de
-- produção real ainda (ver issue #37).
ALTER TABLE "Order" DROP COLUMN "deliveryPin";
ALTER TABLE "Order" ADD COLUMN "deliveryPinHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ALTER COLUMN "deliveryPinHash" DROP DEFAULT;
