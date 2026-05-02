import type { auth } from "./server";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type AppUser = AuthSession["user"] & {
  fullName: string;
  avatarUrl: string | null;
};
