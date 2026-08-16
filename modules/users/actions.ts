"use server";

import { withActionResult } from "@/server/errors";
import {
  changePassword,
  updateContact,
  updatePersonalInfo,
} from "./service";

export async function updatePersonalInfoAction(input: unknown) {
  return withActionResult(() => updatePersonalInfo(input));
}

export async function updateContactAction(input: unknown) {
  return withActionResult(() => updateContact(input));
}

export async function changePasswordAction(input: unknown) {
  return withActionResult(() => changePassword(input));
}
