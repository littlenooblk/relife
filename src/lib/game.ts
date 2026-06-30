import {
  BIRTH_PLACES,
  BirthPlace,
  Faction,
  THREE_KINGDOMS_YEAR_RANGE,
  getFactionForYearAndPlace,
} from "./threeKingdoms";

export type PlayerProfile = {
  birthYear: number;
  birthMonth: number;
  birthPlace: BirthPlace;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  age: number;
  faction: Faction;
  socialClass: string;
};

export type StoryChoice = {
  id: string;
  label: string;
  intent: string;
};

export type PlayerPreferenceKey =
  | "family"
  | "romance"
  | "morality"
  | "power"
  | "wealth"
  | "adventure"
  | "survival"
  | "scholarship"
  | "freedom";

export type PlayerIntentProfile = {
  scores: Record<PlayerPreferenceKey, number>;
  recentIntents: string[];
};

export type PersonaKey =
  | "benevolence"
  | "strategy"
  | "martial"
  | "charisma"
  | "reputation"
  | "wealth";

export type PersonaProfile = Record<PersonaKey, number>;

export type StoryState = {
  profile: PlayerProfile;
  currentLocation: string;
  relationships: string[];
  traits: string[];
  inventory: string[];
  history: StoryTurn[];
  isGameOver: boolean;
  intentProfile: PlayerIntentProfile;
  personaProfile: PersonaProfile;
};

export type StoryTurn = {
  year: number;
  month: number;
  day: number;
  age: number;
  title: string;
  narrative: string;
  historicalContext: string;
  choices: StoryChoice[];
  risk: string;
  chosenAction?: string;
  isEnding?: boolean;
};

export type StoryRequest = {
  state: StoryState;
  action: string;
};

export type StoryResponse = {
  state: StoryState;
  turn: StoryTurn;
  source: "llm" | "mock";
};

export const MIN_STORY_TURNS = 16;
export const MAX_STORY_TURNS = 32;
export const ENDING_SOON_TURN = 24;

export const PREFERENCE_LABELS: Record<PlayerPreferenceKey, string> = {
  family: "重视亲族",
  romance: "追求情感",
  morality: "看重道义",
  power: "追求权势",
  wealth: "重视生计财富",
  adventure: "偏好冒险",
  survival: "优先生存",
  scholarship: "向往学识名望",
  freedom: "向往自由",
};

export const PERSONA_LABELS: Record<PersonaKey, string> = {
  benevolence: "仁德",
  strategy: "谋略",
  martial: "勇武",
  charisma: "魅力",
  reputation: "名望",
  wealth: "资财",
};

export const PERSONA_KEYS: PersonaKey[] = [
  "benevolence",
  "strategy",
  "martial",
  "charisma",
  "reputation",
  "wealth",
];

const BASE_PERSONA_PROFILE: PersonaProfile = {
  benevolence: 45,
  strategy: 45,
  martial: 45,
  charisma: 45,
  reputation: 35,
  wealth: 30,
};

const EMPTY_PREFERENCE_SCORES: Record<PlayerPreferenceKey, number> = {
  family: 0,
  romance: 0,
  morality: 0,
  power: 0,
  wealth: 0,
  adventure: 0,
  survival: 0,
  scholarship: 0,
  freedom: 0,
};

const PREFERENCE_KEYWORDS: Record<PlayerPreferenceKey, string[]> = {
  family: ["家", "父", "母", "妻", "夫", "子", "女", "兄", "弟", "姊", "妹", "族", "乡邻", "照顾", "保护"],
  romance: ["爱", "情", "婚", "嫁", "娶", "恋", "私奔", "相守", "心上", "伴侣"],
  morality: ["义", "信", "恩", "救", "仁", "忠", "承诺", "良心", "无辜", "报答"],
  power: ["官", "仕", "权", "军功", "升迁", "投靠", "幕府", "郡县", "将军", "名位"],
  wealth: ["钱", "财", "商", "田", "粮", "盐", "买卖", "债", "家业", "资源"],
  adventure: ["远行", "离开", "冒险", "闯", "游历", "探", "刺探", "潜入", "寻找机会"],
  survival: ["活", "避难", "逃", "躲", "安全", "保命", "粮荒", "疫", "减少风险", "庇护"],
  scholarship: ["学", "书", "文", "师", "名士", "读", "策论", "经", "竹简", "声名"],
  freedom: ["自由", "不受", "归隐", "山林", "离群", "不仕", "自己决定", "摆脱"],
};

const PERSONA_KEYWORDS: Record<PersonaKey, string[]> = {
  benevolence: ["仁", "义", "救", "照顾", "保护", "家人", "乡邻", "无辜", "施舍", "孝", "善"],
  strategy: ["谋", "计", "策", "观察", "学习", "文书", "权衡", "试探", "联络", "布局"],
  martial: ["战", "武", "军", "守备", "坞堡", "刀", "弓", "护卫", "杀", "突围", "勇"],
  charisma: ["说服", "结交", "婚", "爱", "名士", "宴", "调停", "人心", "伴侣", "盟友"],
  reputation: ["名", "声望", "仕", "官", "军功", "举荐", "门第", "大义", "承诺", "信"],
  wealth: ["财", "钱", "商", "田", "粮", "盐", "买卖", "家业", "债", "资源", "经营"],
};

const SOCIAL_CLASSES = [
  "寒门农户之子",
  "郡县小吏之家",
  "工匠家庭",
  "商旅家庭",
  "边郡军户",
  "地方豪族旁支",
  "流寓士人之后",
];

const STARTING_TRAITS = ["谨慎", "好奇", "坚韧", "善辩", "敏锐", "重义"];

export function createNewLife(): StoryState {
  const birthYear = randomInt(THREE_KINGDOMS_YEAR_RANGE.start, 242);
  const birthMonth = randomInt(1, 12);
  const birthPlace = pickRandom(BIRTH_PLACES);
  const socialClass = pickRandom(SOCIAL_CLASSES);
  const age = randomInt(12, 18);
  const currentYear = Math.min(birthYear + age, THREE_KINGDOMS_YEAR_RANGE.end - 1);
  const currentMonth = randomInt(1, 12);

  const profile: PlayerProfile = {
    birthYear,
    birthMonth,
    birthPlace,
    currentYear,
    currentMonth,
    currentDay: randomInt(1, daysInMonth(currentMonth)),
    age: calculateAge(birthYear, birthMonth, currentYear, currentMonth),
    faction: getFactionForYearAndPlace(currentYear, birthPlace),
    socialClass,
  };

  const state: StoryState = {
    profile,
    currentLocation: birthPlace.name,
    relationships: [`${socialClass}的家人`],
    traits: [pickRandom(STARTING_TRAITS)],
    inventory: ["粗布衣", "竹简残页", "少量铜钱"],
    history: [],
    isGameOver: false,
    intentProfile: createEmptyIntentProfile(),
    personaProfile: createInitialPersonaProfile(socialClass),
  };

  const openingTurn = createOpeningTurn(state);
  return {
    ...state,
    history: [openingTurn],
  };
}

export function createOpeningTurn(state: StoryState): StoryTurn {
  const { profile } = state;

  return {
    year: profile.currentYear,
    month: profile.currentMonth,
    day: profile.currentDay,
    age: profile.age,
    title: "乱世初醒",
    narrative: `你生于建安以来风声不息的年代，故乡是${profile.birthPlace.name}。${profile.birthPlace.socialTexture}到了${profile.currentYear}年，你已${profile.age}岁，家中开始把一些真正会改变命运的事交到你手里。`,
    historicalContext: `${profile.birthPlace.name}地处${profile.birthPlace.region}，此时大势偏向${profile.faction}。${profile.birthPlace.geography}`,
    choices: [
      {
        id: "study",
        label: "把未来押在学识与名望上，离家拜师求进",
        intent: "选择以学识、名声和仕途作为人生主线，即使要离开家人多年",
      },
      {
        id: "trade",
        label: "跟随亲族经营家业，在乱世中保全一家",
        intent: "选择以亲族、家业和生计作为人生主线，优先守住家人",
      },
      {
        id: "militia",
        label: "投身坞堡或军府，用武力换取庇护与出路",
        intent: "选择以军功、风险和权势作为人生主线，承担卷入战事的代价",
      },
    ],
    risk: "乱世中每一步都可能带来征发、饥荒、疫病或卷入战事的风险。",
    isEnding: false,
  };
}

export function createMockStoryResponse(request: StoryRequest): StoryResponse {
  const previous = request.state.history.at(-1);
  const turnCount = request.state.history.length;
  const shouldEnd = turnCount >= MAX_STORY_TURNS - 1;
  const advancedProfile = advanceProfileTime(
    request.state.profile,
    shouldEnd ? randomInt(1095, 4380) : getMockTimeAdvanceDays(turnCount),
  );
  const faction = getFactionForYearAndPlace(
    advancedProfile.currentYear,
    request.state.profile.birthPlace,
  );
  const newResource = pickRandom(["一封乡中荐书", "半袋粟米", "郡中通行木符", "修补过的短刀"]);
  const intentProfile = updateIntentProfile(
    request.state.intentProfile,
    request.action,
  );
  const personaProfile = updatePersonaProfile(
    request.state.personaProfile,
    request.action,
    request.state.intentProfile,
  );

  const turn: StoryTurn = {
    year: advancedProfile.currentYear,
    month: advancedProfile.currentMonth,
    day: advancedProfile.currentDay,
    age: advancedProfile.age,
    title: shouldEnd ? "一生落幕" : "命运分岔",
    narrative: shouldEnd
      ? `你选择了“${request.action}”。此后许多年，你在熟悉的门声、饭香和亲族低语里慢慢老去。远处的战报仍会传来，但你更常记得的是某个黄昏里家人递来的热水，和自己终于放下的一口气。`
      : `你选择了“${request.action}”。此后数月到数年间，你走过泥泞的道路，听过家中压低声音的争执，也接下亲友一次次托付。那些小事不再需要逐件定夺，却在你身上留下痕迹。如今，一个真正会改变余生方向的关口摆在你面前。`,
    historicalContext: `${advancedProfile.currentYear}年前后，${request.state.currentLocation}仍受${faction}大势影响。地方秩序表面维持，背后却常被粮赋、兵役和交通断绝牵动。`,
    choices: shouldEnd
      ? []
      : [
          {
            id: "protect-family",
            label: "放弃更大的机会，优先守住家人与乡邻",
            intent: "在人生主线上转向亲族责任、家业和地方声望",
          },
          {
            id: "marriage-duty",
            label: "接受一段会改变门第与命运的婚约或私情",
            intent: "在人生主线上转向爱情、婚姻、子女和宗族责任",
          },
          {
            id: "travel",
            label: "离开故地，把余生押给更大的城邑与机会",
            intent: "在人生主线上转向迁徙、冒险、名望或权势",
          },
        ],
    risk: shouldEnd
      ? "人生已经收束，余下的是后人如何记得你。"
      : previous
      ? `上一次的“${previous.title}”仍在影响旁人对你的信任。`
      : "你尚未建立足够声望，贸然行动容易被豪强或官吏利用。",
    chosenAction: request.action,
    isEnding: shouldEnd,
  };

  return {
    source: "mock",
    turn,
    state: {
      ...request.state,
      profile: {
        ...advancedProfile,
        faction,
      },
      relationships: unique([
        ...request.state.relationships,
        "一位留意你的地方掾吏",
      ]),
      traits: unique([...request.state.traits, "知机"]),
      inventory: unique([...request.state.inventory, newResource]),
      history: [...request.state.history, turn],
      isGameOver: shouldEnd,
      intentProfile,
      personaProfile,
    },
  };
}

export function normalizeAction(action: string) {
  return action.trim().slice(0, 300);
}

export function createEmptyIntentProfile(): PlayerIntentProfile {
  return {
    scores: { ...EMPTY_PREFERENCE_SCORES },
    recentIntents: [],
  };
}

export function createInitialPersonaProfile(socialClass: string): PersonaProfile {
  const profile = { ...BASE_PERSONA_PROFILE };

  if (socialClass.includes("军户")) {
    profile.martial += 12;
    profile.reputation += 4;
  }

  if (socialClass.includes("商旅")) {
    profile.wealth += 12;
    profile.charisma += 4;
  }

  if (socialClass.includes("小吏") || socialClass.includes("士人")) {
    profile.strategy += 10;
    profile.reputation += 6;
  }

  if (socialClass.includes("豪族")) {
    profile.reputation += 10;
    profile.wealth += 8;
  }

  if (socialClass.includes("农户") || socialClass.includes("工匠")) {
    profile.benevolence += 5;
    profile.wealth += 3;
  }

  return clampPersonaProfile(profile);
}

export function updateIntentProfile(
  profile: PlayerIntentProfile | undefined,
  action: string,
): PlayerIntentProfile {
  const nextProfile = profile ?? createEmptyIntentProfile();
  const detected = detectIntentPreferences(action);
  const nextScores = { ...EMPTY_PREFERENCE_SCORES, ...nextProfile.scores };

  for (const key of detected) {
    nextScores[key] = Math.min(nextScores[key] + 1, 20);
  }

  return {
    scores: nextScores,
    recentIntents: [
      ...detected.map((key) => PREFERENCE_LABELS[key]),
      ...nextProfile.recentIntents,
    ].slice(0, 6),
  };
}

export function getTopPreferences(
  profile: PlayerIntentProfile | undefined,
  limit = 3,
) {
  const scores = profile?.scores ?? EMPTY_PREFERENCE_SCORES;

  return (Object.entries(scores) as Array<[PlayerPreferenceKey, number]>)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, score]) => ({
      key,
      label: PREFERENCE_LABELS[key],
      score,
    }));
}

export function describeIntentProfile(profile: PlayerIntentProfile | undefined) {
  const topPreferences = getTopPreferences(profile);

  if (topPreferences.length === 0) {
    return "尚未形成明显偏好。请根据玩家接下来的选择逐渐识别喜好。";
  }

  return topPreferences
    .map((preference) => `${preference.label}(${preference.score})`)
    .join("、");
}

export function updatePersonaProfile(
  profile: PersonaProfile | undefined,
  action: string,
  intentProfile?: PlayerIntentProfile,
): PersonaProfile {
  const nextProfile = { ...BASE_PERSONA_PROFILE, ...profile };
  const detectedPersonaKeys = detectPersonaDimensions(action);
  const detectedPreferences = detectIntentPreferences(action);

  for (const key of detectedPersonaKeys) {
    nextProfile[key] += 6;
  }

  for (const preference of detectedPreferences) {
    applyPreferenceToPersona(nextProfile, preference);
  }

  for (const preference of getTopPreferences(intentProfile, 2)) {
    applyPreferenceToPersona(nextProfile, preference.key, 2);
  }

  return clampPersonaProfile(nextProfile);
}

export function getPersonaDimensions(profile: PersonaProfile | undefined) {
  const safeProfile = clampPersonaProfile({
    ...BASE_PERSONA_PROFILE,
    ...profile,
  });

  return PERSONA_KEYS.map((key) => ({
    key,
    label: PERSONA_LABELS[key],
    value: safeProfile[key],
  }));
}

export function describePersonaProfile(profile: PersonaProfile | undefined) {
  return getPersonaDimensions(profile)
    .map((dimension) => `${dimension.label}${dimension.value}`)
    .join("、");
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function detectIntentPreferences(action: string): PlayerPreferenceKey[] {
  const normalizedAction = action.toLowerCase();

  return (Object.entries(PREFERENCE_KEYWORDS) as Array<
    [PlayerPreferenceKey, string[]]
  >)
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalizedAction.includes(keyword)),
    )
    .map(([key]) => key);
}

function detectPersonaDimensions(action: string): PersonaKey[] {
  const normalizedAction = action.toLowerCase();

  return (Object.entries(PERSONA_KEYWORDS) as Array<[PersonaKey, string[]]>)
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalizedAction.includes(keyword)),
    )
    .map(([key]) => key);
}

function applyPreferenceToPersona(
  profile: PersonaProfile,
  preference: PlayerPreferenceKey,
  amount = 4,
) {
  if (preference === "family" || preference === "morality") {
    profile.benevolence += amount;
    profile.reputation += Math.ceil(amount / 2);
  }

  if (preference === "romance") {
    profile.charisma += amount;
    profile.benevolence += Math.ceil(amount / 2);
  }

  if (preference === "power") {
    profile.reputation += amount;
    profile.strategy += Math.ceil(amount / 2);
  }

  if (preference === "wealth") {
    profile.wealth += amount;
    profile.strategy += Math.ceil(amount / 2);
  }

  if (preference === "adventure") {
    profile.martial += amount;
    profile.charisma += Math.ceil(amount / 2);
  }

  if (preference === "survival") {
    profile.strategy += amount;
    profile.martial += Math.ceil(amount / 2);
  }

  if (preference === "scholarship") {
    profile.strategy += amount;
    profile.reputation += Math.ceil(amount / 2);
  }

  if (preference === "freedom") {
    profile.charisma += amount;
    profile.strategy += Math.ceil(amount / 2);
  }
}

function clampPersonaProfile(profile: PersonaProfile): PersonaProfile {
  return PERSONA_KEYS.reduce((nextProfile, key) => {
    nextProfile[key] = clamp(profile[key] ?? BASE_PERSONA_PROFILE[key], 0, 100);
    return nextProfile;
  }, {} as PersonaProfile);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function getMockTimeAdvanceDays(turnCount: number) {
  if (turnCount < 4) {
    return randomInt(120, 730);
  }

  if (turnCount < 9) {
    return randomInt(365, 1460);
  }

  if (turnCount < ENDING_SOON_TURN) {
    return randomInt(730, 2190);
  }

  return randomInt(1095, 3650);
}

export function advanceProfileTime(
  profile: PlayerProfile,
  daysToAdvance: number,
): PlayerProfile {
  let currentYear = profile.currentYear;
  let currentMonth = profile.currentMonth ?? profile.birthMonth;
  let currentDay = profile.currentDay ?? 1;
  let remainingDays = Math.max(0, Math.round(daysToAdvance));

  while (remainingDays > 0 && currentYear < THREE_KINGDOMS_YEAR_RANGE.end) {
    const daysLeftThisMonth = daysInMonth(currentMonth) - currentDay;

    if (remainingDays <= daysLeftThisMonth) {
      currentDay += remainingDays;
      remainingDays = 0;
    } else {
      remainingDays -= daysLeftThisMonth + 1;
      currentDay = 1;
      currentMonth += 1;

      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }
    }
  }

  return {
    ...profile,
    currentYear,
    currentMonth,
    currentDay,
    age: calculateAge(profile.birthYear, profile.birthMonth, currentYear, currentMonth),
  };
}

function calculateAge(
  birthYear: number,
  birthMonth: number,
  currentYear: number,
  currentMonth: number,
) {
  const age = currentYear - birthYear - (currentMonth < birthMonth ? 1 : 0);
  return Math.max(0, age);
}

function daysInMonth(month: number) {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}
