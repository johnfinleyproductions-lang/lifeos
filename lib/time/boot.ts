/**
 * Boot-time check of the time configuration. Imported once from
 * instrumentation.ts in the Node runtime.
 *
 * Next keeps the process alive when register() throws and answers every
 * request, the health check included, with a 500. That is loud but it is
 * not a stopped container, and a container that is up and useless gets
 * restarted into the same state. Exit instead, so the orchestrator sees a
 * failed boot and the log line is the last thing it printed.
 */
import { assertTimeConfig } from "./day";

try {
  assertTimeConfig();
} catch (err) {
  console.error(`[time] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
