import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign in · LifeOS",
};

/**
 * /auth — sign-in landing page.
 *
 * If the visitor already has a valid session, bounce them to Today.
 * Otherwise show the magic-link form.
 *
 * Note: we read the real session via auth.api directly (NOT through
 * server-helpers' getAuthContext) so the fallback-user logic is bypassed
 * here. Otherwise users with the fallback env set would always be
 * redirected to / and could never see the sign-in form.
 */
export default async function AuthPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <AuthForm />
    </div>
  );
}
