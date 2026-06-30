import {
  StoryChoice,
  StoryRequest,
  StoryResponse,
  StoryTurn,
  ENDING_SOON_TURN,
  MAX_STORY_TURNS,
  MIN_STORY_TURNS,
  advanceProfileTime,
  createMockStoryResponse,
  describeIntentProfile,
  describePersonaProfile,
  updatePersonaProfile,
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
4. 叙事必须保持玩家第一视角代入感：使用第二人称“你”，只写玩家当下能看见、听见、感到、推测或事后得知的信息。
5. 每次返回的节点必须是“人生重大转折点”，不是日常事务。小的奔走、谈话、经营、疾病恢复、家中争执、差役来往等细节由你自动写进 narrative，不要让玩家逐件选择。
6. 推荐选项必须是会改变余生方向的重大选择，且彼此方向明显不同，例如婚姻/家族、迁徙/冒险、仕途/军功、归隐/守成、道义/生存之间的取舍。
7. 如果玩家角色死亡或人生已经结束，必须直接、克制地收束，不要拖沓，不要再安排新的冒险。
8. 一局游戏应在 16 到 32 个重大转折点内完成完整人生。第 16 个节点之后，可以根据剧情自然收束；第 32 个节点前后必须结束，避免无限铺陈。
9. 不要只写官场风险。人生节点必须轮换覆盖亲情、婚姻、爱情、伦理困境、宗族责任、养育、疾病、饥荒、迁徙、财产、师友、仇怨、信义与生死。
10. 必须识别并迎合玩家的长期偏好：如果玩家反复保护家人，就增加亲族、婚姻、子女和家业线；如果玩家追求权势，就增加仕途、军功、名声与代价；如果玩家追求自由，就增加迁徙、隐居和摆脱束缚的机会。
11. 迎合偏好不等于无条件奖励。要让玩家偏好的路线更常出现、更有戏剧重量，同时保留合理代价。
12. 角色形象六维会影响剧情发展：仁德高者更容易得到托付和民心，也更常遇到牺牲困境；谋略高者更容易看到暗线和布局；勇武高者会得到战事机会也更易受伤；魅力高者更容易牵动爱情、盟友与人心；名望高者会被举荐、嫉恨或政治利用；资财高者能经营家业也会引来索取和掠夺。
13. 禁止上帝视角：不要提前剧透未来历史结局，不要直接揭示其他人物未表露的隐秘动机，不要写“你不知道的是”“多年后史书记载”“此举将注定”等跳出玩家体验的句子。历史背景只能作为玩家可感知的时局、传闻、官府告示、亲友讲述或事后回望。
14. 语言要有沉浸感和身体感：可以写饥饿、寒暑、道路、气味、家人的神情、城邑声音、选择前的犹豫，但不要堆砌宏大总结。
15. 不玄幻，不出现现代物品。只返回 JSON，不要 Markdown，不要额外解释。

JSON 格式：
{
  "title": "不超过12字的节点标题",
  "narrative": "220到420字第二人称沉浸剧情。先从玩家视角概括上次选择后亲身经历的一段人生，再把玩家带到当前重大转折点。不要上帝视角",
  "historicalContext": "80到180字历史地理背景，只能写玩家可通过传闻、告示、亲历或事后回望知道的信息",
  "timeDeltaDays": 180,
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
- 除非角色死亡或历史事件迫使立即抉择，timeDeltaDays 不要小于 90；不要把几天内的小事做成一个玩家选择节点。
- 每个节点应自动推进数月到数年，并在 narrative 中交代期间重要变化。
- 早期节点通常推进数月到两年；中期推进一到四年；后期必须明显加速，允许一次跨过多年。
- 每次返回的 relationships、traits、inventory 都必须反映本次行动造成的状态变化；不要机械重复旧数组。
- 如果角色死亡，isGameOver 返回 true，narrative 控制在 80 到 160 字，choices 返回空数组，risk 用一句话交代死因或结局代价。
- 前 16 个节点以内，除非角色死亡，不要草率结束一生。第 16 个节点之后，若剧情长期后果已经成熟，可以自然结束。第 32 个节点前后必须结束这一生，isGameOver 返回 true。

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
- 当前角色形象：${describePersonaProfile(state.personaProfile)}
- 本次选择后的形象倾向：${describePersonaProfile(updatePersonaProfile(state.personaProfile, action, state.intentProfile))}
- 当前节点：第${turnCount}步，完整人生应在第${MIN_STORY_TURNS}到第${MAX_STORY_TURNS}步之间结束
- 节奏阶段：${getPacingStage(turnCount, state.profile.age)}
- 本节点建议主题：${getThemeGuidance(turnCount)}
- 时间跨度要求：${getTimeGuidance(turnCount)}

最近经历：
${recentHistory || "暂无"}

玩家本次行动：
${action}

请生成下一段人生重大转折点。先自动写完这次选择之后玩家亲身经历或合理得知的中间人生剧情和小变动，再把玩家带到下一个必须亲自决定的大关口。不要让玩家选择琐碎细节，不要使用上帝视角。`;
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
    turnCount >= MAX_STORY_TURNS - 1 ||
    (turnCount >= MIN_STORY_TURNS && request.state.profile.age >= 70);
  const shouldSuppressEarlyEnding =
    payload.isGameOver &&
    turnCount < MIN_STORY_TURNS - 1 &&
    request.state.profile.age < 70;
  const [minDays, maxDays] = getTimeBounds(turnCount);
  const timeDeltaDays = shouldForceEnding
    ? clampNumber(payload.timeDeltaDays || 2190, 1095, 4380)
    : clampNumber(payload.timeDeltaDays, minDays, maxDays);

  if (!shouldForceEnding) {
    return {
      ...payload,
      timeDeltaDays,
      choices:
        shouldSuppressEarlyEnding && payload.choices.length === 0
          ? createContinuationChoices(request)
          : payload.choices,
      isGameOver: shouldSuppressEarlyEnding ? false : payload.isGameOver,
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
  const personaProfile = updatePersonaProfile(
    request.state.personaProfile,
    request.action,
    request.state.intentProfile,
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
      personaProfile,
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

function createContinuationChoices(request: StoryRequest): StoryChoice[] {
  return [
    {
      id: "continue-family",
      label: "把余生重心放回家人与亲族，承担长期责任",
      intent: "继续人生，不在此处终结，转向家族、婚姻、子女和地方责任",
    },
    {
      id: "continue-fame",
      label: "接受更大的名声与风险，继续追逐外部机会",
      intent: "继续人生，不在此处终结，转向名望、权势、军功或远方机会",
    },
    {
      id: "continue-freedom",
      label: "从旧身份中抽身，寻找更自由的活法",
      intent: `继续人生，不在此处终结，离开${request.state.currentLocation}附近旧有关系，寻找新的生活方向`,
    },
  ];
}

function getPacingStage(turnCount: number, age: number) {
  if (turnCount < 4) {
    return `开局阶段：建立家庭、性格、牵挂与人生主线，年龄${age}岁。每步都应是会改变几年人生方向的大关口。`;
  }

  if (turnCount < 9) {
    return `成长阶段：自动写完中间小事，让事业、婚恋、亲族责任和伦理代价交织；每步推进一到数年。`;
  }

  if (turnCount < ENDING_SOON_TURN) {
    return `中后期阶段：让早年选择结出长期后果，明显推进年龄、关系和生死风险；不要开启琐碎支线。`;
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

  if (turnCount >= MAX_STORY_TURNS - 1) {
    return "必须收束为终局，timeDeltaDays 通常为 1095 到 4380。";
  }

  if (turnCount >= MIN_STORY_TURNS) {
    return `已经达到最低节点数，模型可以根据剧情决定是否收束；若继续，timeDeltaDays 应在 ${minDays} 到 ${maxDays} 之间。`;
  }

  return `timeDeltaDays 应在 ${minDays} 到 ${maxDays} 之间，除非角色死亡。`;
}

function getTimeBounds(turnCount: number): [number, number] {
  if (turnCount < 4) {
    return [120, 730];
  }

  if (turnCount < 9) {
    return [365, 1460];
  }

  if (turnCount < ENDING_SOON_TURN) {
    return [730, 2190];
  }

  return [1095, 3650];
}

function buildForcedEndingNarrative(request: StoryRequest) {
  return `你选择了“${request.action}”。此后的年月里，旧日的胜负渐渐退到身后。你记得的是亲族的脚步声、某个没有说出口的名字、病榻旁递来的水，和自己曾经承担过的责任。最后一个黄昏来临时，你已不再需要作新的选择。`;
}
