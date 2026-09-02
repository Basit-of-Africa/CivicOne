"use server";

import { withActionResult } from "@/server/errors";
import { verifyIdentity } from "./service";

export async function verifyIdentityAction(input: unknown) {
  return withActionResult(() => verifyIdentity(input));
}
