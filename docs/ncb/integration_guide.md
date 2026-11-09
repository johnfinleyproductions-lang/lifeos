# NoCodeBackend MCP Integration Guide

When the user asks to build an app using **NoCodeBackend (NCB)**, follow this guide EXACTLY.

---

## GOLDEN PATH (MANDATORY WORKFLOW)

1. **Create Database**
   - Use the `create_database` MCP tool.

2. **Fetch Integration Prompts**
   - IMMEDIATELY call `get_integration_prompts`.
   - Save the prompts as three files in your project root:
     - `auth_proxy_setup.md` - Authentication setup
     - `data_proxy_setup.md` - Data proxy and CRUD setup
     - `setup_account.md` - Required official Account component setup and smoke tests

3. **Configure Auth Providers (MANDATORY)**
   - Use the `setup_auth_providers` MCP tool.
   - You MUST call this to check/set which auth methods (email, google, emailOTP) and `public_signup` are enabled.
   - **DYNAMIC UI RULE:** When building your auth UI, ALWAYS fetch the enabled providers from `/api/auth-providers` first. Do NOT hardcode buttons. If `public_signup` is false, hide the signup form. If a provider is false, hide its button. This ensures the app instantly reflects changes made in the admin portal.

4. **Install Account Component (AUTOMATIC AND MANDATORY)**
   - `setup_auth_providers` automatically includes the `install_account_component` package in its response. Install that package in the same coding turn; do not wait for the user to request it or spend another MCP call.
   - Use `install_account_component` directly when adding the maintained component to an existing app. Use `generate_account_component` only when the app owner explicitly needs a custom UI instead.
   - The maintained component is NoCodeBackend's pre-built end-user Account experience. Do not substitute Clerk or the NoCodeBackend dashboard identity.
   - The Profile and Security sections are required regardless of monetization or plans. Billing is implemented once but dynamically appears only while monetization is enabled.
   - Place the component (avatar trigger) in your app's main layout or navbar header.

5. **Set RLS Policies (if app has public or shared pages)**
   - Use the `set_rls_policy` MCP tool for each table that needs non-private access.
   - Example: building a booking app? → `set_rls_policy({ database, table: "event_types", policy: "public_scoped_read" })`
   - The policy MUST be set before the public data route will serve data for that table.

6. **Post-Provisioning Testing & Setup (REQUIRED for customer-facing apps)**
   - **Account smoke test:** After implementing `setup_account.md`, call `create_test_user` to register an end user, sign in locally with those credentials, then complete the Profile, Security, sign-out, and dynamic-Billing checks in `setup_account.md`. Do not declare the app complete until this passes.
   - **Need mock data?** Use `insert_mock_data` to push JSON arrays directly to the DB without dealing with SQL escaping.
   - **Need to test the data API?** Use `query_data_api` to mock a frontend `fetch` request.
   - **Need email delivery?** Use `configure_smtp` to set up the global email server.
   - **Need to audit security?** Use `get_rls_policies` to verify table permissions.
   - **Plan-limit UX test (when limits are configured):** create records as a signed-in test user until a configured table reaches its allowance. Verify the customer UI shows the API's plan-limit message and a clear View plans/Upgrade action, never a generic “cannot create record” or database error.

7. **Offer Built-in Monetization (Dashboard-first when the app has paid tiers, subscriptions, or usage limits)**
   - Ask the app owner: **"Would you like to use NoCodeBackend's built-in payments? It handles provider connection, plans, checkout, subscription synchronization, tier limits, and the Account Billing UI without custom payment backend work."**
   - If they opt in, direct them to the database-specific **Enable Billing (Beta)** screen at `https://app.nocodebackend.com/databases/<database>/monetization` to connect their provider, enable billing, and create/manage plans. This owner-controlled dashboard workflow is the default; do not perform payment onboarding or create plans through MCP automatically.
   - The owner completes **Stripe Connect** for that database before paid plans; they may reuse an account from another database or connect a separate account.
   - The Account component is already installed independently of billing. It shows Profile and Security always; its Billing tab appears automatically when the owner enables monetization in the dashboard and disappears immediately if they disable it.
   - Only if the owner explicitly asks for advanced MCP-managed billing after dashboard onboarding may you call `get_monetization_status`, `enable_monetization`, `create_monetization_plan`, and `set_monetization_plan_limits`. Never create duplicate external provider catalogs.
   - If the owner declines, leave monetization disabled; the Account component still provides Profile and Security, while its Billing tab remains hidden.

8. **Schema & API Persistence (MANDATORY)**
   - Call the `get_schema` and `get_swagger` MCP tools.
   - Save their JSON outputs to `schema.json` and `swagger.json` in the root of the project.
   - You MUST use these files as your definitive reference for all database and API structures to avoid hallucinations.


---

## Environment Variables (SERVER-ONLY)

These variables MUST exist in `.env.local`  
They MUST NEVER be exposed to the browser.

```env
NCB_INSTANCE=<instance_name>
NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
NCB_APP_URL=https://app.nocodebackend.com
NCB_SECRET_KEY=<auto_generated_secret_key>
```

**Rules**
- ALWAYS read from `process.env`
- NEVER hardcode
- NEVER use `NEXT_PUBLIC_*`
- `NCB_SECRET_KEY` is auto-generated when you create a database and is used server-side by the data proxy to authenticate with NCB
- The secret key must NEVER be sent to the browser — it is only used in server-side proxy routes

---

## Authentication: Session Cookies

NCB uses session cookies for authentication. The cookies are:
- `better-auth.session_token` - The session token
- `better-auth.session_data` - The session data

**NCB accepts cookies in BOTH formats:**
- `better-auth.session_token` (without prefix)
- `__Secure-better-auth.session_token` (with prefix)

NCB dynamically finds any cookie ending with `better-auth.session_token`.

### Cookie Flow

1. **User logs in** → NCB returns cookies with `__Secure-` prefix
2. **Auth proxy transforms** → Strips prefix for localhost compatibility
3. **Browser stores** → Cookies as `better-auth.*` (no prefix)
4. **Forwarding to NCB** → Forward cookies (either format works)
5. **NCB validates** → Authenticates user and enforces RLS

---

## Auth Proxy (REQUIRED)

**Path:** `app/api/auth/[...path]/route.ts`

### Responsibilities
- Proxy requests to `NCB_AUTH_API_URL`
- Transform cookies for localhost compatibility
- Handle sign-out gracefully

### Cookie Handling

**When RECEIVING cookies (Set-Cookie from NCB):**
- Strip `__Secure-` and `__Host-` prefixes (browsers reject on localhost)
- Strip `Domain` attribute
- Strip `Secure` flag
- Set `SameSite=Lax`

**When FORWARDING cookies (to NCB):**
- Extract `better-auth.session_token` and `better-auth.session_data`
- Send AS-IS - no prefix transformation needed

```typescript
// Extract auth cookies to forward to NCB
function extractAuthCookies(cookieHeader: string): string {
  if (!cookieHeader) return "";
  
  const cookies = cookieHeader.split(";");
  const authCookies: string[] = [];
  
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith("better-auth.session_token=") || 
        trimmed.startsWith("better-auth.session_data=")) {
      authCookies.push(trimmed);
    }
  }
  
  return authCookies.join("; ");
}
```

---

## Data Proxies (REQUIRED)

NCB uses **two data routes** for different access patterns. Both routes send `NCB_SECRET_KEY` as a Bearer token server-side for authentication — this key is NEVER exposed to the browser.

### 1. Authenticated Data Proxy: `app/api/data/[...path]/route.ts`

For admin panels / dashboards. Session ALWAYS required.

- **Private** (default): Normal RLS — `WHERE user_id = session_user`
- **`shared_read`**: Reads return all admins' records. Writes still inject user_id.
- **`shared_readwrite`**: No user_id filter for any operation.
- **`public_*`**: Treated as private on the authenticated route.
- The backend reads `ncba_rls_config` and decides — no custom headers needed from the proxy.

### 2. Public Data Proxy: `app/api/public-data/[...path]/route.ts`

For public pages (booking pages, storefronts, blogs). No session required.

- Does NOT forward session cookies (backend sees an anonymous request)
- Only allows operations permitted by the table's `public_*` policy in `ncba_rls_config`
- For **scoped** policies: validates `owner_id` is present (query param or body)
- Only allows GET (read) and POST (create) — no PUT/DELETE
- The backend reads the policy + checks for session absence to decide access

### RLS Policy Types

#### Shared (authenticated route — cross-admin access)

| Policy | Auth | Read | Write | user_id Filter |
|--------|------|------|-------|----------------|
| *(default)* | Yes | Own | Own | `WHERE user_id = session_user` |
| `shared_read` | Yes | All | Own | No filter for reads |
| `shared_readwrite` | Yes | All | All | No filter |

#### Public (public route — anonymous access)

| Policy | Auth | Read | Write | Scoped |
|--------|------|------|-------|--------|
| `public_read` | No | All | No | No |
| `public_write` | No | No | Yes | No |
| `public_readwrite` | No | All | Yes | No |
| `public_scoped_read` | No | Owner's | No | Yes |
| `public_scoped_write` | No | No | Yes (to owner) | Yes |
| `public_scoped_readwrite` | No | Owner's | Yes (to owner) | Yes |

**Combining:** You can combine one `shared_*` + one `public_*` (stored comma-separated). E.g. `"shared_read,public_scoped_read"` gives admins cross-visibility AND anonymous scoped reads.

### How the Backend Decides (no custom headers needed)

The backend reads `ncba_rls_config` on every request and checks:

1. **Session cookies present?** → Authenticated path
   - `shared_read` → skip user_id filter for reads
   - `shared_readwrite` → skip user_id filter entirely
   - Otherwise → normal RLS: `WHERE user_id = session_user`

2. **No session cookies?** → Public path
   - Has `public_*` policy? → Allow (scoped uses `owner_id` from query/body)
   - No public policy? → Reject 401

**No custom headers (`X-NCB-*`) are sent by the proxy. The backend is fully self-contained.**

### ⚡ Setting Policies (IMPORTANT)

Use the `set_rls_policy` MCP tool to configure table access. **You MUST call this whenever the app needs non-private access.**

| App Requirement | Policy to Set |
|----------------|---------------|
| Public page reads data (blog, marketplace) | `public_read` |
| Public page reads ONE admin's data (booking page) | `public_scoped_read` |
| Public form creates records for an admin (booking form) | `public_scoped_write` |
| Public form creates unscoped records (feedback) | `public_write` |
| Team feature — admins see each other's data | `shared_read` |
| Combined: team + public on same table | `shared_read,public_scoped_read` |
| Private (DEFAULT — no action needed) | `private` |

Call `set_rls_policy` with: `{ database, table, policy }`

---

## Session Handling

### Getting Current User
```typescript
async function getSessionUser(cookieHeader: string): Promise<{ id: string } | null> {
  const authCookies = extractAuthCookies(cookieHeader);
  if (!authCookies) return null;
  
  const url = \`\${CONFIG.authApiUrl}/get-session?instance=\${CONFIG.instance}\`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Database-Instance": CONFIG.instance,
      "Cookie": authCookies,
    },
  });
  
  if (res.ok) {
    const data = await res.json();
    return data.user || null;
  }
  return null;
}
```

### Sign-Out Best Practices
- Always return 200 (even if upstream errors)
- Always clear cookies: `better-auth.session_token` and `better-auth.session_data`
- Clear UI state immediately on sign-out

### Password Recovery (MANDATORY with Email+Password)

If the app implements email sign-in/sign-up, it MUST also implement:
- Forgot password request via `POST /api/auth/request-password-reset`
- Reset password submit via `POST /api/auth/reset-password`

The forgot-password request MUST send:
- `redirectTo: `${window.location.origin}/reset-password``

The app MUST include:
- `app/reset-password/page.tsx` that reads `token` and `db` from query params

Use `/request-password-reset` as the canonical route.

---

## Required File Structure

```
/
├── .env.local
│   NCB_INSTANCE=...
│   NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
│   NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
│   NCB_APP_URL=https://app.nocodebackend.com
│   NCB_SECRET_KEY=<auto_generated_secret_key>
│
├── lib/ncb-utils.ts                          ← Shared utilities
├── app/api/auth/[...path]/route.ts           ← Auth proxy
├── app/api/auth-providers/route.ts           ← Fetch enabled providers
├── app/api/data/[...path]/route.ts           ← Authenticated data proxy (session RLS)
├── app/api/public-data/[...path]/route.ts    ← Public data proxy (policy-based)
├── app/auth/callback/page.tsx                ← OAuth callback (if using OAuth)
├── app/reset-password/page.tsx               ← Password reset form page
```

---

## Common Failures

❌ Calling `api.nocodebackend.com` from frontend  
❌ Skipping auth proxy  
❌ Missing `Instance` param  
❌ Missing `credentials: "include"` in frontend fetch calls (authenticated routes)  
❌ Letting client control `user_id`
❌ Not stripping `__Secure-` prefix when SETTING cookies (browser rejects on localhost)
❌ Not clearing UI state immediately on sign-out
❌ Not injecting `user_id` from session on CREATE (authenticated route)
❌ Hardcoding auth buttons without fetching `/api/auth-providers` first
❌ Confusing `email` (password-based) with `emailOTP` (passwordless) — they are separate providers
❌ Showing Email OTP form when `providers.emailOTP` is not `true`
❌ Using `/api/data/` for public pages (use `/api/public-data/` instead)
❌ Forgetting `owner_id` for scoped public policies
❌ Exposing `NCB_SECRET_KEY` to the browser (use `NEXT_PUBLIC_*` prefix) — it must stay server-side only
❌ Missing `NCB_SECRET_KEY` in `.env.local` — data API calls will fail without it

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Session lost on page refresh | Cookie not sent to NCB | Ensure `credentials: "include"` and cookies are extracted properly |
| `get-session` returns null | Cookies not being forwarded | Check `extractAuthCookies()` function |
| `user_id` is null on created records | Proxy not injecting user_id | Use `getSessionUser()` and inject on CREATE |
| User can set any user_id | Proxy trusts client payload | Strip `user_id` from all client payloads |
| Records not showing for user | user_id not set correctly | Verify proxy injects user_id |
| User sees ALL records | RLS not enforced | Ensure session cookies are forwarded properly |
| Data API returns 401 | Missing or invalid NCB_SECRET_KEY | Verify `NCB_SECRET_KEY` in `.env.local` matches the auto-generated key |
| Secret key visible in network tab | Key sent from client-side | Ensure all data calls go through server-side proxy routes, never call NCB directly from browser |

---

## Pre-Flight Checklist

### Auth Proxy Setup
- [ ] Database created
- [ ] `get_integration_prompts` used
- [ ] Auth proxy created with cookie handling
- [ ] `/api/auth-providers` endpoint created
- [ ] UI fetches providers on load and ONLY renders enabled methods
- [ ] Email+Password works (if `email` provider enabled)
- [ ] Google OAuth works (if `google` provider enabled)
- [ ] Email OTP send+verify works (if `emailOTP` provider enabled)
- [ ] Cookies persist on refresh
- [ ] `/api/auth/get-session` works
- [ ] Sign-out clears cookies AND UI state
- [ ] OAuth callback page exists (if using OAuth)

### Data Proxy Setup
- [ ] Data proxy created
- [ ] Data proxy forwards session cookies
- [ ] Data proxy validates session for operations
- [ ] Data proxy injects `user_id` on create
- [ ] Data proxy strips `user_id` from client payloads
- [ ] RLS is working - user only sees their own records
- [ ] Every customer create flow parses non-2xx JSON and displays the API's `error` text
- [ ] Exhausting a configured plan allowance shows a friendly plan-limit message plus View plans/Upgrade—not a generic create or database error

### RLS Policy Setup (if app has public/shared pages)
- [ ] Identified which tables need public or shared access
- [ ] Called `set_rls_policy` for each table that needs non-private access
- [ ] Public data proxy created at `/api/public-data/[...path]`
- [ ] Verified public routes work for configured tables