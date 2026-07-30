-- CreateTable
CREATE TABLE "DailyCounter" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyCounter_scope_dateKey_key" ON "DailyCounter"("scope", "dateKey");
