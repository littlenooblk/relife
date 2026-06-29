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

export type StoryState = {
  profile: PlayerProfile;
  currentLocation: string;
  relationships: string[];
  traits: string[];
  inventory: string[];
  history: StoryTurn[];
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
  };
}

export function createMockStoryResponse(request: StoryRequest): StoryResponse {
  const previous = request.state.history.at(-1);
  const advancedProfile = advanceProfileTime(
    request.state.profile,
    randomInt(3, 45),
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
    title: "命运分岔",
    narrative: `你选择了“${request.action}”。接下来的几日里，这件事没有立刻惊动天下，却改变了你在乡里人眼中的位置。你在官府征发、宗族庇护和远方战报之间学着判断轻重，也开始有人带着真正棘手的请求来找你。`,
    historicalContext: `${advancedProfile.currentYear}年前后，${request.state.currentLocation}仍受${faction}大势影响。地方秩序表面维持，背后却常被粮赋、兵役和交通断绝牵动。`,
    choices: [
      {
        id: "protect-family",
        label: "优先保护家人与乡邻，减少冒险",
        intent: "把资源用于家族和乡里安全",
      },
      {
        id: "seek-office",
        label: "接受郡中差遣，争取正式身份",
        intent: "进入地方官府或军府体系",
      },
      {
        id: "travel",
        label: "离开故地，去更大的城邑寻找机会",
        intent: "迁徙到政治或商业中心",
      },
    ],
    risk: previous
      ? `上一次的“${previous.title}”仍在影响旁人对你的信任。`
      : "你尚未建立足够声望，贸然行动容易被豪强或官吏利用。",
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
    },
  };
}

export function normalizeAction(action: string) {
  return action.trim().slice(0, 300);
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
