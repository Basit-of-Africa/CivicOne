-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'READY', 'PAYMENT_PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('ELIGIBILITY', 'FORM', 'DOCUMENTS', 'REVIEW', 'PAYMENT', 'SUBMISSION', 'STATUS', 'COMPLETION');

-- CreateTable
CREATE TABLE "service_workflows" (
    "id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_workflow_steps" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_id" VARCHAR(64) NOT NULL,
    "type" "WorkflowStepType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_form_definitions" (
    "id" VARCHAR(64) NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" VARCHAR(64) NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "workflow_id" VARCHAR(64) NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "current_step_id" VARCHAR(64),
    "data" JSONB,
    "provider_ref" VARCHAR(80),
    "provider_name" VARCHAR(40),
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "form_key" VARCHAR(80) NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "value" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "from_status" "ApplicationStatus",
    "to_status" "ApplicationStatus" NOT NULL,
    "reason" VARCHAR(255),
    "actor_user_id" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" VARCHAR(64) NOT NULL,
    "application_id" VARCHAR(64) NOT NULL,
    "form_key" VARCHAR(80) NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_counters" (
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    CONSTRAINT "application_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_workflows_service_id_key" ON "service_workflows"("service_id");

-- CreateIndex
CREATE INDEX "service_workflow_steps_workflow_id_idx" ON "service_workflow_steps"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_form_definitions_key_key" ON "service_form_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_key" ON "applications"("reference");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_service_id_idx" ON "applications"("service_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_answers_application_id_form_key_field_key_key" ON "application_answers"("application_id", "form_key", "field_key");

-- CreateIndex
CREATE INDEX "application_answers_application_id_idx" ON "application_answers"("application_id");

-- CreateIndex
CREATE INDEX "application_status_history_application_id_idx" ON "application_status_history"("application_id");

-- CreateIndex
CREATE INDEX "application_documents_application_id_idx" ON "application_documents"("application_id");

-- AddForeignKey
ALTER TABLE "service_workflows" ADD CONSTRAINT "service_workflows_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_workflow_steps" ADD CONSTRAINT "service_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "service_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "service_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
