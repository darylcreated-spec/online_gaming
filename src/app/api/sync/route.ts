import { syncLatest } from "@/lib/scraper";
import { createSingleGameSyncHandlers } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";

export const { POST, GET } = createSingleGameSyncHandlers({
  routeName: "/api/sync",
  lockKey: "sync_lotto_plus",
  syncFn: syncLatest
});
