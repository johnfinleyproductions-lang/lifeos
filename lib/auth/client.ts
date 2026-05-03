"use client";

/**
 * Browser-side Better Auth client.
 *
 * Adds the magic-link plugin so client code can call
 * `authClient.signIn.magicLink({ email })` from the /auth page form.
 */
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001",
  plugins: [magicLinkClient()],
});

export const { useSession, signOut, signIn } = authClient;
