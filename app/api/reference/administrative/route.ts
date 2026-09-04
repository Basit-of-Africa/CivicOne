import { NextResponse } from "next/server";
import { getAdministrativeLgas, getAdministrativeStates } from "@/server/ng-data";

export async function GET(request: Request) {
  const stateCode = new URL(request.url).searchParams.get("stateCode");
  if (stateCode) {
    return NextResponse.json({ stateCode, lgas: await getAdministrativeLgas(stateCode) });
  }
  return NextResponse.json({ states: await getAdministrativeStates() });
}