-- CreateTable
CREATE TABLE "service_steps" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_steps_service_id_idx" ON "service_steps"("service_id");

-- AddForeignKey
ALTER TABLE "service_steps" ADD CONSTRAINT "service_steps_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
