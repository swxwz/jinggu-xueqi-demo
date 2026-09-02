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
    description: '青衣、白玉簪、很少真正笑。她不爱说软话，却会把步子放慢，也敢为一份无人肯认的旧名册交回执事令',
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
    no: '终章·一', title: '藏锋入门', summary: '你没有一夜成名，只拿走一块最普通的木牌，从此一步一步往上走',
    paragraphs: [
      '黑石谷的旧阵塌了，青岚门却没有一夜变成好地方',
      '有人想让你做首功，有人想知道你究竟藏了多少本事。你都没答，只从功簿上拿走一块外门木牌',
      '三个月后，你仍住在山腰最小的院子里，清晨挑水，午后练剑，夜里替百草堂晒药',
      '不同的是，再没人敢把你的沉默当成软弱',
      '父亲的断药刀被你放在窗边。你没有把它供起来，只用它裁药、削竹签，让一件等了十年的遗物重新回到日子里',
      '新来的杂役走不完三千石阶时，你也没有背他，只把手按在他背后，教他先把下一口气喘稳',
      '裴照雪偶尔经过，见你一剑只使七分，便抬手压低你的剑尖：“又藏？”',
      '你说还不够强。她看了你片刻，把自己的剑放到你手边：“那就慢慢来，我等得起”',
      '山风吹开她鬓边一缕发，也吹亮远处万家灯火。你终于知道，仙路不必从惊天动地开始',
    ],
  },
  pei: {
    no: '终章·二', title: '与雪同程', lead: 'pei', summary: '她教你出剑，你教她偶尔把重担交给别人',
    paragraphs: [
      '裴照雪辞了试炼执事，只留下一柄剑和两套青衣',
      '她要沿黑石谷的旧路，把失踪弟子的名字一个个送回家。你说正好顺路，她明知不是，仍把另一匹马的缰绳递给你',
      '第一户人家没有相信你们。第二户老人接过名牌，当场打了裴照雪一巴掌，问她为何十年后才来',
      '她没有躲，也没有解释。离开时，你把那只发红的手握进掌心，她沉默走了很久，才慢慢回握',
      '离山第一夜落了雨。客栈只有一间上房，她把床让给你，自己坐在窗边擦剑',
      '你伤口发热，半夜醒来时，她正俯身替你换药。长发从肩头滑下来，扫过你的手背，凉得你一下清醒',
      '“看什么？”她问',
      '你说看师姐是不是也会累。她的手停在你衣襟上，离得很近，眼底那层惯常的冷终于松了一点',
      '“会，”她低声说，“所以以后，你走慢些”',
      '窗外雨声很长。她没有退开，你也没有催她退开',
    ],
  },
  luo: {
    no: '终章·三', title: '人间药火', lead: 'luo', summary: '你们没有炼成长生丹，却让更多普通人不必拿命换一次入门',
    paragraphs: [
      '洛青禾把黑石谷带回的灵苔种满半座药山',
      '她的新方子终于成了。药效不算惊天动地，只能替根骨普通的人稳住第一口灵息',
      '可第一炉开时，山下排了整整两里的人',
      '第一个服药的是个卖炭人的女儿。石头只亮了一点，她却抱着母亲哭得停不下来',
      '洛青禾躲到炉后擦眼睛，被你撞见后还不承认，只说烟太大',
      '你替她守炉三天，最后困得靠在墙边睡着。醒来时，头正枕在她腿上，鼻端全是温暖的药香',
      '洛青禾垂眼看你，指尖慢慢拨开你额前的碎发：“小师弟，你欠我的诊金越来越多了”',
      '你问怎么还。她弯起眼睛，俯得更近，呼吸轻轻落在你唇边',
      '“先替我守一辈子炉，”她说，“剩下的，我再慢慢算”',
      '炉火正好，窗外春色也正好。你忽然觉得，这笔债可以欠得久一点',
    ],
  },
  shang: {
    no: '终章·四', title: '绯伞九州', lead: 'shang', summary: '她把你带进最热闹的人间，你把她唯一不肯标价的真心留了下来',
    paragraphs: [
      '商绯月拿回归潮镜，在青岚城开了九家新的听潮阁',
      '她请你做首席鉴宝师，月钱高得吓人。你去了才知道，所谓首席，平日只需陪她走南闯北',
      '她把当年三本假账里多收的钱一户户退完。有人早已搬走，她便把银子留在柜上，账页却始终没有勾销',
      '那颗灰种子也终于开花，花很小，不值三个月工钱。商绯月仍把第一朵夹进账本最前面，谁都不许碰',
      '她谈生意时仍旧滴水不漏，夜里回到船上，却会踢掉鞋子，把发间金铃随手搁进你掌心',
      '有一晚江风太大，她的绯色外衫被吹开。你替她拢好衣领，她顺势按住你的手，没有立刻放',
      '“沈先生，”她笑得很轻，“这一路吃我的、住我的，还总盯着我看，账怎么算？”',
      '你说把自己抵给她',
      '商绯月本来准备了一百句玩笑，那一刻竟一句也没说出来',
      '许久，她才把额头靠上你的肩：“好。这是你做过最划算的一笔买卖”',
    ],
  },
  yun: {
    no: '终章·五', title: '云台新章', lead: 'yun', summary: '她改掉一座宗门的旧规，你替她守住落笔时最难的那口气',
    paragraphs: [
      '云知意把新试炼章贴上山门那天，十七位长老联名反对',
      '她没有争辩，只把黑石谷的名册一页页铺开。你站在她身后，替每个回不了家的人念出名字',
      '新章第一次试行仍出了错。一个弟子被困半日，云知意当着所有人的面划掉自己最坚持的一条，又请那名弟子亲手重写',
      '她从前以为守住正确就够了。后来才明白，好的规矩还得允许最弱的人说一句“这里不对”',
      '旧章最终被烧掉。火光映在她眼底，像一场终于肯落下的日出',
      '深夜，你在云台找到她。她伏案睡着，银簪松了，墨发铺过肩背，比白日少了几分遥不可及',
      '你替她披衣，她却在半梦半醒间握住你的手，把你拉得俯下身去',
      '两个人挨得太近。她睁开眼，呼吸乱了一拍，却仍没有松手',
      '“新章还有一条没写，”她说，“往后我做错了，你要当面告诉我”',
      '你点头。她这才笑了，很淡，也很好看。云台灯火一直亮到天明',
    ],
  },
  home: {
    no: '终章·六', title: '先回人间', summary: '仙门给了你一条向上的路，你先用它走回那个等你吃饭的小村子',
    paragraphs: [
      '论功那日，你没要法器，也没要内门名额，只换了三年的药和一袋灵谷种',
      '你回到青溪村时，阿婆正坐在门口晒萝卜干',
      '她看了半天才认出你，开口第一句却是：“又瘦了”',
      '你蹲下来替她收竹匾，像小时候那样听她数落。直到热汤端上桌，才把那块外门木牌放到她面前',
      '阿婆摸了又摸，最后只问山上有没有人欺负你',
      '你想起掌心的伤、雪地里的那一夜，也想起有人递来的剑、药、伞和阵图',
      '“有，”你笑了笑，“不过也有人帮我”',
      '饭后，你把父亲的断药刀放到灶边。阿婆认出月牙，手在半空停了很久，最终只是把烧干过无数次的旧锅重新添满水',
      '那天夜里，她第一次把门闩插得很早。等一个人十年以后，家里终于可以好好睡一觉',
      '门外，四封信几乎同时送到。你拆开第一封，饭还没吃完，新的路已经在纸上等你',
    ],
  },
  true: {
    no: '隐章·真', title: '人间第一程', summary: '最好的结局不是选中一个终点，而是你们都还拥有继续选择的余地',
    paragraphs: [
      '你没有接受长老席，也没有立刻选一条路',
      '你在青岚城最便宜的面摊摆了五只碗，然后给四个人各写一封很短的信：事办完了，来吃面',
      '裴照雪最先到，嘴上说只坐片刻。洛青禾带了酒，商绯月嫌桌子不稳，云知意则把一卷新章放在油灯旁',
      '她们第一次不为阵眼、药方、买卖或门规坐在一起',
      '面快凉时，你说想去九州看看。不是逃，也不是报仇，只是想知道山外还有多少条普通人也能走的路',
      '短暂的安静后，裴照雪把剑放上桌，洛青禾添了药囊，商绯月推来一张船票，云知意在新章末尾写下“准行”',
      '没人许诺永远，也没人把谁当作奖赏',
      '商绯月先问路费谁出，洛青禾说可以拿她抵账。裴照雪没听懂，云知意却认真算起了四条路线',
      '你看着她们第一次为一件无关生死的小事争起来，忽然觉得这比黑石谷的胜利更像一个新开始',
      '第二天清晨，五个人从不同的门出城，又在第一座桥边碰头。故事到这里才真正开始',
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
    title: '石会呼吸', location: '青溪村 · 春水河', progress: 6,
    paragraphs: () => [
      '沈砚八岁那年，第一次听见石头呼吸',
      '那块青石沉在春水河底，明明没有嘴，却在水声里一下一下吐着极轻的白气。别人都说他饿昏了，只有阿婆把他从河里捞上来，拿旧棉被裹住他',
      '“听见也别乱说，”阿婆替他擦头发，“人没本事护住的东西，说出去就是祸”',
      '也是那年秋天，父亲跟着青岚门的采药队进山，再也没有回来',
      '宗门只送来一张薄纸，说他临阵逃了。阿婆没哭，当着来人的面把纸折好，等门一关，才坐在灶前守着一锅烧干的粥，一夜没有添水',
      '十年过去，沈砚十八岁，仍是青溪村最普通的采药郎',
      '他会被荆棘划破手，会为一株认错的药挨骂，也要攒三个月铜钱才买得起一双不漏水的鞋。那点能听见灵息的本事，除了让他比别人多找到几株药，什么都没改变',
      '直到青岚门来村里收徒的前一晚，他在河底听见了第二种呼吸',
      '一柄锈得看不出模样的短剑压在石缝里。沈砚拔出它时，剑身没有发光，只在他掌心轻轻震了一下',
      '剑柄下方有一道歪歪的月牙缺口。父亲的药刀上，也有一模一样的记号',
      '沈砚在河里站了很久。岸上，阿婆已经把他明日上山要穿的旧鞋烘在灶边，一边烘，一边假装没往河里看',
      '有些路不是想明白了才走，是家里已经把鞋替你烘干了',
    ],
    choices: () => [
      { label: '用父亲留下的旧布缠好短剑，藏进药篓', tone: '先把秘密护住', impact: '你把剑藏了起来，却没有再把疑问埋回河底。阿婆看见药篓多出来的重量，只替你把绳结重新系紧', next: 'test', apply: (s) => gain(s, { restraint: 1 }, undefined, ['wrapped_sword']) },
      { label: '把短剑挂在腰间，明日就带它上山', tone: '带着答案上山', impact: '阿婆盯着那道月牙缺口看了很久，最后只说了一句：“若真是他的东西，就替他带回来一个明白”', next: 'test', apply: (s) => gain(s, { resolve: 1 }, undefined, ['open_sword']) },
    ],
  },
  test: {
    title: '一星灵根', location: '青岚门 · 山门坪', progress: 16,
    paragraphs: (s) => [
      '第二天，验灵石前排了三百多人',
      ...(has(s, 'wrapped_sword') ? [
        '阿婆把你送到村口，没有问药篓里是什么，只把最结实的肩带换到了磨损那一边',
        '临走前，她拍了拍药篓：“藏东西不难。难的是别把自己也藏没了”',
      ] : [
        '短剑挂在腰间，一路都有人笑它像根烧火棍。你没有摘下来，因为剑柄那道月牙每撞一下腿侧，都在提醒你为何而来',
        '阿婆送到村口便停下了。她没说争气，只说：“该跑就跑。活人比答案要紧”',
      ]),
      '轮到沈砚时，石头里面一共有九处灵息。他听得清清楚楚，只要掌心再往下压半寸，九道光就会一起亮起来',
      '他想起阿婆的话，也想起自己那副连半桶水都挑不上山的身体',
      '于是他只碰了最弱的一处',
      '验灵石亮起一粒可怜的白点。司礼弟子连眼皮都没抬：“一星杂灵根，只配做外门杂役”',
      has(s, 'wrapped_sword') ? '人群里有人笑你背着破药篓也敢来求仙' : '人群里有人笑你连破剑都舍不得扔，也敢来求仙',
      '笑声响到一半，一辆失控的水车忽然从石阶上滑下来。站在最下方的小杂役吓得一动不动',
      '一道青影从山雾里掠过。女子没有拔剑，只以剑鞘压住车轴，满车清水在她身后晃出一片碎光',
      '她没有戴珠钗，只以一根白玉簪束着长发。眉眼被晨光照得很淡，站在一地水光里，衣角却连半点都没湿',
      '她叫裴照雪，是洗剑峰最年轻的内门师姐',
      '她先确认那名小杂役没有受伤，才从人群中走过来。一路上没人敢再高声说笑',
      '经过你身边时，她看了一眼验灵石，又看了一眼你刚刚收回的手',
      '“一星？”她轻声问。语气平静，眼里却分明有一点不信',
    ],
    choices: () => [
      { label: '接过杂役木牌，先留下来再找答案', tone: '认下最小的木牌', impact: '你认下了别人眼里的低处，也替自己留下了上山的资格。裴照雪记住的不是那粒白光，而是你收手前极短的一停', next: 'stair', apply: (s) => gain(s, { restraint: 1 }, ['pei', 1], ['took_token']) },
      { label: '抬头问她：杂役能不能学剑', tone: '当众多问一句', impact: '司礼弟子笑得更响，裴照雪却把自己的外门剑谱丢进你怀里：“能。先走得到山上，再来问第二句”', next: 'stair', apply: (s) => gain(s, { resolve: 1 }, ['pei', 1], ['asked_sword']) },
    ],
  },
  stair: {
    title: '三千石阶', location: '青岚门 · 登云阶', progress: 27,
    paragraphs: (s) => [
      ...(has(s, 'asked_sword') ? [
        '那卷旧剑谱很薄，第一页没有绝招，只写了四个字：先学站稳',
        '你把它塞在衣襟最里面。一路有人笑你拿到一本杂役都不要的旧册，裴照雪没有解释，只在山门上方等着',
      ] : [
        '那块杂役木牌轻得很，背面却被人刻过一道又一道浅痕。你后来才知道，每一道都属于一个没能走完石阶的人',
        '裴照雪把最旧的扁担递给你，没有因为看出了什么就给你优待',
      ]),
      '杂役入门的第一关不是悟道，是挑水',
      '两只木桶，一根旧扁担，三千级石阶',
      '沈砚走到八百级时，肩膀已经磨破。走到一千五百级，鞋底裂开，脚心每落一步都像踩着烧红的砂',
      '那些灵根比他好的人从身边掠过，没有谁特意欺负他。他们只是根本看不见他',
      '黄昏前，沈砚摔在最后两百级上。水洒了大半，掌心也在石头上擦出一片血',
      '这次没有藏着的底牌替他站起来。能听见灵息，不代表身体不会疼，更不代表路会自己变短',
      '一双青色布靴停在眼前',
      '裴照雪没有扶他，只把手按在他背后：“先别起。跟着我的呼吸”',
      '她俯得很近，清冷的声音落在耳侧，一呼一吸，慢得像春雪融水。隔着湿透的衣料，你能感觉到她掌心的温度，稳稳压住乱撞的心跳',
      '三息之后，散在四肢的那点灵气第一次有了方向',
      '“现在起来，”她说，“剩下两百级，我陪你走”',
      '你问她为何不直接扶。她看着石阶上那些旧血痕：“我能扶你一次，三千级台阶不能次次替你变短”',
      '话并不温柔。可她真的把步子放慢，陪一个一星杂役走到了天黑',
    ],
    choices: () => [
      { label: '照着她的呼吸，把最后两百级走稳', tone: '学会第一口灵息', impact: '你没有突然变强，只是第一次能在疼的时候，把散乱的气息收回来。裴照雪走在半步之外，没有扶你，却也没有先走', next: 'herb', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 1], ['learned_breath']) },
      { label: '先下二十级，把洒掉的水重新打满', tone: '把欠下的水补满', impact: '这一来一回让你最后一个到山顶。裴照雪等了整整一刻钟，随后把你的名牌挂进百草堂——那里苦，却离她要查的旧案最近', next: 'herb', apply: (s) => gain(s, { resolve: 2 }, ['pei', 1], ['filled_water']) },
    ],
  },
  herb: {
    title: '药香近身', location: '青岚门 · 百草堂', progress: 38,
    paragraphs: (s) => [
      ...(has(s, 'filled_water') ? [
        '你到百草堂时，所有人都已经领完差事。管事把最潮、最容易坏的一批药推给最后来的你',
        '那个差点被水车撞到的小杂役悄悄送来半只馒头。他没说谢，只替你把最重的药筐往阴处挪了挪',
        '你忽然明白，慢一步不总是吃亏。至少有人因为那桶水，记住你不是只顾自己往上爬的人',
      ] : [
        '你靠着刚学会的呼吸撑到了山顶，却在领差时抖得握不住笔',
        '裴照雪把剑谱翻到第二页，替你压在名册下：“站稳以后，先学承认自己还会倒”',
        '第二天，你被分进百草堂。这里不看剑，只看一双手能不能把活干细',
      ]),
      '百草堂的第一天，你就打碎了三只药罐',
      '管事罚你跪在晒药场，把三百斤潮药一筐筐翻完。正午太阳压下来，伤口被汗浸得发白，连锈剑都安静得没有一点动静',
      '丹房里忽然传来闷响。众人还在后退，一名浅杏衣裙的女子已经抬脚踢开炉门，反手把一把冷药撒进火里',
      '青烟散开，她先把两个吓哭的小药童推出去，才撑起竹伞，替你挡住最晒的那一块天',
      '“再翻下去，这双手就不能要了”',
      '她乌发松松挽着，忙了一上午，鬓边落下几缕碎发。笑起来时眼尾微弯，袖口却利落地卷到手肘，露出一道被炉火灼过的旧疤',
      '洛青禾，二十四岁，百草堂里最年轻的丹师',
      '她托起你的手看伤。指腹柔软，按下去却一点都不客气。你疼得缩了一下，她反而笑：“知道疼，说明还没废”',
      '说完，她低头替你挑掉伤口里的细砂。呼吸从指节上轻轻扫过，你不敢乱动，只能盯着她颈侧被日光照亮的一小片肌肤',
      '洛青禾像是知道你在看，偏偏没有抬头：“小师弟，脸怎么比伤口还红？”',
      '你还没答，她已把一碗药送到唇边。苦味很重，碗沿却留着一点她指尖的温度',
      '桌上压着一张被退回七次的药方。她想让普通根骨的人也能稳住第一口灵息，长老却嫌这种药卖不起价',
      '“我救你的手，不是可怜你，”她把废药方折回袖中，“我只是缺一个不会被好根骨骗过去的试药人”',
      '她说得像玩笑，眼里的光却很认真。那一刻你知道，她撑的伞不只遮住了你一个人',
    ],
    choices: () => [
      { label: '替她试这一碗新药，把每一处变化都说清', tone: '替她试药', impact: '药比想象中更苦，你烧了整整一夜，却替她找出了第八张方子里最关键的一味错药。天亮时，她把最后一颗糖按进你掌心', next: 'rain', apply: (s) => gain(s, { breath: 1 }, ['luo', 2], ['drank_medicine']) },
      { label: '先问这药能不能给山下的阿婆留一包', tone: '先替家里问药', impact: '洛青禾没有笑你没出息。她装了两包药，一包写“青溪村”，一包写“那个只会硬撑的人”，又让你替她把药效带回人间', next: 'rain', apply: (s) => gain(s, { resolve: 1 }, ['luo', 2], ['village_medicine']) },
    ],
  },
  rain: {
    title: '雨夜试剑', location: '洗剑峰 · 守夜小屋', progress: 49,
    paragraphs: (s) => [
      ...(has(s, 'drank_medicine') ? [
        '新药让你烧了一夜。洛青禾坐在床沿记录脉象，每隔一刻便用两根微凉的手指压住你腕间',
        '最难受的时候，你本能地握紧她的手。她没有抽走，只用另一只手替你擦掉额角的汗：“抓吧，诊金另算”',
        '第二天，你的第二口灵息终于没有散。那张被退回七次的药方，也第一次有了能拿给别人看的证据',
      ] : [
        '给阿婆的药装进竹筒后，洛青禾又塞进一张用法，字写得比宗门告示还大',
        '“老人舍不得吃好药，”她说，“你写信时别说价钱，就说快过期了”',
        '你第一次发现，真正懂人间的医术，不只会认药，也知道人为什么把最好的东西留到坏掉',
      ]),
      '半个月后，洗剑峰下了一场很长的雨',
      '你替百草堂送药，推开守夜小屋的门，正看见裴照雪靠在桌边解自己的护腕',
      '她刚从黑石谷回来。青衣被雨打透，贴在肩背上，平日束得一丝不乱的长发也散了，几缕湿发沿着颈侧落进衣领',
      '她左肩有一道剑伤，必须褪开半边外衫才能上药',
      '“过来。”她把药瓶放到你手里，神色自然得像受伤的人不是自己',
      '你走过去，指尖碰到她肩头时还是抖了一下。那一片肌肤比想象中更暖，伤口却很冷',
      '裴照雪侧过脸，近得你能看清她睫毛上的水：“在百草堂看了半个月，还不会上药？”',
      '你说会，只是没给师姐上过',
      '“那就从今天开始会”',
      '她在黑石谷找到一块旧名牌。十年前，一个和她一起入门的少年死在那里，宗门却只说他畏罪逃走。她查到今日，不是为了报仇，是为了不让下一批杂役继续消失',
      '你问她为什么帮自己。裴照雪沉默了一会儿，握住你替她系绷带的手，带着它绕过肩后',
      '“因为那时候，没有人这样帮他”',
      '她的发梢贴过你的手腕，窗外雨声忽然很近。你能感觉到她呼吸微微一紧，却还是把最难碰到的伤口交给了你',
      '换好药后，她把执事令压在桌上。明日若宗门仍不准她查谷，她就辞掉这个人人羡慕的位置',
      '你第一次看清，这个冷得像雪的人不是不会害怕。她只是每一次都在害怕之后，仍把剑提了起来',
    ],
    choices: () => [
      { label: '请她从明日起教你一剑，陪她进黑石谷', tone: '学一剑真本事', impact: '裴照雪站到你身后，握着你的手腕把第一剑送出去。接下来的三十个清晨，她都比你先到，直到那一剑真正成为你的东西', next: 'market', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 2], ['learned_sword']) },
      { label: '把干衣披回她肩上，先陪她喝完这盏热茶', tone: '陪她守一夜雨', impact: '你们没有说很多话，只把黑石谷名册从头看到尾。雨停前，她把唯一的副本交给你，也第一次承认自己怕查到最后仍无人相信', next: 'market', apply: (s) => gain(s, { restraint: 1 }, ['pei', 2], ['shared_rain']) },
    ],
  },
  market: {
    title: '一颗废种', location: '青岚城 · 听潮阁', progress: 60,
    paragraphs: (s) => [
      ...(has(s, 'learned_sword') ? [
        '裴照雪教你的只有一剑：听息，近身，收锋',
        '最初十天，你连她的衣角都碰不到。第二十天，你能让她退半步。第三十天清晨，她以剑鞘压住你的剑尖，眼里终于有了一点很淡的笑',
        '“这一剑还不够赢人，”她说，“够你在该活的时候，多活一次”',
      ] : [
        '雨停以后，裴照雪真的交回了执事令。有人说她为了死人断送前程，她没有辩解',
        '你替她抄了三夜名册，发现其中七人的籍贯被改过，改法和父亲那张“逃徒”文书一模一样',
        '线索第一次不再只是你的私事。有人改掉名字，是因为名字一旦留下，就总会有人来问',
      ]),
      '为了买一把能用的剑，你第一次进青岚城',
      '听潮阁门前正有人闹事。一位老客买到假玉，伙计拿规矩压他，围观的人越聚越多',
      '绯色纸伞从人群后方抬起。伞下女子走到柜前，只看一眼便把假玉摔碎，又当众烧了那名伙计做的三本假账',
      '她穿绯色长裙，腰间一串细小金铃，走动时只响一声。琥珀色的眼睛含着笑，笑意却从不妨碍她把事情看清',
      '“听潮阁可以赚眼力钱，”她说，“不能赚别人不识字的钱”',
      '处理完闹事，她才回头看向角落的拍卖台。那里正摆着一颗灰扑扑的种子',
      '鉴宝师说它灵气已死，只配拿去垫花盆，满堂没人愿意出第二次价',
      '可你听见那层硬壳下面，有一缕很慢、很倔的呼吸',
      '你用两个月工钱买下它，四周立刻响起笑声',
      '这一回没有立刻翻盘。种子放在掌心还是灰的，你的钱也真的没了。走出门时，连晚饭都成了问题',
      '那柄绯色纸伞在门外拦住雨丝，也拦住了你',
      '“两个月工钱换一颗废种，”商绯月笑着问，“心疼吗？”', '你说心疼',
      '她似乎没料到你这么诚实，笑意反而真了些。随后她用指甲轻轻划过种壳，一点嫩绿从裂缝里冒出来',
      '“眼力不错，运气差了点。它还要三年才值钱”',
      '商绯月把一袋银钱放进你掌心，手指却没有立刻松开。伞下本就窄，她再近半步，衣袖上的暖香便和雨气一起压了过来',
      '“替我辨三件东西，饭钱我先借你，”她看着你发红的耳根，慢慢弯起眼睛，“别紧张，我又不会吃了你”',
      '她要找的是一面失落多年的归潮镜。镜子能照出物件被改过的旧痕，也能照出黑石谷那些假名册原本写了什么',
    ],
    choices: () => [
      { label: '替她辨一晚货，用眼力把饭钱挣回来', tone: '和她做一晚生意', impact: '你连看三件，只说中两件，还当众承认第三件听不清。商绯月却付了三份工钱——她说懂得停口，比每次都猜对更值钱', next: 'cold', apply: (s) => gain(s, { breath: 1, restraint: 1 }, ['shang', 2], ['worked_market']) },
      { label: '把三年后才值钱的种子押给她，换一把旧剑', tone: '拿将来换一把剑', impact: '商绯月收下种子，却把旧剑和种子一起塞回你怀里。她不肯把帮助说成施舍，只在账本上写：押一个人的三年，利息等他活着回来再算', next: 'cold', apply: (s) => gain(s, { resolve: 1 }, ['shang', 2], ['borrowed_sword']) },
    ],
  },
  cold: {
    title: '雪地一夜', location: '黑石谷外 · 初试', progress: 70,
    paragraphs: (s) => [
      ...(has(s, 'worked_market') ? [
        '那一夜你替听潮阁看了四十七件货。商绯月每次都先问你听见什么，再告诉你看漏了什么',
        '天快亮时，你在一块不起眼的旧阵砖里听见了潮声。她脸上的笑第一次停住——那是归潮镜碎片留下的回音',
        '她把碎片线索写在你掌心，指甲轻轻划过皮肤：“记住。纸会被偷，手得跟着你走”',
      ] : [
        '旧剑并不锋利，握柄却刚好贴合你的手。商绯月说它曾属于一名没有灵根的护院，靠这把剑活着走完了三州',
        '你问那颗种子怎么算。她把账册一合：“等它开花，我要第一朵。等你出名，我要第一笔生意”',
        '她从不把帮助说成恩情，因此你接过东西时，第一次没有觉得自己低了一头',
      ]),
      '入门第三个月，外门初试选在黑石谷外',
      '你以为自己已经能撑住，真正进谷才知道，一层灵息挡不住山风，也挡不住妖兽的爪子',
      '为了拉回那个曾递给你半只馒头的小杂役，你被岩狼扑进雪沟。旧剑断了，肋下也被划开，血把半边衣服冻得发硬',
      '你能听见狼下一次从哪里扑来，却没有力气躲', '那一刻你终于明白，知道答案和做得到，是两回事',
      '一道银色阵纹在雪地亮起，岩狼被无形的墙推了出去',
      '云知意从风雪里走来。她披着墨色斗篷，银簪束发，眉眼清得像雪后的天，弯腰时却先把最暖的护心丹塞进你嘴里',
      '她的手指按住你唇角，直到确定你咽下去才移开：“别动。再逞强一次，我先打断你的腿”',
      '远处就是改阵人的脚印。她只要追上去，便可能抓到查了七年的证人',
      '云知意看了一眼脚印，还是先背起那名小杂役，又把你拖进避风的石缝。证人趁这几息消失在雪里',
      '你在她的斗篷里醒来，身上盖着一半，另一半还在她肩上。两个人离得很近，你一偏头，额角几乎碰到她的下颌',
      '她没有退，只按住你的手，带着你在阵图上描出第一条活路。她的指尖很凉，呼吸却稳得让人安心',
      '“你听得见阵息，”她淡淡道，“但你还不强。承认这一点，不丢人”',
      '云知意查过七年试炼伤亡。她想废掉黑石谷初试，缺的不是道理，是能证明旧阵被人故意改过的证据',
      '你把自己听见的第三处断点告诉她。她第一次抬眼认真看你，随后把阵图推到两人中间',
      '“活着回去，”她说，“我教你把听见的东西，变成真正的本事”',
      '你问她后不后悔没追那个人。她替你收紧绷带：“线索可以再找。死掉的人，不能再救第二次”',
    ],
    choices: () => [
      { label: '承认自己还弱，先把这张救命阵图学会', tone: '先补上做不到的地方', impact: '你在雪地躺了七天，也跟着云知意学了七天。她把每一次错都让你重来，直到第三口灵息不再只是听见，而是真正能由你调动', next: 'duel', apply: (s) => gain(s, { breath: 2 }, ['yun', 2], ['studied_array']) },
      { label: '把阵旗接过来，请她先背那名杂役出谷', tone: '先把同行的人带回去', impact: '云知意把最重要的阵旗交给你，自己背起伤者。你一路错了三次，也硬是把出口守到所有人出来——这一次，被人扶过的你也扶住了别人', next: 'duel', apply: (s) => gain(s, { resolve: 2 }, ['yun', 2], ['saved_novice']) },
    ],
  },
  duel: {
    title: '只赢一招', location: '青岚门 · 外门大比', progress: 80,
    paragraphs: (s) => [
      ...(has(s, 'studied_array') ? [
        '养伤的七天里，云知意每天只教一条阵线。你问得多了，她便用银簪点着你的手背：“别背答案，先看它为什么会断”',
        '第七夜，你终于独自改出一条生路。她伏在你肩旁看了很久，呼吸掠过耳侧，最后只把银簪收回发间：“勉强能用”',
        '可她转身时，唇角分明弯了一下',
      ] : [
        '那个小杂役活了下来。回山后，他和另外六个人一起在试炼簿上按下手印，证明旧阵的出口曾被人故意封死',
        '云知意把那张手印收进新章。她说规矩最怕的不是强者，是一群原本没有名字的人开始彼此作证',
        '你也因此错过了七日修炼，只能用更慢的办法把第三口灵息一点点磨稳',
      ]),
      '半年后，外门大比',
      '沈砚已经能把三口灵息完整走过一周天，仍算不上天才，至少不再是那个挑一担水就会倒下的少年',
      '你的对手是验灵那天笑得最大声的火灵根弟子。四星灵根，练气三层，所有人都觉得这场没有悬念',
      '第一剑撞上来，你虎口立刻裂了', '第二剑把你逼到台边，胸口的旧伤也跟着发疼。这不是装的，你确实比他弱一层',
      '可第三剑来时，你听见了',
      '对手每次换气，右肩的火息都会慢半拍。半年前你只能听见；现在，裴照雪教过你的剑、洛青禾养住的经脉、商绯月给的旧剑和云知意改过的步法，全都在这一刻有了用处',
      has(s, 'learned_sword') ? '看台上，裴照雪的指尖轻轻敲了一下剑鞘。那是只有你们知道的起剑暗号' : '看台上，裴照雪望着你的脚步，忽然明白你这半年究竟藏住了哪一分',
      '对手以为你已无路可退，第四剑用了十成力', '你侧身，进半步，只出一剑',
      '他的剑飞出擂台，你的剑停在他喉前',
      '四周安静了足足三息。你没有报出什么惊人的境界，只把剑收回鞘里：“承让”',
      '那一刻最先笑的人不是你，是裴照雪。很浅的一下，却比满场惊呼更让你心口发热',
      '你等了半年，真正觉得痛快的却不是别人终于闭嘴',
      '是那些曾经由别人递给你的剑、药、钱和阵图，到了你手里，没有被浪费',
    ],
    choices: () => [
      { label: '剑停在喉前，赢这一招便收手', tone: '赢了，也给人留一步', impact: '你没有把自己受过的轻视原样还回去。对手沉默很久，最终捡起剑向你行礼；真正看懂那一剑的人，也从此不再把克制当软弱', next: 'quiet', apply: (s) => gain(s, { restraint: 2 }, ['pei', 1], ['stopped_one']) },
      { label: '用赢来的资格，请宗门撤掉杂役禁剑牌', tone: '把这一胜换给后来人', impact: '你没有讨内门名额，只让执事当众摘下“杂役不得观剑”的旧牌。满场第一次为一个一星杂役喝彩，也让下一批人少绕一段路', next: 'quiet', apply: (s) => gain(s, { resolve: 2 }, undefined, ['broke_board']) },
    ],
  },
  quiet: {
    title: '灯下藏伤', location: '洗剑峰 · 小药室', progress: 87,
    paragraphs: (s) => [
      ...(has(s, 'stopped_one') ? [
        '下台后，那名火灵根弟子追到石阶下，把一块从旧库房找到的铜牌交给你',
        '“我以前看见过这个，”他说，“本来不想管。你刚才若废我一只手，我大概更不会管”',
        '铜牌背面也是一道月牙。克制没有让你少赢，反而替你换来父亲留下的第二条线索',
      ] : [
        '旧牌摘下那一刻，最先走进观剑台的不是你，而是十几个还穿着灰衣的杂役',
        '有人在台下骂你拿一场胜负换虚名。洛青禾却把那块旧牌拖回药室，当成了垫药炉的木板',
        '你忽然觉得，一场胜负若只能抬高一个人，确实小了些',
      ]),
      '热闹散尽，你还是在药室里疼得直冒冷汗',
      '裴照雪替你解开护腕，洛青禾重新缝好虎口，商绯月把断掉的旧剑换成一柄更好的，云知意则在桌上摊开黑石谷真正的阵图',
      '到这时你才看清，她们从来不是站在路边等你去选的人',
      '裴照雪要替旧友讨回名字，洛青禾要拿回被扣下的药方，商绯月要找归潮镜的最后一块碎片，云知意要让那场吃人的初试永远停下',
      '你们只是刚好要去同一个地方',
      '洛青禾缝完最后一针，故意在你掌心轻轻一按。你疼得吸气，她笑得肩膀都在抖',
      '裴照雪看了她一眼，把你的手拿回来，低头缠上新的布带。她的指节擦过掌心，动作明明很轻，耳尖却被灯火映出一点薄红',
      '商绯月靠在门边笑：“两位慢慢包，天亮前能出发就行”',
      '云知意没抬头，只把阵图推过来：“总阵只能开一次。先决定怎么进，再决定和谁一起”',
      '正面阵心最险，却能最快救人；外围旧账更慢，却可能把十年的证据一次带走',
      '没有哪一条路只靠勇气。真正的选择，是你愿意先承担哪一种代价',
    ],
    choices: () => [
      { label: '从阵心正面进去，先把被困的人放出来', tone: '先走最短也最险的路', impact: '你选择先救人，便要有人与你一起承受阵火。裴照雪和洛青禾同时把自己的东西放到了桌上：一柄剑，一颗命丹', next: 'preparation', apply: (s) => gain(s, { resolve: 1 }, undefined, ['plan_core']) },
      { label: '先拆外围旧账，让幕后的人再也封不住口', tone: '先让旧阵失去退路', impact: '你选择先留证，便要有人陪你在阵外多绕半圈。商绯月合上账册，云知意拔下银簪，一人找谎，一人找门', next: 'preparation', apply: (s) => gain(s, { restraint: 1 }, undefined, ['plan_ring']) },
    ],
  },
  preparation: {
    title: '把后背交给谁', location: '青岚门 · 出发前', progress: 91,
    paragraphs: (s) => has(s, 'plan_core') ? [
      '你选了阵心，药室里反而安静下来',
      '裴照雪把执事令推远，只留下剑。她已经为这一天查了十年，若阵心合拢，她会用自己守住最后一道出口',
      '洛青禾则把两颗命丹碾成一颗。这样药力更强，代价是服药的人会在短时间内共享痛觉',
      '“不是谁更适合你，”云知意说，“是你想用哪种办法活着走到裂缝前”',
      '裴照雪走到你面前，低头替你系紧护腕。她的白玉簪离你很近，发间有被夜露打湿的清冷气息',
      '“跟我进去，你只管听阵息，”她说，“阵火落下来，我替你挡第一道”',
      '洛青禾倚在桌边看着你，眼尾仍带着笑，掌心那颗命丹却攥得很紧',
      '“跟我进去，你会疼得很清楚，”她摊开手，“可只要我还醒着，你的经脉就不会先断”',
      '一个把危险说得很轻，一个把疼痛说得很明白',
      '门外天色将亮。你只能把后背交给其中一人，另外三人则从阵外同时动手',
    ] : [
      '你选了外围，商绯月当场把听潮阁能查到的假账全铺在地上',
      '那面归潮镜只剩半掌大，每照一次旧痕便会再裂一道。照到最后，它可能彻底碎掉',
      '云知意拔下银簪，在阵图上连改七处。她若改错一笔，外围的人不会死在阵里，却会被永远困在原地',
      '“不是谁更适合你，”裴照雪说，“是你愿意把哪一种错交给谁承担”',
      '商绯月抬起绯伞，把你拉进伞下。伞骨很窄，她替你整理腰间的剑带时，指尖从衣料上缓慢划过',
      '“跟我走，听我的价，”她抬眼笑道，“该舍的镜子舍掉，该留的人一个都不许少”',
      '云知意则握住你的手腕，把最后三笔阵纹一笔一笔写进掌心。她低着头，呼吸轻轻落在你的指节',
      '“跟我走，听我的数，”她说，“我若算错，你当场打断，不必顾我脸面”',
      '一个最会在乱局里留人，一个愿意把最骄傲的正确交给你质疑',
      '门外天色将亮。你只能把后背交给其中一人，另外三人则从另一侧同时动手',
    ],
    choices: (s) => has(s, 'plan_core') ? [
      { label: '和裴照雪一起进阵心，剑替耳朵开路', tone: '与剑同入', impact: '裴照雪把自己的护心镜扣在你胸前，又把你的手按上剑柄：“这次不必走在我后面。我们并肩”', next: 'hunt', apply: (state) => gain(state, {}, ['pei', 3], ['trust_pei']) },
      { label: '和洛青禾一起进阵心，用命丹护住经脉', tone: '与药同入', impact: '洛青禾把命丹分成两半，一半含进自己唇间，一半递到你唇边：“先说好，疼可以抓我，松手不行”', next: 'hunt', apply: (state) => gain(state, {}, ['luo', 3], ['trust_luo']) },
    ] : [
      { label: '和商绯月走外围，用归潮镜把假账照回来', tone: '与局同入', impact: '商绯月把归潮镜扣在你心口，金铃在近处轻轻一响：“镜子碎了算我的，你若丢了，我找谁收账？”', next: 'hunt', apply: (state) => gain(state, {}, ['shang', 3], ['trust_shang']) },
      { label: '和云知意走外围，一笔一笔改掉旧阵', tone: '与阵同入', impact: '云知意收起最后一枚阵旗，十指与你相扣，在掌心重新画了一遍路线：“进去以后，只听我的呼吸；若我乱了，你来稳住我”', next: 'hunt', apply: (state) => gain(state, {}, ['yun', 3], ['trust_yun']) },
    ],
  },
  hunt: {
    title: '黑石谷底', location: '黑石谷 · 阵心', progress: 95,
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      const allyParagraphs: Record<LeadKey, string[]> = {
        pei: [
          '总阵合拢时，第一道阵火比预计来得更快。裴照雪没有替你挡在身后，而是与你同时出剑',
          '第二道火落下，她才侧身压住你的肩。湿冷的青衣贴近后背，她握着你的手一同起剑，两个人的呼吸几乎落在同一个节拍上',
          '“别回头，”她的声音就在耳边，“我在”',
          '你没有回头，却第一次把全部力气压进她掌心。她不再是替你挡雨的人，你也不再只是被她带上石阶的人',
        ],
        luo: [
          '阵火烧进经脉时，你和洛青禾同时弯下腰。命丹让你的每一处疼，也在她身上重新疼了一遍',
          '她额角全是冷汗，仍先扣住你的脉门。草木香混在焦灼的空气里，近得像能把人从火里拖回来',
          '最后一段经脉开始断裂，她咬开那半颗命丹，俯身把最后一口药气渡到你唇边',
          '呼吸相触只有一瞬，她的手却始终托着你的后颈：“先活下来。害羞和诊金，都出去再算”',
        ],
        shang: [
          '归潮镜照出第一本旧账时，商绯月腰间的金铃便裂了一颗。她看也没看，只把镜光转向下一面石壁',
          '第三次照旧痕，镜片从中间裂开。她原本能收手保住听潮阁最值钱的宝物，却把你的手一起按到镜面上',
          '碎光反卷回来，她把你按进怀里，用自己的后背挡住最锋利的那一片。绯衣间的暖香和急促心跳一起贴得很近',
          '“别多想，”她还在你耳边笑，声音却有一点哑，“这次救命，确实得加价”',
        ],
        yun: [
          '外围阵纹失控时，云知意第一次算错了。那道她认定不会移动的死门，正朝两个人脚下合拢',
          '你没有等她下令，反手握住她的十指，把自己听见的断点压进第三笔',
          '她从背后扣紧你的手，脸贴近侧颈，呼吸乱了一瞬，又慢慢跟上你的节拍：“很好。现在换你带我”',
          '最后三笔由你们一起落下。她敢把错误交给你，而你终于有能力在她失手时，把她也带回来',
        ],
      };
      return [
        '黑石谷真正的入口，就在初试雪沟下面',
        '那里没有仙家宝库，只有一座拿杂役灵息温养多年的旧阵。石壁上刻着七百多个名字，有些只剩一个姓，有些连姓都没有',
        '你在最下面看见“青溪村采药人”六个字，旁边压着一柄断掉的药刀',
        '刀背上，是那道歪歪的月牙',
        '父亲不是英雄，也不是天才，只是十年前进山后没能回家的普通人。阿婆守着一锅烧干的粥等了一夜，宗门却连他的名字都不肯留下',
        '那一瞬，你确实想把整座山都砸了', '可你还不够强。愤怒也不会替你完成最后一步',
        ...allyParagraphs[ally],
        '阵外，另外三个人同时动手。剑切断锁链，药护住活人，镜照出证据，阵旗改写出口。少一个都不行',
        '你把耳朵贴上阵心，听见它最深处那一口迟了十年的喘息',
        '然后把自己半年里练出的三口灵息，全送进同一道裂缝', '没有惊天动地的一剑', '只有一声很轻的“咔”',
        '下一刻，整座旧阵从里面裂开。被困的人开始往外跑，黑石谷第一次没有吞掉任何一个走进去的人',
        '最后离开前，你把父亲的药刀连同其他人的名牌一块块装好',
        '你没有只带走自己家的答案。等过一个人的那盏灯，和等过七百个人的灯，并没有哪一盏更轻',
      ];
    },
    choices: () => [
      { label: '先打开出口，把还活着的人一个个送出去', tone: '先把活人带回去', impact: '你放走了最容易拿来立功的阵灵，却带回了每一个还能走路的人。那个被你救过的杂役又折回来，替你背走了最后一袋名牌', next: 'dawn', apply: (s) => gain(s, { resolve: 1 }, undefined, ['saved_all']) },
      { label: '先封住阵心一刻，带走所有名册和旧账', tone: '让名字有证据可依', impact: '你们在谷底多困了一刻钟，也因此带走了完整旧账。有人会说你冒险，可从这一天起，再没人能把七百个名字改回“逃徒”', next: 'dawn', apply: (s) => gain(s, { restraint: 1 }, undefined, ['kept_proof']) },
    ],
  },
  dawn: {
    title: '山门天亮', location: '青岚门 · 晨光里', progress: 99,
    paragraphs: (s) => {
      const closest = highestBond(s);
      return [
        ...(has(s, 'saved_all') ? [
          '你们走出黑石谷时，天还没有亮。最后出来的那个杂役背着整袋名牌，腿一直在抖，却没有松手',
          '被救的人在谷口坐成一排。没人高声感谢，只是有人递水，有人替陌生人系好散开的鞋带',
          '你忽然想起登云阶上那只递来的半边馒头。许多真正改变人的事，发生时都没有掌声',
        ] : [
          '你们走出黑石谷时，归潮镜只剩最后一片。商绯月把它交给最年轻的杂役，让他亲手照出名册原字',
          '云知意把七百份旧账按年份排在山门前。纸页很薄，铺开却足以堵住所有上山的路',
          '证据不能替人活回来，却能让后来者不必再被同一句谎话送进去',
        ]),
        '天亮时，黑石谷的名册贴满山门',
        has(s, 'saved_all') ? '被救出来的人站在石阶上，一个接一个说出自己看见的事' : '归潮镜留下的影像传遍青岚城，十年的假账再也遮不住',
        '旧试炼被废，涉事长老交给戒律堂。没有谁因为你赢了一场大比就立刻俯首，也没有谁一夜之间把你奉成救世主',
        '你仍是练气境，身上还有伤，往后的路也仍旧很长',
        '可半年前那个连水都挑不上山的采药郎，已经能站在这里，决定下一步往哪里走',
        '裴照雪把父亲的药刀交还给你。洛青禾用布包得很仔细，商绯月补上了他的真名，云知意则在新试炼章的第一页写下：名册不得再由胜者独占',
        '你没有忽然原谅青岚门，也没有把所有人都当成仇人',
        '山很大，错的是其中一群人；路也很长，往后要做的事比报一场仇更多',
        `${LEADS[closest].name}站在离你最近的地方，没有催你。她知道这一次，你不需要别人替你选`,
        '晨风从山门外吹来，带着很淡的草木香', '故事会继续向前。只是从这里开始，它真正属于你',
      ];
    },
    choices: (s, found) => {
      const closest = highestBond(s);
      const options: Choice[] = [
        { label: '只领外门木牌，继续从最普通的一步练起', tone: '留在青岚门', next: 'ending:keep' },
        { label: `走到${LEADS[closest].name}身边，问她下一站去哪`, tone: `跟${LEADS[closest].title.replace('青岚门', '')}走`, next: `ending:${closest}` },
        { label: '先回青溪村，把药送到阿婆手里', tone: '先回人间', next: 'ending:home' },
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
          <h1>所有人都以为你没有灵根<br />只有她看见，你提前收了手</h1>
          <p className="lede">十八岁的采药郎沈砚带着父亲留下的锈剑上山，只想学一点本事，也查清十年前那张“逃徒”文书。他会受伤，会输，也会被人扶一把——半年以后，再用真正练出的那一剑，让所有轻视安静下来</p>
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
