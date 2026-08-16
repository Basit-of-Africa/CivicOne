import type { Metadata } from "next";
import { FindServiceExplorer } from "@/components/app/find-service-explorer";

export const metadata: Metadata = {
  title: "Find a Service",
};

export default function FindServicePage() {
  return <FindServiceExplorer />;
}
