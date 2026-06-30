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

export type PersonaKey =
  | "benevolence"
  | "strategy"
  | "martial"
  | "charisma"
  | "reputation"
  | "wealth";

export type PersonaProfile = Record<PersonaKey, number>;

export type PersonaDeltas = Partial<Record<PersonaKey, number>>;

export type StoryState = {
  profile: PlayerProfile;
  currentLocation: string;
  relationships: string[];
  traits: string[];
  inventory: string[];
  history: StoryTurn[];
  isGameOver: boolean;
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
const BIRTH_YEAR_RANGE = {
  start: THREE_KINGDOMS_YEAR_RANGE.start,
  end: 225,
} as const;

export function createNewLife(): StoryState {
  const birthYear = randomInt(BIRTH_YEAR_RANGE.start, BIRTH_YEAR_RANGE.end);
  const birthMonth = randomInt(1, 12);
  const birthPlace = pickRandom(BIRTH_PLACES);
  const socialClass = pickRandom(SOCIAL_CLASSES);
  const age = randomInt(12, 18);
  const currentYear = birthYear + age;
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
  const regularAdvanceDays = getMockTimeAdvanceDays(turnCount);
  const shouldEnd =
    turnCount >= MAX_STORY_TURNS - 1 ||
    (turnCount >= MIN_STORY_TURNS && request.state.profile.age >= 75);
  const advancedProfile = advanceProfileTime(
    request.state.profile,
    shouldEnd ? randomInt(1095, 4380) : regularAdvanceDays,
  );
  const faction = getFactionForYearAndPlace(
    advancedProfile.currentYear,
    request.state.profile.birthPlace,
  );
  const newResource = pickRandom(["一封乡中荐书", "半袋粟米", "郡中通行木符", "修补过的短刀"]);
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
      personaProfile: request.state.personaProfile,
    },
  };
}

export function normalizeAction(action: string) {
  return action.trim().slice(0, 300);
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

export function applyPersonaDeltas(
  profile: PersonaProfile | undefined,
  deltas: PersonaDeltas | undefined,
): PersonaProfile {
  const nextProfile = clampPersonaProfile({
    ...BASE_PERSONA_PROFILE,
    ...profile,
  });

  if (!deltas) {
    return nextProfile;
  }

  for (const key of PERSONA_KEYS) {
    const delta = deltas[key];

    if (typeof delta === "number" && Number.isFinite(delta)) {
      nextProfile[key] += clamp(delta, -12, 12);
    }
  }

  return clampPersonaProfile(nextProfile);
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

  while (remainingDays > 0) {
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
