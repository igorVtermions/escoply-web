import "server-only";
import { after } from "next/server";
import { flushGoogleQueue } from "./automatic";
// Called only by authenticated mutations. Queue is durable; local saves never depend on Google.
export function scheduleGoogleSync() {
    after(async () => { try { await flushGoogleQueue(); } catch { /* Persisted queue retries when workspace is open. */ } });
}
