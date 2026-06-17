-- DropIndex
DROP INDEX IF EXISTS "Order_courierToken_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN IF EXISTS "courierToken";
