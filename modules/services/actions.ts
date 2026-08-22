"use server";

import { withActionResult } from "@/server/errors";
import { saveService, unsaveService } from "./service";

export async function saveServiceAction(serviceId: string) {
  return withActionResult(() => saveService(serviceId));
}

export async function unsaveServiceAction(serviceId: string) {
  return withActionResult(() => unsaveService(serviceId));
}
