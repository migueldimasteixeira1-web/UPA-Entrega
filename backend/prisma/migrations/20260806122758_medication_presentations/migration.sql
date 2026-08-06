/*
  Warnings:

  - You are about to drop the column `unit` on the `Medication` table. All the data in the column will be lost.
  - You are about to drop the column `medicationId` on the `OrderItem` table. All the data in the column will be lost.
  - Added the required column `dosage` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicationPresentationId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_medicationId_fkey";

-- AlterTable
ALTER TABLE "Medication" DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "medicationId",
ADD COLUMN     "dosage" TEXT NOT NULL,
ADD COLUMN     "medicationPresentationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "MedicationPresentation" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidade',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationPresentation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MedicationPresentation" ADD CONSTRAINT "MedicationPresentation_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_medicationPresentationId_fkey" FOREIGN KEY ("medicationPresentationId") REFERENCES "MedicationPresentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
