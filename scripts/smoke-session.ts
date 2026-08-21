/**
 * Smoke-test helper: creates a dev-DB user + session so pages can be checked
 * over real HTTP. Prints `EMAIL NAME TOKEN` lines for use with curl.
 *
 * Usage: npx tsx scripts/smoke-session.ts
 */
import { createHash, createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO = {
  nin: "00000000001",
  legalName: "Adaeze Ngozi Okafor",
  dateOfBirth: "1990-04-12",
  gender: "FEMALE",
  nationality: "Nigerian",
  stateOfOrigin: "Anambra",
  lga: "Idemili North",
} as const;

function generateId(prefix: string): string {
  const raw = randomBytes(10).toString("hex");
  return `${prefix}_${raw.slice(0, 20)}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function maskNin(nin: string): string {
  const digits = nin.replace(/\D/g, "");
  return `********${digits.slice(-4)}`;
}

function encryptSensitive(value: string): string {
  const key = createHash("sha256").update("smoke-only-key").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

async function setupVerified(): Promise<{ email: string; token: string }> {
  const email = `smoke_verified_${Date.now()}@example.com`;
  const user = await db.user.create({
    data: {
      id: generateId("usr"),
      email,
      passwordHash: sha256("unused-for-smoke"),
      status: "VERIFIED",
      profile: {
        create: {
          id: generateId("prf"),
          firstName: "Adaeze",
          lastName: "Okafor",
        },
      },
      userRoles: {
        create: {
          id: generateId("ur"),
          role: { connect: { name: "USER" } },
        },
      },
    },
  });

  const provider = await db.identityProvider.findUnique({ where: { code: "MOCK_NIN" } });
  if (!provider) throw new Error("MOCK_NIN provider not seeded");

  const profileId = generateId("idp");
  await db.identityProfile.create({
    data: {
      id: profileId,
      userId: user.id,
      providerId: provider.id,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      legalName: DEMO.legalName,
      dateOfBirth: new Date(DEMO.dateOfBirth),
      gender: DEMO.gender,
      nationality: DEMO.nationality,
      stateOfOrigin: DEMO.stateOfOrigin,
      lga: DEMO.lga,
    },
  });

  await db.identityCredential.create({
    data: {
      id: generateId("idc"),
      userId: user.id,
      profileId,
      kind: "NIN",
      maskedValue: maskNin(DEMO.nin),
      encryptedValue: encryptSensitive(DEMO.nin),
    },
  });

  await db.identityVerification.create({
    data: {
      id: generateId("idv"),
      userId: user.id,
      providerId: provider.id,
      reference: `ref-${Date.now()}`,
      verifiedAt: new Date(),
    },
  });

  await db.identityVerificationAttempt.create({
    data: {
      id: generateId("iva"),
      userId: user.id,
      providerId: provider.id,
      result: "SUCCESS",
      reference: `ref-${Date.now()}`,
    },
  });

  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: generateId("ses"),
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  return { email, token };
}

async function setupUnverified(): Promise<{ email: string; token: string }> {
  const email = `smoke_unverified_${Date.now()}@example.com`;
  const user = await db.user.create({
    data: {
      id: generateId("usr"),
      email,
      passwordHash: sha256("unused-for-smoke"),
      status: "UNVERIFIED",
      profile: {
        create: { id: generateId("prf"), firstName: "Smoke", lastName: "User" },
      },
      userRoles: {
        create: { id: generateId("ur"), role: { connect: { name: "USER" } } },
      },
    },
  });

  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: generateId("ses"),
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  return { email, token };
}

async function main() {
  const verified = await setupVerified();
  const unverified = await setupUnverified();
  console.log(`VERIFIED\t${verified.email}\t${verified.token}`);
  console.log(`UNVERIFIED\t${unverified.email}\t${unverified.token}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
