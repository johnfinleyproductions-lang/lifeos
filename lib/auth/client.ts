"use client";

/**
 * Browser-side Better Auth client.
 *
 * Same secret + cookies as EC, so calling `useSession()` here will return
 * the user that signed in over at EC's modal.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001",
});

export const { useSession, signOut } = authClient;
