/**
 * Auth email sender. Two modes:
 *
 * 1. **Resend mode** — when RESEND_API_KEY is set, sends a real email
 *    via Resend's HTTP API. Free tier covers ~3000 emails/month, plenty
 *    for a personal multi-user LifeOS.
 *
 * 2. **Console mode** — when RESEND_API_KEY is NOT set, logs the magic
 *    link to stdout. Useful for local dev or first-deploy testing where
 *    you don't want to wire up an email provider yet. Just check Coolify
 *    logs for the link, copy-paste into a browser.
 *
 * From-address defaults to Resend's `onboarding@resend.dev` which works
 * without domain verification. Override with LIFEOS_EMAIL_FROM if you've
 * verified your own domain in Resend.
 */

const RESEND_API = "https://api.resend.com/emails";

type AuthEmail = {
  to: string;
  subject: string;
  body: string;
  url: string;
};

export async function sendAuthEmail(opts: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.LIFEOS_EMAIL_FROM?.trim() ||
    "LifeOS <onboarding@resend.dev>";

  if (!apiKey) {
    // Dev fallback — logs the link so you can grab it manually
    console.log("=".repeat(70));
    console.log("LIFEOS AUTH EMAIL (no RESEND_API_KEY set, console-only)");
    console.log(`To:      ${opts.to}`);
    console.log(`Subject: ${opts.subject}`);
    console.log(`Link:    ${opts.url}`);
    console.log("=".repeat(70));
    return;
  }

  const html = renderHtml(opts);
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

function renderHtml(opts: { body: string; url: string }): string {
  return `<!DOCTYPE html>
<html><body style="background:#0a0a0c;color:#d8d8e6;font-family:Inter,system-ui,sans-serif;padding:40px 20px;text-align:center;margin:0">
<div style="max-width:480px;margin:0 auto;background:#16161d;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.04)">
  <div style="font-family:Fraunces,Georgia,serif;font-size:28px;color:#f0f0f6;margin-bottom:16px;letter-spacing:-0.02em">LifeOS</div>
  <p style="line-height:1.5;color:#b0b0c4;margin:16px 0 24px;font-size:15px">${escapeHtml(opts.body)}</p>
  <a href="${escapeAttr(opts.url)}" style="display:inline-block;background:#7dd3a8;color:#0a0a0c;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">Sign in to LifeOS</a>
  <p style="color:#5a5a6e;font-size:12px;margin:28px 0 0;line-height:1.5">This link expires in 5 minutes. If you didn&apos;t request this, you can safely ignore the email.</p>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
