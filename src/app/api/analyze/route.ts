import { NextResponse } from "next/server";
import { analyzeMatch } from "@/lib/ai-analyzer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const homeId = searchParams.get("homeId");
    const awayId = searchParams.get("awayId");

    if (!homeId || !awayId) {
      return NextResponse.json(
        { error: "Both homeId and awayId query parameters are required." },
        { status: 400 }
      );
    }

    if (homeId === awayId) {
      return NextResponse.json(
        { error: "homeId and awayId must be different players." },
        { status: 400 }
      );
    }

    const analysis = await analyzeMatch(homeId, awayId);
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("GET /api/analyze error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze match.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
