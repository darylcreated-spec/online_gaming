import { NextRequest, NextResponse } from "next/server";
import {
  computeCrossEngineConsensus,
  ConsensusGameKey,
  lockConsensusPreDrawSnapshot
} from "@/lib/consensus_engine";
import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/cron_auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_GAMES: ConsensusGameKey[] = [
  "cashpot",
  "lotto-plus",
  "win-for-life",
  "play-whe",
  "pick4",
  "fast-cash"
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = (searchParams.get("game") || "cashpot") as ConsensusGameKey;
    if (!VALID_GAMES.includes(game)) {
      return NextResponse.json(
        { success: false, error: `Unsupported game "${game}".` },
        { status: 400 }
      );
    }

    const data = await computeCrossEngineConsensus(game);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/consensus GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to compute Cross-Engine Consensus." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const game = (body.game || "cashpot") as ConsensusGameKey;
    const force = Boolean(body.force);
    if (!VALID_GAMES.includes(game)) {
      return NextResponse.json(
        { success: false, error: `Unsupported game "${game}".` },
        { status: 400 }
      );
    }

    if (force && !isAuthorizedCronRequest(request, body.secret)) {
      return unauthorizedResponse("Admin CRON_SECRET required to overwrite an existing pre-draw lock.");
    }

    const result = await lockConsensusPreDrawSnapshot(game, force);
    return NextResponse.json(
      {
        success: true,
        alreadyLocked: result.alreadyLocked,
        lockedRecord: result.lockedRecord,
        data: result.consensus,
        message: result.alreadyLocked
          ? `Draw #${result.lockedRecord.targetDrawNumber} was already locked pre-draw.`
          : `Locked pre-draw snapshot for ${result.consensus.gameName} Draw #${result.lockedRecord.targetDrawNumber}.`
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/consensus POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to lock pre-draw snapshot." },
      { status: 500 }
    );
  }
}
