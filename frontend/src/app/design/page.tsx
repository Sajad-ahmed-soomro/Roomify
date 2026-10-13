import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Design studio · Roomify",
};

export default function DesignPage() {
  return (
    <Suspense>
      <Studio />
    </Suspense>
  );
}
