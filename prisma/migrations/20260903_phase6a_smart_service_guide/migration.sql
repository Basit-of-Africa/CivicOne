-- Phase 6A: Smart Service Guide
-- Add agency_url/agency_label to services, create office_locations, service_analytics, notifications

-- AlterTable: Add agency_url and agency_label to services
ALTER TABLE "services" ADD COLUMN "agency_url" VARCHAR(512),
ADD COLUMN "agency_label" VARCHAR(80);

-- CreateTable: office_locations
CREATE TABLE "office_locations" (
    "id" VARCHAR(64) NOT NULL,
    "agency" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "lga" VARCHAR(80),
    "address" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" VARCHAR(32),
    "email" VARCHAR(320),
    "hours" VARCHAR(200),
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: service_analytics
CREATE TABLE "service_analytics" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "service_id" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(512),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: office_locations
CREATE INDEX "office_locations_agency_idx" ON "office_locations"("agency");
CREATE INDEX "office_locations_state_idx" ON "office_locations"("state");

-- CreateIndex: service_analytics
CREATE INDEX "service_analytics_user_id_idx" ON "service_analytics"("user_id");
CREATE INDEX "service_analytics_service_id_idx" ON "service_analytics"("service_id");
CREATE INDEX "service_analytics_action_idx" ON "service_analytics"("action");
CREATE INDEX "service_analytics_created_at_idx" ON "service_analytics"("created_at");

-- CreateIndex: notifications
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey: service_analytics
ALTER TABLE "service_analytics" ADD CONSTRAINT "service_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_analytics" ADD CONSTRAINT "service_analytics_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
