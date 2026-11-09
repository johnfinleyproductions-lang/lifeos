# NoCodeBackend Account Component Setup

> **IMPORTANT:** Save this file as `setup_account.md` in your project root. This is a required integration artifact for every customer-facing app that uses NCB authentication.

The official Account component is a maintained, Clerk-style end-user experience. It includes Profile, password changes, active sessions, per-device and other-device sign-out, full sign-out, and a Billing tab that follows live monetization status. Do not substitute a hand-built profile menu unless the owner explicitly asks for a custom component.

## 1. Install

```bash
npm install @nocodebackend/account-react@latest
```

## 2. Server-only configuration

Ensure `.env.local` contains these values. `NCB_SECRET_KEY` is the key returned by `create_database`; never expose it through `NEXT_PUBLIC_*`.

```env
NCB_INSTANCE=54318_lifeos
NCB_SECRET_KEY=<the database secret key from create_database>
NCB_APP_URL=https://app.nocodebackend.com
NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
```

## 3. Create the secure local gateway

Create `app/api/ncb/account/[...path]/route.ts`:

```typescript
import { createNcbAccountProxy } from "@nocodebackend/account-react/next";

const proxy = createNcbAccountProxy({
  instance: process.env.NCB_INSTANCE!,
  secretKey: process.env.NCB_SECRET_KEY!,
  appUrl: process.env.NCB_APP_URL,
  authApiUrl: process.env.NCB_AUTH_API_URL,
});

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}

export const GET = handle;
export const POST = handle;
```

## 4. Render the trigger once

Create a client component such as `components/AccountButton.tsx`:

```tsx
"use client";

import { NCBAccount } from "@nocodebackend/account-react";

export function AccountButton() {
  return <NCBAccount />;
}
```

Render `<AccountButton />` exactly once in the signed-in navbar, header, or app shell.

## 5. Required task list

- [ ] Install `@nocodebackend/account-react`.
- [ ] Add the server-only environment values above.
- [ ] Create `app/api/ncb/account/[...path]/route.ts` with `createNcbAccountProxy`.
- [ ] Render `<AccountButton />` exactly once for signed-in users.
- [ ] Call the MCP `create_test_user` tool and sign in locally with that account.
- [ ] Complete the smoke tests below before declaring integration complete.

## 6. Required smoke tests

1. Signed out: no Account trigger is visible.
2. Sign in with the test user created through MCP: the Account trigger appears.
3. Open Account: Profile and Security load successfully through `/api/ncb/account/*`.
4. Update the display name, reload the page, and confirm it persists.
5. Open Security, confirm the current device is listed, then verify Sign out logs out this browser and requires a fresh login.
6. In a second browser profile, sign in as the same test user. From the first browser select **Sign out other devices**, then refresh the second browser and confirm it is forced to log in again.
7. Confirm browser code contains no NCB secret, database name, `user_id`, or provider customer ID.
8. If monetization is off, Billing is absent. In NoCodeBackend, open this database's **Enable Billing (Beta)** screen from its actions menu, enable billing there, and confirm Billing appears without a page reload; disable it again and confirm the tab disappears.

**Completion gate:** do not report the app as integrated until all six tasks and eight smoke tests are complete. In the final report, list the gateway route, trigger component, and layout/navbar file that renders it.


## ⛔ Required Account Component

Save the included third artifact as `setup_account.md` and complete every task and smoke test in it before declaring the customer app complete.

## 📋 Quick Checklist

1. ✅ Database created: 54318_lifeos
2. ⬜ Create `.env.local` with the configuration above (including `NCB_SECRET_KEY`)
3. ⬜ Create `app/api/auth/[...path]/route.ts` (Auth Proxy)
4. ⬜ Create `app/api/data/[...path]/route.ts` (Data Proxy)
5. ⬜ Install `@nocodebackend/account-react`, create `app/api/ncb/account/[...path]/route.ts`, and render `<NCBAccount />` in the main layout or navbar

## 🛠 Recommended Next Tools
- **setup_auth_providers**: Configure which auth methods are enabled (MANDATORY before building auth UI).
- **setup_r2_storage**: If the app requires file, image, avatar, or document uploads (or has `FILE` columns), call this tool to automatically create a dedicated Cloudflare R2 bucket with CORS policies. Reuses existing Cloudflare connections automatically or prompts for credentials if not yet connected.
- **install_account_component**: Already bundled above for this customer-facing app. It is a required deliverable, not an optional follow-up.
- **get_monetization_status**: If the app will sell subscriptions or paid tiers, direct the owner to that database's **Enable Billing (Beta)** screen to connect or reuse a provider account, then enable billing and manage plans. Use MCP billing tools only when the owner explicitly requests programmatic plan management after dashboard onboarding.

## 📚 Full Documentation

https://app.nocodebackend.com/swagger?instance=54318_lifeos
