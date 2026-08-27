import type { ApplicationStatus } from "@prisma/client";

export type MockProviderId = "MOCK_CAC" | "MOCK_PASSPORT" | "MOCK_DRIVER_LICENCE";

export interface ProviderContext {
  reference: string;
  providerRef: string | null;
  status: ApplicationStatus;
}

export interface ProviderOutcome {
  status: ApplicationStatus;
  note: string;
}

export interface MockProvider {
  id: MockProviderId;
  label: string;
  submit(ctx: ProviderContext): Promise<{ providerRef: string; note: string }>;
  advance(
    ctx: ProviderContext,
    opts?: { forceOutcome?: "APPROVED" | "REJECTED" },
  ): Promise<ProviderOutcome>;
}

const MockCACProvider: MockProvider = {
  id: "MOCK_CAC",
  label: "Corporate Affairs Commission (demo)",
  async submit(ctx) {
    return { providerRef: `CAC-${ctx.reference}`, note: "Application accepted by the CAC (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Company registration approved (demo)."
            : "Company registration rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your application is being reviewed by the CAC (demo)." };
    }
    return { status: "APPROVED", note: "Your company registration was approved (demo)." };
  },
};

const MockPassportProvider: MockProvider = {
  id: "MOCK_PASSPORT",
  label: "Nigeria Immigration Service (demo)",
  async submit(ctx) {
    return { providerRef: `NIS-${ctx.reference}`, note: "Passport application accepted (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Passport application approved (demo)."
            : "Passport application rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your passport application is under review (demo)." };
    }
    if (ctx.status === "UNDER_REVIEW") {
      return { status: "ACTION_REQUIRED", note: "Additional information may be requested (demo)." };
    }
    return { status: "APPROVED", note: "Your passport application was approved (demo)." };
  },
};

const MockDriverLicenceProvider: MockProvider = {
  id: "MOCK_DRIVER_LICENCE",
  label: "Federal Road Safety Corps (demo)",
  async submit(ctx) {
    return { providerRef: `FRSC-${ctx.reference}`, note: "Licence application accepted (demo)." };
  },
  async advance(ctx, opts) {
    if (opts?.forceOutcome) {
      return {
        status: opts.forceOutcome,
        note:
          opts.forceOutcome === "APPROVED"
            ? "Driver licence approved (demo)."
            : "Driver licence rejected (demo).",
      };
    }
    if (ctx.status === "SUBMITTED") {
      return { status: "UNDER_REVIEW", note: "Your licence application is under review (demo)." };
    }
    return { status: "APPROVED", note: "Your driver licence was approved (demo)." };
  },
};

const PROVIDERS: Record<MockProviderId, MockProvider> = {
  MOCK_CAC: MockCACProvider,
  MOCK_PASSPORT: MockPassportProvider,
  MOCK_DRIVER_LICENCE: MockDriverLicenceProvider,
};

export function getMockProvider(id: MockProviderId): MockProvider {
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(`Unknown mock provider: ${String(id)}`);
  }
  return provider;
}
