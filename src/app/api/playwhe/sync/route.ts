import { syncPlayWhe } from "@/lib/scraper";
import { createSingleGameSyncHandlers } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";

export const { POST, GET } = createSingleGameSyncHandlers({
  routeName: "/api/playwhe/sync",
  lockKey: "sync_playwhe",
  syncFn: syncPlayWhe,
  postSyncHook: async () => {
    try {
      const { verifyPlayWhePredictions, generatePlayWhePredictions, getLocalDateString } = await import("@/lib/predictions");
      await verifyPlayWhePredictions();
      const todayStr = getLocalDateString();
      for (const slot of ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]) {
        await generatePlayWhePredictions(todayStr, slot);
      }
    } catch (e) {
      console.warn("[API /api/playwhe/sync] Background prediction update notice:", e);
    }
  }
});
