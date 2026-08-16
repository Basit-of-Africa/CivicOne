"use server";

import { withActionResult } from "@/server/errors";
import {
  login,
  logout,
  register,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "./service";

export async function registerAction(input: unknown) {
  return withActionResult(() => register(input));
}

export async function loginAction(input: unknown) {
  return withActionResult(() => login(input));
}

export async function logoutAction() {
  return withActionResult(() => logout());
}

export async function verifyEmailAction(token: string) {
  return withActionResult(() => verifyEmail(token));
}

export async function requestPasswordResetAction(input: unknown) {
  return withActionResult(() => requestPasswordReset(input));
}

export async function resetPasswordAction(token: string, input: unknown) {
  return withActionResult(() => resetPassword(token, input));
}

export async function resendEmailVerificationAction() {
  return withActionResult(() => resendEmailVerification());
}
