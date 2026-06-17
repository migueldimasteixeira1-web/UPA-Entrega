-- Remove legacy delivery fields and simplify DeliveryService enum to UBER_FLASH only

UPDATE "Order"
SET "deliveryService" = 'UBER_FLASH'
WHERE "deliveryService" IS NOT NULL
  AND "deliveryService"::text NOT IN ('UBER_FLASH');

ALTER TABLE "Order" DROP COLUMN IF EXISTS "deliveryServiceOther";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "pinSkipReason";

CREATE TYPE "DeliveryService_new" AS ENUM ('UBER_FLASH');

ALTER TABLE "Order"
  ALTER COLUMN "deliveryService" TYPE "DeliveryService_new"
  USING (
    CASE
      WHEN "deliveryService" IS NULL THEN NULL
      ELSE 'UBER_FLASH'::"DeliveryService_new"
    END
  );

DROP TYPE "DeliveryService";
ALTER TYPE "DeliveryService_new" RENAME TO "DeliveryService";
