import {
  StoryChoice,
  StoryRequest,
  StoryResponse,
  StoryTurn,
  ENDING_SOON_TURN,
  TARGET_STORY_TURNS,
  advanceProfileTime,
  createMockStoryResponse,
  describeIntentProfile,
  updateIntentProfile,
} from "./game";
import {
  HISTORICAL_CONTEXT,
  describePlace,
  getFactionForYearAndPlace,
} from "./threeKingdoms";

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
  timeDeltaDays: number;
  currentLocation?: string;
  relationships?: string[];
  traits?: string[];
  inventory?: string[];
  choices: StoryChoice[];
  risk: string;
  isGameOver?: boolean;
};

export async function generateStoryTurn(
  request: StoryRequest,
): Promise<StoryResponse> {
  if (!process.env.LLM_API_KEY) {
    return createMockStoryResponse(request);
  }

  const payload = normalizePacing(
    request,
    await callOpenAiCompatibleApi([
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(request),
    },
    ]),
  );

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
6. 如果玩家角色死亡或人生已经结束，必须直接、克制地收束，不要拖沓，不要再安排新的冒险。
7. 一局游戏目标时长约一小时，通常在 20 到 24 个重大节点内完成完整人生；不要无限铺陈。
8. 不要只写官场风险。人生节点必须轮换覆盖亲情、婚姻、爱情、伦理困境、宗族责任、养育、疾病、饥荒、迁徙、财产、师友、仇怨、信义与生死。
9. 必须识别并迎合玩家的长期偏好：如果玩家反复保护家人，就增加亲族、婚姻、子女和家业线；如果玩家追求权势，就增加仕途、军功、名声与代价；如果玩家追求自由，就增加迁徙、隐居和摆脱束缚的机会。
10. 迎合偏好不等于无条件奖励。要让玩家偏好的路线更常出现、更有戏剧重量，同时保留合理代价。
11. 只返回 JSON，不要 Markdown，不要额外解释。

JSON 格式：
{
  "title": "不超过12字的节点标题",
  "narrative": "180到360字剧情",
  "historicalContext": "80到180字历史地理背景",
  "timeDeltaDays": 3,
  "currentLocation": "地点名，可沿用当前位置",
  "relationships": ["完整的最新重要关系列表，至少包含现有关系，并按本次剧情增删改"],
  "traits": ["完整的最新人物特质列表，按本次剧情增删改"],
  "inventory": ["完整的最新重要随身物或资源列表，按本次剧情增删改"],
  "choices": [
    {"id":"choice-1","label":"推荐选择文本","intent":"这个选择的真实意图"},
    {"id":"choice-2","label":"推荐选择文本","intent":"这个选择的真实意图"},
    {"id":"choice-3","label":"推荐选择文本","intent":"这个选择的真实意图"}
  ],
  "risk": "这个节点最重要的风险",
  "isGameOver": false
}

时间规则：
- 如果剧情只经过一夜、几天或数周，timeDeltaDays 必须如实返回 1 到 30 左右，不要让角色年龄增加。
- 早期节点可以是几天到数月；中期应推进数月到数年；后期必须明显加速，允许一次跨过多年。
- 每次返回的 relationships、traits、inventory 都必须反映本次行动造成的状态变化；不要机械重复旧数组。
- 如果角色死亡，isGameOver 返回 true，narrative 控制在 80 到 160 字，choices 返回空数组，risk 用一句话交代死因或结局代价。
- 当接近第 18 个节点后，应开始收束长期后果；第 24 个节点前后必须结束这一生，isGameOver 返回 true。

内置历史上下文：
${HISTORICAL_CONTEXT}`;
}

function buildUserPrompt(request: StoryRequest) {
  const { state, action } = request;
  const turnCount = state.history.length;
  const recentHistory = state.history
    .slice(-4)
    .map(
      (turn) =>
        `${turn.year}年${turn.month ?? 1}月${turn.day ?? 1}日，${turn.age}岁，${turn.title}：${turn.narrative}`,
    )
    .join("\n");

  return `玩家出生资料：
- 出生：${state.profile.birthYear}年${state.profile.birthMonth}月
- 出生地：${describePlace(state.profile.birthPlace)}
- 当前：${state.profile.currentYear}年${state.profile.currentMonth ?? state.profile.birthMonth}月${state.profile.currentDay ?? 1}日，${state.profile.age}岁，人在${state.currentLocation}
- 当前大势：${state.profile.faction}
- 出身：${state.profile.socialClass}
- 关系：${state.relationships.join("、")}
- 特质：${state.traits.join("、")}
- 物品/资源：${state.inventory.join("、")}
- 玩家偏好画像：${describeIntentProfile(state.intentProfile)}
- 最近意图标签：${state.intentProfile?.recentIntents.join("、") || "暂无"}
- 当前节点：第${turnCount}步，目标在第${TARGET_STORY_TURNS}步左右结束一生
- 节奏阶段：${getPacingStage(turnCount, state.profile.age)}
- 本节点建议主题：${getThemeGuidance(turnCount)}
- 时间跨度要求：${getTimeGuidance(turnCount)}

最近经历：
${recentHistory || "暂无"}

玩家本次行动：
${action}

请生成下一段人生重大节点。请确保这一节点不只围绕官场，也要让私人关系和伦理代价真实影响人生。`;
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
    (!parsed.isGameOver && parsed.choices.length < 2) ||
    !parsed.risk
  ) {
    throw new Error("LLM 返回的剧情 JSON 缺少必要字段");
  }

  return {
    title: parsed.title,
    narrative: parsed.narrative,
    historicalContext: parsed.historicalContext,
    timeDeltaDays: clampNumber(parsed.timeDeltaDays ?? 7, 1, 3650),
    currentLocation: parsed.currentLocation,
    relationships: parsed.relationships,
    traits: parsed.traits,
    inventory: parsed.inventory,
    choices: parsed.isGameOver
      ? []
      : parsed.choices.slice(0, 4).map((choice, index) => ({
          id: choice.id || `choice-${index + 1}`,
          label: choice.label,
          intent: choice.intent || choice.label,
        })),
    risk: parsed.risk,
    isGameOver: Boolean(parsed.isGameOver),
  };
}

function normalizePacing(
  request: StoryRequest,
  payload: LlmStoryPayload,
): LlmStoryPayload {
  const turnCount = request.state.history.length;
  const shouldForceEnding =
    turnCount >= TARGET_STORY_TURNS - 1 ||
    (turnCount >= ENDING_SOON_TURN && request.state.profile.age >= 65);
  const [minDays, maxDays] = getTimeBounds(turnCount);
  const timeDeltaDays = shouldForceEnding
    ? clampNumber(payload.timeDeltaDays || 1825, 730, 3650)
    : clampNumber(payload.timeDeltaDays, minDays, maxDays);

  if (!shouldForceEnding) {
    return {
      ...payload,
      timeDeltaDays,
    };
  }

  return {
    ...payload,
    title: payload.isGameOver ? payload.title : "一生落幕",
    narrative: payload.isGameOver
      ? payload.narrative
      : buildForcedEndingNarrative(request),
    timeDeltaDays,
    choices: [],
    risk: payload.isGameOver
      ? payload.risk
      : "人生已经收束，余下的是亲友与后人如何记得你。",
    isGameOver: true,
  };
}

function applyLlmPayload(
  request: StoryRequest,
  payload: LlmStoryPayload,
): StoryResponse {
  const advancedProfile = advanceProfileTime(
    request.state.profile,
    payload.timeDeltaDays,
  );
  const faction = getFactionForYearAndPlace(
    advancedProfile.currentYear,
    advancedProfile.birthPlace,
  );
  const turn: StoryTurn = {
    year: advancedProfile.currentYear,
    month: advancedProfile.currentMonth,
    day: advancedProfile.currentDay,
    age: advancedProfile.age,
    title: payload.title,
    narrative: payload.narrative,
    historicalContext: payload.historicalContext,
    choices: payload.choices,
    risk: payload.risk,
    chosenAction: request.action,
    isEnding: payload.isGameOver,
  };
  const intentProfile = updateIntentProfile(
    request.state.intentProfile,
    request.action,
  );

  return {
    source: "llm",
    turn,
    state: {
      ...request.state,
      currentLocation: payload.currentLocation || request.state.currentLocation,
      profile: {
        ...advancedProfile,
        faction,
      },
      relationships: mergeStrings(request.state.relationships, payload.relationships),
      traits: mergeStrings(request.state.traits, payload.traits),
      inventory: mergeStrings(request.state.inventory, payload.inventory),
      history: [...request.state.history, turn],
      isGameOver: payload.isGameOver || request.state.isGameOver,
      intentProfile,
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

function getPacingStage(turnCount: number, age: number) {
  if (turnCount < 6) {
    return `开局阶段：建立家庭、性格、牵挂与最初选择，年龄${age}岁，不要过早进入纯官场线。`;
  }

  if (turnCount < 14) {
    return `成长阶段：让事业、婚恋、亲族责任和伦理代价交织，允许一次推进数月到数年。`;
  }

  if (turnCount < ENDING_SOON_TURN) {
    return `中后期阶段：让早年选择结出长期后果，明显推进年龄、关系和生死风险。`;
  }

  return `收束阶段：这一局应开始走向晚年、死亡或人生结局，不要再开启全新的长线支线。`;
}

function getThemeGuidance(turnCount: number) {
  const themes = [
    "亲情与孝道：父母、手足、子女或族人的请求与代价",
    "爱情与婚姻：私情、婚约、门第、离散或相守",
    "伦理困境：救一人还是保全一家，守信还是求生",
    "生计与财产：田产、债务、商旅、手艺或家业",
    "疾病与衰老：疫病、伤残、照护和对死亡的准备",
    "信义与背叛：朋友、恩人、仇怨和乱世中的承诺",
  ];

  return themes[turnCount % themes.length];
}

function getTimeGuidance(turnCount: number) {
  const [minDays, maxDays] = getTimeBounds(turnCount);

  if (turnCount >= TARGET_STORY_TURNS - 1) {
    return "必须收束为终局，timeDeltaDays 通常为 730 到 3650。";
  }

  return `timeDeltaDays 应在 ${minDays} 到 ${maxDays} 之间，除非角色死亡。`;
}

function getTimeBounds(turnCount: number): [number, number] {
  if (turnCount < 6) {
    return [3, 180];
  }

  if (turnCount < 14) {
    return [90, 730];
  }

  if (turnCount < ENDING_SOON_TURN) {
    return [365, 1460];
  }

  return [730, 2920];
}

function buildForcedEndingNarrative(request: StoryRequest) {
  const { profile } = request.state;

  return `你选择了“${request.action}”。此后的年月里，旧日的胜负渐渐退到身后，留下的是亲族的记忆、爱恨的余声和你曾承担过的责任。乱世没有为谁停步，你的一生也在${profile.birthPlace.name}出身者所能抵达的地方安静收束。`;
}
