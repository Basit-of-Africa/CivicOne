-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('GUIDANCE', 'EXTERNAL', 'INTEGRATED');

-- CreateEnum
CREATE TYPE "JurisdictionLevel" AS ENUM ('FEDERAL', 'STATE', 'LOCAL');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_providers" (
    "id" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "abbreviation" VARCHAR(40),
    "description" TEXT,
    "official_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "level" "JurisdictionLevel" NOT NULL,
    "parent_id" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "category_id" VARCHAR(64) NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "jurisdiction_id" VARCHAR(64) NOT NULL,
    "mode" "ServiceMode" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility" TEXT,
    "estimated_time" VARCHAR(120),
    "official_url" VARCHAR(512),
    "search_text" TEXT NOT NULL DEFAULT '',
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requirements" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_document" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_faqs" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_fees" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "frequency" VARCHAR(40),
    "note" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_related" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "related_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_related_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_services" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_slug_key" ON "service_providers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE INDEX "jurisdictions_parent_id_idx" ON "jurisdictions"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_category_id_idx" ON "services"("category_id");

-- CreateIndex
CREATE INDEX "services_provider_id_idx" ON "services"("provider_id");

-- CreateIndex
CREATE INDEX "services_jurisdiction_id_idx" ON "services"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "services_is_active_idx" ON "services"("is_active");

-- CreateIndex
CREATE INDEX "service_requirements_service_id_idx" ON "service_requirements"("service_id");

-- CreateIndex
CREATE INDEX "service_faqs_service_id_idx" ON "service_faqs"("service_id");

-- CreateIndex
CREATE INDEX "service_fees_service_id_idx" ON "service_fees"("service_id");

-- CreateIndex
CREATE INDEX "service_related_related_id_idx" ON "service_related"("related_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_related_service_id_related_id_key" ON "service_related"("service_id", "related_id");

-- CreateIndex
CREATE INDEX "saved_services_service_id_idx" ON "saved_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_services_user_id_service_id_key" ON "saved_services"("user_id", "service_id");

-- AddForeignKey
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_faqs" ADD CONSTRAINT "service_faqs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fees" ADD CONSTRAINT "service_fees_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_related" ADD CONSTRAINT "service_related_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_related" ADD CONSTRAINT "service_related_related_id_fkey" FOREIGN KEY ("related_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_services" ADD CONSTRAINT "saved_services_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_services" ADD CONSTRAINT "saved_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search support (generated tsvector over denormalised search text)
ALTER TABLE services ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', search_text)) STORED;
CREATE INDEX services_search_vector_idx ON services USING GIN (search_vector);

