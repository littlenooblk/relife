import { NextResponse } from "next/server";
import { createNewLife } from "@/lib/game";
import { generateOpeningLife } from "@/lib/llm";

export async function POST() {
  try {
    const state = await generateOpeningLife();
    return NextResponse.json({ state, source: "llm" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      state: createNewLife(),
      source: "mock",
      error: error instanceof Error ? error.message : "开局生成失败",
    });
  }
}
