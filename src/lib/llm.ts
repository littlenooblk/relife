import {
  StoryChoice,
  StoryRequest,
  StoryResponse,
  StoryTurn,
  createMockStoryResponse,
} from "./game";
import { HISTORICAL_CONTEXT, describePlace } from "./threeKingdoms";

type LlmMessage = {
  role: "system" | "user";
  content: string;
};

type LlmChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type LlmStoryPayload = {
  title: string;
  narrative: string;
  historicalContext: string;
  ageDelta: number;
  currentLocation?: string;
  relationships?: string[];
  traits?: string[];
  inventory?: string[];
  choices: StoryChoice[];
  risk: string;
};

export async function generateStoryTurn(
  request: StoryRequest,
): Promise<StoryResponse> {
  if (!process.env.LLM_API_KEY) {
    return createMockStoryResponse(request);
  }

  const payload = await callOpenAiCompatibleApi([
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(request),
    },
  ]);

  return applyLlmPayload(request, payload);
}

function buildSystemPrompt() {
  return `你是一个严谨的三国时期人生模拟游戏叙事引擎。

必须遵守：
1. 只叙述公元184年至280年的中国相关地区。
2. 地理、交通、政权归属和社会身份必须符合三国时期大体事实。
3. 玩家可以影响自己、家庭、乡里、军府或地方层面的命运，但不能轻易改变重大历史结局。
4. 叙事使用第二人称中文，克制、有历史质感，不玄幻，不出现现代物品。
5. 推荐选项必须是重大人生选择，且彼此方向明显不同。
6. 只返回 JSON，不要 Markdown，不要额外解释。

JSON 格式：
{
  "title": "不超过12字的节点标题",
  "narrative": "180到360字剧情",
  "historicalContext": "80到180字历史地理背景",
  "ageDelta": 1,
  "currentLocation": "地点名，可沿用当前位置",
  "relationships": ["新增或保留的重要关系"],
  "traits": ["新增或保留的人物特质"],
  "inventory": ["重要随身物或资源"],
  "choices": [
    {"id":"choice-1","label":"推荐选择文本","intent":"这个选择的真实意图"},
    {"id":"choice-2","label":"推荐选择文本","intent":"这个选择的真实意图"},
    {"id":"choice-3","label":"推荐选择文本","intent":"这个选择的真实意图"}
  ],
  "risk": "这个节点最重要的风险"
}

内置历史上下文：
${HISTORICAL_CONTEXT}`;
}

function buildUserPrompt(request: StoryRequest) {
  const { state, action } = request;
  const recentHistory = state.history
    .slice(-4)
    .map(
      (turn) =>
        `${turn.year}年，${turn.age}岁，${turn.title}：${turn.narrative}`,
    )
    .join("\n");

  return `玩家出生资料：
- 出生：${state.profile.birthYear}年${state.profile.birthMonth}月
- 出生地：${describePlace(state.profile.birthPlace)}
- 当前：${state.profile.currentYear}年，${state.profile.age}岁，人在${state.currentLocation}
- 当前大势：${state.profile.faction}
- 出身：${state.profile.socialClass}
- 关系：${state.relationships.join("、")}
- 特质：${state.traits.join("、")}
- 物品/资源：${state.inventory.join("、")}

最近经历：
${recentHistory || "暂无"}

玩家本次行动：
${action}

请生成下一段人生重大节点。`;
}

async function callOpenAiCompatibleApi(messages: LlmMessage[]) {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`LLM API 请求失败：${response.status} ${details}`);
  }

  const data = (await response.json()) as LlmChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM API 未返回内容");
  }

  return parseStoryPayload(content);
}

function parseStoryPayload(content: string): LlmStoryPayload {
  const parsed = JSON.parse(content) as Partial<LlmStoryPayload>;

  if (
    !parsed.title ||
    !parsed.narrative ||
    !parsed.historicalContext ||
    !Array.isArray(parsed.choices) ||
    parsed.choices.length < 2 ||
    !parsed.risk
  ) {
    throw new Error("LLM 返回的剧情 JSON 缺少必要字段");
  }

  return {
    title: parsed.title,
    narrative: parsed.narrative,
    historicalContext: parsed.historicalContext,
    ageDelta: clampNumber(parsed.ageDelta ?? 1, 1, 5),
    currentLocation: parsed.currentLocation,
    relationships: parsed.relationships,
    traits: parsed.traits,
    inventory: parsed.inventory,
    choices: parsed.choices.slice(0, 4).map((choice, index) => ({
      id: choice.id || `choice-${index + 1}`,
      label: choice.label,
      intent: choice.intent || choice.label,
    })),
    risk: parsed.risk,
  };
}

function applyLlmPayload(
  request: StoryRequest,
  payload: LlmStoryPayload,
): StoryResponse {
  const nextAge = Math.min(request.state.profile.age + payload.ageDelta, 80);
  const nextYear = Math.min(request.state.profile.birthYear + nextAge, 280);
  const turn: StoryTurn = {
    year: nextYear,
    age: nextAge,
    title: payload.title,
    narrative: payload.narrative,
    historicalContext: payload.historicalContext,
    choices: payload.choices,
    risk: payload.risk,
  };

  return {
    source: "llm",
    turn,
    state: {
      ...request.state,
      currentLocation: payload.currentLocation || request.state.currentLocation,
      profile: {
        ...request.state.profile,
        age: nextAge,
        currentYear: nextYear,
      },
      relationships: mergeStrings(request.state.relationships, payload.relationships),
      traits: mergeStrings(request.state.traits, payload.traits),
      inventory: mergeStrings(request.state.inventory, payload.inventory),
      history: [...request.state.history, turn],
    },
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

function mergeStrings(existing: string[], incoming?: string[]) {
  return Array.from(new Set([...existing, ...(incoming || [])])).slice(0, 12);
}
