import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { nextApplicationReference } from "@/modules/applications/reference";

describe("application reference", () => {
  it("generates CO-<year>-<6-digit> references", async () => {
    const year = new Date().getFullYear();
    const ref = await nextApplicationReference();
    expect(ref).toMatch(new RegExp(`^CO-${year}-\\d{6}$`));
  });

  it("increments sequentially", async () => {
    const a = await nextApplicationReference();
    const b = await nextApplicationReference();
    const seqA = Number(a.split("-")[2]);
    const seqB = Number(b.split("-")[2]);
    expect(seqB).toBe(seqA + 1);
  });

  afterAll(async () => {
    await db.$disconnect();
  });
});
