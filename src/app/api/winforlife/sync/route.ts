import { syncWinForLife } from "@/lib/scraper";
import { createSingleGameSyncHandlers } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";

export const { POST, GET } = createSingleGameSyncHandlers({
  routeName: "/api/winforlife/sync",
  lockKey: "sync_winforlife",
  syncFn: syncWinForLife
});
