import {
  StoryChoice,
  StoryRequest,
  StoryResponse,
  StoryState,
  StoryTurn,
  ENDING_SOON_TURN,
  MAX_STORY_TURNS,
  MIN_STORY_TURNS,
  PersonaDeltas,
  PERSONA_KEYS,
  PersonaProfile,
  WorldState,
  applyPersonaDeltas,
  advanceProfileTime,
  createInitialPersonaProfile,
  createInitialWorldState,
  createNewLife,
  createMockStoryResponse,
  describePersonaProfile,
} from "./game";
import {
  BirthPlace,
  Faction,
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
  personaDeltas?: PersonaDeltas;
  worldState?: Partial<WorldState>;
  choices: StoryChoice[];
  risk: string;
  isGameOver?: boolean;
};

type LlmOpeningPayload = {
  birthYear: number;
  birthMonth: number;
  birthPlace: BirthPlace;
  currentAge: number;
  currentMonth: number;
  currentDay: number;
  socialClass: string;
  familyBackground: string;
  relationships: string[];
  traits: string[];
  inventory: string[];
  personaProfile?: Partial<PersonaProfile>;
  title: string;
  narrative: string;
  historicalContext: string;
  choices: StoryChoice[];
  risk: string;
};

const FACTIONS: Faction[] = ["曹魏", "蜀汉", "东吴", "群雄割据", "边郡部族"];

export async function generateStoryTurn(
  request: StoryRequest,
): Promise<StoryResponse> {
  if (!process.env.LLM_API_KEY) {
    return createMockStoryResponse(request);
  }

  const payload = normalizePacing(
    request,
    parseStoryPayload(await callOpenAiCompatibleApi([
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(request),
    },
    ])),
  );

  return applyLlmPayload(request, payload);
}

export async function generateOpeningLife(): Promise<StoryState> {
  if (!process.env.LLM_API_KEY) {
    return createNewLife();
  }

  const payload = await callOpenAiCompatibleApi([
    {
      role: "system",
      content: buildOpeningSystemPrompt(),
    },
    {
      role: "user",
      content:
        "请为一局新游戏生成一个高随机性的三国前中期开局，包括出生信息、家庭背景、初始关系、性格、资源、角色六维和第一组重大人生选择。",
    },
  ]);

  return createStateFromOpeningPayload(parseOpeningPayload(payload));
}

function buildSystemPrompt() {
  return `你是一个严谨的三国时期人生模拟游戏叙事引擎。

必须遵守：
1. 出生与主要时代背景从汉末到三国前中期开始；如果玩家人生自然延续到 280 年之后，可以写西晋初年和三国余波，不要因为 280 年机械终止人生。
2. 地理、交通、政权归属和社会身份必须符合对应年份的大体事实。
3. 在 worldState.canInfluenceHistory 为 false 时，玩家主要影响自己、家庭、乡里、军府或地方层面的命运，重大历史事件遵循史实；当 worldState.canInfluenceHistory 为 true 后，玩家可以尝试影响重大历史事件；当 worldState.alternateHistory 为 true 后，本局可以进入架空历史，不必再严格遵循原历史结局，但仍要保持地理、社会和因果合理。
4. 叙事必须保持玩家第一视角代入感：使用第二人称“你”，只写玩家当下能看见、听见、感到、推测或事后得知的信息。
5. 每次返回的节点必须是“人生重大转折点”，不是日常事务。小的奔走、谈话、经营、疾病恢复、家中争执、差役来往等细节由你自动写进 narrative，不要让玩家逐件选择。
6. 推荐选项必须是会改变余生方向的重大选择，且彼此方向明显不同，例如婚姻/家族、迁徙/冒险、仕途/军功、归隐/守成、道义/生存之间的取舍。
7. 如果玩家角色死亡或人生已经结束，必须直接、克制地收束，不要拖沓，不要再安排新的冒险。
8. 一局游戏应在 16 到 32 个重大转折点内完成完整人生。第 16 个节点之后，可以根据剧情自然收束；第 32 个节点前后必须结束，避免无限铺陈。
9. 不要只写官场风险。人生节点必须轮换覆盖亲情、婚姻、爱情、伦理困境、宗族责任、养育、疾病、饥荒、迁徙、财产、师友、仇怨、信义与生死。
10. 角色形象六维会影响剧情发展：仁德高者更容易得到托付和民心，也更常遇到牺牲困境；谋略高者更容易看到暗线和布局；勇武高者会得到战事机会也更易受伤；魅力高者更容易牵动爱情、盟友与人心；名望高者会被举荐、嫉恨或政治利用；资财高者能经营家业也会引来索取和掠夺。
11. 每次必须根据玩家本次选择和剧情结果判断角色形象六维变化，返回 personaDeltas。变化量可以为负数，必须体现取舍，不要所有维度都上涨。
12. 禁止上帝视角：不要提前剧透未来历史结局，不要直接揭示其他人物未表露的隐秘动机，不要写“你不知道的是”“多年后史书记载”“此举将注定”等跳出玩家体验的句子。历史背景只能作为玩家可感知的时局、传闻、官府告示、亲友讲述或事后回望。
13. 语言要有沉浸感和身体感：可以写饥饿、寒暑、道路、气味、家人的神情、城邑声音、选择前的犹豫，但不要堆砌宏大总结。
14. 不玄幻，不出现现代物品。只返回 JSON，不要 Markdown，不要额外解释。

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
  "personaDeltas": {
    "benevolence": 0,
    "strategy": 0,
    "martial": 0,
    "charisma": 0,
    "reputation": 0,
    "wealth": 0
  },
  "worldState": {
    "canInfluenceHistory": false,
    "alternateHistory": false,
    "influenceReason": "判断玩家当前是否已经有能力影响重大历史走势，以及原因",
    "divergenceSummary": "如果已经进入架空历史，概括本局已经改变的历史走势",
    "changedEvents": ["本局已经改变或可能改变的重大事件"]
  },
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
- personaDeltas 每个维度范围为 -12 到 12 的整数。只根据本次选择与剧情结果判断变化；可以全为 0，但如果选择有明显代价或成长，应有正负变化。
- personaDeltas 六个字段含义：benevolence=仁德，strategy=谋略，martial=勇武，charisma=魅力，reputation=名望，wealth=资财。
- 每次都要判断 worldState：玩家是否已经拥有足够地位、资源、军力、名望或情报网络来影响世界线。没有能力时，重大历史事件仍遵循史实；有能力后，可以让本局历史被改变，并在 alternateHistory 和 divergenceSummary 中记录。
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
- 当前角色形象：${describePersonaProfile(state.personaProfile)}
- 世界线状态：${describeWorldState(state.worldState)}
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

function buildOpeningSystemPrompt() {
  return `你是三国人生游戏的开局生成器。

目标：生成一个极具随机性但历史地理合理的开局。不要使用固定模板，不要总是士族、农户、军户；可以有孤儿、赘婿、流民、医家、巫祝旁支、船户、盐户、边郡混血家庭、被收养者、商队遗孤、地方豪强庶支等合理身份。

必须遵守：
1. 出生年份必须在公元184年至225年之间，地点必须在当时中国相关区域内。
2. 家庭背景要具体，包含家庭结构、经济状态、地方处境、至少一个牵挂或隐患。
3. 第一组 choices 必须由你生成，且都是重大人生方向，不是日常小事。
4. narrative 使用第二人称“你”，只写玩家可感知的信息，不要上帝视角。
5. 只返回 JSON。

JSON 格式：
{
  "birthYear": 196,
  "birthMonth": 4,
  "birthPlace": {
    "name": "地点名",
    "presentDay": "今地名",
    "region": "当时州郡或地域",
    "factionHints": ["群雄割据"],
    "geography": "地理与交通",
    "socialTexture": "地方社会气质"
  },
  "currentAge": 14,
  "currentMonth": 9,
  "currentDay": 12,
  "socialClass": "具体出身标签",
  "familyBackground": "80到160字家庭背景",
  "relationships": ["初始重要关系"],
  "traits": ["初始性格或处境标签"],
  "inventory": ["初始重要资源"],
  "personaProfile": {
    "benevolence": 45,
    "strategy": 45,
    "martial": 45,
    "charisma": 45,
    "reputation": 35,
    "wealth": 30
  },
  "title": "开局标题",
  "narrative": "220到420字开局剧情",
  "historicalContext": "80到180字玩家可感知的历史地理背景",
  "choices": [
    {"id":"choice-1","label":"重大选择","intent":"真实意图"},
    {"id":"choice-2","label":"重大选择","intent":"真实意图"},
    {"id":"choice-3","label":"重大选择","intent":"真实意图"}
  ],
  "risk": "当前最重要风险"
}

内置历史上下文：
${HISTORICAL_CONTEXT}`;
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

  return content;
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
    personaDeltas: normalizePersonaDeltas(parsed.personaDeltas),
    worldState: parsed.worldState,
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

function parseOpeningPayload(content: string): LlmOpeningPayload {
  const parsed = JSON.parse(content) as Partial<LlmOpeningPayload>;

  if (
    !parsed.birthPlace ||
    !parsed.socialClass ||
    !parsed.familyBackground ||
    !parsed.title ||
    !parsed.narrative ||
    !parsed.historicalContext ||
    !Array.isArray(parsed.choices) ||
    parsed.choices.length < 2
  ) {
    throw new Error("LLM 返回的开局 JSON 缺少必要字段");
  }

  return {
    birthYear: clampNumber(parsed.birthYear ?? 196, 184, 225),
    birthMonth: clampNumber(parsed.birthMonth ?? 1, 1, 12),
    birthPlace: normalizeBirthPlace(parsed.birthPlace),
    currentAge: clampNumber(parsed.currentAge ?? 14, 8, 22),
    currentMonth: clampNumber(parsed.currentMonth ?? 1, 1, 12),
    currentDay: clampNumber(parsed.currentDay ?? 1, 1, 28),
    socialClass: parsed.socialClass.slice(0, 40),
    familyBackground: parsed.familyBackground.slice(0, 220),
    relationships: normalizeStringList(parsed.relationships, ["家人"]),
    traits: normalizeStringList(parsed.traits, ["未定之人"]),
    inventory: normalizeStringList(parsed.inventory, ["粗布衣"]),
    personaProfile: parsed.personaProfile,
    title: parsed.title,
    narrative: parsed.narrative,
    historicalContext: parsed.historicalContext,
    choices: parsed.choices.slice(0, 4).map((choice, index) => ({
      id: choice.id || `opening-${index + 1}`,
      label: choice.label,
      intent: choice.intent || choice.label,
    })),
    risk: parsed.risk || "乱世中，家人、粮食与身份都可能在一夜之间失去。",
  };
}

function createStateFromOpeningPayload(payload: LlmOpeningPayload): StoryState {
  const currentYear = payload.birthYear + payload.currentAge;
  const faction = getFactionForYearAndPlace(currentYear, payload.birthPlace);
  const personaProfile = normalizePersonaProfile(
    createInitialPersonaProfile(payload.socialClass),
    payload.personaProfile,
  );

  const state: StoryState = {
    profile: {
      birthYear: payload.birthYear,
      birthMonth: payload.birthMonth,
      birthPlace: payload.birthPlace,
      currentYear,
      currentMonth: payload.currentMonth,
      currentDay: payload.currentDay,
      age: payload.currentAge,
      faction,
      socialClass: payload.socialClass,
      familyBackground: payload.familyBackground,
    },
    currentLocation: payload.birthPlace.name,
    relationships: payload.relationships,
    traits: payload.traits,
    inventory: payload.inventory,
    history: [],
    isGameOver: false,
    personaProfile,
    worldState: createInitialWorldState(),
  };

  return {
    ...state,
    history: [
      {
        year: currentYear,
        month: payload.currentMonth,
        day: payload.currentDay,
        age: payload.currentAge,
        title: payload.title,
        narrative: payload.narrative,
        historicalContext: payload.historicalContext,
        choices: payload.choices,
        risk: payload.risk,
        isEnding: false,
      },
    ],
  };
}

function normalizeBirthPlace(place: BirthPlace): BirthPlace {
  const factionHints = Array.isArray(place.factionHints)
    ? place.factionHints.filter((faction): faction is Faction =>
        FACTIONS.includes(faction as Faction),
      )
    : [];

  return {
    name: String(place.name || "无名郡县").slice(0, 30),
    presentDay: String(place.presentDay || "今地不详").slice(0, 40),
    region: String(place.region || "州郡不详").slice(0, 30),
    factionHints: factionHints.length > 0 ? factionHints : ["群雄割据"],
    geography: String(place.geography || "地处乱世交通要道附近。").slice(0, 180),
    socialTexture: String(place.socialTexture || "地方豪强、流民与郡县小吏往来混杂。").slice(0, 180),
  };
}

function normalizePersonaProfile(
  fallback: PersonaProfile,
  incoming?: Partial<PersonaProfile>,
): PersonaProfile {
  return PERSONA_KEYS.reduce((profile, key) => {
    profile[key] = clampNumber(incoming?.[key] ?? fallback[key], 0, 100);
    return profile;
  }, {} as PersonaProfile);
}

function normalizeStringList(value: string[] | undefined, fallback: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim().slice(0, 40))
    .slice(0, 8);
}

function normalizePersonaDeltas(
  deltas: PersonaDeltas | undefined,
): PersonaDeltas {
  if (!deltas) {
    return {};
  }

  return {
    benevolence: clampOptionalDelta(deltas.benevolence),
    strategy: clampOptionalDelta(deltas.strategy),
    martial: clampOptionalDelta(deltas.martial),
    charisma: clampOptionalDelta(deltas.charisma),
    reputation: clampOptionalDelta(deltas.reputation),
    wealth: clampOptionalDelta(deltas.wealth),
  };
}

function clampOptionalDelta(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return clampNumber(value, -12, 12);
}

function normalizePacing(
  request: StoryRequest,
  payload: LlmStoryPayload,
): LlmStoryPayload {
  const turnCount = request.state.history.length;
  const shouldForceEnding =
    turnCount >= MAX_STORY_TURNS - 1 ||
    (turnCount >= MIN_STORY_TURNS && request.state.profile.age >= 75);
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
  const personaProfile = applyPersonaDeltas(
    request.state.personaProfile,
    payload.personaDeltas,
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
      personaProfile,
      worldState: mergeWorldState(request.state.worldState, payload.worldState),
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
  const normalizedIncoming = (incoming || [])
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());
  const normalizedExisting = existing
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());

  return Array.from(new Set([...normalizedIncoming, ...normalizedExisting])).slice(
    0,
    12,
  );
}

function describeWorldState(worldState: WorldState | undefined) {
  const state = worldState ?? createInitialWorldState();

  if (state.alternateHistory) {
    return `已进入架空历史。${state.divergenceSummary || state.influenceReason}`;
  }

  if (state.canInfluenceHistory) {
    return `具备影响世界线的能力。${state.influenceReason}`;
  }

  return `尚未能影响重大历史走势。${state.influenceReason}`;
}

function mergeWorldState(
  existing: WorldState | undefined,
  incoming: Partial<WorldState> | undefined,
): WorldState {
  const base = existing ?? createInitialWorldState();

  if (!incoming) {
    return base;
  }

  const canInfluenceHistory =
    Boolean(incoming.canInfluenceHistory) || base.canInfluenceHistory;
  const alternateHistory =
    Boolean(incoming.alternateHistory) || base.alternateHistory;

  return {
    canInfluenceHistory,
    alternateHistory,
    influenceReason:
      incoming.influenceReason || base.influenceReason || createInitialWorldState().influenceReason,
    divergenceSummary:
      incoming.divergenceSummary || base.divergenceSummary || "",
    changedEvents: Array.from(
      new Set([
        ...(base.changedEvents || []),
        ...normalizeStringList(incoming.changedEvents, []),
      ]),
    ).slice(-8),
  };
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
