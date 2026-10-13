import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signOut } = authClient;

export function signInWithGoogle(callbackURL = "/design") {
  return authClient.signIn.social({
    provider: "google",
    callbackURL,
    errorCallbackURL: `/signin?error=google&callbackURL=${encodeURIComponent(callbackURL)}`,
  });
}
