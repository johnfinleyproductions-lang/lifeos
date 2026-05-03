/**
 * Profile registry — the list of users LifeOS knows about.
 *
 * For "household / shared device" use cases where you don't want to deal
 * with login flows but still want each person's data isolated. Pick a
 * profile once, cookie remembers it, all data ties to that user_id.
 *
 * To add a new profile:
 *   1. Add an entry below
 *   2. Re-deploy
 *   3. Visit /pick-profile, click the new card
 *   4. First-pick auto-provisions a user + workspace if missing
 *
 * Slugs are URL-safe ids used in cookies. Emails should match an existing
 * user record OR will be created on first selection.
 */

export type ProfileConfig = {
  slug: string;
  name: string;
  email: string;
  initial: string; // single letter for the avatar circle
  accentClass: string; // tailwind class for the accent ring
};

export const PROFILES: ProfileConfig[] = [
  {
    slug: "john",
    name: "John",
    email: "johnfinleyproductions@gmail.com",
    initial: "J",
    accentClass: "text-accent-violet bg-accent-violet/15 border-accent-violet/30",
  },
  {
    slug: "emily",
    name: "Emily",
    email: "emilyholt13@gmail.com",
    initial: "E",
    accentClass: "text-accent-rose bg-accent-rose/15 border-accent-rose/30",
  },
];

export function getProfile(slug: string): ProfileConfig | undefined {
  return PROFILES.find((p) => p.slug === slug);
}
