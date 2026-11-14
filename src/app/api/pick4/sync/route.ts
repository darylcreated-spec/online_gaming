import { syncPick4 } from "@/lib/scraper";
import { createSingleGameSyncHandlers } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";

export const { POST, GET } = createSingleGameSyncHandlers({
  routeName: "/api/pick4/sync",
  lockKey: "sync_pick4",
  syncFn: syncPick4
});
