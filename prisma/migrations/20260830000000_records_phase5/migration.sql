-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecordVerificationStatus" AS ENUM ('UNVERIFIED', 'USER_ASSERTED', 'PENDING', 'VERIFIED', 'GOVERNMENT_VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('CIVICONE', 'USER_PROVIDED', 'GOVERNMENT_API', 'EXTERNAL_PROVIDER', 'ADMIN_VERIFIED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTITY', 'CERTIFICATES', 'LICENCES', 'BUSINESS', 'TAX', 'EDUCATION', 'PROPERTY', 'EMPLOYMENT', 'OTHER');

-- CreateTable
CREATE TABLE "government_service_records" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64),
    "record_type" VARCHAR(80) NOT NULL,
    "external_reference" VARCHAR(120),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "registration_date" TIMESTAMP(3),
    "verification_status" "RecordVerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "source" "RecordSource" NOT NULL DEFAULT 'CIVICONE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "government_service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_documents" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "record_id" VARCHAR(64),
    "category" "DocumentCategory" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "issuer" VARCHAR(160),
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "verification_status" "RecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source" "RecordSource" NOT NULL DEFAULT 'USER_PROVIDED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "government_service_records_application_id_key" ON "government_service_records"("application_id");

-- CreateIndex
CREATE INDEX "government_service_records_user_id_idx" ON "government_service_records"("user_id");

-- CreateIndex
CREATE INDEX "government_service_records_service_id_idx" ON "government_service_records"("service_id");

-- CreateIndex
CREATE INDEX "wallet_documents_user_id_idx" ON "wallet_documents"("user_id");

-- CreateIndex
CREATE INDEX "wallet_documents_category_idx" ON "wallet_documents"("category");

-- CreateIndex
CREATE INDEX "wallet_documents_record_id_idx" ON "wallet_documents"("record_id");

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_records" ADD CONSTRAINT "government_service_records_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_documents" ADD CONSTRAINT "wallet_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_documents" ADD CONSTRAINT "wallet_documents_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "government_service_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
