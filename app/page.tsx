'use client';

import { useEffect, useMemo, useState } from 'react';

type LeadKey = 'su' | 'ning' | 'qing' | 'gu' | 'liu';
type EndingKey = 'vessel' | 'su' | 'qing' | 'liu' | 'gu' | 'ning' | 'true';

type StoryState = {
  nerve: number;
  guile: number;
  mercy: number;
  ash: number;
  bonds: Record<LeadKey, number>;
  flags: string[];
};

type Choice = {
  label: string;
  tone: string;
  next: string;
  apply?: (state: StoryState) => StoryState;
};

type Scene = {
  title: string;
  location: string;
  progress: number;
  paragraphs: (state: StoryState) => string[];
  choices: (state: StoryState, found: EndingKey[]) => Choice[];
};

type HistoryEntry = {
  sceneId: string;
  state: StoryState;
  trail: string[];
};

const LEADS: Record<LeadKey, { name: string; age: number; title: string; mark: string; description: string }> = {
  su: {
    name: '苏晚照',
    age: 28,
    title: '青冥剑首',
    mark: '剑',
    description: '寡言，守诺。她的温柔从不说出口，只会在剑锋偏开半寸时被人看见。',
  },
  ning: {
    name: '宁红绡',
    age: 31,
    title: '残骨魔君',
    mark: '契',
    description: '被封在烬骨中的旧日魔修。笑意轻慢，句句像试探，却从不掩饰自己要什么。',
  },
  qing: {
    name: '沈青檀',
    age: 26,
    title: '丹堂执炉',
    mark: '丹',
    description: '温静得近乎无害，擅长药理与人心。她递来的每一味药，都有药方之外的用意。',
  },
  gu: {
    name: '顾寒灯',
    age: 34,
    title: '执律使',
    mark: '律',
    description: '代掌宗门刑律，端严冷峻。她相信秩序，却不一定相信制定秩序的人。',
  },
  liu: {
    name: '柳问棠',
    age: 24,
    title: '外门知客',
    mark: '局',
    description: '以消息换命的局中人。看似散漫爱笑，真正的心思总藏在笑声停下之后。',
  },
};

const ENDINGS: Record<EndingKey, { no: string; title: string; lead?: LeadKey; summary: string; paragraphs: string[] }> = {
  vessel: {
    no: '终局·零',
    title: '炉中人',
    summary: '你活了下来，只是活下来的不再全是你。',
    paragraphs: [
      '你迟疑的那一息，恰好够阵法合拢。三十六道魂火沿石阶次第亮起，照得每个人脸上都没有阴影。',
      '大长老说这是新生。你听见自己的声音从很远的地方回答，说弟子明白。',
      '后来青冥宗多了一位天资绝世的少宗主。他不眠，不怒，也再没有叫对过任何一个旧人的名字。',
      '只有夜深时，掌心那道裂纹会轻轻发热。仿佛有谁隔着一副已经不属于你的骨头，一遍遍叩门。',
    ],
  },
  su: {
    no: '终局·一',
    title: '剑冠青冥',
    lead: 'su',
    summary: '她替你开山门，你替她斩旧规。',
    paragraphs: [
      '苏晚照接住你掷出的阵印，只出了一剑。那剑没有惊天声势，只让高台与旧日戒律从正中缓缓分开。',
      '天亮后，她把剑首玉冠放在你面前，说从今日起，青冥宗只认活人，不认祭品。',
      '你问她为何信你。她俯身替你系紧染血的护腕，指尖在腕骨处停了片刻。近得能听见呼吸，却没有一句多余解释。',
      '窗外新雪落满长阶。她起身时，袖口从你掌心慢慢抽走，只留下一句：“伤好以后，陪我去改一改这座山。”',
      '门扉合拢，灯影并在一处。余下的话，被风雪留在了屋外。',
    ],
  },
  qing: {
    no: '终局·二',
    title: '丹炉春雪',
    lead: 'qing',
    summary: '最温柔的药，终于毒死了最古老的规矩。',
    paragraphs: [
      '沈青檀将那枚灰白丹丸投入主炉。炉火先青后红，供奉百年的夺灵阵在一阵药香里寸寸锈蚀。',
      '她早把解药分给了所有祭品，唯独没给大长老留一份。旁人这才明白，她温顺了七年，只为等今夜这一炉火。',
      '你醒在丹堂深处。她散着长发坐在榻边，替你换最后一道药，神情仍是那般不疾不徐。',
      '“会疼。”她说。你说已经不疼了。她抬眼看你，似笑非笑，指腹却没有立刻离开那道伤痕。',
      '炉火烧了一夜。帘外落雪无声，帘内药香渐暖，故事在将明未明处轻轻收住。',
    ],
  },
  liu: {
    no: '终局·三',
    title: '满堂假面',
    lead: 'liu',
    summary: '你们把真相卖给天下，也把彼此留作唯一不卖的秘密。',
    paragraphs: [
      '柳问棠把账册抛向半空时，早埋在山下的留影符同时亮了。青冥宗百年血债，一夜传遍九州。',
      '大长老想逃，却发现每条退路都被一个不起眼的外门知客提前标好了价。',
      '三日后，你在山外酒肆找到她。她已换过姓名与衣裳，唯独腕间那根从你衣角撕下的布带还在。',
      '她靠近替你摘掉易容面具，笑问这张脸以后还卖不卖。你扣住她的手，说不卖。那笑意便一点点淡下来，露出极少给人看的认真。',
      '酒肆提前打烊。门上挂着“东主有喜”，究竟喜从何来，只有两个人知道。',
    ],
  },
  gu: {
    no: '终局·四',
    title: '寒灯执律',
    lead: 'gu',
    summary: '她以锁链试你，也把锁链的另一端交到了你手中。',
    paragraphs: [
      '顾寒灯念完最后一条罪名，亲手将刑律金印按在大长老眉心。满殿长老无人敢动，因为每个人的名字都在她身后的罪卷上。',
      '你成为新律的第一位见证者，也是唯一能在子夜进入执律殿而不必通报的人。',
      '那盏寒灯下，她替你解开魂锁。金链褪去时留下细红痕迹，她看了许久，忽然问你是否后悔把性命交给她。',
      '你将那截已经无用的锁链绕回她腕上，低声说，现在轮到你回答。她一贯平稳的呼吸，终于乱了一拍。',
      '灯火随后熄灭。律令写到了黎明，至于中间缺失的两页，无人获准查阅。',
    ],
  },
  ning: {
    no: '终局·五',
    title: '红绡共命',
    lead: 'ning',
    summary: '你没有成为她的容器；你们成为彼此唯一的破绽。',
    paragraphs: [
      '你放开最后一道心防时，宁红绡没有夺舍。她借你的手折断祭骨，又把足以重生的半数魂火推回你体内。',
      '大长老至死也不明白，世上最危险的血契不是支配，而是两个人都肯把后背交出去。',
      '离山那夜，她终于有了自己的影子。红衣从月下掠过，停在你一步之外，问你怕不怕养一位声名狼藉的魔君。',
      '你说怕。她眯起眼，你却握住了她的手。那只手起初微凉，很快便与掌心同温。',
      '月色被门扉挡在身后。血契在腕间缓慢发亮，像两道心跳终于找到了同一个节拍。',
    ],
  },
  true: {
    no: '隐局·真',
    title: '山门之外',
    summary: '通关并非选对一个人，而是让所有被选中的人都能走出棋盘。',
    paragraphs: [
      '你没有碰阵印，也没有杀大长老。你转身击碎第七盏无人看守的魂灯——那才是整座青冥山真正的主人。',
      '灯灭的一刻，苏晚照的剑、沈青檀的药、柳问棠的账册、顾寒灯的罪卷与宁红绡的残魂同时失去了枷锁。',
      '原来所谓五条命路，从来不是要你挑选谁留下，而是教你看清谁在逼所有人彼此争夺。',
      '黎明时，五个方向各有一道山门打开。有人留下重建，有人远行还债，也有人只在经过你身旁时，把一句约定压得很轻。',
      '你没有得到一座宗门。你得到的是比宗门更难驾驭的东西——选择下一步人生的自由。',
    ],
  },
};

const freshState = (): StoryState => ({
  nerve: 0,
  guile: 0,
  mercy: 0,
  ash: 0,
  bonds: { su: 0, ning: 0, qing: 0, gu: 0, liu: 0 },
  flags: [],
});

function gain(
  state: StoryState,
  delta: Partial<Pick<StoryState, 'nerve' | 'guile' | 'mercy' | 'ash'>> = {},
  bond?: [LeadKey, number],
  flags: string[] = [],
): StoryState {
  const bonds = { ...state.bonds };
  if (bond) bonds[bond[0]] += bond[1];
  return {
    ...state,
    nerve: state.nerve + (delta.nerve ?? 0),
    guile: state.guile + (delta.guile ?? 0),
    mercy: state.mercy + (delta.mercy ?? 0),
    ash: state.ash + (delta.ash ?? 0),
    bonds,
    flags: [...new Set([...state.flags, ...flags])],
  };
}

function has(state: StoryState, flag: string) {
  return state.flags.includes(flag);
}

function allyOf(state: StoryState): LeadKey {
  if (has(state, 'ally_su')) return 'su';
  if (has(state, 'ally_qing')) return 'qing';
  return 'liu';
}

function highestBond(state: StoryState): LeadKey | null {
  const ranked = (Object.keys(state.bonds) as LeadKey[]).sort((a, b) => state.bonds[b] - state.bonds[a]);
  return state.bonds[ranked[0]] > 0 ? ranked[0] : null;
}

const SCENES: Record<string, Scene> = {
  test: {
    title: '验骨',
    location: '青冥宗 · 问心坪',
    progress: 8,
    paragraphs: () => [
      '铜钟第九响落下时，验骨石在你掌下裂开一道细缝。满山灯火像被谁捏住灯芯，齐齐暗了一瞬。',
      '高台上，执剑的白衣女子终于抬眼。她没有看石头，只看你的手。目光极轻，却像一寸冷刃，从腕骨慢慢量到指尖。',
      '“陆沉，二十二岁，废灵根。”司礼长老把你的名字念得毫无起伏，“石裂，便是心术不正。”',
      '袖中那截残骨忽然发烫。一个陌生女人的声音贴着识海响起，带着笑，也带着三百年未散的冷意：“别松手。他们等的就是你怕。”',
    ],
    choices: () => [
      { label: '按住裂缝，反问长老：此石验的是灵根，还是活祭？', tone: '当众破局', next: 'exposure', apply: (s) => gain(s, { nerve: 2 }, ['su', 1], ['defied']) },
      { label: '顺势收手，把袖中残骨压得更深。', tone: '藏锋待变', next: 'silk', apply: (s) => gain(s, { guile: 2 }, ['liu', 1], ['concealed']) },
      { label: '循着识海中的声音，让那截残骨贴上掌心。', tone: '应答禁忌', next: 'marrow', apply: (s) => gain(s, { ash: 2 }, ['ning', 1], ['answered']) },
    ],
  },
  exposure: {
    title: '一剑作证',
    location: '问心坪 · 万人之前',
    progress: 17,
    paragraphs: () => [
      '人群先静，继而哗然。司礼长老抬手便要封你的喉，一柄没有出鞘的剑却先横在两人之间。',
      '“石中有血。”白衣女子从高台走下。她叫苏晚照，二十八岁，是青冥宗这一代最年轻的剑首。',
      '她用剑鞘挑起你的手，动作疏冷，拇指却不动声色地遮住了那道正在渗血的裂纹。',
      '殿门阴影里，执律使顾寒灯翻开一卷金册。她三十四岁，眉眼比手中律令更冷：“敢在入门大典质疑长老。给我一个不处置你的理由。”',
    ],
    choices: () => [
      { label: '借苏晚照的剑鞘划开验骨石，让石中血阵见光。', tone: '证据先行', next: 'judgment', apply: (s) => gain(s, { nerve: 1 }, ['su', 1], ['sword_mark']) },
      { label: '直视顾寒灯：先查石，再查我。顺序错了，律令便是笑话。', tone: '以律压律', next: 'judgment', apply: (s) => gain(s, { guile: 1 }, ['gu', 1], ['law_notice']) },
      { label: '不再解释，只把染血的手掌举给满山弟子看。', tone: '逼众人表态', next: 'judgment', apply: (s) => gain(s, { mercy: 1, nerve: 1 }, undefined, ['witnesses']) },
    ],
  },
  silk: {
    title: '袖底藏针',
    location: '问心坪 · 人潮暗处',
    progress: 17,
    paragraphs: () => [
      '你退得恰到好处，仿佛当真只是一个被吓住的落选弟子。司礼长老移开视线的同时，一枚薄如蝉翼的纸片滑进你袖中。',
      '身旁女子笑吟吟地替你挡住半步。柳问棠，二十四岁，外门知客。她嗓音不高：“别回头。想活，先学会让别人以为你不值钱。”',
      '纸片上只有两个字：石下。墨迹沾着极淡的丹香。丹堂那边，沈青檀正垂眸整理药匣，二十六岁的面容温静得像与此事毫无关系。',
      '下一刻，你袖中残骨再度升温。柳问棠的手掌恰好覆上你手腕，替你压住异动。她靠得很近，笑意却没有抵达眼底：“你袖子里的东西，价钱大得吓人。”',
    ],
    choices: () => [
      { label: '把纸片折回她掌心：消息可以卖，先报买主。', tone: '反客为主', next: 'judgment', apply: (s) => gain(s, { guile: 1 }, ['liu', 1], ['ledger_hint']) },
      { label: '借整理衣袖，给沈青檀看一眼掌心血色。', tone: '试探丹堂', next: 'judgment', apply: (s) => gain(s, { mercy: 1 }, ['qing', 1], ['medicine_hint']) },
      { label: '任柳问棠按着手腕，低声问她敢不敢做一笔赔命的买卖。', tone: '共设险局', next: 'judgment', apply: (s) => gain(s, { nerve: 1, guile: 1 }, ['liu', 1], ['shared_risk']) },
    ],
  },
  marrow: {
    title: '骨中红绡',
    location: '识海 · 无灯之室',
    progress: 17,
    paragraphs: () => [
      '残骨贴上掌心的一刻，山门从眼前退去。你站在一间没有门窗的暗室里，红衣女子斜倚在唯一一盏灯旁。',
      '她自称宁红绡，封骨时三十一岁。那双眼像在漫长岁月里看透过太多人，却仍肯对你留三分兴味。',
      '“他们要拿你盛我。”她抬起你的手，隔着神魂端详掌纹，“可惜这副骨头已经先认了主。”',
      '她的指尖从掌心移到腕脉，所过之处烧起一线微热。你分不清那是血契，还是她故意留下的提醒。',
    ],
    choices: () => [
      { label: '扣住她的手腕：认主可以，谁是谁的主，另说。', tone: '与魔争锋', next: 'judgment', apply: (s) => gain(s, { nerve: 1, ash: 1 }, ['ning', 1], ['equal_pact']) },
      { label: '先退出识海，不给她第二次触碰神魂的机会。', tone: '守住心门', next: 'judgment', apply: (s) => gain(s, { mercy: 1 }, undefined, ['guarded']) },
      { label: '告诉她一个假名字，顺便问出夺舍阵的阵眼。', tone: '欺魔问路', next: 'judgment', apply: (s) => gain(s, { guile: 2 }, ['ning', 1], ['false_name']) },
    ],
  },
  judgment: {
    title: '三条生路',
    location: '青冥宗 · 戒律阶',
    progress: 29,
    paragraphs: (s) => [
      has(s, 'defied') ? '你逼验骨石显出了半道血阵，司礼长老却反咬你以邪术污损宗门圣物。' : '你虽没有当场揭开石中秘密，袖中残骨的异动仍被护山阵捕捉。司礼长老当即封锁山门。',
      '顾寒灯命人押你去照魂殿。苏晚照经过时，把一枚薄薄剑符弹入你掌心；沈青檀的药童在阶下故意撞翻药箱；更远处，柳问棠正把一扇本不该开启的侧门留出半尺。',
      '三个人，三条路。每一条都像救命，也都像更精致的圈套。山顶钟声再响，留给你的只有一次决定。',
    ],
    choices: () => [
      { label: '捏碎剑符，跟苏晚照走。', tone: '以剑破围', next: 'swordroom', apply: (s) => gain(s, { nerve: 1 }, ['su', 2], ['ally_su']) },
      { label: '借药雾遮身，进入沈青檀的丹房。', tone: '以药藏锋', next: 'furnace', apply: (s) => gain(s, { mercy: 1 }, ['qing', 2], ['ally_qing']) },
      { label: '穿过侧门，把命押给柳问棠的消息。', tone: '以局换命', next: 'archive', apply: (s) => gain(s, { guile: 1 }, ['liu', 2], ['ally_liu']) },
    ],
  },
  swordroom: {
    title: '剑室听雪',
    location: '洗剑峰 · 无名剑室',
    progress: 40,
    paragraphs: () => [
      '剑符碎后，你被一阵清寒剑气卷入偏峰。门外追兵从雪地经过三次，没有一人看见这间近在咫尺的石室。',
      '苏晚照背对着你解下染血护腕。方才替你挡下的那一掌，在她肩后留了一线暗红。她说无碍，声音仍稳，脸色却比窗外积雪更淡。',
      '你替她重新缠好伤处。两人隔得太近，她散落的一缕长发擦过你的指节。她没有退，只在你系紧布带时轻声问：“袖中那个人，可信么？”',
      '石室很冷，那一句话却让残骨烫了一下。宁红绡在识海里轻笑，没有回答。',
    ],
    choices: () => [
      { label: '把血契之事全部告诉苏晚照。', tone: '交付秘密', next: 'midnight', apply: (s) => gain(s, { mercy: 1 }, ['su', 1], ['told_ally']) },
      { label: '只说夺舍阵，把宁红绡留下作为自己的底牌。', tone: '留一寸暗刃', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, undefined, ['kept_secret']) },
      { label: '反问她为何冒险救你。', tone: '逼近真心', next: 'midnight', apply: (s) => gain(s, { nerve: 1 }, ['su', 1], ['asked_why']) },
    ],
  },
  furnace: {
    title: '炉火无声',
    location: '丹霞谷 · 第七炉室',
    progress: 40,
    paragraphs: () => [
      '沈青檀把你藏进一座熄火丹炉。追兵推门时，她正慢条斯理地净手，连眼睫都没有乱。',
      '人走后，她开启暗门放你出来，指尖按上你心口，隔着衣料探查烬骨侵入经脉的程度。药香很淡，掌下温度却清晰得令人无法忽略。',
      '“忍一忍。”银针落下前，她靠近提醒。你以为她说的是针，下一刻才发现她已从你血脉里逼出一缕会说话的红雾。',
      '宁红绡在雾中冷笑。沈青檀也笑，仍是温柔模样：“原来前辈醒着。那我们便把条件当面谈清楚。”',
    ],
    choices: () => [
      { label: '让沈青檀继续施针，借疼痛验证她是否动了手脚。', tone: '以身试药', next: 'midnight', apply: (s) => gain(s, { nerve: 1 }, ['qing', 1], ['trusted_medicine']) },
      { label: '握住她执针的手：先告诉我，你为何早备了解契药。', tone: '温言逼供', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, ['qing', 1], ['asked_formula']) },
      { label: '允许她读取一段血契记忆，但隐去宁红绡的真名。', tone: '半真半假', next: 'midnight', apply: (s) => gain(s, { mercy: 1, guile: 1 }, undefined, ['shared_memory']) },
    ],
  },
  archive: {
    title: '账册之后',
    location: '外门 · 封卷阁',
    progress: 40,
    paragraphs: () => [
      '侧门后不是出路，而是一排贴满禁符的旧账柜。柳问棠反手合门，把你压进书架与墙壁之间，自己则挡在唯一能被窗外看见的位置。',
      '追兵的灯影从窗纸掠过。她一手抵在你肩侧，一手按住你腕间越来越亮的血纹。呼吸近在咫尺，语气却仍带三分戏谑：“陆公子，这笔买卖比我想的还烫手。”',
      '待脚步远去，她没有立刻松开。你从她眼底看见短暂的迟疑，随即被熟悉的笑意藏住。',
      '她身后的暗柜已经打开。里面不是功法，而是三十六名失踪弟子的生辰与入门日期——每一个都与今夜的祭阵对应。',
    ],
    choices: () => [
      { label: '把账册收入怀中，答应替她把这些名字带到天亮。', tone: '替死者作证', next: 'midnight', apply: (s) => gain(s, { mercy: 1 }, ['liu', 1], ['took_ledger']) },
      { label: '问她真正的买主是谁，不接受没有底价的同盟。', tone: '先拆她的局', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, ['liu', 1], ['named_buyer']) },
      { label: '趁追兵折返，与她共同烧掉假账、留下唯一真本。', tone: '共担罪名', next: 'midnight', apply: (s) => gain(s, { nerve: 1, guile: 1 }, ['liu', 1], ['burned_decoy']) },
    ],
  },
  midnight: {
    title: '子夜问契',
    location: '青冥宗 · 地脉之下',
    progress: 54,
    paragraphs: (s) => [
      `子夜将至，${LEADS[allyOf(s)].name}带你抵达地脉入口。石门上嵌着三十六枚命灯，灯芯跳动的节奏竟与山中弟子的心跳一致。`,
      '宁红绡借铜镜显出身影。她说青冥宗每十年借入门大典挑选容器，以新弟子的骨血温养一位沉睡在山底的“祖师”。你是百年来唯一能反吞阵法的人。',
      '顾寒灯也在此时现身。她没有召来追兵，只将一条金色魂锁放在石阶上：“让我锁住你体内的魔魂，我能以执律使之名保你到开审。”',
      '镜中红衣俯近你的倒影，声音像从耳畔拂过：“让她锁。再让我顺着锁链，看看这位执律使究竟把心藏在哪里。”',
    ],
    choices: () => [
      { label: '接受顾寒灯的魂锁，但要求锁链两端各留一道生门。', tone: '以律为盾', next: 'trial', apply: (s) => gain(s, { mercy: 1 }, ['gu', 2], ['law_path']) },
      { label: '拒绝魂锁，与宁红绡补全平等血契。', tone: '与魔共命', next: 'trial', apply: (s) => gain(s, { ash: 2 }, ['ning', 2], ['blood_path']) },
      { label: '让顾寒灯以为锁住了宁红绡，也让宁红绡以为你会替她开门。', tone: '两面设局', next: 'trial', apply: (s) => gain(s, { guile: 2 }, ['gu', 1], ['double_path']) },
    ],
  },
  trial: {
    title: '照魂开审',
    location: '祖师殿 · 三十六灯',
    progress: 68,
    paragraphs: (s) => [
      '开审时，祖师殿坐满了人。苏晚照的剑搁在膝上，沈青檀捧着一只未点火的药炉，柳问棠站在最末一排，顾寒灯居于律席。宁红绡则安静得反常。',
      `你呈上的${has(s, 'ally_su') ? '剑痕拓印' : has(s, 'ally_qing') ? '血阵药引' : '失踪账册'}只让殿中沉默了一瞬。大长老随即笑了。他承认所有指控，因为在他看来，三十六条外门弟子的命，本就是供宗门延续的柴薪。`,
      '殿门轰然闭合。命灯一盏接一盏燃起，你的骨骼深处传来细碎裂响。原来所谓开审，正是最后一道祭礼。',
      '大长老向你伸手，慈和得像要接一个迷途弟子回家：“不要抵抗。待祖师醒来，你的名字会被供奉千年。”',
    ],
    choices: () => [
      { label: '公开证据，让所有被当作祭品的弟子同时看见真相。', tone: '以众生破局', next: 'crucible', apply: (s) => gain(s, { mercy: 2, nerve: 1 }, undefined, ['exposed']) },
      { label: '假意跪下，等夺舍阵吞入第一缕神魂再反咬阵主。', tone: '请君入瓮', next: 'crucible', apply: (s) => gain(s, { guile: 2 }, undefined, ['baited']) },
      { label: '放开烬骨，让宁红绡的魔息沿三十六盏灯逆流。', tone: '借魔焚阵', next: 'crucible', apply: (s) => gain(s, { ash: 2, nerve: 1 }, ['ning', 1], ['opened_bone']) },
      { label: '停止抵抗，相信所谓“祖师新生”会保留你的意识。', tone: '危险抉择', next: 'ending:vessel' },
    ],
  },
  crucible: {
    title: '满殿燃骨',
    location: '祖师殿 · 阵心',
    progress: 82,
    paragraphs: (s) => [
      has(s, 'baited')
        ? '你任由夺舍阵咬住一缕神魂，又在它最贪婪时骤然收紧心门。阵势倒卷，大长老第一次露出惊惶。'
        : has(s, 'opened_bone')
          ? '红色魔息从你腕间奔涌而出，却没有夺走你的身体。宁红绡把自己的残魂烧成一场火，替你照见阵法所有裂隙。'
          : '三十六名弟子同时看见命灯中的自己。恐惧只持续了一瞬，下一刻，三十六道挣扎同时从阵内爆发。',
      `${LEADS[allyOf(s)].name}最先响应你。${has(s, 'ally_su') ? '剑光截断殿门，替所有人守住退路。' : has(s, 'ally_qing') ? '药炉轰然点燃，将控制神魂的香气烧作无害白雾。' : '藏在账册夹层的符纸飞满大殿，把每一张有罪的脸映给山外。'}`,
      '顾寒灯撕去律席后的旧祖训，金色锁链转而缠住长老们的手腕。铜镜里，宁红绡的红衣被火光吹得猎猎作响。',
      '阵心终于暴露。你只有一次出手机会，也只能决定这场胜利最先救下什么。',
    ],
    choices: (s) => [
      { label: '先斩三十六盏命灯，放所有祭品离开阵法。', tone: '先救人', next: 'finale', apply: (x) => gain(x, { mercy: 2 }, [allyOf(s), 1], ['freed']) },
      { label: '先夺宗主金印，以整座护山阵反压大长老。', tone: '先夺权', next: 'finale', apply: (x) => gain(x, { nerve: 2 }, undefined, ['seized']) },
      { label: `把阵心交给${LEADS[allyOf(s)].name}，自己承受烬骨反噬。`, tone: '把后背交出去', next: 'finale', apply: (x) => gain(x, { mercy: 1, ash: 1 }, [allyOf(s), 2], ['entrusted']) },
    ],
  },
  finale: {
    title: '天将明',
    location: '青冥宗 · 破晓之前',
    progress: 94,
    paragraphs: (s) => [
      has(s, 'freed')
        ? '最后一盏命灯熄灭，三十六名弟子跌出阵外。有人哭，有人笑，更多的人只是第一次真正看清这座山。'
        : has(s, 'seized')
          ? '宗主金印落入掌心，整座青冥山随你一念俯首。曾经高坐云端的人跪了一地，连风都不敢越过你的肩。'
          : `阵心在${LEADS[allyOf(s)].name}手中碎裂。你承受了反噬，却也因此让烬骨彻底记住了你的名字。`,
      '大长老已经败了，真正困难的选择却在胜利之后到来：由谁定义今夜，由谁与你共同承担下一段因果。',
      '东方浮起第一线灰白。苏晚照、沈青檀、柳问棠、顾寒灯与宁红绡各自站在不同的光影里。没有人催你，但每一条路都将从此改变。',
    ],
    choices: (s, found) => {
      const ally = allyOf(s);
      const base: Choice[] = [
        {
          label: ally === 'su' ? '把宗主金印递给苏晚照，与她重立山门。' : ally === 'qing' ? '把阵中魂火交给沈青檀，与她救醒所有祭品。' : '把真账交给柳问棠，与她让九州共同审判青冥宗。',
          tone: `走向${LEADS[ally].name}`,
          next: `ending:${ally}`,
        },
      ];
      if (has(s, 'law_path') || has(s, 'double_path')) {
        base.push({ label: '接过顾寒灯的罪卷，成为新律的第一个执笔人。', tone: '走向顾寒灯', next: 'ending:gu' });
      }
      if (has(s, 'blood_path') || has(s, 'double_path') || s.ash >= 5) {
        base.push({ label: '握住宁红绡伸来的手，让平等血契成为她的新肉身。', tone: '走向宁红绡', next: 'ending:ning' });
      }
      base.push({ label: '独自占据烬骨与宗门，拒绝任何人靠近阵心。', tone: '力量仍有代价', next: 'ending:vessel' });
      if (found.length >= 3) {
        base.unshift({ label: '不选任何一条命路——击碎那盏从未被计入阵法的第七灯。', tone: '已解锁 · 命外之路', next: 'ending:true' });
      }
      return base;
    },
  },
};

const NUMBER_MARKS = ['壹', '贰', '叁', '肆', '伍'];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState('test');
  const [state, setState] = useState<StoryState>(() => freshState());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trail, setTrail] = useState<string[]>([]);
  const [endingId, setEndingId] = useState<EndingKey | null>(null);
  const [foundEndings, setFoundEndings] = useState<EndingKey[]>([]);
  const [showCodex, setShowCodex] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('jinggu-found-endings');
    if (saved) {
      try { setFoundEndings(JSON.parse(saved)); } catch { /* ignore damaged local data */ }
    }
  }, []);

  const scene = SCENES[sceneId];
  const choices = useMemo(() => endingId ? [] : scene.choices(state, foundEndings), [endingId, scene, state, foundEndings]);
  const closest = highestBond(state);

  function choose(choice: Choice) {
    setHistory((items) => [...items, { sceneId, state, trail }]);
    const nextState = choice.apply ? choice.apply(state) : state;
    setState(nextState);
    setTrail((items) => [...items, choice.tone]);

    if (choice.next.startsWith('ending:')) {
      const id = choice.next.replace('ending:', '') as EndingKey;
      setEndingId(id);
      setFoundEndings((items) => {
        const next = items.includes(id) ? items : [...items, id];
        window.localStorage.setItem('jinggu-found-endings', JSON.stringify(next));
        return next;
      });
      return;
    }
    setSceneId(choice.next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function rewind() {
    const previous = history.at(-1);
    if (!previous) return;
    setSceneId(previous.sceneId);
    setState(previous.state);
    setTrail(previous.trail);
    setEndingId(null);
    setHistory((items) => items.slice(0, -1));
  }

  function restart() {
    setStarted(true);
    setSceneId('test');
    setState(freshState());
    setHistory([]);
    setTrail([]);
    setEndingId(null);
    setShowMap(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!started || endingId || showCodex || showMap) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) choose(choices[index]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ending = endingId ? ENDINGS[endingId] : null;
  const progress = ending ? 100 : scene.progress;

  return (
    <main className="story-shell">
      <div className="mist mist-one" aria-hidden="true" />
      <div className="mist mist-two" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" onClick={() => setStarted(false)} aria-label="返回封面">
          <span className="seal">烬</span>
          <span><small>第一卷 · 试玩</small><strong>烬骨录</strong></span>
        </button>
        <nav aria-label="游戏功能">
          <button onClick={() => setShowCodex(true)}>人物录</button>
          <button onClick={() => setShowMap(true)}>命轨 <i>{foundEndings.length}/7</i></button>
          <button onClick={rewind} disabled={!history.length}>回到上一决意</button>
        </nav>
      </header>

      {!started ? (
        <section className="cover-card">
          <p className="kicker">青冥宗入门大典 · 子时</p>
          <h1>这一夜，山门择徒。<br />也择一副最合适的骨头。</h1>
          <p className="lede">
            你是陆沉，二十二岁。灵根尽毁，本该止步山下，却在验骨石前听见一个只有你能听见的女人声音。
          </p>
          <div className="cover-actions">
            <button className="primary" onClick={() => setStarted(true)}>踏入山门 <span>→</span></button>
            {foundEndings.length > 0 && <button className="text-button" onClick={() => setShowMap(true)}>查看已解锁命轨</button>}
          </div>
          <div className="cover-meta">
            <span>约 10–15 分钟</span><span>9 次关键抉择</span><span>6 个基础结局 + 1 隐局</span>
          </div>
          <p className="notice">本作所有角色均为成年人 · 含危险关系、权力博弈与含蓄亲密描写</p>
        </section>
      ) : (
        <div className="game-layout">
          <section className="story-card" aria-live="polite">
            <div className="scene-head">
              <span>{ending ? ending.no : scene.location}</span>
              <i />
              <span>{ending ? '命轨已定' : `${String(trail.length + 1).padStart(2, '0')} · ${scene.title}`}</span>
            </div>

            {ending ? (
              <article className="ending-view">
                <p className="kicker">{ending.no}</p>
                <h2>{ending.title}</h2>
                <p className="ending-summary">{ending.summary}</p>
                <div className="prose">
                  {ending.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
                <div className="ending-actions">
                  <button className="primary" onClick={restart}>再入山门</button>
                  <button className="outline" onClick={() => setShowMap(true)}>查看命轨</button>
                  <button className="text-button" onClick={rewind}>回到最后抉择</button>
                </div>
              </article>
            ) : (
              <article className="passage" key={sceneId}>
                <div className="prose">
                  {scene.paragraphs(state).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
                <div className="choices" aria-label="选择行动">
                  {choices.map((choice, index) => (
                    <button key={`${sceneId}-${index}`} onClick={() => choose(choice)}>
                      <b>{NUMBER_MARKS[index]}</b>
                      <span><small>{choice.tone}</small>{choice.label}</span>
                      <em>{index + 1}</em>
                    </button>
                  ))}
                </div>
              </article>
            )}
          </section>

          <aside className="destiny-panel">
            <p className="panel-title">此行命势</p>
            <div className="progress-orb"><span>{progress}</span><small>%</small></div>
            <dl>
              <div><dt>抉择</dt><dd>{trail.length} 次</dd></div>
              <div><dt>锋芒</dt><dd>{state.nerve >= 5 ? '已出鞘' : state.nerve >= 2 ? '渐露' : '未显'}</dd></div>
              <div><dt>心机</dt><dd>{state.guile >= 5 ? '局中局' : state.guile >= 2 ? '藏锋' : '坦白'}</dd></div>
              <div><dt>烬骨</dt><dd>{state.ash >= 5 ? '将苏醒' : state.ash >= 2 ? '有回声' : '沉寂'}</dd></div>
            </dl>
            <div className="bond-card">
              <small>当前最深牵系</small>
              <strong>{closest ? LEADS[closest].name : '尚未结缘'}</strong>
              <span>{closest ? LEADS[closest].title : '你的选择会留下痕迹'}</span>
            </div>
            <p className="key-hint">按数字键 1–4 也可选择</p>
          </aside>
        </div>
      )}

      {started && (
        <footer className="progress-row">
          <span>{ending ? ending.title : scene.title}</span>
          <i><em style={{ width: `${progress}%` }} /></i>
          <span>{ending ? '本次命轨完成' : '剧情将继续向前'}</span>
        </footer>
      )}

      {showCodex && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCodex(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="人物录" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><p className="kicker">五种因果</p><h2>人物录</h2></div><button onClick={() => setShowCodex(false)}>关闭</button></div>
            <div className="people-grid">
              {(Object.keys(LEADS) as LeadKey[]).map((key) => {
                const lead = LEADS[key];
                return (
                  <article key={key}>
                    <span className="person-mark">{lead.mark}</span>
                    <div><small>{lead.title} · {lead.age}岁</small><h3>{lead.name}</h3><p>{lead.description}</p></div>
                    <em>{state.bonds[key] > 3 ? '牵系已深' : state.bonds[key] > 0 ? '已有交集' : '因果未明'}</em>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {showMap && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowMap(false)}>
          <section className="modal route-modal" role="dialog" aria-modal="true" aria-label="命轨图" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><p className="kicker">选择留下的形状</p><h2>命轨</h2></div><button onClick={() => setShowMap(false)}>关闭</button></div>
            <p className="route-note">基础结局来自五位关键人物与一次失败；发现任意三个结局后，最后抉择会出现一条不属于任何人的路。</p>
            <div className="ending-grid">
              {(Object.keys(ENDINGS) as EndingKey[]).map((key) => {
                const item = ENDINGS[key];
                const unlocked = foundEndings.includes(key);
                return <article key={key} className={unlocked ? 'unlocked' : ''}><small>{unlocked ? item.no : '未解锁'}</small><strong>{unlocked ? item.title : '？？？'}</strong><p>{unlocked ? item.summary : key === 'true' ? '三条旧命之后，方见山外。' : '从另一种选择抵达这里。'}</p></article>;
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
