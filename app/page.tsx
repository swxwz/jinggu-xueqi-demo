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
    description: '青衣负剑，安静得像雨落进深潭。她不爱说软话，却会把最危险的位置留给自己，也会在无人处替你藏好那点不该露出的锋芒',
  },
  luo: {
    name: '洛青禾',
    age: 24,
    title: '百草堂丹师',
    mark: '药',
    description: '眼里总有笑，袖口带着晒暖的草木香。她替人把脉时很近，话也轻，却把十年都押在一张不肯拿活人试药的新方子上',
  },
  shang: {
    name: '商绯月',
    age: 27,
    title: '听潮阁掌柜',
    mark: '局',
    description: '绯伞、金铃、琥珀色的眼睛。她把每句话都说得像一桩买卖，偏偏总在你付不起价的时候，先把真正值钱的东西推过来',
  },
  yun: {
    name: '云知意',
    age: 25,
    title: '青岚门阵师',
    mark: '阵',
    description: '墨发以银簪束起，眉眼清淡，落子从不迟疑。她看上去最守规矩，案头却压着一份要把旧规矩全部推翻的试炼新章',
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
function highestBond(state: StoryState): LeadKey { return (Object.keys(state.bonds) as LeadKey[]).sort((a, b) => state.bonds[b] - state.bonds[a])[0]; }
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
      '十年过去，沈砚十八岁，仍是青溪村最普通的采药郎',
      '他会被荆棘划破手，会为一株认错的药挨骂，也要攒三个月铜钱才买得起一双不漏水的鞋。那点能听见灵息的本事，除了让他比别人多找到几株药，什么都没改变',
      '直到青岚门来村里收徒的前一晚，他在河底听见了第二种呼吸',
      '一柄锈得看不出模样的短剑压在石缝里。沈砚拔出它时，剑身没有发光，只在他掌心轻轻震了一下',
      '像是一个等了很多年的人，终于等到有人回答',
    ],
    choices: () => [
      { label: '用旧布把短剑缠好，藏进药篓', tone: '先藏起来', impact: '锈剑没有反抗。它把自己的气息收得和你一样安静', next: 'test', apply: (s) => gain(s, { restraint: 1 }, undefined, ['wrapped_sword']) },
      { label: '带着短剑去参加明天的收徒试', tone: '带它上山', impact: '你第一次没有把听见的东西留在河底', next: 'test', apply: (s) => gain(s, { resolve: 1 }, undefined, ['open_sword']) },
    ],
  },
  test: {
    title: '一星灵根', location: '青岚门 · 山门坪', progress: 16,
    paragraphs: (s) => [
      '第二天，验灵石前排了三百多人',
      '轮到沈砚时，石头里面一共有九处灵息。他听得清清楚楚，只要掌心再往下压半寸，九道光就会一起亮起来',
      '他想起阿婆的话，也想起自己那副连半桶水都挑不上山的身体',
      '于是他只碰了最弱的一处',
      '验灵石亮起一粒可怜的白点。司礼弟子连眼皮都没抬：“一星杂灵根，只配做外门杂役”',
      has(s, 'wrapped_sword') ? '人群里有人笑你背着破药篓也敢来求仙' : '人群里有人笑你连破剑都舍不得扔，也敢来求仙',
      '笑声响到一半，石阶上忽然安静下来',
      '一名青衣女子从山雾里走来。她没有戴任何珠钗，只以一根白玉簪束着长发，眉眼被晨光照得很淡。那份美并不张扬，却让周围嘈杂的人自觉给她让出路',
      '她叫裴照雪，是洗剑峰最年轻的内门师姐',
      '经过你身边时，她看了一眼验灵石，又看了一眼你刚刚收回的手',
      '“一星？”她轻声问。语气平静，眼里却分明有一点不信',
    ],
    choices: () => [
      { label: '接过杂役木牌，先上山再说', tone: '认下木牌', impact: '所有人都把你当成了杂役，只有裴照雪记住了你收手的时机', next: 'stair', apply: (s) => gain(s, { restraint: 1 }, ['pei', 1], ['took_token']) },
      { label: '问一句：杂役也能学剑吗', tone: '多问一句', impact: '司礼弟子笑得更响。裴照雪却替你答了：“能，只要你走得到山上”', next: 'stair', apply: (s) => gain(s, { resolve: 1 }, ['pei', 1], ['asked_sword']) },
    ],
  },
  stair: {
    title: '三千石阶', location: '青岚门 · 登云阶', progress: 27,
    paragraphs: () => [
      '杂役入门的第一关不是悟道，是挑水', '两只木桶，一根旧扁担，三千级石阶',
      '沈砚走到八百级时，肩膀已经磨破。走到一千五百级，鞋底裂开，脚心每落一步都像踩着烧红的砂',
      '那些灵根比他好的人从身边掠过，没有谁特意欺负他。他们只是根本看不见他',
      '黄昏前，沈砚摔在最后两百级上。水洒了大半，掌心也在石头上擦出一片血',
      '这次没有藏着的底牌替他站起来。能听见灵息，不代表身体不会疼，更不代表路会自己变短',
      '一双青色布靴停在眼前',
      '裴照雪没有扶他，只把手按在他背后：“先别起。跟着我的呼吸”',
      '她俯得很近，清冷的声音落在耳侧，一呼一吸，慢得像春雪融水。隔着湿透的衣料，你能感觉到她掌心的温度，稳稳压住乱撞的心跳',
      '三息之后，散在四肢的那点灵气第一次有了方向', '“现在起来，”她说，“剩下两百级，我陪你走”',
    ],
    choices: () => [
      { label: '照她教的，再走两百级', tone: '学会第一息', impact: '你没有忽然变强，只是终于学会在疼的时候，把下一步走稳', next: 'herb', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 1], ['learned_breath']) },
      { label: '先把洒掉的水重新打满', tone: '把水补满', impact: '裴照雪等了你整整一刻钟。上山后，她把你调进了离洗剑峰最近的百草堂', next: 'herb', apply: (s) => gain(s, { resolve: 2 }, ['pei', 1], ['filled_water']) },
    ],
  },
  herb: {
    title: '药香近身', location: '青岚门 · 百草堂', progress: 38,
    paragraphs: () => [
      '百草堂的第一天，你就打碎了三只药罐',
      '管事罚你跪在晒药场，把三百斤潮药一筐筐翻完。正午太阳压下来，伤口被汗浸得发白，连锈剑都安静得没有一点动静',
      '有人撑着一把竹伞，替你挡住了最晒的那一块天', '“再翻下去，这双手就不能要了”',
      '说话的女子穿一身浅杏色衣裙，乌发松松挽着，笑起来时眼尾微弯。她蹲到你面前，裙摆落在药草之间，袖口那阵温软的草木香一下近了',
      '洛青禾，二十四岁，百草堂里最年轻的丹师',
      '她托起你的手看伤。指腹柔软，按下去却一点都不客气。你疼得缩了一下，她反而笑：“知道疼，说明还没废”',
      '说完，她低头替你挑掉伤口里的细砂。呼吸从指节上轻轻扫过，你不敢乱动，只能盯着她颈侧被日光照亮的一小片肌肤',
      '洛青禾像是知道你在看，偏偏没有抬头：“小师弟，脸怎么比伤口还红？”',
      '你还没答，她已把一碗药送到唇边。苦味很重，碗沿却留着一点她指尖的温度',
    ],
    choices: () => [
      { label: '接过药，一口喝完', tone: '欠她一碗药', impact: '药很苦。洛青禾塞给你一颗糖，又顺手教会你用药气养住第二口灵息', next: 'rain', apply: (s) => gain(s, { breath: 1 }, ['luo', 2], ['drank_medicine']) },
      { label: '先问能不能给阿婆留一包', tone: '先留一包药', impact: '洛青禾看了你很久，最后装了两包：“一包给阿婆，一包给这个只会硬撑的人”', next: 'rain', apply: (s) => gain(s, { resolve: 1 }, ['luo', 2], ['village_medicine']) },
    ],
  },
  rain: {
    title: '雨夜试剑', location: '洗剑峰 · 守夜小屋', progress: 49,
    paragraphs: () => [
      '半个月后，洗剑峰下了一场很长的雨',
      '你替百草堂送药，推开守夜小屋的门，正看见裴照雪靠在桌边解自己的护腕',
      '她刚从黑石谷回来。青衣被雨打透，贴在肩背上，平日束得一丝不乱的长发也散了，几缕湿发沿着雪白的颈侧落进衣领',
      '她左肩有一道剑伤，必须褪开半边外衫才能上药', '“过来。”她把药瓶放到你手里，神色自然得像受伤的人不是自己',
      '你走过去，指尖碰到她肩头时还是抖了一下。那一片肌肤比想象中更暖，伤口却很冷',
      '裴照雪侧过脸，近得你能看清她睫毛上的水：“在百草堂看了半个月，还不会上药？”',
      '你说会，只是没给师姐上过', '“那就从今天开始会”',
      '她在黑石谷找到一块旧名牌。十年前，一个和她一起入门的少年死在那里，宗门却只说他畏罪逃走。她查了十年，不是为了报仇，是为了不让下一批杂役继续消失',
      '你问她为什么帮自己。裴照雪沉默了一会儿，握住你替她系绷带的手，带着它绕过肩后',
      '“因为那时候，没有人这样帮他”',
      '她的发梢贴过你的手腕，窗外雨声忽然很近。你第一次觉得，这个冷得像雪的人，其实一直在用自己替别人挡雨',
    ],
    choices: () => [
      { label: '请她教你一剑，明天开始练', tone: '跟她学剑', impact: '裴照雪站到你身后，握着你的手腕把第一剑送出去。她离开后，掌心的温度还在', next: 'market', apply: (s) => gain(s, { breath: 1, resolve: 1 }, ['pei', 2], ['learned_sword']) },
      { label: '把干净外衫披回她肩上', tone: '先陪她坐会儿', impact: '你们没有再说话，只分了一盏热茶。她却把黑石谷的全部名册交给了你', next: 'market', apply: (s) => gain(s, { restraint: 1 }, ['pei', 2], ['shared_rain']) },
    ],
  },
  market: {
    title: '一颗废种', location: '青岚城 · 听潮阁', progress: 60,
    paragraphs: () => [
      '为了买一把能用的剑，你第一次进青岚城',
      '听潮阁正在拍卖一颗灰扑扑的种子。鉴宝师说它灵气已死，只配拿去垫花盆，满堂没人愿意出第二次价',
      '可你听见那层硬壳下面，有一缕很慢、很倔的呼吸',
      '你用两个月工钱买下它，四周立刻响起笑声',
      '这一回没有立刻翻盘。种子放在掌心还是灰的，你的钱也真的没了。走出门时，连晚饭都成了问题',
      '一柄绯色纸伞在门外拦住雨丝，也拦住了你',
      '伞下的女子穿着绯色长裙，腰间一串细小金铃，走近时只响了一声。她的眼睛是很浅的琥珀色，看人的时候总像已经知道答案',
      '“两个月工钱换一颗废种，”商绯月笑着问，“心疼吗？”', '你说心疼',
      '她似乎没料到你这么诚实，笑意反而真了些。随后她用指甲轻轻划过种壳，一点嫩绿从裂缝里冒出来',
      '“眼力不错，运气差了点。它还要三年才值钱”',
      '商绯月把一袋银钱放进你掌心，手指却没有立刻松开：“替我辨三件东西，饭钱我先借你。别紧张，我又不会吃了你”',
    ],
    choices: () => [
      { label: '替她辨货，拿工钱', tone: '做一晚生意', impact: '你连看三件，只说中两件。商绯月却把三份工钱都给了你：“留点错，才像新人”', next: 'cold', apply: (s) => gain(s, { breath: 1, restraint: 1 }, ['shang', 2], ['worked_market']) },
      { label: '把种子押给她，换一把旧剑', tone: '先换一把剑', impact: '她收下种子，却把剑和种子一起塞回你怀里：“等你值钱了，我连本带利收”', next: 'cold', apply: (s) => gain(s, { resolve: 1 }, ['shang', 2], ['borrowed_sword']) },
    ],
  },
  cold: {
    title: '雪地一夜', location: '黑石谷外 · 初试', progress: 70,
    paragraphs: () => [
      '入门第三个月，外门初试选在黑石谷外',
      '你以为自己已经能撑住，真正进谷才知道，一层灵息挡不住山风，也挡不住妖兽的爪子',
      '为了拉回一个掉队的杂役，你被岩狼扑进雪沟。旧剑断了，肋下也被划开，血把半边衣服冻得发硬',
      '你能听见狼下一次从哪里扑来，却没有力气躲', '那一刻你终于明白，知道答案和做得到，是两回事',
      '一道银色阵纹在雪地亮起，岩狼被无形的墙推了出去',
      '云知意从风雪里走来。她披着墨色斗篷，银簪束发，脸上没有多少表情，弯腰时却先把最暖的护心丹塞进你嘴里',
      '她的手指按住你唇角，直到确定你咽下去才移开：“别动。再逞强一次，我先打断你的腿”',
      '你在她的斗篷里醒来，身上盖着一半，另一半还在她肩上。两个人离得很近，她却只低头改那张错误百出的试炼图',
      '“你听得见阵息，”她淡淡道，“但你还不强。承认这一点，不丢人”',
      '云知意查过七年试炼伤亡。她想废掉黑石谷初试，缺的不是道理，是能证明旧阵被人故意改过的证据',
      '你把自己听见的第三处断点告诉她。她第一次抬眼认真看你，随后把阵图推到两人中间',
      '“活着回去，”她说，“我教你把听见的东西，变成真正的本事”',
    ],
    choices: () => [
      { label: '先跟她学会这张阵图', tone: '把弱点补上', impact: '你在雪地躺了七天，也学了七天。伤没有白受，第三口灵息终于真正属于你', next: 'duel', apply: (s) => gain(s, { breath: 2 }, ['yun', 2], ['studied_array']) },
      { label: '请她先救那个掉队的杂役', tone: '先把人带回去', impact: '云知意没有说你傻。她背起那人，把最重要的阵旗交到你手里', next: 'duel', apply: (s) => gain(s, { resolve: 2 }, ['yun', 2], ['saved_novice']) },
    ],
  },
  duel: {
    title: '只赢一招', location: '青岚门 · 外门大比', progress: 80,
    paragraphs: (s) => [
      '半年后，外门大比',
      '沈砚已经能把三口灵息完整走过一周天，仍算不上天才，至少不再是那个挑一担水就会倒下的少年',
      '你的对手是验灵那天笑得最大声的赵衡。四星火灵根，练气三层，所有人都觉得这场没有悬念',
      '第一剑撞上来，你虎口立刻裂了', '第二剑把你逼到台边，胸口的旧伤也跟着发疼。这不是装的，你确实比他弱一层',
      '可第三剑来时，你听见了',
      '赵衡每次换气，右肩的火息都会慢半拍。半年前你只能听见；现在，裴照雪教过你的剑、洛青禾养住的经脉、商绯月给的旧剑和云知意改过的步法，全都在这一刻有了用处',
      has(s, 'learned_sword') ? '看台上，裴照雪的指尖轻轻敲了一下剑鞘。那是只有你们知道的起剑暗号' : '看台上，裴照雪望着你的脚步，忽然明白你这半年究竟藏住了哪一分',
      '赵衡以为你已无路可退，第四剑用了十成力', '你侧身，进半步，只出一剑',
      '他的剑飞出擂台，你的剑停在他喉前',
      '四周安静了足足三息。你没有报出什么惊人的境界，只把剑收回鞘里：“承让”',
      '那一刻最先笑的人不是你，是裴照雪。很浅的一下，却比满场惊呼更让你心口发热',
    ],
    choices: () => [
      { label: '赢一招就收手', tone: '锋芒只露三分', impact: '你赢了，也给对手留了体面。真正看懂那一剑的人，从此不再小看你', next: 'quiet', apply: (s) => gain(s, { restraint: 2 }, ['pei', 1], ['stopped_one']) },
      { label: '借他的剑，再破一次旧榜', tone: '再往前一步', impact: '你用赵衡的剑斩开了写着“杂役不得入内门”的旧榜，满场第一次为一个杂役喝彩', next: 'quiet', apply: (s) => gain(s, { resolve: 2 }, undefined, ['broke_board']) },
    ],
  },
  quiet: {
    title: '灯下藏伤', location: '洗剑峰 · 小药室', progress: 87,
    paragraphs: () => [
      '热闹散尽，你还是在药室里疼得直冒冷汗',
      '裴照雪替你解开护腕，洛青禾重新缝好虎口，商绯月把断掉的旧剑换成一柄更好的，云知意则在桌上摊开黑石谷真正的阵图',
      '到这时你才看清，她们从来不是站在路边等你去选的人',
      '裴照雪要替旧友讨回名字，洛青禾要拿回被扣下的药方，商绯月要找归潮镜的最后一块碎片，云知意要让那场吃人的初试永远停下',
      '你们只是刚好要去同一个地方',
      '洛青禾缝完最后一针，故意在你掌心轻轻一按。你疼得吸气，她笑得肩膀都在抖',
      '裴照雪看了她一眼，把你的手拿回来，低头缠上新的布带。她的指节擦过掌心，动作明明很轻，耳尖却被灯火映出一点薄红',
      '商绯月靠在门边笑：“两位慢慢包，天亮前能出发就行”',
      '云知意没抬头，只把阵图推过来：“总阵只能开一次。沈砚，你要选一个最信的人，和你一起进阵心”',
      '这不是选谁更美，也不是把谁当奖赏', '只是下一步，你愿意把后背交给谁',
    ],
    choices: () => [
      { label: '裴照雪。她知道你藏了多少', tone: '与剑同入', impact: '裴照雪替你系紧护腕：“这次，我不会让你一个人走在前面”', next: 'hunt', apply: (s) => gain(s, {}, ['pei', 2], ['trust_pei']) },
      { label: '洛青禾。她能护住你的经脉', tone: '与药同入', impact: '洛青禾把命丹分成两半，一半含进自己唇间，一半递给了你', next: 'hunt', apply: (s) => gain(s, {}, ['luo', 2], ['trust_luo']) },
      { label: '商绯月。她最会给自己留后路', tone: '与局同入', impact: '商绯月把归潮镜扣在你心口：“别死，你还欠我一大笔”', next: 'hunt', apply: (s) => gain(s, {}, ['shang', 2], ['trust_shang']) },
      { label: '云知意。阵图出自她的手', tone: '与阵同入', impact: '云知意收起最后一枚阵旗，伸手握住你：“进去以后，只听我的呼吸”', next: 'hunt', apply: (s) => gain(s, {}, ['yun', 2], ['trust_yun']) },
    ],
  },
  hunt: {
    title: '黑石谷底', location: '黑石谷 · 阵心', progress: 95,
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      const allyParagraph: Record<LeadKey, string> = {
        pei: '总阵合拢时，裴照雪从身后抱住你的肩，握着你的手一同起剑。两个人的呼吸贴得很近，她的声音落在耳边：“别回头，我在”',
        luo: '阵火烧进经脉时，洛青禾咬开那半颗命丹，俯身把药气渡到你唇边。只一瞬，她的呼吸和草木香一起落进来：“先活下来，再害羞”',
        shang: '归潮镜碎裂前，商绯月把你按进怀里，用自己的后背挡住碎光。金铃乱响，她还在你耳边笑：“这次救命，得加价”',
        yun: '阵纹失控时，云知意从背后扣住你的十指，带着你一笔一笔改阵。她的脸贴近侧颈，呼吸依旧稳：“跟着我，最后三笔”',
      };
      return [
        '黑石谷真正的入口，就在初试雪沟下面',
        '那里没有仙家宝库，只有一座拿杂役灵息温养多年的旧阵。石壁上刻着七百多个名字，有些只剩一个姓，有些连姓都没有',
        '你在最下面看见“青溪村采药人”六个字',
        '不是英雄，也不是天才，只是十年前进山后再没回家的普通人。阿婆一直以为他跑去了远方，其实他连名字都没能留下',
        '那一瞬，你确实想把整座山都砸了', '可你还不够强。愤怒也不会替你完成最后一步', allyParagraph[ally],
        '阵外，另外三个人同时动手。剑切断锁链，药护住活人，镜照出证据，阵旗改写出口。少一个都不行',
        '你把耳朵贴上阵心，听见它最深处那一口迟了十年的喘息',
        '然后把自己半年里练出的三口灵息，全送进同一道裂缝', '没有惊天动地的一剑', '只有一声很轻的“咔”',
        '下一刻，整座旧阵从里面裂开。被困的人开始往外跑，黑石谷第一次没有吞掉任何一个走进去的人',
      ];
    },
    choices: () => [
      { label: '先打开出口，让所有人出去', tone: '先救人', impact: '你放走了最容易拿来立功的阵灵，却带回了每一个还能走路的人', next: 'dawn', apply: (s) => gain(s, { resolve: 1 }, undefined, ['saved_all']) },
      { label: '先封住阵心，带走全部证据', tone: '先留证据', impact: '你们多困了一刻钟，却让旧长老再也无法把这件事压回山底', next: 'dawn', apply: (s) => gain(s, { restraint: 1 }, undefined, ['kept_proof']) },
    ],
  },
  dawn: {
    title: '山门天亮', location: '青岚门 · 晨光里', progress: 99,
    paragraphs: (s) => {
      const closest = highestBond(s);
      return [
        '天亮时，黑石谷的名册贴满山门',
        has(s, 'saved_all') ? '被救出来的人站在石阶上，一个接一个说出自己看见的事' : '归潮镜留下的影像传遍青岚城，十年的假账再也遮不住',
        '旧试炼被废，涉事长老交给戒律堂。没有谁因为你赢了一场大比就立刻俯首，也没有谁一夜之间把你奉成救世主',
        '你仍是练气境，身上还有伤，往后的路也仍旧很长',
        '可半年前那个连水都挑不上山的采药郎，已经能站在这里，决定下一步往哪里走',
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
          <p className="lede">十八岁的采药郎沈砚第一次上山，只想学一点本事、挣一副好药。他会受伤，会输，也会被人帮一把——半年以后，再用自己真正练出的那一剑，让所有轻视安静下来</p>
          <div className="cover-actions"><button className="primary" onClick={beginStory}>从青溪村出发 <span>→</span></button>{foundEndings.length > 0 && <button className="text-button" onClick={() => setShowMap(true)}>查看已解锁结局</button>}</div>
          <div className="cover-meta"><span>约 25–35 分钟</span><span>10 次轻选择</span><span>6 个基础结局 + 1 隐章</span></div>
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
