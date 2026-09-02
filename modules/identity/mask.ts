/**
 * Mask a NIN for display. Only the last four digits are ever shown.
 */
export function maskNin(nin: string): string {
  const digits = nin.replace(/\D/g, "");
  if (digits.length < 4) return "********";
  return `********${digits.slice(-4)}`;
}
