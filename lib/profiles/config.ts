/**
 * Profile registry — the household LifeOS knows about.
 *
 * Read from the LIFEOS_PROFILES environment variable at runtime. It used to
 * be a hardcoded array in this file, which meant two things: adding or
 * removing a person was a code change and a redeploy, and real email
 * addresses of real people lived in the repository.
 *
 * The value is a JSON array:
 *
 *   LIFEOS_PROFILES='[
 *     {"slug":"sam","name":"Sam","email":"sam@example.com","accent":"violet"},
 *     {"slug":"ada","name":"Ada","email":"ada@example.com","accent":"rose"}
 *   ]'
 *
 * Only slug, name and email are required. `accent` falls back to the next
 * colour in the palette, `initial` to the first letter of the name.
 *
 * Fails closed. If the variable is unset or malformed in production the
 * registry is empty, the picker shows nobody, and the reason is logged. An
 * unconfigured deploy is locked rather than open, which is the same rule the
 * household code follows.
 */

export type ProfileConfig = {
  slug: string;
  name: string;
  email: string;
  initial: string; // single letter for the avatar square
  accentClass: string; // tailwind classes for the accent ring
};

/**
 * The environment supplies an accent NAME and this maps it to classes.
 *
 * It cannot supply the classes directly: Tailwind scans the source to decide
 * what to compile, so a class string that exists only in an env var is never
 * generated and the avatar comes out unstyled. These literals are what make
 * the classes real.
 *
 * accent-spot is deliberately absent. The fluorescent ink means live, today,
 * now, and handing it to a person's avatar would spend that meaning.
 */
const ACCENT_CLASS = {
  violet: "text-accent-violet bg-accent-violet/15 border-accent-violet/30",
  rose: "text-accent-rose bg-accent-rose/15 border-accent-rose/30",
  sky: "text-accent-sky bg-accent-sky/15 border-accent-sky/30",
  green: "text-accent-green bg-accent-green/15 border-accent-green/30",
  gold: "text-accent-gold bg-accent-gold/15 border-accent-gold/30",
} as const;

export type AccentName = keyof typeof ACCENT_CLASS;
const ACCENT_NAMES = Object.keys(ACCENT_CLASS) as AccentName[];

// Lowercase letters, digits and hyphens. This is the value that ends up in a
// signed cookie and is matched against on every request.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PROFILES = 12;

export type ProfilesResult = { profiles: ProfileConfig[]; error: string | null };

const firstChar = (s: string) => [...s][0] ?? "";

function fail(error: string): ProfilesResult {
  return { profiles: [], error };
}

/**
 * Exported so it can be exercised directly, without booting the app.
 * Rejects the whole list on the first bad entry rather than quietly dropping
 * one person: a profile that silently vanishes is worse than a loud refusal.
 */
export function parseProfiles(raw: string | null | undefined): ProfilesResult {
  const text = (raw ?? "").trim();
  if (!text) return fail("LIFEOS_PROFILES is not set.");

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail(
      'LIFEOS_PROFILES is not valid JSON. It should be an array, e.g. [{"slug":"sam","name":"Sam","email":"sam@example.com"}]',
    );
  }

  if (!Array.isArray(data)) return fail("LIFEOS_PROFILES must be a JSON array.");
  if (data.length === 0) {
    return fail("LIFEOS_PROFILES is an empty array, so nobody could sign in.");
  }
  if (data.length > MAX_PROFILES) {
    return fail(
      `LIFEOS_PROFILES lists ${data.length} profiles and the maximum is ${MAX_PROFILES}.`,
    );
  }

  const profiles: ProfileConfig[] = [];
  const seenSlugs = new Set<string>();
  const seenEmails = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const at = `LIFEOS_PROFILES profile ${i + 1}`;
    const entry = data[i];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return fail(`${at} is not an object.`);
    }
    const e = entry as Record<string, unknown>;

    const slug = typeof e.slug === "string" ? e.slug.trim().toLowerCase() : "";
    if (!SLUG_RE.test(slug)) {
      return fail(
        `${at} has slug ${JSON.stringify(e.slug)}. Use 1 to 32 lowercase letters, digits or hyphens.`,
      );
    }
    if (seenSlugs.has(slug)) return fail(`${at} repeats the slug "${slug}".`);

    const name = typeof e.name === "string" ? e.name.trim() : "";
    if (!name || name.length > 40) {
      return fail(`${at} ("${slug}") needs a name of 1 to 40 characters.`);
    }

    const email = typeof e.email === "string" ? e.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) {
      return fail(`${at} ("${slug}") needs a valid email address.`);
    }
    if (seenEmails.has(email)) {
      // Two profiles sharing an address would resolve to one user row and
      // silently share a log.
      return fail(`${at} ("${slug}") reuses an email address another profile already has.`);
    }

    let accent: AccentName;
    if (e.accent === undefined || e.accent === null || e.accent === "") {
      accent = ACCENT_NAMES[i % ACCENT_NAMES.length];
    } else if (
      typeof e.accent === "string" &&
      (ACCENT_NAMES as string[]).includes(e.accent)
    ) {
      accent = e.accent as AccentName;
    } else {
      return fail(
        `${at} ("${slug}") has accent ${JSON.stringify(e.accent)}. Use one of: ${ACCENT_NAMES.join(", ")}.`,
      );
    }

    const given = typeof e.initial === "string" ? e.initial.trim() : "";
    const initial = firstChar(
      (firstChar(given) || firstChar(name) || "?").toUpperCase(),
    );

    seenSlugs.add(slug);
    seenEmails.add(email);
    profiles.push({ slug, name, email, initial, accentClass: ACCENT_CLASS[accent] });
  }

  return { profiles, error: null };
}

/**
 * Local development only. Keeps `pnpm dev` working without anyone having to
 * put real addresses anywhere. Never used when NODE_ENV is production.
 */
const DEV_PROFILES: ProfileConfig[] = [
  {
    slug: "sample",
    name: "Sample",
    email: "sample@example.invalid",
    initial: "S",
    accentClass: ACCENT_CLASS.violet,
  },
  {
    slug: "second",
    name: "Second",
    email: "second@example.invalid",
    initial: "2",
    accentClass: ACCENT_CLASS.rose,
  },
];

// Resolved on first use rather than at import, so the build does not read an
// environment the build does not have, and so the value comes from the
// running container.
let cached: ProfilesResult | null = null;

function load(): ProfilesResult {
  if (cached) return cached;

  const raw = process.env.LIFEOS_PROFILES;
  if (!raw || !raw.trim()) {
    if (process.env.NODE_ENV === "production") {
      cached = fail("LIFEOS_PROFILES is not set, so no profile can be picked.");
    } else {
      console.warn(
        "[profiles] LIFEOS_PROFILES is not set. Using the development sample. Set it to run against real profiles.",
      );
      cached = { profiles: DEV_PROFILES, error: null };
    }
  } else {
    cached = parseProfiles(raw);
  }

  if (cached.error) console.error(`[profiles] ${cached.error}`);
  return cached;
}

export function getProfiles(): ProfileConfig[] {
  return load().profiles;
}

export function profilesError(): string | null {
  return load().error;
}

export function getProfile(slug: string): ProfileConfig | undefined {
  return load().profiles.find((p) => p.slug === slug);
}
