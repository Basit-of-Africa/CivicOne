-- CreateEnum
CREATE TYPE "IdentityVerificationAttemptResult" AS ENUM ('SUCCESS', 'FAILED', 'REQUIRES_REVIEW', 'UNAVAILABLE');

-- AlterEnum
BEGIN;
CREATE TYPE "IdentityVerificationStatus_new" AS ENUM ('UNVERIFIED', 'VERIFICATION_PENDING', 'VERIFIED', 'VERIFICATION_FAILED', 'REQUIRES_MANUAL_REVIEW', 'SUSPENDED');
ALTER TABLE "public"."identity_profiles" ALTER COLUMN "verification_status" DROP DEFAULT;
ALTER TABLE "identity_profiles" ALTER COLUMN "verification_status" TYPE "IdentityVerificationStatus_new" USING ("verification_status"::text::"IdentityVerificationStatus_new");
ALTER TYPE "IdentityVerificationStatus" RENAME TO "IdentityVerificationStatus_old";
ALTER TYPE "IdentityVerificationStatus_new" RENAME TO "IdentityVerificationStatus";
DROP TYPE "public"."IdentityVerificationStatus_old";
ALTER TABLE "identity_profiles" ALTER COLUMN "verification_status" SET DEFAULT 'UNVERIFIED';
COMMIT;

-- AlterTable
ALTER TABLE "identity_profiles" ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "legal_name" VARCHAR(160),
ADD COLUMN     "lga" VARCHAR(80),
ADD COLUMN     "nationality" VARCHAR(80),
ADD COLUMN     "provider_id" VARCHAR(64),
ADD COLUMN     "state_of_origin" VARCHAR(80);

-- CreateTable
CREATE TABLE "identity_providers" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "is_mock" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_credentials" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "profile_id" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'NIN',
    "masked_value" VARCHAR(20) NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "reference" VARCHAR(120) NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verification_attempts" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "result" "IdentityVerificationAttemptResult" NOT NULL,
    "reason_code" VARCHAR(80),
    "reference" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_providers_code_key" ON "identity_providers"("code");

-- CreateIndex
CREATE INDEX "identity_credentials_profile_id_idx" ON "identity_credentials"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_credentials_user_id_kind_key" ON "identity_credentials"("user_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "identity_verifications_reference_key" ON "identity_verifications"("reference");

-- CreateIndex
CREATE INDEX "identity_verifications_user_id_idx" ON "identity_verifications"("user_id");

-- CreateIndex
CREATE INDEX "identity_verification_attempts_user_id_idx" ON "identity_verification_attempts"("user_id");

-- CreateIndex
CREATE INDEX "identity_verification_attempts_created_at_idx" ON "identity_verification_attempts"("created_at");

-- AddForeignKey
ALTER TABLE "identity_profiles" ADD CONSTRAINT "identity_profiles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "identity_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_credentials" ADD CONSTRAINT "identity_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_credentials" ADD CONSTRAINT "identity_credentials_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "identity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "identity_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "identity_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

