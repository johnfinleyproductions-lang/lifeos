/**
 * Better Auth's HTTP endpoints for LifeOS.
 *
 * In Phase 1 we don't expose any provider/login UI — this handler exists
 * so that signOut(), session validation, and cookie refresh work normally
 * from the browser. Anything signin-related is delegated to EC's modal.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

export const { GET, POST } = toNextJsHandler(auth.handler);
