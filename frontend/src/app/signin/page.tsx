import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@/components/SignIn";

export const metadata: Metadata = {
  title: "Sign in · Roomify",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
