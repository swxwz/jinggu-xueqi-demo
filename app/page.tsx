'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  impact?: string;
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
  echo: string | null;
};

const LEADS: Record<LeadKey, { name: string; age: number; title: string; mark: string; description: string }> = {
  su: {
    name: '苏晚照',
    age: 28,
    title: '青冥剑首',
    mark: '剑',
    description: '白衣，冷眼，话少得像雪。她越克制，越让人想知道：这样的人真正失控时，会把谁护在身后。',
  },
  ning: {
    name: '宁红绡',
    age: 31,
    title: '残骨魔君',
    mark: '契',
    description: '红衣残魂，声音总像贴着耳边。她危险、直接，从不假装无欲无求；可真正能要走的东西，她偏偏没有动。',
  },
  qing: {
    name: '沈青檀',
    age: 26,
    title: '丹堂执炉',
    mark: '丹',
    description: '袖口常带淡淡药香，笑得温柔，下针却从不手软。她很会照顾人，也很会让人忘记追问药里藏了什么。',
  },
  gu: {
    name: '顾寒灯',
    age: 34,
    title: '执律使',
    mark: '律',
    description: '黑衣束发，眼神比锁链更冷。她习惯审别人，却把最重的一桩罪压在自己心里，六年没有放下。',
  },
  liu: {
    name: '柳问棠',
    age: 24,
    title: '外门知客',
    mark: '局',
    description: '眼尾总带三分笑，靠近时像在同你说秘密。她什么都敢卖，唯独把一个死人的名字守了六年。',
  },
};

const ENDINGS: Record<EndingKey, { no: string; title: string; lead?: LeadKey; summary: string; paragraphs: string[] }> = {
  vessel: {
    no: '终局·零',
    title: '炉中人',
    summary: '你没有输掉性命。你输掉了那个会疼、会怕、也会记住姐姐的人。',
    paragraphs: [
      '你慢了一步。就一步。',
      '三十六盏命灯同时亮起，阵法合拢。大长老笑着说：“别怕，这是新生。”',
      '你听见自己回答：“弟子明白。”声音很稳，稳得不像你。',
      '后来，青冥宗多了一位天资绝世的少宗主。他不眠，不怒，也从不做梦。',
      '有人把一支旧木簪放到他面前。他看了很久，只问：“这是何物？”',
      '那人转身时，掌心忽然疼了一下。很轻。像六年前没有说完的那声“姐姐”，还在骨头里敲门。',
    ],
  },
  su: {
    no: '终局·一',
    title: '剑冠青冥',
    lead: 'su',
    summary: '她替你挡下旧山门，你让她终于不用一个人守规矩。',
    paragraphs: [
      '剑首接住阵印，只出了一剑。',
      '高台裂开，旧祖训也裂开。满山长老跪了一地，再没人敢把活人叫作柴薪。',
      '天亮后，她把剑首玉冠放到你面前：“从今天起，这座山只认活人。”',
      '你问她，六年前为什么没有救下姐姐。她沉默很久，第一次没有避开你的眼睛：“因为那时，我不敢。”',
      '这答案并不漂亮。你却知道，她能说出来，比再斩一座山更难。',
      '她低头替你系好护腕。冷香很淡，指尖停在你的腕骨上，迟迟没有离开。',
      '“伤好以后，”她轻声说，“陪我把剩下的规矩也改了。”门外风雪正大，屋里的灯却暖了一夜。',
    ],
  },
  qing: {
    no: '终局·二',
    title: '丹炉春雪',
    lead: 'qing',
    summary: '她温顺了七年，只为把解药送到该活下来的人手里。',
    paragraphs: [
      '丹师把灰白药丸投入主炉。炉火一变，整座夺灵阵开始生锈。',
      '三十六名弟子都拿到了解药。只有大长老没有。',
      '众人这才明白：她低头七年，不是认命。她是在记药量，也是在等一个能点火的人。',
      '你醒来时，她散着长发坐在榻边，袖子挽到手肘，正替你换最后一道药。',
      '“会疼。”她说。你笑：“你每次这么说，都比实际轻。”',
      '她抬眼看你，嘴角终于有了真笑。温热指腹压过伤处，却没有马上收回。',
      '帘外是新雪，帘内是药香。她把你姐姐留下的半张药方放在枕边：“这次，我们赶上了。”',
    ],
  },
  liu: {
    no: '终局·三',
    title: '满堂假面',
    lead: 'liu',
    summary: '你们把真相卖遍九州，只把彼此留成一桩不谈价钱的买卖。',
    paragraphs: [
      '知客把真账抛上半空。山下三百道留影符同时亮了。',
      '青冥宗百年血债，一夜传遍九州。大长老想逃，才发现每条退路都被她提前卖给了债主。',
      '三天后，你在山外酒肆找到她。她换了衣裳，也换了假名。',
      '只有腕上那根布带没换。那是她从你衣角撕下来的。',
      '她替你揭下易容面具，靠得很近，笑问：“这张脸，以后还卖不卖？”',
      '你扣住她的手：“不卖。”',
      '她眼里的笑慢慢淡了，露出难得的认真：“那我也不走了。”当天酒肆提前打烊，门外的人只听见她笑了一次，又安静了很久。',
    ],
  },
  gu: {
    no: '终局·四',
    title: '寒灯执律',
    lead: 'gu',
    summary: '她审了半生别人，最后把最难的判词留给了自己。',
    paragraphs: [
      '执律使念完最后一条罪名，把金印按在大长老眉心。',
      '满殿无人敢动。每个人的名字，都在她身后的罪卷上。',
      '她也写了自己的名字。六年前那份放行令盖着她的印。印是被盗用的，可她说：“不知道，不等于没有责任。”',
      '你没有替她擦掉名字，只在旁边写下：余生偿还。',
      '子夜，她替你解开魂锁。金链退去，在腕上留下一圈浅红。她看了很久，问你后不后悔把命交给她。',
      '你把那截锁链绕回她腕上：“现在轮到你信我。”',
      '她一向平稳的呼吸终于乱了一拍。寒灯随后熄灭，新律写到天亮，中间空出的两页，无人获准查阅。',
    ],
  },
  ning: {
    no: '终局·五',
    title: '红绡共命',
    lead: 'ning',
    summary: '你没做她的容器。你们成了彼此唯一愿意承认的破绽。',
    paragraphs: [
      '你放开最后一道心门。魔君却没有夺舍。',
      '她借你的手折断祭骨，又把足够自己重生的魂火推回你体内。',
      '“你不是一直想出去吗？”你问。',
      '红衣女人沉默片刻，笑得仍旧轻慢：“忽然觉得，两个人出去更有意思。”',
      '离山那夜，她第一次有了自己的影子。她站在月下，问你怕不怕身边跟着一个声名狼藉的魔君。',
      '你说怕，却还是握住她的手。那只手起初微凉，很快便与掌心同温。',
      '她靠近时，血契在两人腕间同时亮起。门在身后合上，月色留在门外。谁也没有再说怕。',
    ],
  },
  true: {
    no: '隐局·真',
    title: '山门之外',
    summary: '真正的破局，不是选对一个人，而是不再让所有人互相争一个活下来的位置。',
    paragraphs: [
      '你没有碰阵印，也没有杀大长老。',
      '你回头，击碎第七盏从未写进账册的魂灯。那盏灯，才是青冥山真正的主人。',
      '灯灭的一刻，剑首的剑、丹师的药、知客的真账、执律使的罪卷，以及魔君的残魂，同时没了枷锁。',
      '五条路本来就不是让你挑一个人活。它们只是在逼所有人互相争。',
      '黎明时，五座山门同时打开。有人留下重建，有人远行还债，也有人路过你身边，把来日的约定说得很轻。',
      '你把姐姐的旧木簪埋在山门外。六年了，你终于能告诉她：这一次，一个都没留下。',
      '你没有得到一座宗门。你得到的是更难的东西——下一步，自己选。',
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
      '第九声钟响时，验骨石裂了。',
      '全场一下安静。',
      '你叫陆沉，二十二岁，灵根已废。来青冥宗也不是为了拜师。六年前，姐姐进了这道山门，再也没有回来。',
      '你掌心压着她留下的半支木簪。石头裂开的地方，正慢慢渗出血。',
      '高台上，白衣剑首抬了眼。她没看石头，只盯着你的手，像是认出了什么。',
      '司礼长老冷声道：“废灵根，毁圣石。拿下。”',
      '袖中那截残骨忽然发烫。一个女人在你脑中笑了：“别松手。他们不是要赶你走。他们是怕你看见石头下面的东西。”',
    ],
    choices: () => [
      { label: '按住裂缝，当众问：这到底是验灵根，还是挑祭品？', tone: '把事闹大', impact: '所有人的目光都落到石头上，剑首第一次站到了你这一边。', next: 'exposure', apply: (s) => gain(s, { nerve: 2 }, ['su', 1], ['defied']) },
      { label: '立刻收手，装成被吓住的废物，先看谁会来找你。', tone: '装弱钓人', impact: '长老暂时移开视线，一个藏在人群里的知客把消息塞进你袖中。', next: 'silk', apply: (s) => gain(s, { guile: 2 }, ['liu', 1], ['concealed']) },
      { label: '握紧残骨，直接问那个女人：我姐姐是不是死在这里？', tone: '先问死人', impact: '山门从眼前退去，骨中女人把你拖进了她的记忆。', next: 'marrow', apply: (s) => gain(s, { ash: 2 }, ['ning', 1], ['answered']) },
    ],
  },
  exposure: {
    title: '一剑作证',
    location: '问心坪 · 万人之前',
    progress: 17,
    paragraphs: () => [
      '话一出口，满场炸了。',
      '司礼长老抬手要封你的嘴。一柄没出鞘的剑先横了过来。',
      '白衣女子走下高台。她叫苏晚照，二十八岁，是青冥宗的剑首。',
      '“石头里有血。”她只说了六个字。',
      '剑鞘挑起你的手。她的动作很冷，拇指却刚好替你挡住渗血的裂口。靠近时，你闻到一点雪松气。',
      '她看见了你掌心的半支木簪，呼吸停了一瞬。六年前，她也见过另一半。',
      '殿门处，黑衣执律使翻开金册：“想翻案，可以。先拿出证据。”',
    ],
    choices: () => [
      { label: '借剑鞘劈开石缝，让里面的血阵当众见光。', tone: '先给证据', impact: '血阵露出一角。剑首替你担保，长老却立刻封了山门。', next: 'judgment', apply: (s) => gain(s, { nerve: 1 }, ['su', 1], ['sword_mark']) },
      { label: '看着执律使：先查石，再查我。顺序错了，律令就是笑话。', tone: '拿规矩反压', impact: '执律使没有抓你。她在金册上记下了司礼长老的名字。', next: 'judgment', apply: (s) => gain(s, { guile: 1 }, ['gu', 1], ['law_notice']) },
      { label: '不再解释，只把流血的手举给满山新弟子看。', tone: '让所有人看见', impact: '人群第一次后退。祭品一旦知道自己是祭品，就不会再安静排队。', next: 'judgment', apply: (s) => gain(s, { mercy: 1, nerve: 1 }, undefined, ['witnesses']) },
    ],
  },
  silk: {
    title: '袖底藏针',
    location: '问心坪 · 人潮暗处',
    progress: 17,
    paragraphs: () => [
      '你退了一步，脸上装出刚好的害怕。',
      '司礼长老果然不再看你。就在这时，一张薄纸滑进袖口。',
      '身旁的青衣女子替你挡住视线。她叫柳问棠，二十四岁，是外门知客。眼尾一直带笑，像什么事都能拿来谈价钱。',
      '“别回头。”她贴近半步，声音压得很低，“想活，先让别人觉得你不值钱。”',
      '纸上只有两个字：石下。背面却画着半支木簪，和你掌心那支正好相反。',
      '残骨突然发热。知客顺手握住你的手腕，替你压住红光。她的掌心很软，力道却稳得不许你挣开。',
      '“你袖子里的东西，”她笑着说，“比你的命贵多了。”',
    ],
    choices: () => [
      { label: '把纸折回她掌心：先告诉我，谁见过这支木簪。', tone: '追姐姐的线', impact: '知客收了笑。她承认六年前，有人托她守住一页真账。', next: 'judgment', apply: (s) => gain(s, { guile: 1 }, ['liu', 1], ['ledger_hint']) },
      { label: '借整理衣袖，把掌心血色亮给远处的丹师看。', tone: '试探丹堂', impact: '丹师没有抬头，却故意撞翻药箱，为你留了一条带药香的路。', next: 'judgment', apply: (s) => gain(s, { mercy: 1 }, ['qing', 1], ['medicine_hint']) },
      { label: '任她按着手腕，低声问：敢不敢做一笔会赔命的买卖？', tone: '拉她入局', impact: '她握紧了你的手腕。笑还在，眼神却认真了：这笔账，她等了六年。', next: 'judgment', apply: (s) => gain(s, { nerve: 1, guile: 1 }, ['liu', 1], ['shared_risk']) },
    ],
  },
  marrow: {
    title: '骨中红绡',
    location: '识海 · 无灯之室',
    progress: 17,
    paragraphs: () => [
      '残骨贴上掌心，山门瞬间没了。',
      '你站在一间暗室里。唯一的灯旁，坐着一个红衣女人。',
      '她叫宁红绡，死时三十一岁。被封了三百年，笑起来却一点都不像死人。',
      '“他们想拿你的身体装我。”她抬起你的手，慢慢看过掌纹，“可惜，这副骨头已经先听见我了。”',
      '她的指尖从掌心划到腕脉。神魂本没有温度，你却清楚感觉到一线热。',
      '你问姐姐。她眼里的笑淡了一点。',
      '“六年前，有个姑娘也走到这里。”她说，“她没求我救命，只求我记住下一批人的名字。”',
    ],
    choices: () => [
      { label: '扣住她的手腕：合作可以，谁做谁的主人，免谈。', tone: '立平等契', impact: '魔君没有生气。她第一次认真看你，并把阵眼的位置告诉了你。', next: 'judgment', apply: (s) => gain(s, { nerve: 1, ash: 1 }, ['ning', 1], ['equal_pact']) },
      { label: '先退出识海。姐姐信过她，不代表你也必须信。', tone: '守住心门', impact: '你保住了神魂的边界，也让魔君知道：姐姐不是拿来逼你点头的筹码。', next: 'judgment', apply: (s) => gain(s, { mercy: 1 }, undefined, ['guarded']) },
      { label: '报一个假名，顺着她的话套出夺舍阵的阵眼。', tone: '骗魔问路', impact: '她明知你在撒谎，还是给了半张真图。你们都给自己留了一手。', next: 'judgment', apply: (s) => gain(s, { guile: 2 }, ['ning', 1], ['false_name']) },
    ],
  },
  judgment: {
    title: '三条生路',
    location: '青冥宗 · 戒律阶',
    progress: 29,
    paragraphs: (s) => [
      has(s, 'defied')
        ? '血阵露了出来。长老干脆倒打一耙，说你用邪术毁了圣石。'
        : has(s, 'concealed')
          ? '你装弱骗过了长老，却没骗过护山阵。袖中残骨一热，整座山门立刻封死。'
          : '你刚从残骨的记忆退出，护山阵就锁定了你。长老显然知道骨中住着谁。',
      '黑衣执律使命人把你押去照魂殿。那地方进去容易，出来的人很少。',
      '路过剑首身边时，一枚剑符落进你掌心。丹堂那边，药箱恰好翻倒，白雾遮住半条石阶。更远处，知客留了一扇不该开的侧门。',
      '剑首、丹师、知客。三个身份，三条路。先别急着记名字。你只要记住：一个用剑，一个用药，一个用消息。',
      '而在掉落的药瓶下面，你看见了姐姐的入门日期。六年前，同一天。',
    ],
    choices: () => [
      { label: '捏碎剑符。跟白衣剑首走，问清她六年前看见了什么。', tone: '跟剑首走', impact: '剑气卷走了你。她替你挡下追兵，也欠你一个迟到了六年的答案。', next: 'swordroom', apply: (s) => gain(s, { nerve: 1 }, ['su', 2], ['ally_su']) },
      { label: '借药雾藏身。去丹房，看那张写着姐姐日期的药单。', tone: '跟丹师走', impact: '药雾遮住了你。丹房里，已经摆着一剂六年前没能送出去的解药。', next: 'furnace', apply: (s) => gain(s, { mercy: 1 }, ['qing', 2], ['ally_qing']) },
      { label: '穿过侧门。把命押给知客，也把那页真账问到底。', tone: '跟知客走', impact: '侧门在身后锁死。她带你去看的不是出路，而是三十六个失踪者的名字。', next: 'archive', apply: (s) => gain(s, { guile: 1 }, ['liu', 2], ['ally_liu']) },
    ],
  },
  swordroom: {
    title: '剑室听雪',
    location: '洗剑峰 · 无名剑室',
    progress: 40,
    paragraphs: () => [
      '剑符碎开，你被一股冷风卷进偏峰石室。追兵从门外走过三次，谁也没发现。',
      '剑首背对你解下护腕。刚才那一掌打在她肩后，白衣已经透出血色。',
      '她说没事。可脸比窗外的雪还白。',
      '你替她缠伤。距离很近，一缕长发擦过你的指节。她没有躲，只把那半支木簪放到桌上。',
      '“另一半，我见过。”她终于开口，“六年前，你姐姐被送进祖师殿。我当时守门。”',
      '你手上用力，绷带立刻渗血。她没有皱眉。',
      '“为什么没拦？”你问。',
      '“因为那时，我只会服从。”她看着你，声音还是稳的，手却悄悄攥紧了衣角，“所以今晚，我先替你挡一次。”',
    ],
    choices: () => [
      { label: '把骨中魔君和姐姐的最后请求，全都告诉她。', tone: '把秘密交给她', impact: '剑首交出自己的命剑作抵押：你若被夺舍，她杀你；你若清醒，她护你。', next: 'midnight', apply: (s) => gain(s, { mercy: 1 }, ['su', 1], ['told_ally']) },
      { label: '只说夺舍阵，留下魔君这张底牌。', tone: '仍留一手', impact: '她看出了你的保留，却没有追问。信任没有断，只是多了一道缝。', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, undefined, ['kept_secret']) },
      { label: '先按住她渗血的伤，再问：你救我是补偿，还是信我？', tone: '逼她说真话', impact: '她没有抽回手，只答：“起初是补偿。现在，我想让你活。”', next: 'midnight', apply: (s) => gain(s, { nerve: 1 }, ['su', 1], ['asked_why']) },
    ],
  },
  furnace: {
    title: '炉火无声',
    location: '丹霞谷 · 第七炉室',
    progress: 40,
    paragraphs: () => [
      '丹师把你藏进一座冷炉。追兵推门时，她正在净手，眼睫都没乱一下。',
      '她叫沈青檀，二十六岁。说话很轻，手里的银针却快得看不见。',
      '人走后，她把你拉出暗门，两指按住你的心口。隔着衣料，那点温度仍清楚得让人分神。',
      '“忍一下。”她说。',
      '银针落下，一缕红雾从血脉里被逼出来。骨中魔君在雾里骂了一句。丹师听完，只是笑。',
      '她从药柜最深处拿出一张旧方。落款日期，正是姐姐失踪那天。',
      '“她发现新弟子被下了药，来找我要解方。”丹师低声说，“我配出来了，但晚了一刻。”',
      '桌上那瓶药放了六年。瓶口干净得没有一点灰。',
    ],
    choices: () => [
      { label: '让她继续下针。这一次，亲眼看着解药配完。', tone: '陪她补完旧方', impact: '她把第一粒新药喂给你，也把第二粒留给所有还活着的新弟子。', next: 'midnight', apply: (s) => gain(s, { nerve: 1 }, ['qing', 1], ['trusted_medicine']) },
      { label: '握住她执针的手：为什么这瓶旧药，六年都没扔？', tone: '问她放不下什么', impact: '她安静很久，承认自己每天擦一次药瓶，只怕有一天连失败都忘了。', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, ['qing', 1], ['asked_formula']) },
      { label: '让她看一段血契记忆，但隐去魔君真名。', tone: '给半份信任', impact: '她看见姐姐的最后一夜，也看见你藏起了什么。她没有拆穿，只多备了一根解契针。', next: 'midnight', apply: (s) => gain(s, { mercy: 1, guile: 1 }, undefined, ['shared_memory']) },
    ],
  },
  archive: {
    title: '账册之后',
    location: '外门 · 封卷阁',
    progress: 40,
    paragraphs: () => [
      '侧门后不是出路，是一排封死的旧账柜。',
      '知客反手关门，把你按进书架和墙壁之间。追兵的灯影正从窗纸上扫过。',
      '她一手撑在你肩边，一手压住你发亮的血纹。呼吸近在咫尺，语气还带着笑：“这笔买卖，真烫手。”',
      '脚步走远，她却没有马上松开。你看见她眼里闪过一点后怕，又被笑意盖住。',
      '暗柜打开。里面没有功法，只有三十六名失踪弟子的记录。',
      '最上面那页，是姐姐的字。她查到了祭阵，还给后来的人留了一句话：别只救我。',
      '知客别开脸：“六年前，我收了她一枚铜钱，答应把真账送出去。”',
      '“我一直没送成。”她笑了一下。这次的笑很难看。',
    ],
    choices: () => [
      { label: '收下真账：天亮前，我替你把这三十六个名字送出去。', tone: '接下她的旧账', impact: '她把那枚铜钱也交给了你。六年的承诺，从此由两个人一起还。', next: 'midnight', apply: (s) => gain(s, { mercy: 1 }, ['liu', 1], ['took_ledger']) },
      { label: '先问清她背后还有谁。你不接一桩看不见底的买卖。', tone: '先拆她的局', impact: '她交出全部暗线。你看见了她的退路，也看见她早把自己的名字写进死者一栏。', next: 'midnight', apply: (s) => gain(s, { guile: 1 }, ['liu', 1], ['named_buyer']) },
      { label: '追兵又来了。和她一起烧掉假账，只留唯一真本。', tone: '一起背罪名', impact: '火光照亮两张脸。她把真账贴身藏好，也第一次把后背完整交给你。', next: 'midnight', apply: (s) => gain(s, { nerve: 1, guile: 1 }, ['liu', 1], ['burned_decoy']) },
    ],
  },
  midnight: {
    title: '子夜问契',
    location: '青冥宗 · 地脉之下',
    progress: 54,
    paragraphs: (s) => [
      `子夜前，${LEADS[allyOf(s)].title}带你到了地脉入口。石门上有三十六盏灯，每一盏都跟着山中弟子的心跳在动。`,
      '门缝里，掉出另外半支木簪。',
      '两半合上的一刻，姐姐留下的最后一段声音响了起来：“如果是你听见，说明我没能回家。”',
      '她本来已经逃到这里。可她发现下一批新弟子还会被送进来，于是转身去砸命灯。',
      '她失败了，却把阵眼砸出了一道裂缝。那道裂缝，六年后长进了你的骨头。',
      '这时，执律使顾寒灯从暗处走出。她三十四岁，黑衣束发，手里拿着一条金色魂锁。',
      '“六年前的放行令，盖着我的印。”她说，“印被人偷了。但这六年，我仍在查。”',
      '铜镜里，红衣魔君也现了身。她靠近你的倒影，声音落在耳边：“一个带锁，一个带火。你打算先信谁？”',
    ],
    choices: () => [
      { label: '戴上魂锁，但让执律使把另一端锁在自己腕上。', tone: '两个人一起受审', impact: '她接受了同一条锁。你若失控，她先受反噬；她若撒谎，你也能拉她下水。', next: 'trial', apply: (s) => gain(s, { mercy: 1 }, ['gu', 2], ['law_path']) },
      { label: '拒绝魂锁，和魔君补完平等血契。生死都不许单方面决定。', tone: '与魔共命', impact: '血契补全。她能借你的手，你也第一次听见了她真正的心跳。', next: 'trial', apply: (s) => gain(s, { ash: 2 }, ['ning', 2], ['blood_path']) },
      { label: '让执律使以为锁住魔君，也让魔君以为你会替她开门。', tone: '同时骗两边', impact: '两个人都看穿了一半，也都暂时没有拆穿你。你的局更大，信任却更薄。', next: 'trial', apply: (s) => gain(s, { guile: 2 }, ['gu', 1], ['double_path']) },
    ],
  },
  trial: {
    title: '照魂开审',
    location: '祖师殿 · 三十六灯',
    progress: 68,
    paragraphs: (s) => [
      '开审时，祖师殿坐满了人。',
      '剑首按着剑。丹师抱着药炉。知客站在最后一排。执律使坐在律席。魔君在你骨中安静得反常。',
      `你把${has(s, 'ally_su') ? '六年前的守门记录' : has(s, 'ally_qing') ? '失效解药与血阵药方' : '三十六人的真账'}放到殿前。最上面，是姐姐留下的那句话：别只救我。`,
      '大长老看完，竟然笑了。他承认一切。',
      '“三十六条外门弟子的命，换宗门百年不倒。很贵吗？”',
      '殿门突然合拢。命灯一盏接一盏燃起，你的骨头开始裂。所谓开审，本来就是最后一场祭礼。',
      '大长老朝你伸手，语气甚至很温和：“别抵抗。祖师醒来后，你的名字会被供奉千年。”',
    ],
    choices: () => [
      { label: '把证据投进命灯，让所有祭品同时看见自己会变成什么。', tone: '让祭品醒来', impact: '三十六个人同时开始反抗。你不再是殿里唯一站着的人。', next: 'crucible', apply: (s) => gain(s, { mercy: 2, nerve: 1 }, undefined, ['exposed']) },
      { label: '先跪下。等阵法吞进第一缕神魂，再从里面咬断它。', tone: '让他先得意', impact: '大长老以为你认命。阵法张开了最脆弱的核心，也把你推到生死边上。', next: 'crucible', apply: (s) => gain(s, { guile: 2 }, undefined, ['baited']) },
      { label: '放开烬骨，让魔君的火沿三十六盏灯倒烧回去。', tone: '借魔烧阵', impact: '魔火没有夺走你的身体。她先烧掉的，反而是困住你的第一根锁。', next: 'crucible', apply: (s) => gain(s, { ash: 2, nerve: 1 }, ['ning', 1], ['opened_bone']) },
      { label: '停止抵抗，相信所谓“祖师新生”会保留你的意识。', tone: '危险抉择', next: 'ending:vessel' },
    ],
  },
  crucible: {
    title: '满殿燃骨',
    location: '祖师殿 · 阵心',
    progress: 82,
    paragraphs: (s) => [
      has(s, 'baited')
        ? '你让夺舍阵咬住一缕神魂。等它最贪的时候，你猛地关上心门。阵法倒卷，大长老第一次变了脸。'
        : has(s, 'opened_bone')
          ? '红色魔火冲出腕脉，却没有抢你的身体。魔君把残魂烧成一条路，替你照出阵法所有裂缝。'
          : '三十六名弟子看见了命灯里的自己。害怕只维持了一瞬。下一刻，三十六个人一起往外撞。',
      `${LEADS[allyOf(s)].title}第一个接住你的选择。${has(s, 'ally_su') ? '一剑封住殿门，谁也别想带走任何祭品。' : has(s, 'ally_qing') ? '药炉当场点燃，控制神魂的香气被烧成白雾。' : '真账里的留影符飞出大殿，每一张有罪的脸都被送到山外。'}`,
      has(s, 'law_path')
        ? '执律使扯紧两人共用的魂锁。她替你受了第一波反噬，唇边见血，手却没有松。'
        : '执律使撕掉旧祖训。金色锁链换了方向，缠上长老们的手腕。',
      has(s, 'blood_path')
        ? '魔君在你耳边说了一句“别死”。声音很轻，轻得不像她。'
        : '铜镜里，红衣被火吹得猎猎作响。她仍在等你决定要不要真正开门。',
      '大长老还想催动阵法。你把合拢的木簪插进裂缝，姐姐六年前留下的那一下，终于被你接上。',
      '阵心暴露了。你只能先救下一样：人、权，或那个把后背交给你的人。',
    ],
    choices: (s) => [
      { label: '先斩命灯。哪怕放走大长老，也先让三十六个人活。', tone: '先救活人', impact: '所有祭品脱离阵法。你放弃了最稳的胜法，却换来三十六个会记住真相的人。', next: 'finale', apply: (x) => gain(x, { mercy: 2 }, [allyOf(s), 1], ['freed']) },
      { label: '先夺宗主金印，用整座护山阵把大长老压下去。', tone: '先拿下权力', impact: '青冥山向你低头。胜负立刻结束，但所有人也开始害怕你会成为下一个他。', next: 'finale', apply: (x) => gain(x, { nerve: 2 }, undefined, ['seized']) },
      { label: `把阵心交给${LEADS[allyOf(s)].title}。你来扛烬骨反噬。`, tone: '把后背交出去', impact: '对方没有辜负你的信任。阵心碎了，你也倒在了她怀里。', next: 'finale', apply: (x) => gain(x, { mercy: 1, ash: 1 }, [allyOf(s), 2], ['entrusted']) },
    ],
  },
  finale: {
    title: '天将明',
    location: '青冥宗 · 破晓之前',
    progress: 94,
    paragraphs: (s) => [
      has(s, 'freed')
        ? '最后一盏命灯熄灭。三十六个人跌出阵外。有人哭，有人笑，更多的人只是抱紧身边的人。'
        : has(s, 'seized')
          ? '宗主金印落进掌心。整座青冥山随你一念低头。曾经坐在高处的人跪了一地，却没人敢先叫你一声宗主。'
          : `阵心在${LEADS[allyOf(s)].title}手里碎开。你替她扛了反噬；她抱住你时，手抖得比你还厉害。`,
      '大长老败了。姐姐的木簪也断成两截。',
      '你等了六年，终于走到她没能走完的地方。可赢下来以后，路要由活着的人继续走。',
      '剑首、丹师、知客、执律使与魔君，站在不同的晨光里。五张脸，五种代价。到这里，你应该已经记住她们为什么没有离开。',
      '没人催你。可你走向谁，就等于把今夜的意义交给谁。',
    ],
    choices: (s, found) => {
      const ally = allyOf(s);
      const base: Choice[] = [
        {
          label: ally === 'su' ? '把宗主金印递给剑首苏晚照。和她一起重立山门。' : ally === 'qing' ? '把阵中魂火交给丹师沈青檀。和她救醒所有祭品。' : '把真账交给知客柳问棠。让九州一起审青冥宗。',
          tone: `走向${LEADS[ally].title}`,
          next: `ending:${ally}`,
        },
      ];
      if (has(s, 'law_path') || has(s, 'double_path')) {
        base.push({ label: '接过执律使顾寒灯的罪卷。和她一起写下新律。', tone: '走向执律使', next: 'ending:gu' });
      }
      if (has(s, 'blood_path') || has(s, 'double_path') || s.ash >= 5) {
        base.push({ label: '握住魔君宁红绡伸来的手。让平等血契给她一个真正的身体。', tone: '走向魔君', next: 'ending:ning' });
      }
      base.push({ label: '独占烬骨与宗门。谁都不许再靠近阵心。', tone: '一个人拿走一切', next: 'ending:vessel' });
      if (found.length >= 3) {
        base.unshift({ label: '谁都不选。回头击碎那盏从未写进账册的第七灯。', tone: '已解锁 · 山门之外', next: 'ending:true' });
      }
      return base;
    },
  },
};

const NUMBER_MARKS = ['壹', '贰', '叁', '肆', '伍'];

function focusedLeads(sceneId: string, state: StoryState): LeadKey[] {
  if (sceneId === 'exposure' || sceneId === 'swordroom') return ['su'];
  if (sceneId === 'silk' || sceneId === 'archive') return ['liu'];
  if (sceneId === 'marrow') return ['ning'];
  if (sceneId === 'furnace') return ['qing'];
  if (sceneId === 'midnight') return [...new Set<LeadKey>([allyOf(state), 'gu', 'ning'])];
  if (sceneId === 'trial' || sceneId === 'crucible') {
    return [...new Set<LeadKey>([allyOf(state), has(state, 'law_path') ? 'gu' : 'ning'])];
  }
  if (sceneId === 'finale') return [allyOf(state)];
  return [];
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState('test');
  const [state, setState] = useState<StoryState>(() => freshState());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trail, setTrail] = useState<string[]>([]);
  const [lastEcho, setLastEcho] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<EndingKey | null>(null);
  const [foundEndings, setFoundEndings] = useState<EndingKey[]>([]);
  const [showCodex, setShowCodex] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.24;
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem('jinggu-found-endings');
      if (saved) {
        try { setFoundEndings(JSON.parse(saved)); } catch { /* ignore damaged local data */ }
      }
      if (window.localStorage.getItem('jinggu-music') === 'off') setMusicOn(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const scene = SCENES[sceneId];
  const choices = useMemo(() => endingId ? [] : scene.choices(state, foundEndings), [endingId, scene, state, foundEndings]);
  const closest = highestBond(state);
  const cast = focusedLeads(sceneId, state);

  function beginStory() {
    setStarted(true);
    const audio = audioRef.current;
    if (musicOn && audio) audio.play().catch(() => { /* browser may require a second gesture */ });
  }

  function returnToCover() {
    setStarted(false);
    audioRef.current?.pause();
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem('jinggu-music', next ? 'on' : 'off');
    const audio = audioRef.current;
    if (!audio) return;
    if (next && started) audio.play().catch(() => { /* browser may require another click */ });
    else audio.pause();
  }

  function choose(choice: Choice) {
    setHistory((items) => [...items, { sceneId, state, trail, echo: lastEcho }]);
    const nextState = choice.apply ? choice.apply(state) : state;
    setState(nextState);
    setTrail((items) => [...items, choice.tone]);
    setLastEcho(choice.impact ?? choice.tone);

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
    setLastEcho(previous.echo);
    setEndingId(null);
    setHistory((items) => items.slice(0, -1));
  }

  function restart() {
    setStarted(true);
    setSceneId('test');
    setState(freshState());
    setHistory([]);
    setTrail([]);
    setLastEcho(null);
    setEndingId(null);
    setShowMap(false);
    const audio = audioRef.current;
    if (musicOn && audio) audio.play().catch(() => { /* browser may require another click */ });
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
      <audio ref={audioRef} src="./audio/qingming-night.ogg" loop preload="metadata" />
      <div className="mist mist-one" aria-hidden="true" />
      <div className="mist mist-two" aria-hidden="true" />
      <div className="ash-field" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
      </div>

      <header className="topbar">
        <button className="brand" onClick={returnToCover} aria-label="返回封面">
          <span className="seal">烬</span>
          <span><small>第一卷 · 试玩</small><strong>烬骨录</strong></span>
        </button>
        <nav aria-label="游戏功能">
          <button onClick={() => setShowCodex(true)}>人物录</button>
          <button onClick={() => setShowMap(true)}>命轨 <i>{foundEndings.length}/7</i></button>
          <button onClick={rewind} disabled={!history.length}>回到上一决意</button>
          <button className={`music-toggle ${musicOn && started ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}>
            <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
            音律 {musicOn ? '开' : '停'}
          </button>
        </nav>
      </header>

      {!started ? (
        <section className="cover-card">
          <p className="kicker">青冥宗入门大典 · 子时</p>
          <h1>这一夜，山门择徒。<br />也择一副最合适的骨头。</h1>
          <p className="lede">
            六年前，姐姐进了青冥宗，再也没有回来。今晚你带着她留下的半支木簪上山，却在验骨石里听见一个死了三百年的女人。
          </p>
          <div className="cover-actions">
            <button className="primary" onClick={beginStory}>踏入山门 <span>→</span></button>
            {foundEndings.length > 0 && <button className="text-button" onClick={() => setShowMap(true)}>查看已解锁命轨</button>}
          </div>
          <div className="cover-meta">
            <span>约 18–25 分钟</span><span>9 次关键抉择</span><span>6 个基础结局 + 1 隐局</span>
          </div>
          <p className="notice">所有角色均为成年人 · 含危险关系、权力博弈与含蓄亲密描写</p>
          <p className="music-credit">背景音律：<a href="https://opengameart.org/content/asianoriental2" target="_blank" rel="noreferrer">Asianoriental2 · Tozan · CC0</a></p>
        </section>
      ) : (
        <div className="game-layout">
          <section className="story-card" aria-live="polite">
            <div className="scene-head">
              <span>{ending ? ending.no : scene.location}</span>
              <i />
              <span>{ending ? '命轨已定' : `${String(trail.length + 1).padStart(2, '0')} · ${scene.title}`}</span>
            </div>

            {!ending && cast.length > 0 && (
              <div className="cast-strip" aria-label="本幕焦点人物">
                <small>本幕只需记住</small>
                {cast.map((key) => (
                  <span key={key}><b>{LEADS[key].mark}</b><em>{LEADS[key].title}</em><strong>{LEADS[key].name}</strong></span>
                ))}
              </div>
            )}

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
                {lastEcho && trail.length > 0 && (
                  <div className="choice-echo">
                    <small>你的上一选择，已经改变局面</small>
                    <strong>{lastEcho}</strong>
                  </div>
                )}
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
