"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { processGoogleQueueAction } from "@/app/dashboard/configuracoes/google-actions";
// One worker per workspace tab; the server lease serializes concurrent tabs.
export function GoogleAutomaticSync() {
    const router = useRouter();
    useEffect(() => {
        let stopped = false, running = false;
        async function flush() {
            if (stopped || running || document.visibilityState !== "visible" || !navigator.onLine) return;
            running = true;
            try { const result = await processGoogleQueueAction(); if (result.processed && !stopped) router.refresh(); } catch { /* Durable queue retries on next tick. */ }
            finally { running = false; }
        }
        const timer = window.setInterval(flush, 30000);
        const first = window.setTimeout(flush, 1200);
        window.addEventListener("online", flush); document.addEventListener("visibilitychange", flush);
        return () => { stopped = true; clearInterval(timer); clearTimeout(first); window.removeEventListener("online", flush); document.removeEventListener("visibilitychange", flush); };
    }, [router]);
    return null;
}
