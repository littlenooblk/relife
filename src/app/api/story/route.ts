import { NextResponse } from "next/server";
import { StoryRequest, createMockStoryResponse, normalizeAction } from "@/lib/game";
import { generateStoryTurn } from "@/lib/llm";

export async function POST(request: Request) {
  let storyRequest: StoryRequest | null = null;

  try {
    const body = (await request.json()) as Partial<StoryRequest>;
    const action = normalizeAction(body.action || "");

    if (!body.state || !action) {
      return NextResponse.json(
        { error: "缺少游戏状态或玩家行动" },
        { status: 400 },
      );
    }

    storyRequest = {
      state: body.state,
      action,
    };

    const response = await generateStoryTurn(storyRequest);
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);

    if (storyRequest) {
      return NextResponse.json(createMockStoryResponse(storyRequest));
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "剧情生成失败" },
      { status: 500 },
    );
  }
}
