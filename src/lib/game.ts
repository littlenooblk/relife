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

export type StoryState = {
  profile: PlayerProfile;
  currentLocation: string;
  relationships: string[];
  traits: string[];
  inventory: string[];
  history: StoryTurn[];
  isGameOver: boolean;
  intentProfile: PlayerIntentProfile;
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

export const TARGET_STORY_TURNS = 24;
export const ENDING_SOON_TURN = 18;

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
        label: "拜访乡中识字的长者，学习文书与时局",
        intent: "学习文书、观察局势，寻找进入郡县体系的机会",
      },
      {
        id: "trade",
        label: "跟随亲族商旅去邻近郡县见世面",
        intent: "参与商旅，积累见闻和人脉",
      },
      {
        id: "militia",
        label: "加入坞堡或地方守备，换取家人庇护",
        intent: "接受武备训练，靠军功或守备求生",
      },
    ],
    risk: "乱世中每一步都可能带来征发、饥荒、疫病或卷入战事的风险。",
    isEnding: false,
  };
}

export function createMockStoryResponse(request: StoryRequest): StoryResponse {
  const previous = request.state.history.at(-1);
  const turnCount = request.state.history.length;
  const shouldEnd = turnCount >= TARGET_STORY_TURNS - 1;
  const advancedProfile = advanceProfileTime(
    request.state.profile,
    shouldEnd ? randomInt(365, 3650) : getMockTimeAdvanceDays(turnCount),
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

  const turn: StoryTurn = {
    year: advancedProfile.currentYear,
    month: advancedProfile.currentMonth,
    day: advancedProfile.currentDay,
    age: advancedProfile.age,
    title: shouldEnd ? "一生落幕" : "命运分岔",
    narrative: shouldEnd
      ? `你选择了“${request.action}”。此后许多年，你没有再追逐更大的名声，只在亲族、乡邻与时代余波之间守住自己能够守住的东西。乱世终会越过每个人，你的一生也在熟悉的人声里安静收束。`
      : `你选择了“${request.action}”。接下来一段日子里，这件事没有立刻惊动天下，却改变了你在乡里人眼中的位置。你在亲族牵挂、私情取舍、官府征发和远方战报之间学着判断轻重，也开始有人带着真正棘手的请求来找你。`,
    historicalContext: `${advancedProfile.currentYear}年前后，${request.state.currentLocation}仍受${faction}大势影响。地方秩序表面维持，背后却常被粮赋、兵役和交通断绝牵动。`,
    choices: shouldEnd
      ? []
      : [
          {
            id: "protect-family",
            label: "优先保护家人与乡邻，减少冒险",
            intent: "把资源用于家族和乡里安全",
          },
          {
            id: "marriage-duty",
            label: "回应一段婚约或私情，承担随之而来的责任",
            intent: "在爱情、婚姻和家族利益之间做选择",
          },
          {
            id: "travel",
            label: "离开故地，去更大的城邑寻找机会",
            intent: "迁徙到政治或商业中心",
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

function getMockTimeAdvanceDays(turnCount: number) {
  if (turnCount < 6) {
    return randomInt(7, 90);
  }

  if (turnCount < 14) {
    return randomInt(120, 540);
  }

  if (turnCount < ENDING_SOON_TURN) {
    return randomInt(365, 1095);
  }

  return randomInt(730, 2190);
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
