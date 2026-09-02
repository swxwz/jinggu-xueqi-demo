'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type LeadKey = 'pei' | 'luo' | 'shang' | 'yun';
type EndingKey = 'keep' | 'pei' | 'luo' | 'shang' | 'yun' | 'home' | 'true';

type StoryState = {
  breath: number;
  resolve: number;
  restraint: number;
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
  pei: {
    name: '裴照雪',
    age: 22,
    title: '洗剑峰师姐',
    mark: '剑',
    description: '青衣、白玉簪，笑起来只弯一下唇角。她不爱说软话，却会在你喘不上气时放慢脚步，也敢为一份无人肯认的旧名册交回执事令',
  },
  luo: {
    name: '洛青禾',
    age: 24,
    title: '百草堂丹师',
    mark: '药',
    description: '浅杏衣、弯眼睛、袖口晒暖的草木香。她替人把脉时很近，下手却准，把十年押在一张普通人也用得起的新方子上',
  },
  shang: {
    name: '商绯月',
    age: 27,
    title: '听潮阁掌柜',
    mark: '局',
    description: '绯伞、金铃、琥珀色的眼睛。她能笑着烧掉三本假账，也总把帮助写成一桩将来还得起的买卖',
  },
  yun: {
    name: '云知意',
    age: 25,
    title: '青岚门阵师',
    mark: '阵',
    description: '墨色斗篷、银簪、落笔极稳。她看上去最信规矩，却会放弃追了七年的证人，先把两个受伤的人背出雪地',
  },
};

const ENDINGS: Record<EndingKey, { no: string; title: string; lead?: LeadKey; summary: string; paragraphs: string[] }> = {
  keep: {
    no: '终章·一', title: '山门还有旧账', summary: '司礼长老逃了，地脉也不止一处。你把木牌扣在腰间，留下来继续查',
    paragraphs: [
      '功簿上有法器、丹药和内门名额。你只拿了一块外门木牌，又从桌角抽走黑石谷近二十年的药账',
      '父亲在百草堂养了三个月。能下床那天，他拄着木杖走到晒药场，第一件事是把你翻错的药重新分了一遍',
      '“仙没修成，草倒认错三种。”他骂得声音很轻，洛青禾在旁边笑了半天',
      '山门换了执事，杂役也能进观剑台。可每到月底，药库仍会少两箱续脉药，领药人写的是一串不存在的编号',
      '你白天练剑，夜里对账。窗边的锈剑常在三更响一声，指向山外不同的方向',
      '裴照雪推门进来时，你刚在地图上圈出第三处地脉',
      '她俯身看图，长发从肩头落到你手背。你抬头，两个人离得太近，她却没有退',
      '“还查？”她问',
      '你把外门木牌扣到腰间，拿起剑：“查到它不响为止”',
      '门外已有七八个杂役在等。你走在最前面，这一次，三千石阶没有人被落下',
    ],
  },
  pei: {
    no: '终章·二', title: '与雪同程', lead: 'pei', summary: '她教你出剑，你教她偶尔把重担交给别人',
    paragraphs: [
      '裴照雪交回执事令，带走一柄剑、三十二块名牌，还有司礼长老逃往北境的线索',
      '你把父亲送上回青溪村的车，再牵过她手里另一匹马',
      '第一户人家不肯开门。第二户老人接过名牌，抬手给了裴照雪一巴掌，问她为什么十年后才来',
      '她没躲。走出很远，你才握住她发红的手。她手指僵了一路，到村口才一点点扣进你的指间',
      '第七天，你们在驿站追上押送续脉药的车队。她引开守卫，你从车底找出一张新名单',
      '名单最后写着青溪村。日期就在三日后',
      '夜里大雨封路，客栈只剩一间房。你肩伤发热，醒来时，她正坐在床边替你解开湿透的里衣',
      '长发垂下来，扫过胸口。你抓住她的手腕，她看了你片刻，俯身将额头贴上你的额头试温',
      '“还烧。”她的声音很低，“今晚别逞强”',
      '窗外马蹄忽然停住。裴照雪的手已按上剑，你也看见窗纸后那枚裂开的白玉戒',
    ],
  },
  luo: {
    no: '终章·三', title: '人间药火', lead: 'luo', summary: '你们没有炼成长生丹，却让更多普通人不必拿命换一次入门',
    paragraphs: [
      '父亲的经脉只剩三成。洛青禾把黑石谷带出的噬脉灰锁进丹房，连续十七天没合眼',
      '你守在炉边，她便拿你试温、试脉、试每一次药性。困极时，她靠着你的肩写方子，墨常常落到衣袖上',
      '第十八炉开时，父亲断了十年的右手终于动了一下，夹起一粒药渣，嫌弃地说：“火候老了”',
      '洛青禾愣了半天，转身踢你一脚，又躲到炉后擦眼睛',
      '新药不能让人长生，只能保住被噬脉灰毁掉的经脉。山下却来了三百多个等同一种药的人',
      '药库只够五十份。你和她沿旧账去找药源，在废井底发现一整片被人藏起的灵苔',
      '守井的杀手放火时，她将药囊塞给你，自己被困在浓烟里',
      '你冲回去把她抱出来。她咳得说不出话，手臂却一直环在你颈后，没有放开',
      '安全后，她仍贴在你胸前，仰头问：“这次诊金怎么算？”',
      '你还没回答，她先吻住你。很轻，带着一点苦药味。井外，追来的人已经踩断了第一根枯枝',
    ],
  },
  shang: {
    no: '终章·四', title: '绯伞九州', lead: 'shang', summary: '她把你带进最热闹的人间，你把她唯一不肯标价的真心留了下来',
    paragraphs: [
      '司礼长老带着阵核逃进商路。商绯月封了听潮阁九处分号，亲自带你上船追人',
      '白天她查账，你听货。三天后，一箱写着茶叶的货里传出与锈剑相同的三声',
      '你们顺线摸到江心赌船。她押上听潮阁，你押上那柄锈剑，一局赢走对方整本转运账',
      '离场时，十八艘小船已经封住江面。商绯月掀开绯伞，伞下只够你们贴身站着',
      '箭雨落下，她转身护住账本。你把她按进怀里，用锈剑挡下最后一箭',
      '箭头擦过她腰侧，绯裙裂开一线。你替她上药时，她懒懒靠在软榻上，始终看着你的耳朵一点点变红',
      '“沈先生，”她按住你替她拢衣的手，“账本看完了，怎么还不走？”',
      '你说船还没靠岸',
      '“这理由太差。”她拉住你的衣襟，将你带得更近，“重想一个”',
      '舱外忽然传来金铃。目标船靠岸了。她在你唇角轻轻碰了一下，起身时已握住伞柄：“剩下的账，回来算”',
    ],
  },
  yun: {
    no: '终章·五', title: '云台新章', lead: 'yun', summary: '她改掉一座宗门的旧规，你替她守住落笔时最难的那口气',
    paragraphs: [
      '云知意将新试炼章贴上山门。十七位长老撕下一次，她便再贴一次',
      '第五次，三百名杂役站在告示前。没人动剑，只把黑石谷的手印一张张贴到新章旁边',
      '新试炼第一次开阵，西侧出口仍慢了三息。云知意当众停阵，让最后一名杂役亲手改掉那一笔',
      '夜里，你在云台找到她。案上铺着九州地脉图，青岚门外还有六处红点',
      '她伏案睡着，银簪落在纸边，墨发散过肩背。你刚替她披上外衣，她便醒了',
      '“第七处。”她拉住你的手，将你带得俯下身。两个人挨得很近，她的呼吸停了一拍，“你听见了吗？”',
      '你听见的不是阵，是她乱掉的心跳',
      '你把这句话说出来。她耳尖慢慢红了，手却仍扣着你的手腕',
      '片刻后，她抬头吻了你一下，又立刻坐直，把银簪插回发间：“现在说第七处”',
      '你指向地图。红点正在移动，方向正是青溪村',
    ],
  },
  home: {
    no: '终章·六', title: '三下敲门', summary: '父亲离家十年。你扶着他走过最后一段村路，门里的人还没有睡',
    paragraphs: [
      '你用大比首名换了三年续脉药，又雇了一辆最慢的车',
      '父亲不能久坐。每走二十里，你便停下来扶他活动双腿。他总嫌耽误工夫，手却一直抓着装药的木箱',
      '第三天傍晚，青溪村的炊烟出现在山下',
      '父亲下了车。他不让你背，只把手搭在你肩上，一步一步走到那间旧屋前',
      '门缝里亮着灯。灶上的粥又烧干了，阿婆正在里面骂你怎么还不回来',
      '父亲抬起手，敲了三下',
      '咚、咚、咚',
      '屋里的骂声突然停住',
      '门开以后，阿婆先看见你，再看见你肩旁那张老了十年的脸。她手里的火钳掉到地上，半天没说出一个字',
      '父亲低着头，像从前做错事一样：“娘，粥又糊了”',
      '阿婆一巴掌打在他肩上，随即抱住他哭出了声。你站在门外，手里的锈剑也轻轻响了三下',
      '桌上很快摆了五封信。除了裴照雪、洛青禾、商绯月和云知意，还有一封没有落款，只画着一枚裂开的白玉戒',
    ],
  },
  true: {
    no: '隐章·真', title: '五碗热面', summary: '父亲回家了，司礼长老还在逃。你请四个人先坐下，把下一程摊在桌上说清楚',
    paragraphs: [
      '你把父亲送上回青溪村的车，又在青岚城最便宜的面摊摆了五只碗',
      '裴照雪最先到，剑没有离手。洛青禾带了父亲三个月的药，商绯月带来一张北境船票，云知意抱着六处地脉的阵图',
      '面刚上桌，商绯月便把一张悬赏令压在碗边。画像上的司礼长老换了名字，右手却仍戴着裂开的白玉戒',
      '裴照雪要往北追，云知意要先封最近的地脉，洛青禾担心那些活引撑不到你们赶去',
      '三个人同时开口。商绯月拿筷子敲了敲碗：“先让他吃。我们救出来的人，总不能饿死在面前”',
      '你低头吃了第一口。汤很烫，和阿婆煮的完全不一样',
      '随后你把六处地脉按远近排好，把船票放在最后一个红点上',
      '裴照雪看完路线，将剑放到桌边。洛青禾添上药站，云知意重算开阵时间，商绯月则在每一站后写下欠账',
      '面吃完，天也亮了。五个人在城门口分头办事，约好午时在第一座桥会合',
      '你赶到桥边时，她们已经都在。桥下的水声里，锈剑忽然指向北面，响了三下',
    ],
  },
};

const freshState = (): StoryState => ({ breath: 0, resolve: 0, restraint: 0, bonds: { pei: 0, luo: 0, shang: 0, yun: 0 }, flags: [] });

function gain(state: StoryState, delta: Partial<Pick<StoryState, 'breath' | 'resolve' | 'restraint'>> = {}, bond?: [LeadKey, number], flags: string[] = []): StoryState {
  const bonds = { ...state.bonds };
  if (bond) bonds[bond[0]] += bond[1];
  return { ...state, breath: state.breath + (delta.breath ?? 0), resolve: state.resolve + (delta.resolve ?? 0), restraint: state.restraint + (delta.restraint ?? 0), bonds, flags: [...new Set([...state.flags, ...flags])] };
}

function has(state: StoryState, flag: string) { return state.flags.includes(flag); }
function highestBond(state: StoryState): LeadKey {
  if (state.flags.some((flag) => flag.startsWith('trust_'))) return chosenAlly(state);
  return (Object.keys(state.bonds) as LeadKey[]).sort((a, b) => state.bonds[b] - state.bonds[a])[0];
}
function chosenAlly(state: StoryState): LeadKey {
  if (has(state, 'trust_luo')) return 'luo';
  if (has(state, 'trust_shang')) return 'shang';
  if (has(state, 'trust_yun')) return 'yun';
  return 'pei';
}

const SCENES: Record<string, Scene> = {
  river: {
    title: '河底第三声', location: '青溪村 · 春水河', progress: 6,
    paragraphs: () => [
      '你在河底摸到那柄剑时，肺里只剩最后一口气',
      '剑压在青石下面，锈得像一根烂铁。你双脚抵住河床，用力一拔，掌心先被剑刃割开，血珠刚冒出来，整条河忽然静了一下',
      '咚',
      '不是水声。那一下从剑里传出来，贴着骨头撞进胸口',
      '你叫沈砚，十八岁。青溪村的石头、草木和旧器物有没有灵息，你从八岁起就听得见。阿婆不许你说，父亲也不许',
      '十年前，父亲跟着青岚门的采药队进山。宗门送回一张“临阵逃走”的文书，人却没回来',
      '阿婆把那张纸压在米缸底下，压了十年',
      '你掰开缠在剑柄上的水草，一道歪歪的月牙露了出来。父亲的药刀上，也有这道缺口',
      '胸口开始发紧。你该浮上去了',
      '咚',
      '剑又响一声，剑尖慢慢偏向北面',
      '北面是青岚门。明天，他们正好来村里收徒',
      '你抓住剑柄往上游。水面只剩半丈时，第三声从掌心钻了进来',
      '咚、咚、咚',
      '父亲每次夜里回家，敲门也是三下',
    ],
    choices: () => [
      { label: '用父亲的旧布缠住剑，先别让别人看见', tone: '把剑藏进药篓', impact: '旧布刚绕到第三圈，剑在里面又敲了三下。阿婆的手停在绳结上，却没有问', next: 'test', apply: (s) => gain(s, { restraint: 1 }, undefined, ['wrapped_sword']) },
      { label: '把剑放到阿婆面前，问她认不认得月牙', tone: '把剑给阿婆看', impact: '火钳从阿婆手里掉进灶灰。她盯着月牙缺口，只问你一句：“这东西，在哪条河段捞的？”', next: 'test', apply: (s) => gain(s, { resolve: 1 }, undefined, ['open_sword']) },
    ],
  },
  test: {
    title: '一星灵根', location: '青岚门 · 山门坪', progress: 16,
    paragraphs: (s) => [
      '第二天，验灵石前排了三百多人',
      ...(has(s, 'wrapped_sword') ? [
        '阿婆把你送到村口，临走才按住药篓：“昨夜我听见了”',
        '你还没开口，她已经松手：“山上有人问起，先说这是一把捡来的废剑”',
      ] : [
        '阿婆一夜没睡。天亮时，她从米缸底抽出那张旧文书，折成四方塞进你衣襟',
        '“河段就在你爹失踪前采药的下游，”她把短剑推回来，“上山可以，先活着回来”',
      ]),
      '轮到你时，验灵石里一共有九处灵息',
      '九处都在响。掌心再压半寸，整块石头都会亮',
      '可你连半桶水都挑不上三千石阶。九道光一旦亮出来，药篓里的剑也会跟着响',
      '你只碰了最弱的一处',
      '验灵石亮起一粒可怜的白点。司礼弟子连眼皮都没抬：“一星杂灵根，只配做外门杂役”',
      has(s, 'wrapped_sword') ? '人群里有人笑你背着破药篓也敢来求仙' : '人群里有人笑你连破剑都舍不得扔，也敢来求仙',
      '笑声响到一半，一辆失控的水车忽然从石阶上滑下来。站在最下方的小杂役吓得一动不动',
      '一道青影从山雾里掠过。女子没有拔剑，只以剑鞘压住车轴，满车清水在她身后晃出一片碎光',
      '她没有戴珠钗，只以一根白玉簪束着长发。眉眼被晨光照得很淡，站在一地水光里，衣角却连半点都没湿',
      '她叫裴照雪，是洗剑峰最年轻的内门师姐',
      '她先把吓呆的小杂役拽到身后，才从一地水里走过来',
      '经过你身边时，她看了一眼验灵石，又看了一眼你刚刚收回的手',
      '“一星？”',
      '她的剑鞘在药篓边轻轻一碰。里面的锈剑立刻还了三声',
      '女子眼里的淡意没了',
      '“这把剑，”她压低声音，“你从哪儿拿到的？”',
    ],
    choices: () => [
      { label: '先接过杂役木牌，等离开人群再回答她', tone: '先留在山门里', impact: '木牌落进掌心。裴照雪没再追问，只用剑鞘点了点登云阶：“走完三千级，到洗剑峰找我”', next: 'stair', apply: (s) => gain(s, { restraint: 1 }, ['pei', 1], ['took_token']) },
      { label: '不答剑的来历，先问她：杂役能不能学剑', tone: '当着三百人开口', impact: '司礼弟子的笑声刚起，裴照雪把一本旧剑谱丢进你怀里：“能。带着你的问题走上来”', next: 'stair', apply: (s) => gain(s, { resolve: 1 }, ['pei', 1], ['asked_sword']) },
    ],
  },
  stair: {
    title: '三千石阶', location: '青岚门 · 登云阶', progress: 27,
    paragraphs: (s) => [
      ...(has(s, 'asked_sword') ? [
        '旧剑谱很薄，第一页只有四个字：先学站稳',
        '你把它塞进衣襟。纸角正好压着阿婆给你的旧文书，一新一旧，都硌着胸口',
      ] : [
        '杂役木牌背面刻着一串旧号：七三一',
        '你衣襟里的逃徒文书也有这串号。父亲进山那年，这块木牌已经发过一次',
      ]),
      '杂役入门的第一关不是悟道，是挑水',
      '两只木桶，一根旧扁担，三千级石阶',
      '八百级，扁担磨破肩皮。一千五百级，鞋底裂开。到两千八百级，你每踩一步，脚心都像压着炭火',
      '灵根好的弟子从旁边掠过去，带起的风把桶水吹出一层又一层',
      '最后两百级，你膝盖砸在石面上。水洒了大半，掌心也擦开一片血',
      '一双青色布靴停在眼前',
      '裴照雪没有扶你，只把手按在你背后：“先别起。跟着我的呼吸”',
      '她俯得很近，声音落在耳侧。隔着湿透的衣料，那只手稳稳压住你乱撞的心跳',
      '一息。两息。三息',
      '散在四肢的灵气终于顺着脊背往下走',
      '“现在起来，”她说，“剩下两百级，我陪你走”',
      '你撑着扁担站起来。她从袖中取出另一块旧木牌',
      '背面也是七三一',
      '“你手里那块，是十年前从黑石谷收回来的，”裴照雪看向山顶，“宗门不该再把它发给活人”',
    ],
    choices: () => [
      { label: '按她教的吐纳，先把最后两百级走完', tone: '把第一口气走顺', impact: '你每走十级，裴照雪就在身后敲一次剑鞘。到山顶时，那口气没有散，药篓里的锈剑却烫得隔布灼手', next: 'herb', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 1], ['learned_breath']) },
      { label: '先退回二十级，把洒掉的水重新打满', tone: '把两桶水补满', impact: '你多走了四十级，最后一个到山顶。裴照雪拿走七三一木牌，把你的名字写进百草堂：“那里能验出剑上的东西”', next: 'herb', apply: (s) => gain(s, { resolve: 2 }, ['pei', 1], ['filled_water']) },
    ],
  },
  herb: {
    title: '剑灰会活', location: '青岚门 · 百草堂', progress: 38,
    paragraphs: (s) => [
      ...(has(s, 'filled_water') ? [
        '你到百草堂时，太阳已经偏西。管事把最潮的六筐药踢到你脚边：“最后一个上山，翻不完别吃饭”',
        '那个差点被水车撞到的小杂役从门后钻出来，把半只馒头塞进你袖里，又蹲下替你抬药筐',
        '他没说谢。你也没推开那半只已经凉透的馒头',
      ] : [
        '你靠着那口刚学会的气走到山顶，领差时右手却抖得握不住笔',
        '裴照雪按住名册，没有替你写：“百草堂缺人。先把手养好，再来找我”',
        '第二天，你抱着药篓去报到，管事只看了那把锈剑一眼，便把最晒的活给了你',
      ]),
      '第三筐翻到一半，掌心的伤裂开了。血顺着竹片滴在锈剑上，剑身立刻浮出一层黑灰',
      '你刚伸手去碰，丹房里轰的一声，炉盖撞破窗纸飞了出来',
      '众人往后躲。一名浅杏衣裙的女子却迎着热浪进去，抬脚踢开侧门，将两名药童一手一个拎了出来',
      '她把人放下，回头看见你剑上的黑灰，脸上的笑一下收了',
      '“手给我”',
      '她叫洛青禾，二十四岁。乌发松松挽着，眼尾天生带一点笑，袖子却早已卷到手肘，露出腕间一道浅白的炉伤',
      '她托住你的手，银针挑进伤口。疼得你肩膀一缩，她反而把你的手腕扣得更紧：“别躲，里面有东西”',
      '针尖带出一粒黑砂。黑砂一碰药液，竟像活物一样往剑的方向爬',
      '洛青禾俯身看得很近。几缕碎发扫过你指背，药香裹着她的呼吸落下来，你连疼都慢了半拍',
      '“盯伤口，”她没抬眼，“再往上看，我就多扎一针”',
      '你立刻低头。她唇角弯了一下，手上却没有半点松',
      '片刻后，她从柜底翻出一本旧药录。黑石谷的封阵石上，才会生这种会追灵息的噬脉灰',
      '药录最后一页被人撕过，只剩半行字：噬脉灰每十年换一次活引',
      '今年正好是第十年',
      '洛青禾把门闩插上，又把一碗刚煎好的药推到你面前：“喝。它能让你听见灰里还剩几道气”',
      '碗里的药黑得见底。锈剑却在桌下，一声接一声地响了起来',
    ],
    choices: () => [
      { label: '把药喝下去，数清黑灰里到底有几道气', tone: '拿自己试一次', impact: '药一入口，胃里像吞进一把火。洛青禾整夜扣着你的脉，直到你从黑灰里听见七百二十一道死气，以及一道极弱的活息', next: 'rain', apply: (s) => gain(s, { breath: 1 }, ['luo', 2], ['drank_medicine']) },
      { label: '先留半碗药，再把黑灰封进瓶里慢慢验', tone: '不拿命赌答案', impact: '洛青禾没有催你。她用自己的血试了第一滴，确认无毒才把余药递来。天亮前，瓶中黑灰拼出了两个模糊的字：七三', next: 'rain', apply: (s) => gain(s, { restraint: 1 }, ['luo', 2], ['village_medicine']) },
    ],
  },
  rain: {
    title: '死人还在领药', location: '洗剑峰 · 守夜小屋', progress: 49,
    paragraphs: (s) => [
      ...(has(s, 'drank_medicine') ? [
        '那道活息只出现了一瞬。你追得太急，药火从胃里冲上喉咙，一口血全咳在洛青禾衣袖上',
        '她没躲，反手把你按回榻上。最疼的时候，你抓住了她的手，她便坐得更近，让你一直抓到天亮',
        '临走前，她塞给你一张纸。上面只有一行：黑石谷里，还有活人',
      ] : [
        '瓶里的“七三”还缺最后一笔。洛青禾把黑灰分成十二份，逐一滴药，直到第七瓶与第三瓶同时泛红',
        '她把两瓶扣在一起，灰粒沿着瓶壁拼出一串完整的旧号：七三一',
        '她没有说猜对了，只将瓶子和解毒丹一起塞进你袖中：“去找裴照雪。今晚就去”',
      ]),
      '洗剑峰的雨下得很大。你推开守夜小屋，裴照雪正用牙咬开左肩的绷带',
      '她刚从黑石谷回来。青衣湿透，长发散在肩后，雨水顺着颈侧没入衣领。桌上那柄剑沾满和你锈剑上一样的黑灰',
      '“先关门。”她把一册发霉的名簿推来，“我被人跟了一路”',
      '门刚插好，她肩上的伤口又渗出血。你拿起药，她便侧过身，褪开半边湿衣，将伤处露给你',
      '指尖刚碰到她肩头，她背上的肌肉便绷紧了一瞬',
      '“疼就说。”你把药粉压上去',
      '“手别抖就行。”她偏过脸。湿睫离你很近，呼吸也比平日快了一点',
      '绷带要从腋下绕过。你的手臂环过去时，几乎将她整个人拢在胸前。裴照雪没有躲，只握住你的手腕，带着你把最后一圈收紧',
      '“看名簿。”她先松手，耳后却被灯火照出一点红',
      '十年前的第七页上，有父亲的名字。旁边原本写着“逃离”，墨迹下面却压着两个更早的字：转运',
      '你继续往后翻。每隔三个月，七三一都会领一次续脉药',
      '最后一次领药，是三个月前',
      '可父亲被报作逃徒，已经整整十年',
      '屋外忽然传来踩水声。有人停在门前，把一封带血的信从门缝塞了进来',
      '信上只有一句：想见七三一，明日带剑来听潮阁',
    ],
    choices: () => [
      { label: '请她现在教你那一剑，明日一起赴约', tone: '今夜把剑练会', impact: '雨下到天亮，你被她打倒二十七次。第二十八次，你的剑擦过她鬓边。她接住你脱力的身体，在耳边说：“够了，明日站我身侧”', next: 'market', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 2], ['learned_sword']) },
      { label: '先收好名簿，陪她把追兵等出来', tone: '今夜不出这扇门', impact: '你们熄了灯，并肩坐到雨停。门外那人第三次靠近时，裴照雪的剑架住他的颈，你则从他袖里摸出一枚听潮阁的黑筹', next: 'market', apply: (s) => gain(s, { restraint: 1 }, ['pei', 2], ['shared_rain']) },
    ],
  },
  market: {
    title: '镜里旧字', location: '青岚城 · 听潮阁', progress: 60,
    paragraphs: (s) => [
      ...(has(s, 'learned_sword') ? [
        '你进听潮阁前，裴照雪将一枚铜钱抛向你眼睛',
        '你听见破风声，偏头，进半步，剑尖停在她腰侧。她用两指夹住剑身：“记住这个距离。再近，你会乱”',
        '她松开剑，指腹顺着你的手背一掠而过：“进去以后，别离我三步”',
      ] : [
        '那枚黑筹只在听潮阁地下拍场使用。裴照雪将它翻到背面，那里刻着一个小小的“谷”字',
        '你们没抓到送信的人。他咬碎毒囊前只说了半句：七三一不是名字，是货号',
        '第二天，你把锈剑裹在布里，带着黑筹进了听潮阁',
      ]),
      '地下拍场没有窗。你刚坐下，四周的灯便一盏盏熄了，只剩台上一面巴掌大的残镜',
      '主持人说，那是归潮镜的最后一片，能照出纸上被洗掉的旧字',
      '你衣襟里的名簿立刻发热',
      '第一声叫价还没落下，一柄绯色纸伞从二楼伸出：“五百灵石”',
      '满场安静。伞下的女子慢慢走下楼，绯裙掠过台阶，腰间金铃只在最后一步响了一声',
      '商绯月，二十七岁，听潮阁掌柜。她的眼睛是很浅的琥珀色，看人时总像带着笑，偏偏谁也猜不准那笑里有几分真',
      '她停在你面前，目光越过你，落到裴照雪的剑上：“两位带着血书来我的地方，是买镜，还是拆楼？”',
      '你把黑筹推过去。她只看一眼，指尖便压住了筹上的“谷”字',
      '“这不是听潮阁发的。”她抬眼，“有人借我的门，卖黑石谷里的活人”',
      '拍场后门突然落锁。十二道气息同时从暗处扑来',
      '裴照雪拔剑，你却先听见了桌下的机关。脚尖一挑，整张长桌翻起，正好挡住第一轮弩箭',
      '混乱里，商绯月扣住你的腰带，把你拽进伞下。伞骨贴着后背展开，三枚毒钉叮叮落地',
      '她的手还停在你腰侧，呼吸贴得很近：“小公子，救你一次，怎么还脸红？”',
      '你说毒钉离她更近',
      '商绯月怔了一下，随后笑出了声。她转身将你护在伞后：“那便算你也救我一次”',
      '半刻钟后，拍场的人全被压在地上。商绯月亲手将残镜按到名簿上',
      '“逃离”两个字像湿墨一样化开，露出原文：转入地脉，续作活引',
      '下面还有一行新添的小字',
      '七三一，今夜子时，断药',
    ],
    choices: () => [
      { label: '让她用残镜追查“断药”命令从哪里发出', tone: '先找下令的人', impact: '镜面裂开一道细纹，照出一只戴白玉戒的手。你认得那枚戒指——验灵那天，它就在司礼长老手上', next: 'cold', apply: (s) => gain(s, { breath: 1, restraint: 1 }, ['shang', 2], ['worked_market']) },
      { label: '请她借一把剑，立刻赶去黑石谷救七三一', tone: '先抢今夜这条命', impact: '商绯月把自己的护身短剑塞进你腰间，又烧掉一纸高价借契：“活着回来再还。死账最难收，我不做”', next: 'cold', apply: (s) => gain(s, { resolve: 1 }, ['shang', 2], ['borrowed_sword']) },
    ],
  },
  cold: {
    title: '雪沟下面', location: '黑石谷外 · 初试', progress: 70,
    paragraphs: (s) => [
      ...(has(s, 'worked_market') ? [
        '归潮镜照出的白玉戒，属于负责外门初试的司礼长老',
        '商绯月把镜片缝进你护腕内侧，针尖几次擦过腕骨。收线时，她用牙咬断丝线：“他若毁名簿，就拿你的手给众人看”',
        '你赶到黑石谷时，初试已经提前开始。司礼长老就站在谷口，右手藏在袖中',
      ] : [
        '商绯月的短剑比锈剑轻一半，握柄还留着她掌心的温度',
        '她没有跟来，只派车把你们送到谷外。临下车时，帘后飞出一枚金铃：“摇响它，听潮阁的人便知道你还活着”',
        '初试不知为何提前了一夜。山门已经封住，你只能混进最后一队杂役',
      ]),
      '进谷不到一刻，出口便在身后消失。头顶传来司礼长老的声音：初试改为猎杀岩狼，日出前只留一百人',
      '三百名杂役一下乱了。有人抢路，有人拔剑，那个曾分你半只馒头的少年被撞下雪沟',
      '你抓住他的手，自己也被拖了下去',
      '岩狼从雪里扑出来。第一剑砍偏，狼爪撕开肋下；第二剑卡进骨头，你手上已经没有力气拔',
      '第三头狼压低身体时，你听见右侧阵纹有一处空响',
      '你抱住那名杂役滚过去。狼爪擦着后背落下，下一刻，整片雪地塌了',
      '你们摔进一道废弃石廊。头顶的狼嚎隔着石板越来越远，石廊深处却传来铁链拖地的声音',
      '一道银色阵纹在黑暗中亮起，将迎面射来的石针挡住',
      '云知意从另一端走来，墨色斗篷上全是雪。她看见你肋下的血，先把护心丹按进你嘴里，才去看地上的阵线',
      '她二十五岁，眉眼清冷，银簪束得一丝不乱。蹲下替你缠伤时，斗篷落下来，将你们两人遮在一小片暖意里',
      '“咽下去。”她的指尖压着你唇角，直到药滚过喉咙才松开',
      '你问她为什么在这里',
      '云知意从石缝里挑出一撮噬脉灰：“我查了七年。每次初试死人，这条地脉都会亮一分”',
      '石廊尽头忽然传来三下敲击',
      '咚、咚、咚',
      '你腰间的锈剑也回了三下',
      '你撑着石壁要起身，膝盖却立刻软下去。云知意接住你，手臂从腰后收紧，让你靠在她肩前',
      '“前面是活阵。以你现在的经脉，走不过第三道门。”她将一张阵图铺在你腿上，“但我能让你记住路”',
      '石廊上方又传来巨响。有人正在封死这条入口',
      '阵图角落里，写着下一次开门的条件：外门大比首名，可入地脉领赏',
      '距离大比，还有三个月',
    ],
    choices: () => [
      { label: '把三道门的阵纹记进身体，三个月后再回来', tone: '先拿到入谷资格', impact: '云知意握着你的手，在掌心一笔一笔画阵。每画错一次，她便擦掉重来。入口合死前，你记住了最后一笔，也听见铁链后有人咳了一声', next: 'duel', apply: (s) => gain(s, { breath: 2 }, ['yun', 2], ['studied_array']) },
      { label: '先把受伤的杂役送出去，再回来找开门办法', tone: '先带活人离开', impact: '云知意背起伤者，你举阵旗开路。出口只剩一人宽时，她在身后托住你的腰，将你推了出去；石门合上前，里面那人又敲了三下', next: 'duel', apply: (s) => gain(s, { resolve: 2 }, ['yun', 2], ['saved_novice']) },
    ],
  },
  duel: {
    title: '他等你拔剑', location: '青岚门 · 外门大比', progress: 80,
    paragraphs: (s) => [
      ...(has(s, 'studied_array') ? [
        '三个月里，云知意每天只让你走三步阵。第一步听，第二步等，第三步才落脚',
        '你走错，她便用银簪敲手背。最后一夜，你闭着眼走出整座石阵，她的银簪停在你掌心，没有再落下来',
        '“明天别看我。”她站在你身后替你系紧护腕，“看他换气”',
      ] : [
        '那个小杂役捡回一条命，也带回七名证人的手印。司礼长老当场说他们受惊胡言，把人全赶回杂役院',
        '你白天劈柴，夜里练步。云知意不教完整阵法，只在地上插三面小旗，让你抱着木头一遍遍穿过去',
        '到大比前夜，你终于能在旗影合拢前，把最后一捆柴放到门外',
      ]),
      '大比首名能进地脉领赏。你要的不是赏，是那扇门',
      '决胜台上，等着你的正是验灵那天笑得最大声的人。四星火灵根，练气三层，比你高一整层',
      '司礼长老坐在高台正中，右手戴着那枚白玉戒',
      '钟响。第一剑砸下来，你的虎口当场裂开',
      '第二剑带着火，擦过肋下旧伤。血一热，你的脚步慢了半拍，台下已经有人喊着让你滚下去',
      '对手没有追。他抬剑时，嘴唇极快地动了一下：认输',
      '你听见他心跳乱得厉害，也看见他握剑的右手在抖',
      '高台上，白玉戒轻轻敲了一下扶手',
      '第三剑立刻变了。火息贴地折返，沿擂台阵纹烧向对手自己的心脉',
      '他若输，会死在台上',
      '你没退。锈剑贴着火光切进去，先断阵线，再撞剑脊',
      has(s, 'learned_sword') ? '裴照雪在台下敲了一声剑鞘。你踏进她教过的那半步，肩膀几乎撞进对手怀里' : '你按云知意教的第三步落脚，火线从鞋边合拢，只差一寸',
      '对手的剑飞出擂台。你的剑没有停在他喉前，而是刺进他脚下那块阵石',
      '阵石炸裂，藏在里面的血色符纸飞上半空',
      '满场的喊声一下没了',
      '你踩住符纸，看向高台：“这一场，算谁输？”',
      '司礼长老脸色不动，白玉戒却在扶手上裂开一条缝',
    ],
    choices: () => [
      { label: '把符纸交给戒律堂，先保住对手的命', tone: '让他活着作证', impact: '对手吐出一口黑血，把首名铜钥塞进你手里：“地脉里不止七三一。别信领路的人”', next: 'quiet', apply: (s) => gain(s, { restraint: 2 }, ['pei', 1], ['stopped_one']) },
      { label: '当众举起符纸，逼司礼长老交出地脉铜钥', tone: '现在就拿钥匙', impact: '三百名杂役一起堵住高台。司礼长老只能将铜钥丢下来，却在转身时无声说了两个字：子时', next: 'quiet', apply: (s) => gain(s, { resolve: 2 }, undefined, ['broke_board']) },
    ],
  },
  quiet: {
    title: '铜钥只开一次', location: '洗剑峰 · 小药室', progress: 87,
    paragraphs: (s) => [
      ...(has(s, 'stopped_one') ? [
        '戒律堂带走了符纸，也带走了你的对手。临走前，他用沾血的手指在你袖上写了一个“井”字',
        '裴照雪查过，地脉铜钥只能开正门；井口还有一条运药暗道',
        '你把铜钥放在桌上，它正一下一下发热',
      ] : [
        '铜钥落进你手里时冷得像冰，回到药室却开始发热',
        '云知意将它放进阵盘。钥匙每热一分，地脉入口便少一层封印',
        '子时一到，不管你们进不进去，门都会从里面打开',
      ]),
      '药室门窗紧闭。洛青禾替你缝虎口，裴照雪守在门边，商绯月擦拭残镜，云知意把地脉阵图钉上墙',
      '针穿过皮肉，你手指一颤。洛青禾按住手腕，低头咬断线：“擂台上敢接火剑，现在怕一根针？”',
      '你说火剑没她离得近',
      '她抬起眼，离你果然只有一掌。片刻后，她笑着在伤口上多按了一下。你疼得吸气，门边的裴照雪回头，把你的手从她掌下拿走',
      '裴照雪重新缠布。她的指节擦过掌心，动作很轻，视线却一直落在你脸上：“还能握剑？”',
      '你合拢五指。能',
      '商绯月将残镜立起来。镜中，正门后是装着活人的十二口石棺；井道外则堆着十年的名簿和药账',
      '云知意用银簪点在阵图中央：“铜钥转动以后，正门和井道只能保住一条。另一条会塌”',
      '石棺里有七三一。旧账里有谁把他们送进去的证据',
      '铜钥又热了一分',
      '窗外，更鼓敲过子时前最后一刻',
    ],
    choices: () => [
      { label: '用铜钥开正门，先把十二口石棺打开', tone: '抢在断药前救人', impact: '裴照雪把剑放上桌，洛青禾把命丹放在剑旁。正门会烧经脉，她们各有一种带你穿过去的办法', next: 'preparation', apply: (s) => gain(s, { resolve: 1 }, undefined, ['plan_core']) },
      { label: '从井道拆阵，试着让两条路都不要塌', tone: '用残镜和阵图改门', impact: '商绯月将残镜推过来，云知意拔下银簪。井道只有一次改阵机会，她们各能替你补上一个最容易出错的地方', next: 'preparation', apply: (s) => gain(s, { restraint: 1 }, undefined, ['plan_ring']) },
    ],
  },
  preparation: {
    title: '子时开门', location: '青岚门 · 出发前', progress: 91,
    paragraphs: (s) => has(s, 'plan_core') ? [
      '正门前，铜钥已经烫得握不住。门后的阵火沿着缝隙往外爬，石棺里那道活息越来越弱',
      '裴照雪卸下执事令，把护心镜扣到你胸前。系带从颈后绕过时，她的手在你后颈停了一下',
      '“我开路，你听门。”她将额头轻轻抵上护心镜，确认位置，“火落下来，别替我挡”',
      '洛青禾把命丹切成两半，一半含在自己舌下。另一半落在她掌心，泛着很淡的红',
      '“这药会把你的疼分给我。”她把手抬到你唇边，“所以进去以后，你若倒，我也站不住”',
      '裴照雪能斩开前三道火，第四道要你自己走',
      '洛青禾能护住经脉，但每一道火都会同时落在两个人身上',
      '铜钥开始发红。你只够时间向其中一人伸手',
    ] : [
      '井口只能容一人下去。商绯月用绯伞撑住井壁，残镜则挂在你胸前，裂纹已经爬到正中',
      '“镜子还能照三次。”她替你收紧腰带，指尖从腰侧绕过，“第四次，它和照镜的人一起碎”',
      '云知意跪在井边，将最后三笔阵纹写进你掌心。她握着你的手很久，确认每一道灵息都走对才松开',
      '“我能改三次。”她抬头时，银簪已被拆成阵针，“第四次算错，井会直接合死”',
      '跟商绯月走，残镜能照出暗门，代价写在镜上的裂纹里',
      '跟云知意走，阵图能保住两条路，代价落在每一次判断上',
      '地底传来铜钥转动的声音。有人已经从里面开门了',
    ],
    choices: (s) => has(s, 'plan_core') ? [
      { label: '握住裴照雪的剑，同她从正门杀进去', tone: '剑开前三道火', impact: '她把你的手按在自己剑柄上。两只手叠在一处，铜钥落锁前，她只说了一句：“这次跟紧我”', next: 'hunt', apply: (state) => gain(state, {}, ['pei', 3], ['trust_pei']) },
      { label: '从洛青禾掌心含走命丹，同她分这一场疼', tone: '两人共用一颗丹', impact: '药碰到舌尖时，她的指腹也擦过你的唇。命丹同时化开，两个人的心跳从这一刻起落在了一起', next: 'hunt', apply: (state) => gain(state, {}, ['luo', 3], ['trust_luo']) },
    ] : [
      { label: '扣好归潮镜，同商绯月从井道下去', tone: '拿三次镜光换路', impact: '她把金铃系到你腕上，又用伞带将两人的腰扣在一起：“井里走散了，谁也别想单独回来”', next: 'hunt', apply: (state) => gain(state, {}, ['shang', 3], ['trust_shang']) },
      { label: '记住掌心阵纹，同云知意下井改阵', tone: '拿三次改阵换路', impact: '她的十指与你相扣，最后描了一遍阵线：“我若数错，你不要信我。信你听见的那一声”', next: 'hunt', apply: (state) => gain(state, {}, ['yun', 3], ['trust_yun']) },
    ],
  },
  hunt: {
    title: '第十二口石棺', location: '黑石谷 · 阵心', progress: 95,
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      const allyParagraphs: Record<LeadKey, string[]> = {
        pei: [
          '第一道阵火落下，裴照雪的剑从你耳边穿过，火线贴着脸颊断成两截',
          '第二道火从脚下卷起。她转到你身后，双手覆住你握剑的手，两个人用同一剑劈开地面',
          '第三道火烧穿她的袖口。你闻到焦味，她却只把下巴抵在你肩侧：“门在左边。现在，换你带路”',
          '你听见左墙里有一声空响，反手带着她一同刺进去',
        ],
        luo: [
          '第一道阵火钻进经脉，你和洛青禾同时跪了下去',
          '她额角全是冷汗，仍先来扣你的脉。药力快散时，她捧住你的脸，将舌下最后一点命丹渡了过来',
          '唇只碰了一瞬，滚烫药气便重新压进胸口。她退开时呼吸发乱，手还托在你后颈',
          '“出去以后再脸红。”她咬着气笑了一下，“门要关了”',
        ],
        shang: [
          '第一次镜光照出假墙，归潮镜裂到边缘。第二次照出毒弩，裂纹已经穿过正中',
          '第三道门前，镜里同时出现两条路。商绯月只看一眼便把你推向左边，自己被碎光撞进你怀里',
          '你抱住她，伞带仍将两人的腰扣在一起。她靠在你胸前喘了两口气，抬手擦掉唇角的血',
          '“左边有活人的影子。”她将碎镜塞进你手里，“别管镜子，去开门”',
        ],
        yun: [
          '前两次改阵都对。第三次，云知意的阵针落下，井壁却猛地向内合拢',
          '她算错了。你没等她开口，抓住她的手改刺右下方。那里正传来锈剑一样的空响',
          '石壁擦着肩膀停住。她从背后抱紧你的腰，稳住两个人的重心，呼吸在耳后乱了片刻',
          '“接下来你数。”她把最后一枚阵针放进你掌心，“我跟你走”',
        ],
      };
      return [
        '地脉里没有宝库，只有十二口竖在阵心四周的石棺',
        '每一口棺都缠着铁链。灵息从棺里被一点点抽出来，送向石壁上那颗拳头大的血色阵核',
        '第一口没有声音。第二口也没有',
        '你跑到第十二口，铜牌上刻着七三一',
        '锈剑刚碰到棺盖，里面便响了三下',
        '咚、咚、咚',
        ...allyParagraphs[ally],
        '棺盖只抬起一线，一只枯瘦的手忽然从里面伸出，死死抓住你的袖口',
        '那张脸瘦得几乎认不出来。鬓发全白，右眉上的旧疤却还在',
        '你七岁那年摔碎药罐，父亲替你挡阿婆的竹条，也是在这里留下一道疤',
        '棺里的人睁开眼。浑浊的目光在你脸上停了很久，嘴唇才动了一下',
        '“小砚？”',
        '你喉咙里堵着东西，只能把他的手越握越紧',
        '身后忽然响起掌声。司礼长老站在阵核旁，碎掉的白玉戒已经被血染红',
        '“来得正好。”他将手按上阵核，“一星灵根能养出这样的耳朵，换你父亲这一副废骨，很划算”',
        '十二口石棺同时震动。父亲抓住你的袖子，拼尽力气说出十年来第一句完整的话：“先开别人的”',
        '阵外也在这一刻传来三声巨响。留下的三个人已经动手，出口还能撑一刻钟',
        '你面前有两样东西：十二口棺的总锁，以及记录所有转运名字的血色阵核',
        '剑只能先斩一处',
      ];
    },
    choices: () => [
      { label: '先斩总锁，把十二口棺里的人全放出来', tone: '一个活人也不留在这里', impact: '铁链崩断，十一道微弱的喘息接连响起。司礼长老卷走阵核逃了，父亲却被那个送你半只馒头的少年背出了地脉', next: 'dawn', apply: (s) => gain(s, { resolve: 1 }, undefined, ['saved_all']) },
      { label: '先夺阵核，让外面的三个人同时开棺', tone: '人和证据都要带走', impact: '你硬接了司礼长老一掌，将阵核砸向井口。四面阵纹一起亮起，十二口棺同时打开；你倒下前，父亲的手垫在了你脑后', next: 'dawn', apply: (s) => gain(s, { restraint: 1 }, undefined, ['kept_proof']) },
    ],
  },
  dawn: {
    title: '阿婆还在等', location: '青岚门 · 晨光里', progress: 99,
    paragraphs: (s) => {
      const closest = highestBond(s);
      return [
        ...(has(s, 'saved_all') ? [
          '你们从地脉出来时，司礼长老已经不见。血色阵核也被他带走，只剩半枚白玉戒落在雪里',
          '十二个被困的人都还活着。那个小杂役背着父亲走在最后，腿一直发抖，手却没有松',
          '父亲伏在他背上，每经过一个人，便吃力地说出那人的名字',
        ] : [
          '你醒来时已经在谷口。父亲坐在旁边，用一只还在发抖的手替你按着伤口',
          '血色阵核摆在雪地上。每一个被送进地脉的名字、日期和下令者都在里面亮着',
          '十二口石棺全开了。洛青禾跪在伤者中间施针，袖口的血已经分不清是谁的',
        ]),
        '天亮时，十二副担架抬上山门',
        '父亲拒绝躺下。他扶着你的肩，一步一步走到验灵石前，将十年前那张转运令按在石面上',
        has(s, 'saved_all') ? '十一名活证人随后按下手印。没有阵核，声音便一遍一遍说，直到山门里所有人都听见' : '血色阵核被归潮镜照亮，司礼长老的名字排在第一行。戒律堂封山搜人，再没人能将它改回去',
        '旧试炼当场停了。杂役院的禁剑牌被人从墙上扯下来，砸在石阶下',
        '洛青禾说父亲的经脉坏了大半，但人能活。父亲听完只问了一句：“青溪村离这里还是两日路？”',
        '你点头。他便望向山下，像已经看见阿婆坐在门口骂人的样子',
        `${LEADS[closest].name}站在你身侧。你手上的伤又裂开，她直接握住你的手腕，没让血滴到地上`,
        '山门后有人在喊你的名字，山门外是回青溪村的路',
        '父亲把那柄锈剑递还给你：“小砚，接下来你自己选”',
      ];
    },
    choices: (s, found) => {
      const closest = highestBond(s);
      const options: Choice[] = [
        { label: '领下外门木牌，把山门里没查完的账查完', tone: '留在青岚门', next: 'ending:keep' },
        { label: `走到${LEADS[closest].name}身边，问她下一站去哪`, tone: `跟${LEADS[closest].title.replace('青岚门', '')}走`, next: `ending:${closest}` },
        { label: '扶住父亲，先回青溪村敲那扇门', tone: '先带父亲回家', next: 'ending:home' },
      ];
      if (found.length >= 3) options.push({ label: '谁也不选终点，请她们先下山吃一碗面', tone: '山外还有路', next: 'ending:true' });
      return options;
    },
  },
};

function focusedLeads(sceneId: string, state: StoryState): LeadKey[] {
  if (sceneId === 'test' || sceneId === 'stair' || sceneId === 'rain' || sceneId === 'duel') return ['pei'];
  if (sceneId === 'herb') return ['luo'];
  if (sceneId === 'market') return ['shang'];
  if (sceneId === 'cold') return ['yun'];
  if (sceneId === 'quiet') return ['pei', 'luo', 'shang', 'yun'];
  if (sceneId === 'preparation') return has(state, 'plan_core') ? ['pei', 'luo'] : ['shang', 'yun'];
  if (sceneId === 'hunt') return [chosenAlly(state)];
  return [];
}

const NUMBER_MARKS = ['一', '二', '三', '四'];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState('river');
  const [state, setState] = useState<StoryState>(freshState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trail, setTrail] = useState<string[]>([]);
  const [lastEcho, setLastEcho] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<EndingKey | null>(null);
  const [foundEndings, setFoundEndings] = useState<EndingKey[]>([]);
  const [showCodex, setShowCodex] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem('qinglan-found-endings');
      if (saved) { try { setFoundEndings(JSON.parse(saved)); } catch { /* ignore damaged local data */ } }
      if (window.localStorage.getItem('qinglan-music') === 'off') setMusicOn(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.26;
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
  function returnToCover() { setStarted(false); audioRef.current?.pause(); }
  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem('qinglan-music', next ? 'on' : 'off');
    const audio = audioRef.current;
    if (!audio) return;
    if (next && started) audio.play().catch(() => { /* browser may require another click */ }); else audio.pause();
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
        window.localStorage.setItem('qinglan-found-endings', JSON.stringify(next));
        return next;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSceneId(choice.next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function rewind() {
    const previous = history.at(-1);
    if (!previous) return;
    setSceneId(previous.sceneId); setState(previous.state); setTrail(previous.trail); setLastEcho(previous.echo); setEndingId(null); setHistory((items) => items.slice(0, -1));
  }
  function restart() {
    setStarted(true); setSceneId('river'); setState(freshState()); setHistory([]); setTrail([]); setLastEcho(null); setEndingId(null); setShowMap(false);
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
  const realm = state.breath >= 5 ? '练气三层' : state.breath >= 3 ? '练气二层' : state.breath >= 1 ? '初引灵息' : '尚未入门';

  return (
    <main className="story-shell">
      <audio ref={audioRef} src="./audio/oriental-dawn.ogg" loop preload="metadata" />
      <div className="mist mist-one" aria-hidden="true" /><div className="mist mist-two" aria-hidden="true" />
      <div className="leaf-field" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>

      <header className="topbar">
        <button className="brand" onClick={returnToCover} aria-label="返回封面"><span className="seal">藏</span><span><small>第一卷 · 试玩</small><strong>青岚问仙</strong></span></button>
        <nav aria-label="游戏功能">
          <button onClick={() => setShowCodex(true)}>人物录</button><button onClick={() => setShowMap(true)}>结局 <i>{foundEndings.length}/7</i></button>
          <button onClick={rewind} disabled={!history.length}>回到上一选择</button>
          <button className={`music-toggle ${musicOn && started ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}><span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>音乐 {musicOn ? '开' : '停'}</button>
        </nav>
      </header>

      {!started ? (
        <section className="cover-card">
          <p className="kicker">小人物成长 · 山门第一卷</p>
          <h1>父亲失踪十年以后<br />他的剑在河底敲了三下</h1>
          <p className="lede">宗门说父亲临阵逃了，你却从河底捞到他的锈剑。剑尖指向青岚门，黑石谷的药册上，一个死去十年的人三个月前还领过药——子时断药，而你只剩最后一次开门的机会</p>
          <div className="cover-actions"><button className="primary" onClick={beginStory}>从青溪村出发 <span>→</span></button>{foundEndings.length > 0 && <button className="text-button" onClick={() => setShowMap(true)}>查看已解锁结局</button>}</div>
          <div className="cover-meta"><span>约 35–50 分钟</span><span>11 次轻选择</span><span>6 个基础结局 + 1 隐章</span></div>
          <p className="notice">所有主要角色均为成年人 · 含受伤、成长压力与含蓄成人暧昧</p>
          <p className="music-credit">背景音乐：<a href="https://opengameart.org/content/%C3%AEle-flotante-village-in-the-air" target="_blank" rel="noreferrer">Village In The Air · Le Mandrill · CC0</a></p>
        </section>
      ) : (
        <div className="game-layout">
          <section className="story-card" aria-live="polite">
            <div className="scene-head"><span>{ending ? ending.no : scene.location}</span><i /><span>{ending ? '此程已至' : `${String(trail.length + 1).padStart(2, '0')} · ${scene.title}`}</span></div>
            {!ending && cast.length > 0 && <div className="cast-strip" aria-label="本幕焦点人物"><small>本幕人物</small>{cast.map((key) => <span key={key}><b>{LEADS[key].mark}</b><em>{LEADS[key].title}</em><strong>{LEADS[key].name}</strong></span>)}</div>}
            {ending ? (
              <article className="ending-view"><p className="kicker">{ending.no}</p><h2>{ending.title}</h2><p className="ending-summary">{ending.summary}</p><div className="prose">{ending.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="ending-actions"><button className="primary" onClick={restart}>重新出发</button><button className="outline" onClick={() => setShowMap(true)}>查看结局</button><button className="text-button" onClick={rewind}>回到最后选择</button></div></article>
            ) : (
              <article className="passage" key={sceneId}>
                {lastEcho && trail.length > 0 && <div className="choice-echo"><small>刚才的选择已经发生</small><strong>{lastEcho}</strong></div>}
                <div className="prose">{scene.paragraphs(state).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                <div className="choices" aria-label="选择行动">{choices.map((choice, index) => <button key={`${sceneId}-${index}`} onClick={() => choose(choice)}><b>{NUMBER_MARKS[index]}</b><span><small>{choice.tone}</small>{choice.label}</span><em>{index + 1}</em></button>)}</div>
              </article>
            )}
          </section>
          <aside className="destiny-panel">
            <p className="panel-title">此行近况</p><div className="progress-orb"><span>{progress}</span><small>%</small></div>
            <dl><div><dt>境界</dt><dd>{realm}</dd></div><div><dt>心性</dt><dd>{state.resolve >= 5 ? '敢往前走' : state.resolve >= 2 ? '渐渐站稳' : '仍会害怕'}</dd></div><div><dt>藏锋</dt><dd>{state.restraint >= 5 ? '收放由心' : state.restraint >= 2 ? '懂得留手' : '尚且生涩'}</dd></div><div><dt>吃过的苦</dt><dd>{trail.length >= 7 ? '已成来路' : trail.length >= 3 ? '掌心有茧' : '刚刚开始'}</dd></div></dl>
            <div className="bond-card"><small>此刻最信任</small><strong>{state.bonds[closest] > 0 ? LEADS[closest].name : '尚未相识'}</strong><span>{state.bonds[closest] > 0 ? LEADS[closest].title : '关系会在共同经历里变化'}</span></div>
            <p className="key-hint">按数字键 1–4 也可选择</p>
          </aside>
        </div>
      )}

      {started && <footer className="progress-row"><span>{ending ? ending.title : scene.title}</span><i><em style={{ width: `${progress}%` }} /></i><span>{ending ? '本次故事完成' : '主线会继续向前'}</span></footer>}

      {showCodex && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCodex(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="人物录" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="kicker">四位同行者</p><h2>人物录</h2></div><button onClick={() => setShowCodex(false)}>关闭</button></div><div className="people-grid">{(Object.keys(LEADS) as LeadKey[]).map((key) => { const lead = LEADS[key]; return <article key={key}><span className="person-mark">{lead.mark}</span><div><small>{lead.title} · {lead.age}岁</small><h3>{lead.name}</h3><p>{lead.description}</p></div><em>{state.bonds[key] > 4 ? '彼此信任' : state.bonds[key] > 0 ? '已经相识' : '尚未相遇'}</em></article>; })}</div></section></div>}

      {showMap && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowMap(false)}><section className="modal route-modal" role="dialog" aria-modal="true" aria-label="结局图" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="kicker">走过的路</p><h2>结局</h2></div><button onClick={() => setShowMap(false)}>关闭</button></div><p className="route-note">六个基础结局没有“答错”。走过任意三个结局后，最后一幕会出现一条新的路</p><div className="ending-grid">{(Object.keys(ENDINGS) as EndingKey[]).map((key) => { const item = ENDINGS[key]; const unlocked = foundEndings.includes(key); return <article key={key} className={unlocked ? 'unlocked' : ''}><small>{unlocked ? item.no : '未解锁'}</small><strong>{unlocked ? item.title : '？？？'}</strong><p>{unlocked ? item.summary : key === 'true' ? '走过三条路，才看得见它' : '换一种同行方式抵达这里'}</p></article>; })}</div></section></div>}
    </main>
  );
}
