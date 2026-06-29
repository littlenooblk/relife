export type Faction = "曹魏" | "蜀汉" | "东吴" | "群雄割据" | "边郡部族";

export type BirthPlace = {
  name: string;
  presentDay: string;
  region: string;
  factionHints: Faction[];
  geography: string;
  socialTexture: string;
};

export const THREE_KINGDOMS_YEAR_RANGE = {
  start: 184,
  end: 280,
} as const;

export const BIRTH_PLACES: BirthPlace[] = [
  {
    name: "洛阳",
    presentDay: "今河南洛阳",
    region: "司隶",
    factionHints: ["群雄割据", "曹魏"],
    geography: "伊洛河谷，旧都宫阙与市肆密集，交通可达关中、兖豫与荆州。",
    socialTexture: "士族、流民、宦官旧部与军吏混杂，乱世消息传播极快。",
  },
  {
    name: "邺城",
    presentDay: "今河北临漳一带",
    region: "冀州",
    factionHints: ["曹魏"],
    geography: "漳水附近的华北平原重镇，粮田广阔，便于屯兵与转运。",
    socialTexture: "豪强田庄、军府幕僚和征发民户构成日常秩序。",
  },
  {
    name: "许昌",
    presentDay: "今河南许昌",
    region: "豫州",
    factionHints: ["曹魏"],
    geography: "中原腹地，靠近颍水，连接兖州、豫州与司隶。",
    socialTexture: "汉室名义与曹氏军政并存，文吏和屯田客尤多。",
  },
  {
    name: "成都",
    presentDay: "今四川成都",
    region: "益州",
    factionHints: ["蜀汉"],
    geography: "成都平原沃野千里，四周有剑阁、三峡与南中山地屏障。",
    socialTexture: "本地豪族、外来官吏、工匠盐铁户和蜀锦商旅往来频繁。",
  },
  {
    name: "江州",
    presentDay: "今重庆一带",
    region: "巴郡",
    factionHints: ["蜀汉"],
    geography: "长江与嘉陵江交汇，山峡险要，是巴蜀东出的门户。",
    socialTexture: "舟人、盐商、巴賨部众与军屯守备共同塑造地方生活。",
  },
  {
    name: "建业",
    presentDay: "今江苏南京",
    region: "扬州",
    factionHints: ["东吴"],
    geography: "濒临长江下游，水网密布，适合水军、商贸与防守。",
    socialTexture: "江东士族、船匠、水军将校和北来侨民并居。",
  },
  {
    name: "吴郡",
    presentDay: "今江苏苏州一带",
    region: "扬州",
    factionHints: ["东吴"],
    geography: "太湖流域，河港交织，稻作、渔盐和手工业兴盛。",
    socialTexture: "地方大姓影响深远，宗族、佃客与商旅关系紧密。",
  },
  {
    name: "襄阳",
    presentDay: "今湖北襄阳",
    region: "荆州",
    factionHints: ["群雄割据", "曹魏", "蜀汉", "东吴"],
    geography: "汉水中游要冲，北接南阳，南通江陵，常为兵家争夺。",
    socialTexture: "名士、流寓士人、守城军民和水陆商队交错。",
  },
  {
    name: "江陵",
    presentDay: "今湖北荆州",
    region: "荆州",
    factionHints: ["群雄割据", "蜀汉", "东吴"],
    geography: "长江中游重镇，水陆汇合，粮仓与船坞价值极高。",
    socialTexture: "地方官府、军营、粮吏和迁徙百姓围绕江防生活。",
  },
  {
    name: "凉州武威",
    presentDay: "今甘肃武威",
    region: "凉州",
    factionHints: ["群雄割据", "曹魏", "边郡部族"],
    geography: "河西走廊东段，连接关中、西域与羌胡诸部。",
    socialTexture: "边军、羌胡互市、马牧和豪强坞堡构成边郡气质。",
  },
  {
    name: "交趾",
    presentDay: "今越南北部及广西南部相关区域",
    region: "交州",
    factionHints: ["东吴", "群雄割据"],
    geography: "岭南以南，气候湿热，江河纵横，远离中原核心战场。",
    socialTexture: "汉人郡县、当地部族、海贸商人与士氏旧势力并存。",
  },
  {
    name: "辽东襄平",
    presentDay: "今辽宁辽阳一带",
    region: "辽东",
    factionHints: ["群雄割据", "曹魏", "边郡部族"],
    geography: "东北边郡重地，近海与山地并存，和乌桓、鲜卑往来频繁。",
    socialTexture: "公孙氏旧部、屯戍军户、边贸商旅和胡汉杂居。",
  },
];

export const HISTORICAL_CONTEXT = `
时代范围：公元184年至280年，涵盖黄巾之乱、董卓乱政、群雄割据、赤壁之后三国鼎立、魏蜀吴后期与西晋统一。
地理范围：以当时中国郡县与边郡为主，包括中原、关中、河北、荆州、益州、江东、凉州、辽东、交州等区域。
社会背景：东汉末年户籍崩坏，流民、坞堡、豪强、屯田、征兵、徭役、疫病与饥荒影响普通人的命运。士族门第、察举征辟、军功、宗族庇护、商旅与手工业都可能改变人生走向。
叙事约束：不要让普通玩家轻易改变重大历史结局。可以与历史人物擦肩而过、受其政策影响，或在地方层面产生影响；重大事件必须符合大体时间线和地理逻辑。
`;

export function describePlace(place: BirthPlace) {
  return `${place.name}（${place.presentDay}，${place.region}）：${place.geography}${place.socialTexture}`;
}

export function getFactionForYearAndPlace(year: number, place: BirthPlace): Faction {
  if (year < 200) {
    return place.factionHints.includes("群雄割据") ? "群雄割据" : place.factionHints[0];
  }

  if (place.factionHints.includes("蜀汉") && year >= 214) {
    return "蜀汉";
  }

  if (place.factionHints.includes("东吴") && year >= 222) {
    return "东吴";
  }

  if (place.factionHints.includes("曹魏") && year >= 220) {
    return "曹魏";
  }

  return place.factionHints[0];
}
