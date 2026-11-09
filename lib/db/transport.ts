/**
 * The real conversation with NoCodeBackend's data API.
 *
 * Three things here are not what NCB's own guide describes. Each was found
 * by testing the live service with two accounts, and each is the reason a
 * line below looks the way it does.
 *
 * 1. Only the session cookie is sent, never the database secret key.
 *    With the key attached, NCB treats a missing or expired session as an
 *    administrator and returns every person's rows. Without it, the same
 *    request is refused with a 401. Refused is the failure this app wants.
 *
 * 2. Every read URL is unique (the nonce added in plan.ts).
 *    NCB remembers the answer to a GET for about two seconds, keyed on the
 *    URL. A page that writes and then reads would otherwise show the old
 *    state, and with the secret key attached that remembered answer was
 *    handed to a different signed-in person asking the same question.
 *
 * 3. Rows are read with a list request even when one id is wanted.
 *    The read-by-id path is remembered the same way and has nowhere to put
 *    a nonce.
 *
 * On top of all three, query.ts refuses any row whose owner is not the
 * person signed in, so a change in NCB's behaviour fails loudly instead of
 * showing one person another's journal.
 */

import { NcbError, ncbConfig, ncbFetch } from "@/lib/ncb/config";
import { currentNcbSession, upstreamCookieHeader } from "@/lib/ncb/session";
import type { Transport, WireRow } from "./query";

type Json = Record<string, unknown>;

function parse(text: string): Json {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" ? (value as Json) : {};
  } catch {
    return {};
  }
}

function fail(action: string, status: number, body: Json): never {
  const said =
    (typeof body.error === "string" && body.error) ||
    (typeof body.message === "string" && body.message) ||
    `HTTP ${status}`;
  if (status === 401) {
    throw new NcbError("The NoCodeBackend session has ended.", 401, "unauthorized");
  }
  if (/duplicate entry/i.test(said)) {
    throw new NcbError(`${action}: that row already exists.`, status, "duplicate");
  }
  throw new NcbError(`${action}: ${said}`, status, "failed");
}

export async function ncbTransport(): Promise<Transport> {
  const session = await currentNcbSession();
  if (!session) {
    throw new NcbError("Nobody is signed in to NoCodeBackend.", 401, "unauthorized");
  }
  const { instance, dataUrl } = ncbConfig();
  const headers = {
    "Content-Type": "application/json",
    "X-Database-Instance": instance,
    Cookie: upstreamCookieHeader(session.token),
  };

  const url = (path: string, params: Array<[string, string]> = []) => {
    const query = new URLSearchParams();
    query.set("Instance", instance);
    for (const [key, value] of params) query.append(key, value);
    return `${dataUrl}/${path}?${query.toString()}`;
  };

  return {
    async ownerId() {
      return session.user.id;
    },

    async list(table, params) {
      const res = await ncbFetch(url(`read/${table}`, params), { method: "GET", headers });
      const body = parse(res.text);
      if (res.status !== 200 || !Array.isArray(body.data)) {
        fail(`Reading ${table}`, res.status, body);
      }
      const metadata = (body.metadata ?? {}) as Json;
      return { rows: body.data as WireRow[], hasMore: metadata.hasMore === true };
    },

    async create(table, record) {
      const res = await ncbFetch(url(`create/${table}`), {
        method: "POST",
        headers,
        body: JSON.stringify(record),
      });
      const body = parse(res.text);
      const id = Number(body.id);
      if (res.status !== 201 || !Number.isInteger(id) || id <= 0) {
        fail(`Writing to ${table}`, res.status, body);
      }
      return id;
    },

    async bulkUpdate(table, records) {
      const res = await ncbFetch(url(`bulk/update/${table}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ records }),
      });
      const body = parse(res.text);
      const summary = (body.summary ?? {}) as Json;
      if ((res.status !== 200 && res.status !== 207) || summary.succeeded !== records.length) {
        const first = Array.isArray(body.errors) ? (body.errors[0] as Json) : body;
        fail(`Updating ${table}`, res.status === 207 ? 409 : res.status, first ?? body);
      }
    },

    async bulkDelete(table, ids) {
      const res = await ncbFetch(url(`bulk/delete/${table}`), {
        method: "DELETE",
        headers,
        body: JSON.stringify({ ids }),
      });
      const body = parse(res.text);
      const summary = (body.summary ?? {}) as Json;
      if (res.status !== 200 || summary.deleted !== ids.length) {
        fail(`Deleting from ${table}`, res.status === 200 ? 409 : res.status, body);
      }
    },
  };
}
