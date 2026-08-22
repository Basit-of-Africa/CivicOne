import { z } from "zod";

export const serviceIdSchema = z.object({
  serviceId: z
    .string()
    .trim()
    .min(1, "Service is required")
    .regex(/^srv_[A-Z0-9]+$/, "Invalid service identifier"),
});

export type ServiceIdInput = z.infer<typeof serviceIdSchema>;
