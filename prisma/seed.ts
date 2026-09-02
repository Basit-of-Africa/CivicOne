import { PrismaClient, RoleName } from "@prisma/client";
import { generateId } from "../lib/id";

const prisma = new PrismaClient();

const roles: Array<{
  name: RoleName;
  label: string;
  description: string;
}> = [
  {
    name: RoleName.USER,
    label: "User",
    description: "A registered CivicOne user (default role).",
  },
  {
    name: RoleName.PROFESSIONAL,
    label: "Professional",
    description:
      "A verified professional providing services through the platform.",
  },
  {
    name: RoleName.SERVICE_ADMIN,
    label: "Service Administrator",
    description:
      "Manages public services and service catalogue content. No identity or user data access.",
  },
  {
    name: RoleName.CONTENT_ADMIN,
    label: "Content Administrator",
    description:
      "Manages public-facing content and documentation. No identity or user data access.",
  },
  {
    name: RoleName.IDENTITY_ADMIN,
    label: "Identity Administrator",
    description:
      "Manages identity verification workflows. No financial or content access.",
  },
  {
    name: RoleName.SUPER_ADMIN,
    label: "Super Administrator",
    description: "Platform-wide operational administration.",
  },
];

const providers: Array<{
  code: string;
  name: string;
  isMock: boolean;
  isActive: boolean;
}> = [
  {
    code: "MOCK_NIN",
    name: "Demo NIN provider (mock)",
    isMock: true,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding roles...");

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label, description: role.description },
      create: {
        id: generateId("rol"),
        name: role.name,
        label: role.label,
        description: role.description,
      },
    });
  }

  const count = await prisma.role.count();
  console.log(`Done. ${count} roles ready.`);

  console.log("Seeding identity providers...");

  for (const provider of providers) {
    await prisma.identityProvider.upsert({
      where: { code: provider.code },
      update: {
        name: provider.name,
        isMock: provider.isMock,
        isActive: provider.isActive,
      },
      create: {
        id: generateId("ipr"),
        code: provider.code,
        name: provider.name,
        isMock: provider.isMock,
        isActive: provider.isActive,
      },
    });
  }

  const providerCount = await prisma.identityProvider.count();
  console.log(`Done. ${providerCount} identity providers ready.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
