/**
 * The cookie that turns the Experiments section on. Shared by the server
 * helper that reads it and the Settings control that writes it, so it lives
 * apart from anything that imports next/headers.
 */
export const EXPERIMENTS_COOKIE = "lifeos_experiments";
