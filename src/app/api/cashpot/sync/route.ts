import { syncCashPot } from "@/lib/scraper";
import { createSingleGameSyncHandlers } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";

export const { POST, GET } = createSingleGameSyncHandlers({
  routeName: "/api/cashpot/sync",
  lockKey: "sync_cashpot",
  syncFn: syncCashPot
});
