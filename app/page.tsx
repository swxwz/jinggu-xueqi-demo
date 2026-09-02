'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  readStorySave,
  writeStorySave,
  type ChoiceCheckpoint,
  type ChoiceRecord,
  type SaveSettings,
  type StorySave,
  type TextScale,
  type TrackId,
  type VolumeLevel,
} from './story-save';

type LeadKey = 'zhi' | 'wan' | 'qiu' | 'qing';
type EndingKey = 'garden' | 'zhi' | 'wan' | 'qiu' | 'qing' | 'leave' | 'union';

type StoryState = {
  craft: number;
  evidence: number;
  credit: number;
  bonds: Record<LeadKey, number>;
  flags: string[];
  skills: string[];
};

type Choice = {
  label: string;
  tone: string;
  impact: string;
  next: string;
  apply?: (state: StoryState) => StoryState;
};

type Scene = {
  chapter: string;
  title: string;
  location: string;
  countdown: string;
  progress: number;
  stage: string;
  question: string;
  paragraphs: (state: StoryState) => string[];
  choices: (state: StoryState, found: EndingKey[]) => Choice[];
};

type Ending = {
  no: string;
  title: string;
  summary: string;
  lead?: LeadKey;
  paragraphs: (state: StoryState) => string[];
};

type HistoryEntry = ChoiceCheckpoint<StoryState>;
type PanelKey = 'people' | 'skills' | 'endings' | 'history' | 'settings' | 'more' | null;

const LEADS: Record<LeadKey, { name: string; age: number; title: string; mark: string; tell: string; goal: string; boundary: string }> = {
  zhi: {
    name: '沈知微', age: 27, title: '停职审评师', mark: '审',
    tell: '白衬衫，细边眼镜，从不用香水。每次判断前先把审评杯转半圈',
    goal: '建立不受品牌控制、任何茶农都能核对的批次追溯记录',
    boundary: '不以亲密换信任；你若隐瞒代签，她会先终止合作',
  },
  wan: {
    name: '唐照晚', age: 25, title: '焙火师', mark: '火',
    tell: '深色工装，木簪，右腕一道旧烫伤。听火时闭一只眼，用手背试热',
    goal: '让长期不署名的女性制茶工用自己的名字出售作品',
    boundary: '可以帮她分担工作，不能把她的手伤当成接管焙笼的理由',
  },
  qiu: {
    name: '苏砚秋', age: 29, title: '拍卖与渠道商', mark: '局',
    tell: '深红伞，窄金戒，衣袖有极淡木香。谈判前替对方添半杯茶',
    goal: '找回父亲留下的失踪老茶，查清自家公司参与过哪些茶园收购',
    boundary: '她能假扮亲密，也会在你把假关系当真时先退开',
  },
  qing: {
    name: '林见青', age: 24, title: '茶树病理研究员', mark: '叶',
    tell: '绿色雨衣，旧帆布包，鞋面总有红土。说话前常先蹲下看叶',
    goal: '保住听雨坪边缘即将被淘汰的地方茶树种质',
    boundary: '生产决定要由数据、成本和农户一起承担，不能用感情替代',
  },
};

const TRACKS: Record<TrackId, { label: string; mood: string; src: string; title: string; author: string; source: string; license: string }> = {
  morning: {
    label: '清晨茶山', mood: '安静、清透，适合普通阅读', src: './audio/oriental-dawn.ogg',
    title: 'Village In The Air', author: 'Le Mandrill', source: 'https://opengameart.org/content/%C3%AEle-flotante-village-in-the-air', license: 'CC0',
  },
  mystery: {
    label: '暗线将近', mood: '低缓而紧，适合追查与危机', src: './audio/mystery-trace.mp3',
    title: 'Mystery Exploration', author: 'PolygonDan', source: 'https://opengameart.org/content/cc0-mystery', license: 'CC0',
  },
  warm: {
    label: '炉火与人', mood: '克制、温暖，适合共同守夜', src: './audio/warm-fire.ogg',
    title: 'Calm Track', author: 'pmiller', source: 'https://opengameart.org/content/calm-track', license: 'CC0',
  },
};

const VOLUME_VALUES: Record<VolumeLevel, number> = { low: 0.2, medium: 0.36, high: 0.55 };
const DEFAULT_SETTINGS: SaveSettings = { musicOn: true, selectedTrackId: 'morning', volume: 'low', textScale: 'medium', reducedMotion: false };

const freshState = (): StoryState => ({
  craft: 0,
  evidence: 0,
  credit: 0,
  bonds: { zhi: 0, wan: 0, qiu: 0, qing: 0 },
  flags: [],
  skills: ['记香：只能认出闻过的气味'],
});

function evolve(
  state: StoryState,
  delta: { craft?: number; evidence?: number; credit?: number; bond?: [LeadKey, number]; flags?: string[]; skills?: string[] },
): StoryState {
  const bonds = { ...state.bonds };
  if (delta.bond) bonds[delta.bond[0]] += delta.bond[1];
  return {
    ...state,
    craft: state.craft + (delta.craft ?? 0),
    evidence: state.evidence + (delta.evidence ?? 0),
    credit: state.credit + (delta.credit ?? 0),
    bonds,
    flags: [...new Set([...state.flags, ...(delta.flags ?? [])])],
    skills: [...new Set([...state.skills, ...(delta.skills ?? [])])],
  };
}

function has(state: StoryState, flag: string) {
  return state.flags.includes(flag);
}

function chosenAlly(state: StoryState): LeadKey {
  if (has(state, 'ally_wan')) return 'wan';
  if (has(state, 'ally_qiu')) return 'qiu';
  if (has(state, 'ally_qing')) return 'qing';
  return 'zhi';
}

function closestLead(state: StoryState): LeadKey {
  const keys = Object.keys(state.bonds) as LeadKey[];
  return keys.sort((a, b) => state.bonds[b] - state.bonds[a])[0];
}

const ENDINGS: Record<EndingKey, Ending> = {
  garden: {
    no: '终章 · 一', title: '听雨坪第一篓', summary: '茶园留下了。你从最普通的一篓鲜叶重新做起',
    paragraphs: (s) => [
      '法院暂缓拍卖九十天。你没有在门口放鞭炮，只把听雨坪的旧收青秤搬出来，校准到指针归零',
      has(s, 'protect_germplasm')
        ? '东坡三亩挂上停采牌。林见青带学生给母株编号，第一年的收入缺口由保育项目和你卖出的普通拼配共同填上'
        : '排水沟下方继续停采，替代地块按采时分篓。林见青每周来一次，鞋上的红土从没干净过',
      '唐照晚把焦边批留作教学样。她让每个来学焙火的人先闻缺陷，再在记录卡上签自己的名字',
      '沈知微的公开批次页很难看：原料普通，损耗偏高，主理人还有一段代签记录。页面上线三天，第一位订货人说，难看总比空白可靠',
      '你用边缘轻火批补香，用中心足火批撑住汤。比例试到第十三杯，廉价春料终于有了清楚的木甜和一点尚未磨平的火痕',
      '茶名仍叫“听雨坪春火一号”。没有老丛传说，也不借谁的获奖名头',
      '收青那天，第一篓鲜叶落到秤上。你看叶面、摸梗、问采时，再把雨水叶单独摊开',
      '三年前的名声没有消失。它被写在批次页最下面，旁边是今年每一次复检和损耗',
      '傍晚，一名采茶工从新篓里挑出一片叶子。锯齿、叶脉和听雨坪的地方种都对不上',
      '叶面带着一缕很淡的海风咸气。你完整闻过一次——是在苏砚秋父亲那只失踪茶箱上',
    ],
  },
  zhi: {
    no: '终章 · 二', title: '杯号向外', summary: '你们把判断写进公开记录，也把不确定留在记录里', lead: 'zhi',
    paragraphs: (s) => [
      '独立审评室开在旧厂二楼。第一笔钱没有用来买名贵茶桌，而是装了无味墙板、稳定光源和一套可以校准的秤',
      '沈知微把每只杯碗编号，你负责称样和计时。第一次公开盲评，送来的全是卖不上价的普通批次',
      has(s, 'admit_signature')
        ? '你的代签说明贴在门边。有人看完转身就走，也有人把自己的收青单重新拿了出来'
        : '你后来补上代签说明。她没有替你润色，只在最后加了一行：程序错误已经公开，样品证据仍需独立核对',
      '第三杯汤薄，香却干净。你说可能是做青偏轻，也可能受水质影响。她把审评杯转半圈：“两种都写。换水复核。”',
      '复核后，你删掉了第一种判断。删改痕迹完整留在页面上，反而有茶农把下一批样寄来',
      '夜里关门，她摘下眼镜，指腹又开始摩擦杯沿。你把温度刚好的茶推过去，没有问她紧不紧张',
      '她喝了一口，伸手扣住你的手腕。力道很轻，却没有立刻放开：“今天的第九杯，你为什么先看我？”',
      '你说怕她又把茶倒掉。她嘴角动了一下，把你的手带到杯边：“那就一起再喝一次。”',
      '窗外的上传提示刚亮，门缝里滑进一只没有寄件人的样品袋。封签完整，生产者一栏却被刮空',
      '袋口有一缕你从未闻过的矿石与潮纸气。沈知微已经戴回眼镜：“新样，新编号。别猜，先记录。”',
    ],
  },
  wan: {
    no: '终章 · 三', title: '火上署名', summary: '每一笼茶都留下制茶人的名字，火候也留下真实的代价', lead: 'wan',
    paragraphs: (s) => [
      '焙火工作室的门牌没有品牌名，只写了六位制茶工的姓名。唐照晚排在第四，不在最前，也没有躲到最后',
      has(s, 'save_roast')
        ? '你们救下的那一笼成了第一批订单。客人嫌火功不够张扬，她把退货条钉在墙上，照原记录复焙一箱，其余不动'
        : '三年前的旧焙笼被拆开留样，桐油味成为培训中的第一种禁忌样。每个人都要先学会何时判废',
      '你的嗅觉仍会在高温里消失。每逢那时，你就退到门外，回来先用手背比较中心和边缘热流，再看茶条、记录和对照样',
      '唐照晚的右手做完康复后仍会抖。她不再藏，把翻焙分成两人轮值，并把每一次接手写进卡里',
      '春火一号复焙结束，她闭一只眼把掌心停在笼上方。你握住她没有受伤的左手，只等她自己决定要不要靠近',
      '她转过手，将手指扣进你的指间：“温度记了？”',
      '你说记了。她又问摊叶厚度。你也答上来',
      '她这才靠过来，额头在你肩上停了一会儿。火声很轻，谁也没有替它解释',
      '天亮前，第一张署名订单送到。客户栏却写着澄江茶业刚注册的新名字，连工作室的商标也被人提前申请',
      '唐照晚拔下木簪，挑开焙笼上的灰：“茶先出。名字的账，我们白天去算。”',
    ],
  },
  qiu: {
    no: '终章 · 四', title: '半杯之后', summary: '她拆掉家族的旧通道，你们沿货单去找下一片被吞下的茶山', lead: 'qiu',
    paragraphs: (s) => [
      '苏砚秋在董事会上投了反对自己的那一票。苏家失去三条最赚钱的代销线，也把共用结算卡和壳公司清单交给调查组',
      has(s, 'follow_truck')
        ? '你们从托盘押金追回第一笔款，补给两家被拖欠的茶农。金额不够体面，却能让他们撑过下一季'
        : '茶会那张合同页成为渠道重建的第一条边界：任何“山场拼配”都要列明原料批次，不再用含混故事代替来源',
      '听雨坪没有卖给她。你以生产顾问身份上了她的车，合同写明每一段工作、报酬与退出条件',
      '她仍习惯替你添半杯茶。你第一次自己把杯子添满时，她看了两秒，没有阻止',
      '港口仓的夜风很咸。你从一排报关箱前走过，在第七只箱角闻见旧木、海水和父亲茶箱上的防潮纸气',
      '保安巡过来，她撑开红伞，把你拉进伞下。距离比茶仓那次更近，她却先问：“合同里，拥抱算加班吗？”',
      '你说这次可以不结算。她忘了看表，手指在你衣领停了很久',
      '“只批准一次。”她说完吻了吻你的唇角，很轻，随即把仓号贴进你掌心，“工作继续。”',
      '第七箱报关品名写着普通红茶，重量却与苏父失踪的老茶分毫不差',
      '吊机开始移动。她收起伞，你按住箱门。半杯之后那笔没算完的账，只能带到下一座港口',
    ],
  },
  qing: {
    no: '终章 · 五', title: '留三亩春天', summary: '停采成为新的生产方法，那片低产老树也有了下一季', lead: 'qing',
    paragraphs: (s) => [
      '听雨坪东坡三亩划进种质保育区。第一年不采，第二年只取足够做适制性试验的鲜叶，收益写进全体农户都看得见的表里',
      '林见青带你重新标母株。她报编号、叶形和病斑，你绑牌，每十株留一份照片和土样位置',
      has(s, 'protect_germplasm')
        ? '当初停采损失的现金没有凭空回来。你卖掉一台闲置包装机，保住采茶工工资；这件事也写在年度记录里'
        : '替代地块的产量补上大半缺口，剩下的由保育项目承担。数据让牺牲有了边界',
      '你学会先划批次，再谈香气。地方种做出的试验茶有明显苦底，林见青没有安慰，只把遮阴与采期对照排到下一年',
      '暴雨夜，她再次牵住你的手，带你穿过记得的每一道坡。回到屋檐下，她没有像上次那样立刻松开',
      '你低头看她。绿色雨衣往下滴水，她先说：“心率很快，可能因为上坡。”',
      '你问还有没有第二种解释。她想了很久，手指收紧一点：“有。样本不足，先保留。”',
      '你笑出声，她皱眉，却把额头抵到你胸前，听了一会儿：“你的也一样。可以合并记录。”',
      '第二天，新梢上出现一种透明附着物。检测结果未出，气味却和旧仓第二种木香相同',
      '她已经给排水沟、风向和来车路线编号。你背上样品箱，和她从第一处空白对照开始',
    ],
  },
  leave: {
    no: '终章 · 六', title: '山外也有火', summary: '你卖掉部分资产还债，带着会做、会记、也会认错的手去下一产区',
    paragraphs: (s) => [
      '听雨坪保留东坡种质地，其余经营权交给农户合作社。旧厂和包装线卖掉以后，债务第一次变成能在纸上数清的数字',
      '有人说你又逃了一次。你没有解释，只把三年前的代签、今年的损耗和最后一批检测结果全部留在公开页面',
      '行李里没有获奖证书。你带了一只标准审评杯、一叠空白批次卡和唐照晚让你留的焦边样',
      '火车穿过山隧道时，手机连续收到四条消息：新的样品号、焙间钥匙、港口箱单和一张东坡母株照片',
      has(s, 'admit_signature') ? '沈知微最后发来一句：“新地方也别替人代签。”' : '沈知微只发来一份待补充说明的空表。你在火车上把迟到三年的那一栏写完',
      '新产区做的是另一种乌龙，叶形、走水和火功都不同。你第一天只负责收青，没有拿栖云经验压人',
      '第三批鲜叶进厂，你摸到梗叶失水不齐，先问采时和运输，再建议分开摊放。老师傅看你一眼，准你守到杀青',
      '夜里开汤，茶有缺点，也有清楚的香。你把“不确定”写在最后一栏，没有划掉',
      '送检车到门口时，你在样品箱封口闻见一缕熟悉的桐油味',
      '封口机的压纹，和栖云旧仓那台一模一样。你拍下编号，给回山的四个人发出同一张照片',
    ],
  },
  union: {
    no: '隐章 · 七', title: '五人一张批次表', summary: '联合不等于把人留在身边，而是让每个人的名字和边界都落在纸上',
    paragraphs: () => [
      '你在旧厂长桌上放了五只杯，也放了五份不同的合同',
      '沈知微要公开审评与追溯系统独立于销售；唐照晚要每一笼留下制茶人署名；苏砚秋要渠道账可以被交叉核对；林见青要三亩种质地拥有一票否决权',
      '四个人同时改你的初稿。有人删掉终身条款，有人加上退出机制，有人把“最好”改成“可复核”，有人把产量目标往下调',
      '你没有坐主位。第一杯由沈知微编号，第二杯由唐照晚定复焙，第三杯由苏砚秋核成本，第四杯等林见青的检测空白，第五杯留给农户代表',
      '春火一号仍有那道轻微火痕。五个人都喝得出来，没有谁建议遮掉',
      '签字前，苏砚秋给每个人添半杯。唐照晚自己添满，沈知微把杯号转正，林见青先记录水温',
      '你的名字最后落下。联合计划的第一页没有愿景，只有批次、责任、复核和怎样散伙',
      '门外有人送来第一份订单：另一个产区的七家小茶园，三个月内先后遇到检测事故，收购方也使用同一张结算卡',
      '样品袋一共七只。第七只带着海风咸气，内封口是栖云旧仓的压纹',
      '天刚亮，红伞靠到车边，绿色雨衣装进后备箱，焙火记录和审评杯各占一个座位。你锁上厂门，下一站没有人替你们命名',
    ],
  },
};

const SCENES: Record<string, Scene> = {
  auction: {
    chapter: '第一幕', title: '拍卖杯中的旧火香', location: '栖云县 · 春茶拍卖预展', countdown: '距茶园拍卖 30 天', progress: 5, stage: '认叶', question: '三年前的问题茶，为什么会出现在今天的拍卖杯里？',
    paragraphs: () => [
      '第一只杯盖揭开，你闻见了三年前那场火',
      '焦糖似的甜气只闪了一下，底下压着湿木、旧竹焙笼和一丝桐油味。右鼻腔随即发麻，你把审评杯放回白瓷碗，指腹已经被杯沿烫红',
      '桌牌写着“外省获奖金奖肉桂”。叶底里却有一片栖云地方种的老叶：锯齿深，侧脉在叶缘前突然收住',
      '单凭一片叶底，证明不了产地。可三年前让你身败名裂的 H17 问题茶，也混过同样的叶子',
      '你叫陆闻川，二十三岁。完整闻过一次的气味，你不会忘。气味只会告诉你见过什么，从不替你说出名字、年份和真相',
      '三十天后，祖父留下的听雨坪茶园公开拍卖。你今天来，只想把最后一批春茶卖掉，替家里还债',
      '拍卖师已经报出底价。深红伞下的女人抬手，价格又高了一截。她袖口的淡木香，与杯底那缕桐油贴得太近',
      '你伸手去拿样品袋，一只戴细边眼镜的手先扣住杯沿，把整杯茶倒进废水桶',
      '白汽擦过她的镜片。她将空杯转了半圈，杯号与桌上的样号错开一位',
      '沈知微，二十七岁。三年前在问题报告上签字的人，也是坚持复检后被停职的人',
      '她没有向你解释旧事，只问主办方：“这批茶，谁动过封签？”',
      '样品管理员已经朝你们走来。桌上只剩那只空杯、一袋叶底和即将被收走的封样袋',
    ],
    choices: () => [
      { label: '按住样品袋，先拍下封签、杯号和批次号', tone: '先留证据', impact: '手机快门亮起。批次号末尾写着 0417，比标注的采摘日早了两天。沈知微把自己的工牌压进同一张照片', next: 'receipt', apply: (s) => evolve(s, { evidence: 2, bond: ['zhi', 1], flags: ['proof_first', 'batch_0417'], skills: ['核样：杯号、样号与封签同时入镜'] }) },
      { label: '端起叶底，当场指出混入的栖云地方种', tone: '先拆穿假产地', impact: '拍卖厅的报价停了。红伞下的女人没有继续举牌，只隔着人群抬了抬半杯茶。管理员趁乱拿走封样袋', next: 'receipt', apply: (s) => evolve(s, { evidence: 1, credit: 1, bond: ['qiu', 1], flags: ['public_leaf', 'batch_0417'], skills: ['认叶：能从叶底提出混料疑点'] }) },
    ],
  },
  receipt: {
    chapter: '第二幕', title: '早到两天的收购单', location: '栖云县 · 拍卖行后巷', countdown: '距茶园拍卖 29 天', progress: 12, stage: '认叶', question: '一个还没采下来的批次，怎样提前两天有了编号？',
    paragraphs: (s) => [
      has(s, 'proof_first') ? '照片放大以后，0417 下方还有一行车号。沈知微确认杯号无误，才让你继续看' : '你公开叶底的短视频已经有人转发。评论在猜山场和品种，真正的封样袋却不见了',
      '后巷传来手推车的轮声。刚才的样品管理员把三箱茶装上一辆没有标识的面包车',
      '你追到门口，深红伞先横在车前。女人把伞收拢，露出窄金戒与一张没来得及继续微笑的脸',
      '“苏砚秋，二十九。”她替自己报得像一项合同条款，“我刚买下那批茶。现在看来，买贵了。”',
      '她递来拍品收购单。日期是四月十七，车号与照片相同；标注采摘却在四月十九',
      '“先造单，再找茶填数。”你说',
      '“可以这样推测。”她纠正得很轻，“要证明，得找原始收青联，或者找到这辆车之前去过哪里。”',
      '绿色雨衣从车尾蹲下。林见青用镊子夹起一片掉落的湿叶，先装进无味袋，再抬头看你',
      '她鞋面沾着听雨坪特有的红土，帆布包侧袋插着一卷地块图',
      '“这片地方种只在三处老地保留。”她说，“两处去年改种，一处是你祖父的东坡。”',
      '苏砚秋已经拍下车牌，伞尖点向路口：“车要走了。我查它的托盘押金和货运单。”',
      '林见青把地块图展开：“我去东坡找采摘记录。两条线，天黑前只能跟一条。”',
    ],
    choices: () => [
      { label: '跟林见青回听雨坪，核对老树与采摘记录', tone: '查原料从哪儿来', impact: '东坡一株母树的旧挂牌被人新近割走。林见青在树皮上取到红色纤维，与你拍到的封样线颜色一致', next: 'rain', apply: (s) => evolve(s, { evidence: 2, bond: ['qing', 2], flags: ['trace_field'], skills: ['认叶：品种线索要与地块记录互证'] }) },
      { label: '上苏砚秋的车，追货运单和结算账户', tone: '查批次送到哪里', impact: '三次货运的公司名都不同，托盘押金却退回同一张企业卡。苏砚秋记到这里，第一次忘了给合同标页码', next: 'rain', apply: (s) => evolve(s, { evidence: 2, bond: ['qiu', 2], flags: ['follow_truck'], skills: ['查批次：车号、托盘与结算账户可互相追踪'] }) },
    ],
  },
  rain: {
    chapter: '第三幕', title: '雨前抢青', location: '听雨坪 · 祖父茶园', countdown: '距茶园拍卖 25 天', progress: 19, stage: '采摘', question: '雨下来以前，怎样保住今年唯一能换成现金的鲜叶？',
    paragraphs: (s) => [
      has(s, 'trace_field') ? '被割走的挂牌只说明有人进过东坡。林见青把纤维样封好，没有让你把推测写成结论' : '货运账户通向一家新注册的采购公司。苏砚秋查到股东时，山上的第一滴雨砸在挡风玻璃上',
      '听雨坪的云压得很低。采茶队已经下篓，雨水从叶尖往手腕里钻',
      '你需要赶在大雨前收完西坡。祖父的债不会等天气，拍卖也不会',
      '第一篓是一芽三四叶的小开面，嫩度还算齐。第二篓混进带水叶，第三篓则夹了东坡更老的母株叶',
      '你闻得见青叶受热前那股闷气，却忙着催秤，把三篓并到同一张收青单上',
      '半小时后，袋心发热。叶面水没有散，嫩叶已经软下去，老梗还硬着',
      '你把鲜叶倒上水筛，底层冒出一股闷熟的青气。至少四十斤原料，因为你的决定失去均匀做青的可能',
      '林见青蹲下翻叶，不说安慰的话：“先分带水、嫩度和地块。现在分，还能救一部分。”',
      '雨幕里，采茶工等你决定。继续抢最远那片，会有更多收入；先处理已采茶青，会让最远地块整批错过采期',
      '你手指沾满叶汁，三年前那股桐油味似乎又浮上来。再闻一次，只剩自己的汗和湿竹篓',
      '能力受疲劳影响。你无法确定刚才闻见的东西是否真的存在',
      '山路下方传来车声。没有标识的面包车停在雨里，车上有人正拍你们混乱的收青现场',
      '照片只要配上“问题茶园抢采”，听雨坪的最后一批茶还没做就会失去买家',
    ],
    choices: () => [
      { label: '停采最远地块，先把湿叶、嫩度和地块彻底分开', tone: '先救已经采下的茶', impact: '西坡少收一成，已采茶青却在薄摊后降温。你亲手把报废部分称出，损耗没有藏进下一批', next: 'review', apply: (s) => evolve(s, { craft: 2, credit: 1, flags: ['save_wet_leaf'], skills: ['收青：雨水叶、嫩度与地块分批薄摊'] }) },
      { label: '让采茶队分篓重称，你补齐每一张采时和地块记录', tone: '先把批次重新立起来', impact: '最远地块只来得及采一半。二十七张重写的收青联却证明 0417 那一批从未在听雨坪发生', next: 'review', apply: (s) => evolve(s, { craft: 1, evidence: 2, credit: 1, flags: ['complete_receipts'], skills: ['收青：采时、地块、重量与经手人缺一不可'] }) },
    ],
  },
  review: {
    chapter: '第四幕', title: '转半圈的审评杯', location: '旧茶厂 · 临时审评室', countdown: '距茶园拍卖 22 天', progress: 27, stage: '看水', question: '封签看起来完整，里面的茶为什么换过？',
    paragraphs: (s) => [
      has(s, 'save_wet_leaf') ? '薄摊后的鲜叶恢复凉意，叶梗失水仍不一致。你记住这次代价，没有把它叫成天气问题' : '二十七张收青联铺满桌面。0417 没有重量、没有采茶人，只有一个提前存在的编号',
      '沈知微带来三年前 H17 的外封袋。骑缝章完整，袋内热封纹却多一道斜线',
      '她在桌上排好两套审评杯碗，统一称样、注水、计时。白衬衫袖口卷到腕上，没有任何香水干扰',
      '“专业审评需要可比。”她说，“你平时盖碗泡得好喝，对这件事没有证明力。”',
      '第一杯是厂内留样，第二杯是送检前拍照样，第三杯只贴着 H17 的手写号',
      '热嗅时，第一杯有干净的初火气；第二杯带旧竹；第三杯压着湿木与桐油',
      '你能确认第三杯的环境气味与拍卖样相似。你无法确认它们来自同一批茶，更不能用鼻子判断农残',
      '沈知微把杯盖送到你鼻下，又在你吸气前收回半寸：“先说依据。”',
      '你说出热气里的湿木、温嗅时留下的旧竹，最后那丝桐油只出现一次',
      '她的拇指摩擦杯沿。三年前签报告前，她也做过这个动作',
      '冷藏柜管理员拒绝打开备用样柜：“沈老师已经停职，没有资格重新封样。”',
      '沈知微没有争吵，把拒绝复检的表格推过去：“可以。请写明经手人、拒绝理由和柜门开启记录。”',
      '对方的笔停在签字栏。你可以把不确定照实写下，也可以用记香直接指出柜中哪只箱子带同一种木味',
    ],
    choices: () => [
      { label: '把“桐油气仅出现一次，需换水复核”写进记录', tone: '先承认不确定', impact: '沈知微在你的记录旁签字。管理员看完两个人的完整说明，终于打开备用样柜', next: 'roast', apply: (s) => evolve(s, { credit: 2, evidence: 1, bond: ['zhi', 2], flags: ['record_uncertain'], skills: ['审评：统一条件，并把不确定写进记录'] }) },
      { label: '退到无味处恢复，再沿柜门找同一种湿木气', tone: '用记香缩小范围', impact: '你找到一只内壁受潮的样箱，随后才补齐柜号与经手记录。沈知微把“嗅觉线索，不作检测结论”写在最上面', next: 'roast', apply: (s) => evolve(s, { evidence: 2, bond: ['zhi', 1], flags: ['find_sample_box'], skills: ['记香：先回到无味处，再用记录验证线索'] }) },
    ],
  },
  roast: {
    chapter: '第五幕', title: '焙火室失香', location: '照晚焙间 · 夜', countdown: '距茶园拍卖 19 天', progress: 35, stage: '听火', question: '鼻子失灵以后，你还能不能救下一笼茶？',
    paragraphs: (s) => [
      has(s, 'record_uncertain') ? '复检申请获准，结果却要等。沈知微把“不确定”三个字留在记录里，没有替你修得更漂亮' : '受潮样箱成为新证物。它能说明储存异常，仍不能单独证明谁换了样',
      '对照茶需要复焙。县里愿意让你进门的焙间，只剩唐照晚这一处',
      '你推门时，焙笼中心已经冒出焦甜。两个学徒正争温度计，深色工装的女人拔下木簪，挑开最厚的一层炭灰',
      '火光压低。她闭一只眼，用手背从笼心移到边缘，随即让人抬笼换位',
      '“右边先热。”她端走焦边对照样，右腕旧烫伤在火光里发白，“那个鼻子好的人，敢不敢赔一整笼？”',
      '你说这批返青茶必须救。她拆三箱，各取上中下三点开汤，确认只有靠墙箱含水回升',
      '“其余两箱封回去。”她在损耗单上签自己的名字，“别拿好茶陪坏茶一起受火。”',
      '复焙到第二轮，烟囱忽然倒灌。浓烟压进鼻腔，所有气味同时消失',
      '你想再靠近焙笼，被她从后面扣住手腕。她把你的掌心翻成手背，带到焙笼上方',
      '“别闻。中心、边、炭门。三处热流。”',
      '她的指骨贴着你的腕骨，每报一个位置就带你移一次。中心灼，边缘温，炭门的火在跳',
      '你看炭灰厚薄，捏一根茶条。外层已经脆，梗心还软。起焙会留下水，继续原位又会焦',
      '她的右手开始发抖，却不肯让任何人接铲。墙边那只旧焙笼编号露出一角：H17',
      '你只能先做一件事。救这一笼茶，或者趁记录员来之前拍清旧笼的调出号',
    ],
    choices: () => [
      { label: '按三处热流换笼、移位，陪她把这一轮焙完', tone: '先救茶', impact: '茶条冷透后没有返软，整笼保住。唐照晚把发抖的右手藏进口袋，却准你在记录卡的第二签名栏写下名字', next: 'banquet', apply: (s) => evolve(s, { craft: 3, credit: 1, bond: ['wan', 3], flags: ['save_roast'], skills: ['听火：手背比较热流，结合茶条与记录换笼'] }) },
      { label: '停火留对照样，拍下 H17 焙笼的完整调出记录', tone: '先查旧焙笼', impact: '这笼茶损失了高香，调出卡却显示三年前事故后，旧笼被送往澄江茶业的外仓', next: 'banquet', apply: (s) => evolve(s, { evidence: 3, craft: 1, bond: ['wan', 1], flags: ['trace_roaster'], skills: ['焙火：停火、留样也属于专业决定'] }) },
    ],
  },
  banquet: {
    chapter: '第六幕', title: '半杯茶的生意', location: '澄江茶会 · 临江厅', countdown: '距茶园拍卖 16 天', progress: 43, stage: '听火', question: '假批次经过哪些渠道，才变成今天的获奖茶？',
    paragraphs: (s) => [
      has(s, 'save_roast') ? '没有鼻子，你仍救下了茶。唐照晚把记录卡折给你一半：“以后别再拿天赋当工序。”' : 'H17 旧焙笼去过澄江外仓。那地方，也是今晚茶会合同上的交货仓',
      '临江厅里没有审评杯，只有薄胎盖碗和用来谈生意的柔光。苏砚秋坐在主桌，替对面的人添了半杯茶',
      '她穿一件剪裁干净的深色外套，红伞靠在椅边。窄金戒敲过合同第四页，笑意刚好让人忽略第五页附件',
      '“陆先生是我的生产顾问。”她把你介绍得像早已合作多年',
      '你在她身侧坐下。对面的人开汤很快，水柱很好看，称样与时间却全凭手感',
      '茶汤高香，第三泡突然发薄。叶底里又出现那片栖云地方种',
      '你没有把商务冲泡当作审评，只要求另取同批样、统一称量和时间。对方笑着说，喝茶何必这么累',
      '他翻合同时漏出一个仓号：旧七仓。苏砚秋的膝侧轻碰你一下，警告你别立刻抬头',
      '桌布下面，她的指尖在你掌心写了一个“七”。动作很慢，也足够让距离变得危险',
      '你闻到她袖口那股木香。不是桐油，是旧箱常用的防潮纸和樟木隔板',
      '对方起身接电话。第五页附件只露出一角，门边保镖正检查离席客人的包',
      '苏砚秋端起自己的半杯茶，声音仍轻：“可以继续演，也可以现在翻桌。两种都会让他们记住你。”',
      '她的公司确实为这些拍品提供渠道。她也确实在把家族的一页旧账交到你面前',
    ],
    choices: () => [
      { label: '继续扮演亲密合伙人，在桌下拍下合同附件', tone: '把戏演到散席', impact: '搜包时她挽住你的手臂，电梯门一合便松开：“刚才是工作。”停了一层，她又补一句：“你做得不错，也是工作评价。”', next: 'field', apply: (s) => evolve(s, { evidence: 3, bond: ['qiu', 3], flags: ['contract_page', 'fake_partner'], skills: ['渠道：合同附件与仓号比口头承诺可靠'] }) },
      { label: '请所有人留座，当场按同一条件开两份茶样', tone: '让茶汤先说出差异', impact: '两只叶底并排以后，混料再也藏不进高香。你没有拿到附件，却得到六名在场见证人和一段完整录像', next: 'field', apply: (s) => evolve(s, { credit: 2, evidence: 2, flags: ['public_comparison'], skills: ['审评：统一条件后再比较茶汤与叶底'] }) },
    ],
  },
  field: {
    chapter: '第七幕', title: '三亩不能采的茶', location: '听雨坪 · 东坡', countdown: '距茶园拍卖 13 天', progress: 51, stage: '经营', question: '今年的现金流与一片地方种质，必须牺牲哪一个？',
    paragraphs: (s) => [
      has(s, 'contract_page') ? '合同附件把旧七仓与三家采购公司连在一起。苏砚秋把自家公章那一页也复印给你，代价是她必须回去面对董事会' : '公开对照的视频保住了茶会样品。仓号却被对方当夜更换，旧七仓可能只剩一次进入机会',
      '东坡已经有人下篓。林见青横过绿色雨衣，蹲在第一垄前剪下一片卷叶',
      '叶背有细小取食痕，土面却留着刚喷过药的轮印。她把每只鲜叶篓翻牌，写上“暂缓入厂”',
      '茶农围上来问是不是农残超标。她没有越过检测说结论，只报地块、风向和需要送检的样点',
      '“现在采，损失这一批。”她把现场空白也装进袋，“现在不查，损失的是谁都说不清。”',
      '你需要东坡这三亩补足订单。停采，工资和债务都会出现缺口',
      '林见青展开产量表。异常轮印只靠近相邻排水沟；更高处是地方种母株，产量低，却保留县里已经少见的性状',
      '“整山停采没有依据。”她说，“只停排水沟下方有风险。母株区则是另一件事，我建议至少停一季。”',
      '你问一季以后谁保证它们值钱',
      '她抬头看你，雨衣下颌沾着一小点红土：“没人保证。保育先承认它可能暂时不赚钱。”',
      '山下又出现那辆面包车。有人等着拍下“科研人员封山”的画面，把局部风险写成整片听雨坪的问题',
      '林见青很少主动碰人，这时却握住你的手，把你带到两条地块线之间。左边是排水沟，右边是母株',
      '“风险、保育、生产，三条线分开。”她松手，“决定要你自己签。”',
    ],
    choices: () => [
      { label: '停采东坡三亩，把地方母株一起列入保育', tone: '给老树留一季', impact: '你失去补足订单的原料，也保住了母株与检测边界。林见青把自己的合作项目押在保育方案上，没有替你许诺收益', next: 'batch', apply: (s) => evolve(s, { credit: 3, bond: ['qing', 3], flags: ['protect_germplasm'], skills: ['经营：把食品安全风险与种质保育分开决策'] }) },
      { label: '只停排水沟下方，按数据启用替代地块', tone: '缩小损失，不缩小检测', impact: '检测样继续送，未受影响地块恢复采摘。林见青在你的生产单旁签字：“这是经营判断，不是赌。”', next: 'batch', apply: (s) => evolve(s, { craft: 2, credit: 2, bond: ['qing', 2], flags: ['bounded_harvest'], skills: ['经营：分区取样，用替代地块控制损失'] }) },
    ],
  },
  batch: {
    chapter: '第八幕', title: '春火一号', location: '旧茶厂 · 做青间', countdown: '距茶园拍卖 10 天', progress: 60, stage: '独立制茶', question: '只剩一次原料，你能否独立做出一个不靠名头的批次？',
    paragraphs: (s) => [
      has(s, 'protect_germplasm') ? '东坡停采，剩余原料不足原计划的七成。每一筛鲜叶都不能再靠侥幸' : '替代地块补上重量，品种与嫩度却更杂。你把它们分成两个小批，不再为了好看合并数字',
      '鲜叶薄摊后，叶面水散去，梗叶重新分配水分。你摸梗、看叶面光泽，再决定第一轮轻摇',
      '做青不是把叶子摇香。每一次碰擦都要跟一段静置，让叶缘变化与走水彼此追上',
      '第二轮后，边批香气先起，中心批仍青。你想加重摇青，唐照晚用木簪点住记录卡：“先看叶，再看钟。”',
      '你等了十分钟。中心批叶面重新有光，梗不再硬顶，才进入下一轮',
      '杀青时，嗅觉恢复得并不稳定。第一锅青气退得快，你提前起锅；第二锅为了补救，火又压得太久',
      '揉捻结束，中心批出现几片焦边，边批则带一线生青。第一批独立茶，只成功一半',
      '师父陆崇岭站在门口。他三年前把你逐出厂，如今只捏断一根茶梗：“一锅急，一锅怕。都写在茶里。”',
      '你以为他要赶你走，他却把旧秤砣放到桌上：“损耗先称。别往好批里埋。”',
      '初焙后，两批分别摊凉。焦边批汤更厚，香被火压住；轻火批香扬，汤却发空',
      '它们可以按比例互补，也可能把两个缺点一起放大。最稳的做法是报废焦边批，只救轻火批，成品将不足拍卖门槛',
      '沈知微拿出空白批次页，唐照晚拿出两只对照袋。没有人替你填“合格”',
      '你给这批茶写下一个没有传说的名字：听雨坪春火一号',
      '窗外，公开盲评的通知刚到。入围者才有资格在拍卖日陈述茶园经营方案',
    ],
    choices: () => [
      { label: '保留两批的真实缺点，分别封样，等比例拼配', tone: '不遮缺点，试着互补', impact: '第七个比例样仍不协调，第十三杯终于让香落进汤里。焦边没有消失，只退成一条可辨认的轻火痕', next: 'blind', apply: (s) => evolve(s, { craft: 3, credit: 1, flags: ['blend_both'], skills: ['拼配：让普通批次互补，并保留各自记录'] }) },
      { label: '报废焦边批，只把轻火批复焙到稳定', tone: '宁可量少，也不把缺陷藏进去', impact: '损耗超过三成。成茶干净、量却不足，你把缺口与报废重量一起写进批次页', next: 'blind', apply: (s) => evolve(s, { craft: 2, credit: 3, flags: ['discard_scorched'], skills: ['做茶：缺陷严重时，报废比遮掩更专业'] }) },
    ],
  },
  blind: {
    chapter: '第九幕', title: '最高分牌', location: '栖云县 · 公开盲评室', countdown: '距茶园拍卖 7 天', progress: 69, stage: '审评与拼配', question: '普通批次怎样在被动过手脚的盲评里留下真实结果？',
    paragraphs: (s) => [
      has(s, 'blend_both') ? '春火一号有轻微火痕，汤却比两只原样都完整。你没有在标签上删掉焦边批的比例' : '轻火批复焙后干净清楚，数量只够一套正式样和一套备用样。任何重做都没有余地',
      '盲评室排着九组杯碗。沈知微不在评委席，只负责封样与计时',
      '第一轮开汤，你喝到第四杯时舌面发紧。第六杯香气被压住，汤的鲜活也显得迟钝',
      '你看水壶。临时赞助方换成了本地高硬度矿泉水，现场记录仍写“统一净化水”',
      '水不能把坏茶变好，却能改变苦涩、鲜爽与香气感知。最昂贵的高香样受影响较小，普通茶的差距被放大',
      '你没有喊作弊，先请工作人员封存水瓶，再用原计划用水复开同号样',
      '有人嘲笑你输不起。沈知微当众把第六杯倒掉，重新称样、注水、计时',
      '复开以后，春火一号的香不再飘，汤从舌中段撑到喉前。它没有夸张的第一口，却在冷嗅时仍干净',
      '高价样的叶底则出现两种嫩度、两种火功和那片熟悉的地方种',
      '评委问你能否确定它来自听雨坪。你说不能。叶底只能说明混料疑点，需要批次和种质记录验证',
      '审评室安静下来。沈知微把最高分牌放到春火一号前，没有看你',
      '这不是完美的茶。它的缺点写在批次页上，解决方式也写在那里',
      '主持人只允许公布名次，不愿公开水瓶与换样记录。个人最高分与审评制度，只能先保一个',
      '窗外突然响起火警。旧七仓方向升起黑烟，有人已经开始销毁批次记录',
    ],
    choices: () => [
      { label: '让最高分牌留在春火一号前，拿到拍卖陈述资格', tone: '先保住茶园的入场券', impact: '掌声落下，你把水瓶证据交给沈知微保管。春火一号取得拍卖日公开开汤资格', next: 'fire', apply: (s) => evolve(s, { craft: 2, credit: 1, flags: ['keep_award'], skills: ['立名：用有记录的普通茶拿到真实结果'] }) },
      { label: '放弃排名，要求先公开换水、样号和复开记录', tone: '先保住审评的可信度', impact: '你的名次暂缓确认。六名参评者却一起要求公开记录，主办方只能保留春火一号的陈述席位', next: 'fire', apply: (s) => evolve(s, { evidence: 2, credit: 3, bond: ['zhi', 2], flags: ['protect_review'], skills: ['审评：程序可信比一次名次更长久'] }) },
    ],
  },
  fire: {
    chapter: '第十幕', title: '旧仓第二种香', location: '澄江茶业 · 旧七仓', countdown: '距茶园拍卖 6 天', progress: 77, stage: '批次追溯', question: '仓火封门以前，人、原样和转运账能带出多少？',
    paragraphs: (s) => [
      has(s, 'protect_review') ? '你没有带走最高分牌，却带走六个共同签名。火警响起时，他们替你守住了复开记录' : '春火一号的陈述席位已经确认。你连证书都没拿，转身跟着消防车去旧七仓',
      '卷帘门只升到一半。唐照晚用木杆撑住门，林见青把湿毛巾和样品空白袋分给每个人',
      '仓内断电，备用灯只照到第三排。沈知微念箱号，你沿封口找三年前那缕湿木与桐油',
      '第七排的纸箱内壁返潮。有人把三年前的备用样、旧焙笼和近两年的转运账放在同一区域',
      '你在一块陈年紧压茶里摸到异常硬物。茶饼只是仓库工人的藏匿方式，拆开后露出一张薄账页',
      '账页列着四家小茶园：检测事故、断渠日期、收购公司、付款账户。最后一行是听雨坪，日期就在六天后',
      '火从西墙爬上纸箱。你闻见桐油，又在浓烟下听见自己的鼻腔发空',
      '靠气味不够。你根据潮痕、箱号和封签位置找出 H17 原始样箱',
      '另一边，苏砚秋停在一只樟木旧箱前。她袖口的木香与箱内防潮纸完全相同',
      '箱侧印着她父亲的旧货号。那批失踪老茶没有消失，只被用来给假批次提供包装与年份故事',
      '楼下卷帘门突然落锁。沈知微用金属样勺卡住防火门，唐照晚的右手撑门时开始发抖',
      '仓管员还在最里面咳嗽。原始样箱很重，账页正在被火卷起',
      '你们能把人带出去。剩下的时间，只够优先护住原样，或者先拍完账页并搬出编号箱',
      '火里传来第二种香：咸湿防潮纸、樟木和海风。它指向苏父最后一次报关的港口',
    ],
    choices: () => [
      { label: '先带仓管员和 H17 原始样箱出去', tone: '先救人和原样', impact: '原样封口完整，转运账烧掉半页。仓管员在救护车上说出内封袋是谁送来的', next: 'sample', apply: (s) => evolve(s, { evidence: 3, credit: 3, bond: ['zhi', 1], flags: ['save_original'], skills: ['封样：实物证据先保护完整流转'] }) },
      { label: '让人先走，你拍完账页并搬出带仓号的旧箱', tone: '先保住资金与转运链', impact: '手机拍下每一行付款账户，H17 原样只带出一袋。苏砚秋认出父亲旧箱后，没有继续算损失', next: 'sample', apply: (s) => evolve(s, { evidence: 4, bond: ['qiu', 2], flags: ['save_ledger'], skills: ['经营：批次、付款与收购时间要形成闭环'] }) },
    ],
  },
  sample: {
    chapter: '第十一幕', title: '三年前的签名', location: '县检测中心 · 封样室', countdown: '距茶园拍卖 4 天', progress: 84, stage: '承担', question: '原样能洗清换货嫌疑，你是否也公开自己的程序错误？',
    paragraphs: (s) => [
      has(s, 'save_original') ? '完整原样、仓管证词和内封口压纹对得上。烧毁的账页仍留下听雨坪那一行' : '转运账与付款账户形成闭环。带出的单袋原样需要沈知微说明保全过程，证明力少了一层',
      '检测中心为 H17 原样、三年前送检存档和拍卖样重新编号。沈知微把每只审评杯转正，再盖住原号',
      '三组茶统一称样、用水、浸泡和沥汤。你只报气味与缺陷，不看编号',
      '第一组有干净旧火；第二组有桐油与湿木；第三组混入防潮纸和樟木',
      '内封口压纹也不同。厂内原样使用平行纹，送检存档多一条斜线，拍卖样则来自旧七仓的新机器',
      '复检报告证明厂内原样没有三年前报告中的同一问题。它能说明送检样被换，仍需要解释样品离厂后的十分钟',
      '沈知微把当年的流转单推到你面前。经手人栏是你的名字',
      '三年前，工友迟到。你替他代签，让样品在无人记录的情况下停留十分钟。换样不是你做，窗口却由你留下',
      '师父陆崇岭站在封样室外。他当年看见代签，选择把你逐出厂，迅速切断风险，也保住厂里其他人的工作',
      '“你可以只交原样。”他说，“换样证据已经够了。代签不改变谁下的手。”',
      '沈知微没有替你决定。她摘下眼镜，指腹反复摩擦杯沿，等你自己把表格拉过去',
      '你想抓住她的手腕，又在碰到前停下。她看见这个动作，手指终于离开杯沿',
      '“写进去，我们才谈信任。”她说，“不写，我照样交证据，但不会和你共同签字。”',
      '拍卖会只剩四天。完整坦白会让所有人重新讨论你的错误；暂缓说明，可以让证据先进入程序',
    ],
    choices: () => [
      { label: '把代签、十分钟空档和理由完整写进公开说明', tone: '先认自己的错', impact: '陆崇岭在你的说明下补签见证。沈知微随后签下自己的名字，两份迟到三年的责任终于落在不同的人身上', next: 'eve', apply: (s) => evolve(s, { credit: 4, bond: ['zhi', 3], flags: ['admit_signature'], skills: ['经营：信用来自可核对的错误与改正'] }) },
      { label: '先提交原样与换袋证据，代签说明等拍卖后补', tone: '先让证据进入程序', impact: '复检和换袋证据被受理。沈知微没有共同签字，只把空白说明表留在你手边', next: 'eve', apply: (s) => evolve(s, { evidence: 2, flags: ['delay_signature'], skills: ['程序：证据成立，也不能替代自己的责任说明'] }) },
    ],
  },
  eve: {
    chapter: '第十二幕', title: '拍卖前夜', location: '旧茶厂 · 四扇灯', countdown: '距茶园拍卖 1 天', progress: 90, stage: '经营', question: '明天只有五分钟，你要让谁和你承担第一步？',
    paragraphs: (s) => [
      has(s, 'admit_signature') ? '公开说明发出后，有人骂你迟到三年，也有人第一次把“换样”和“代签”分开谈' : '原样证据已经受理。那张空白代签说明仍在你口袋里，纸角磨着掌心',
      '旧茶厂亮着四盏灯。审评室、焙间、办公室和东坡临时实验台，各有人等你',
      '沈知微在给原样做最后一次封签。她的方案把程序放在第一位：先承认能确认什么，再展示换样与复检',
      '唐照晚守着春火一号最后一轮稳定焙。她的方案让成茶先开汤：缺点、改法和记录都留在杯里',
      '苏砚秋铺开壳公司与付款账户。她的方案先截断收购资金，让拍卖方没有理由立刻落槌',
      '林见青把风险区、保育区和生产区画成三色。她的方案先证明听雨坪没有“整山问题”，再谈经营',
      '四条路都要走，明天却只能有一个人站在你身边，决定前两分钟的顺序',
      '你走进审评室，沈知微会要求你当众补完任何空白；走进焙间，唐照晚会让你先把茶做稳；拿起红伞，苏砚秋会把你带进最危险的合同；穿上雨衣，林见青会让你先对农户负责',
      '她们都帮助过你，也都在你不参与时继续自己的工作',
      '选择同行者不等于选择谁属于你。它只决定明天最先由哪一种专业承担风险',
      '你把四份材料按在桌上。焙火声、打印声、雨点与杯盖相碰的声音同时从四个方向传来',
      '拍卖会开始前，只剩这一夜',
    ],
    choices: () => [
      { label: '去审评室，与沈知微完成最后一套封样', tone: '让程序站在最前面', impact: '她核完最后一个杯号，才把温度正好的茶推给你：“明天你说依据，我说边界。”', next: 'auction_day', apply: (s) => evolve(s, { bond: ['zhi', 3], flags: ['ally_zhi'] }) },
      { label: '进焙间，与唐照晚守完春火一号', tone: '让成茶站在最前面', impact: '她从背后校准你的手背位置，确认你没有再靠鼻子逞强。起焙后，她没有立刻松手', next: 'auction_day', apply: (s) => evolve(s, { bond: ['wan', 3], flags: ['ally_wan'] }) },
      { label: '拿起红伞，与苏砚秋重排资金和合同证据', tone: '让渠道站在最前面', impact: '她在合同末页写下退出家族公司的日期，笔停了很久：“明天以后，这把伞也许不值钱了。”', next: 'auction_day', apply: (s) => evolve(s, { bond: ['qiu', 3], flags: ['ally_qiu'] }) },
      { label: '穿上雨衣，与林见青把三条地块线钉到山图', tone: '让茶园本身站在最前面', impact: '暴雨里她握住你的手带你穿过最后一条坡。回到屋檐下，她多握了两秒，才把地图交给你', next: 'auction_day', apply: (s) => evolve(s, { bond: ['qing', 3], flags: ['ally_qing'] }) },
    ],
  },
  auction_day: {
    chapter: '第十三幕', title: '五分钟与三杯茶', location: '栖云县 · 公开拍卖厅', countdown: '拍卖当日', progress: 96, stage: '立名', question: '茶汤、记录和账目，怎样在五分钟里互相作证？',
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      const allyLead = LEADS[ally];
      const allyOpening: Record<LeadKey, string[]> = {
        zhi: ['沈知微先把三只封样袋投到屏幕上。她不讲香气，只讲杯号、内封口、经手时间和哪一项仍需调查', '她把你的代签单独列在一页，没有替你遮。换样窗口因此更清楚，也更刺眼'],
        wan: ['唐照晚把春火一号放进第一只审评杯。她先展示焦边对照与复焙记录，让所有人知道这批茶怎样失败过', '她右腕在倒茶时抖了一下，没有换手。第二签名栏里，你们两个人的名字都清楚可见'],
        qiu: ['苏砚秋把共用结算卡、托盘押金和四家收购公司的付款路径投到屏幕上', '她最后打开自家公司那一页。拍卖厅后排有人离席，她没有追，只把红伞放到脚边'],
        qing: ['林见青把听雨坪分成风险、保育与生产三条线。检测结果只覆盖取样区域，没有人再能用一处异常概括整座山', '她展示地方母株的叶形与地块记录，明确说叶底只能支持混料疑点，不能单独证明产地'],
      };
      return [
        '落槌前五分钟，主持人才给你一支话筒。贺敬山坐在买方席，身后的澄江茶业已经准备好收购文件',
        '“一个三年前代签、今年又做出焦边茶的人，”他说，“凭什么继续经营茶园？”',
        ...allyOpening[ally],
        `前两分钟结束，${allyLead.name}退到你身侧。剩下的顺序由你接`,
        '你没有先报香名。第一杯是 H17 厂内原样，第二杯是三年前送检存档，第三杯是本月拍卖样',
        '三杯统一称样、用水、计时。叶底、内封口、仓储气味和复检结果分别放在对应记录下',
        '厂内原样没有那项问题；送检存档换过内袋；拍卖样混入听雨坪原料，又经过旧七仓的污染焙笼与包装箱',
        has(s, 'save_ledger') || has(s, 'contract_page') || has(s, 'follow_truck')
          ? '付款账户与仓号把采购公司连回澄江渠道。贺敬山没有碰过每一袋茶，却批准了每一条“事故后收购”的价格'
          : '仓管证词、货运车号与被烧剩的账页连起四次事故。调查人员当场要求冻结拍卖款',
        '贺敬山说旧火香只是你的幻觉。你同意：气味不能定罪，所以它只放在最后一页，标成“调查起点”',
        '主持人让你开春火一号。汤入口有一条轻微火痕，随后是清楚的木甜；冷下来，没有旧仓杂味',
        has(s, 'blend_both') ? '你公布两个普通批次的拼配比例，也公布焦边批的损耗。没有名贵原料替你遮住第一次失败' : '你公布三成报废量。成茶数量不足，却没有一片严重焦边被塞回好批',
        '评委喝完，没有人立刻说话。最高分牌仍在，批次页也仍在',
        '陆崇岭走到话筒前，承认三年前他用“开除一个学徒”替代完整调查。沈知微随后递交复检，唐照晚递交焙笼记录，苏砚秋递交渠道账，林见青递交地块与检测边界',
        '调查人员封存拍卖文件。法院宣布听雨坪暂缓拍卖九十天，澄江的收购资格等待审查',
        '九十天足够做一季茶，远远不够还清所有债。清白没有替你解决明年的现金、停采地与谁来承担经营',
        '你还有最后一句话。先端出茶，让现场看见你现在会做什么；或者先认代签，让所有人知道证据里也包括你自己',
      ];
    },
    choices: () => [
      { label: '先端春火一号，再逐项交出封样、检测、批次和账目', tone: '先让茶汤落地', impact: '三杯茶喝完，拍卖槌一直没有落下。你的茶有缺点，记录却让每一项缺点都有出处', next: 'dawn', apply: (s) => evolve(s, { craft: 2, credit: 2, flags: ['tea_first'], skills: ['立名：茶汤与证据各自承担边界'] }) },
      { label: '先公开代签与损耗，再说明换样和吞并链', tone: '先把自己放进证据里', impact: '质疑声先响，随后被一页页独立证据压住。没有人能再用你的错误替换贺敬山的责任', next: 'dawn', apply: (s) => evolve(s, { credit: 4, evidence: 2, flags: ['account_first'], skills: ['立名：先承担自己的记录，再要求别人承担'] }) },
    ],
  },
  dawn: {
    chapter: '第十四幕', title: '春山天亮', location: '听雨坪 · 旧厂门前', countdown: '拍卖暂缓第 1 天', progress: 100, stage: '立名', question: '茶园暂时留下以后，你愿意与谁承担下一年春茶？',
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      return [
        has(s, 'tea_first') ? '春火一号的最后一杯已经冷了，木甜仍在，轻微火痕也仍在。你没有再要求任何人忽略它' : '公开说明的浏览数还在涨。代签记录没有洗白你，也没有再替真正的换样者遮挡',
        '天亮时，法院的暂缓通知贴上旧厂门。九十天后仍要重新评估债务与经营方案',
        '唐照晚先去检查焙间，沈知微把封样锁进新柜，苏砚秋在车边接董事会电话，林见青已经往东坡走',
        '没有人站在门口等你选择。她们各自的事都已经开始',
        `昨夜与你并肩的${LEADS[ally].name}在离开前留下一样东西：${ally === 'zhi' ? '一只编号朝外的审评杯' : ally === 'wan' ? '一张有两个签名栏的焙火记录' : ally === 'qiu' ? '一份写清退出条件的合作合同' : '一张分出风险、保育与生产的地块图'}`,
        '祖父的旧秤停在门内。你把春火一号放上去，茶的重量够不上原计划，能换来的时间却比昨天多九十天',
        '留下经营茶园，需要从普通批次和公开记录重来；与某个人并肩，需要接受她的目标与边界；离开也可以让债务和技术走向新的地方',
        '三年前你只想证明那批茶不是你换的。现在桌上还有农户工资、停采三亩、复检费用和下一年的火',
        '山雾从门口退到茶垄。第一辆收青车尚未上山，港口那只旧箱也还没有找到',
        '你把门推开。最后一次选择不决定谁属于你，只决定你愿意把名字签在哪一段责任下面',
      ];
    },
    choices: (s, found) => {
      const ally = chosenAlly(s);
      const options: Choice[] = [
        { label: '留在听雨坪，从第一篓普通鲜叶重新经营', tone: '保住茶园', impact: '旧秤重新归零。你把下一张收青单压在门边，等第一篓鲜叶上山', next: 'ending:garden' },
        { label: `走向${LEADS[ally].name}，接受她的目标、条件与下一站`, tone: `与${LEADS[ally].name}并肩`, impact: `${LEADS[ally].name}看完你签下的那一栏，没有替你改字。她把自己的名字签在旁边`, next: `ending:${ally}` },
        { label: '卖掉部分资产还债，带着技术去新的产区', tone: '离山，不逃', impact: '你只带走审评杯、焦边样和一叠空白批次卡。第一张火车票没有写回程日期', next: 'ending:leave' },
      ];
      if (found.filter((id) => id !== 'union').length >= 3) {
        options.push({ label: '请四个人回到长桌，把联合计划的边界一条条写清', tone: '五人一张批次表', impact: '没有人立刻同意。四支笔先后落下，删掉愿景，补上责任、复核、退出与各自的名字', next: 'ending:union' });
      }
      return options;
    },
  },
};

const SCENE_ORDER = ['auction', 'receipt', 'rain', 'review', 'roast', 'banquet', 'field', 'batch', 'blind', 'fire', 'sample', 'eve', 'auction_day', 'dawn'];

function focusLeads(sceneId: string, state: StoryState): LeadKey[] {
  if (sceneId === 'auction') return ['zhi', 'qiu'];
  if (sceneId === 'receipt') return ['qiu', 'qing'];
  if (sceneId === 'rain' || sceneId === 'field') return ['qing'];
  if (sceneId === 'review' || sceneId === 'sample' || sceneId === 'blind') return ['zhi'];
  if (sceneId === 'roast' || sceneId === 'batch') return ['wan'];
  if (sceneId === 'banquet') return ['qiu'];
  if (sceneId === 'eve') return ['zhi', 'wan', 'qiu', 'qing'];
  if (sceneId === 'auction_day' || sceneId === 'dawn') return [chosenAlly(state)];
  return [];
}

const NUMBER_MARKS = ['一', '二', '三', '四'];
const CRITICAL_SCENES = new Set(['auction', 'rain', 'batch', 'fire', 'eve', 'dawn']);

export default function Home() {
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState('auction');
  const [state, setState] = useState<StoryState>(freshState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trail, setTrail] = useState<ChoiceRecord[]>([]);
  const [lastEcho, setLastEcho] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<EndingKey | null>(null);
  const [foundEndings, setFoundEndings] = useState<EndingKey[]>([]);
  const [resumeSave, setResumeSave] = useState<StorySave<StoryState> | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [historyMode, setHistoryMode] = useState<'all' | 'key'>('all');
  const [pendingCheckpoint, setPendingCheckpoint] = useState<number | null>(null);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(DEFAULT_SETTINGS.musicOn);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(DEFAULT_SETTINGS.selectedTrackId);
  const [volume, setVolume] = useState<VolumeLevel>(DEFAULT_SETTINGS.volume);
  const [textScale, setTextScale] = useState<TextScale>(DEFAULT_SETTINGS.textScale);
  const [reducedMotion, setReducedMotion] = useState(DEFAULT_SETTINGS.reducedMotion);
  const audioRef = useRef<HTMLAudioElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const choiceLockRef = useRef(false);
  const latestSaveRef = useRef<StorySave<StoryState> | null>(null);
  const settings = useMemo<SaveSettings>(() => ({ musicOn, selectedTrackId, volume, textScale, reducedMotion }), [musicOn, selectedTrackId, volume, textScale, reducedMotion]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readStorySave<StoryState>();
      setStorageAvailable(result.available);
      if (result.save && SCENES[result.save.currentSceneId]) {
        const saved = result.save;
        const unlocked = saved.unlockedEndings.filter((id): id is EndingKey => id in ENDINGS);
        setResumeSave(saved);
        setSceneId(saved.currentSceneId);
        setState(saved.currentState);
        setHistory(saved.choiceHistory ?? []);
        setTrail(saved.choiceTrail ?? []);
        setLastEcho(saved.lastChoiceResult);
        setEndingId(saved.currentEndingId && saved.currentEndingId in ENDINGS ? saved.currentEndingId as EndingKey : null);
        setFoundEndings(unlocked);
        setMusicOn(saved.settings.musicOn);
        setSelectedTrackId(saved.settings.selectedTrackId in TRACKS ? saved.settings.selectedTrackId : 'morning');
        setVolume(saved.settings.volume in VOLUME_VALUES ? saved.settings.volume : 'low');
        setTextScale(['medium', 'large', 'xlarge'].includes(saved.settings.textScale) ? saved.settings.textScale : 'medium');
        setReducedMotion(Boolean(saved.settings.reducedMotion));
        setSavedAt(saved.updatedAt);
      } else {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = VOLUME_VALUES[volume];
  }, [volume]);

  useEffect(() => {
    if (!activePanel && !restartConfirm) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, [activePanel, restartConfirm]);

  const scene = SCENES[sceneId];
  const choices = useMemo(() => endingId ? [] : scene.choices(state, foundEndings), [endingId, scene, state, foundEndings]);
  const focused = focusLeads(sceneId, state);
  const closest = closestLead(state);
  const ending = endingId ? ENDINGS[endingId] : null;
  const latestChoice = trail.at(-1);
  const progress = ending ? 100 : scene.progress;

  function makeSave(overrides: Partial<StorySave<StoryState>> = {}): StorySave<StoryState> {
    return {
      version: '1.1',
      updatedAt: new Date().toISOString(),
      currentSceneId: sceneId,
      currentState: state,
      choiceHistory: history,
      choiceTrail: trail,
      lastChoiceResult: lastEcho,
      currentEndingId: endingId,
      unlockedEndings: foundEndings,
      scrollPosition: typeof window === 'undefined' ? 0 : window.scrollY,
      settings,
      ...overrides,
    };
  }

  useEffect(() => {
    latestSaveRef.current = {
      version: '1.1', updatedAt: new Date().toISOString(), currentSceneId: sceneId, currentState: state,
      choiceHistory: history, choiceTrail: trail, lastChoiceResult: lastEcho, currentEndingId: endingId,
      unlockedEndings: foundEndings, scrollPosition: window.scrollY, settings,
    };
  }, [sceneId, state, history, trail, lastEcho, endingId, foundEndings, settings]);

  function persist(save: StorySave<StoryState>) {
    const ok = writeStorySave(save);
    setStorageAvailable(ok);
    if (ok) {
      latestSaveRef.current = save;
      setResumeSave(save);
      setSavedAt(save.updatedAt);
    }
    return ok;
  }

  useEffect(() => {
    const flush = () => {
      const current = latestSaveRef.current;
      if (!current) return;
      const save = { ...current, updatedAt: new Date().toISOString(), scrollPosition: window.scrollY };
      const ok = writeStorySave(save);
      if (!ok) setStorageAvailable(false);
      latestSaveRef.current = save;
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  function applySettings(next: SaveSettings) {
    setMusicOn(next.musicOn);
    setSelectedTrackId(next.selectedTrackId);
    setVolume(next.volume);
    setTextScale(next.textScale);
    setReducedMotion(next.reducedMotion);
  }

  function beginStory() {
    const newState = freshState();
    const save = makeSave({
      currentSceneId: 'auction', currentState: newState, choiceHistory: [], choiceTrail: [],
      lastChoiceResult: null, currentEndingId: null, scrollPosition: 0,
    });
    persist(save);
    setSceneId('auction');
    setState(newState);
    setHistory([]);
    setTrail([]);
    setLastEcho(null);
    setEndingId(null);
    setStarted(true);
    if (musicOn) audioRef.current?.play().catch(() => { /* a second gesture may be required */ });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function continueStory() {
    if (!resumeSave) return beginStory();
    const savedEnding = resumeSave.currentEndingId && resumeSave.currentEndingId in ENDINGS ? resumeSave.currentEndingId as EndingKey : null;
    setSceneId(resumeSave.currentSceneId);
    setState(resumeSave.currentState);
    setHistory(resumeSave.choiceHistory ?? []);
    setTrail(resumeSave.choiceTrail ?? []);
    setLastEcho(resumeSave.lastChoiceResult);
    setEndingId(savedEnding);
    setFoundEndings(resumeSave.unlockedEndings.filter((id): id is EndingKey => id in ENDINGS));
    applySettings(resumeSave.settings);
    setStarted(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: resumeSave.scrollPosition ?? 0, behavior: 'auto' });
      if (resumeSave.settings.musicOn) audioRef.current?.play().catch(() => { /* browser may require another gesture */ });
    });
  }

  function returnToCover() {
    persist(makeSave());
    setStarted(false);
    audioRef.current?.pause();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    persist(makeSave({ settings: { ...settings, musicOn: next } }));
    if (!audioRef.current) return;
    if (next && started) audioRef.current.play().catch(() => { /* a second gesture may be required */ });
    else audioRef.current.pause();
  }

  function fadeAudio(target: number, done?: () => void) {
    const audio = audioRef.current;
    if (!audio) { done?.(); return; }
    const initial = audio.volume;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = Math.max(0, Math.min(1, initial + (target - initial) * (step / 7)));
      if (step >= 7) { window.clearInterval(timer); done?.(); }
    }, 24);
  }

  function switchTrack(id: TrackId) {
    if (id === selectedTrackId) return;
    persist(makeSave({ settings: { ...settings, selectedTrackId: id } }));
    fadeAudio(0, () => {
      setSelectedTrackId(id);
      window.setTimeout(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.load();
        audio.volume = 0;
        if (musicOn && started) audio.play().catch(() => { /* browser may require another gesture */ });
        fadeAudio(VOLUME_VALUES[volume]);
      }, 0);
    });
  }

  function changeVolume(next: VolumeLevel) {
    setVolume(next);
    persist(makeSave({ settings: { ...settings, volume: next } }));
    fadeAudio(VOLUME_VALUES[next]);
  }

  function changeTextScale(next: TextScale) {
    setTextScale(next);
    persist(makeSave({ settings: { ...settings, textScale: next } }));
  }

  function changeMotion(next: boolean) {
    setReducedMotion(next);
    persist(makeSave({ settings: { ...settings, reducedMotion: next } }));
  }

  function openPanel(panel: Exclude<PanelKey, null>, trigger?: HTMLElement) {
    if (trigger) lastTriggerRef.current = trigger;
    setPendingCheckpoint(null);
    setActivePanel(panel);
  }

  function openHistory(mode: 'all' | 'key', trigger?: HTMLElement) {
    setHistoryMode(mode);
    openPanel('history', trigger);
  }

  function closePanel() {
    setActivePanel(null);
    setPendingCheckpoint(null);
    window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }

  function choose(choice: Choice) {
    if (choiceLockRef.current) return;
    choiceLockRef.current = true;
    const now = new Date().toISOString();
    const record: ChoiceRecord = { sceneId, chapter: scene.chapter, sceneTitle: scene.title, tone: choice.tone, label: choice.label, result: choice.impact, createdAt: now };
    const checkpoint: HistoryEntry = {
      sceneId, state, trail, lastChoiceResult: lastEcho, chapter: scene.chapter, title: scene.title,
      createdAt: now, selectedTone: choice.tone, selectedLabel: choice.label, result: choice.impact,
      critical: CRITICAL_SCENES.has(sceneId),
    };
    const nextState = choice.apply ? choice.apply(state) : state;
    const nextHistory = [...history, checkpoint];
    const nextTrail = [...trail, record];
    let nextSceneId = sceneId;
    let nextEndingId: EndingKey | null = null;
    let nextEndings = foundEndings;
    if (choice.next.startsWith('ending:')) {
      const id = choice.next.replace('ending:', '') as EndingKey;
      nextEndingId = id;
      nextEndings = foundEndings.includes(id) ? foundEndings : [...foundEndings, id];
    } else {
      nextSceneId = choice.next;
    }
    const save = makeSave({
      currentSceneId: nextSceneId, currentState: nextState, choiceHistory: nextHistory, choiceTrail: nextTrail,
      lastChoiceResult: choice.impact, currentEndingId: nextEndingId, unlockedEndings: nextEndings, scrollPosition: 0,
    });
    persist(save);
    setHistory(nextHistory);
    setState(nextState);
    setTrail(nextTrail);
    setLastEcho(choice.impact);
    setSceneId(nextSceneId);
    setEndingId(nextEndingId);
    setFoundEndings(nextEndings);
    window.setTimeout(() => {
      choiceLockRef.current = false;
      if (nextEndingId) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      else {
        resultRef.current?.focus({ preventScroll: true });
        resultRef.current?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    }, 40);
  }

  function rewind() {
    const previous = history.at(-1);
    if (!previous) return;
    const nextHistory = history.slice(0, -1);
    const save = makeSave({
      currentSceneId: previous.sceneId, currentState: previous.state, choiceHistory: nextHistory,
      choiceTrail: previous.trail, lastChoiceResult: previous.lastChoiceResult, currentEndingId: null, scrollPosition: 0,
    });
    persist(save);
    setSceneId(previous.sceneId);
    setState(previous.state);
    setTrail(previous.trail);
    setLastEcho(previous.lastChoiceResult);
    setEndingId(null);
    setHistory(nextHistory);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function jumpToCheckpoint(index: number) {
    const checkpoint = history[index];
    if (!checkpoint) return;
    const nextHistory = history.slice(0, index);
    const save = makeSave({
      currentSceneId: checkpoint.sceneId, currentState: checkpoint.state, choiceHistory: nextHistory,
      choiceTrail: checkpoint.trail, lastChoiceResult: checkpoint.lastChoiceResult, currentEndingId: null, scrollPosition: 0,
    });
    persist(save);
    setSceneId(checkpoint.sceneId);
    setState(checkpoint.state);
    setHistory(nextHistory);
    setTrail(checkpoint.trail);
    setLastEcho(checkpoint.lastChoiceResult);
    setEndingId(null);
    closePanel();
    setStarted(true);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function restart() {
    const newState = freshState();
    const save = makeSave({
      currentSceneId: 'auction', currentState: newState, choiceHistory: [], choiceTrail: [],
      lastChoiceResult: null, currentEndingId: null, scrollPosition: 0,
    });
    persist(save);
    setSceneId('auction');
    setState(newState);
    setHistory([]);
    setTrail([]);
    setLastEcho(null);
    setEndingId(null);
    setActivePanel(null);
    setRestartConfirm(false);
    setStarted(true);
    if (musicOn) audioRef.current?.play().catch(() => { /* a second gesture may be required */ });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (restartConfirm) setRestartConfirm(false);
        else if (activePanel) closePanel();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (!started || endingId || activePanel || restartConfirm || choiceLockRef.current) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) choose(choices[index]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const relationship = state.bonds[closest] >= 6 ? '愿意共同承担' : state.bonds[closest] >= 3 ? '已经互相信任' : state.bonds[closest] > 0 ? '留下了印象' : '尚未同行';
  const saveTime = savedAt ? new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
  const historyItems = history.map((item, index) => ({ item, index })).filter(({ item }) => historyMode === 'all' || item.critical);
  const resumeScene = resumeSave && SCENES[resumeSave.currentSceneId];

  return (
    <main className={`story-shell text-${textScale} ${reducedMotion ? 'reduce-motion' : ''}`}>
      <audio ref={audioRef} src={TRACKS[selectedTrackId].src} loop preload="metadata" />
      <div className="mist mist-one" aria-hidden="true" /><div className="mist mist-two" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" onClick={returnToCover} aria-label="返回封面">
          <span className="seal">火</span><span><small>栖云县 · 三十日</small><strong>春山听火</strong></span>
        </button>
        {started && <div className="mobile-progress" aria-label={`故事进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
        <p className={`save-status ${storageAvailable ? '' : 'save-error'}`} role="status">{storageAvailable ? saveTime ? `已自动保存 · ${saveTime}` : '自动保存已开启' : '无法写入本机存档，本次进度仍可继续'}</p>
        <nav className="desktop-nav" aria-label="故事功能">
          <button onClick={(event) => openHistory('all', event.currentTarget)}>已走节点 <i>{history.length}</i></button>
          <button onClick={(event) => openPanel('people', event.currentTarget)}>人物录</button>
          <button onClick={(event) => openPanel('skills', event.currentTarget)}>茶艺 <i>{state.skills.length}</i></button>
          <button onClick={(event) => openPanel('endings', event.currentTarget)}>结局 <i>{foundEndings.length}/7</i></button>
          <button onClick={rewind} disabled={!history.length}>回到上一选择</button>
          <button className={`music-toggle ${musicOn && started ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}>
            <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>音乐 {musicOn ? '开' : '停'}
          </button>
          <button onClick={(event) => openPanel('settings', event.currentTarget)}>阅读设置</button>
        </nav>
        <button className="more-button" onClick={(event) => openPanel('more', event.currentTarget)} aria-label="打开更多功能">更多</button>
      </header>

      {!started ? (
        <section className="cover-card">
          <div className="cover-copy">
            <p className="kicker">当代东方茶业 · 行业悬疑 · 成年暧昧</p>
            <h1>那批让你身败名裂的茶<br />又在拍卖杯里出现了</h1>
            <p className="lede">三十天后，祖父的茶园将被拍卖。你必须在旧仓起火以前，做出一批能过审评与检测的茶，并从旧火香、封样和被提前写好的收购单里，找出三年前是谁换了货</p>
            {resumeSave ? (
              <div className="resume-card">
                <small>上次读到</small><strong>{resumeSave.currentEndingId ? '一段已经抵达的结局' : `${resumeScene?.chapter} · ${resumeScene?.title}`}</strong>
                <span>{new Date(resumeSave.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 已走 {resumeSave.choiceHistory.length} 个节点</span>
              </div>
            ) : <p className="autosave-note">从第一步开始，故事会在每次选择后自动保存到这台设备。</p>}
            <div className="cover-actions">
              {resumeSave ? <button className="primary" onClick={continueStory}>继续上次阅读 <span>→</span></button> : <button className="primary" onClick={beginStory}>揭开第一只审评杯 <span>→</span></button>}
              {resumeSave && <button className="outline" onClick={(event) => openHistory('all', event.currentTarget)}>查看已走节点</button>}
              {resumeSave && <button className="text-button" onClick={() => setRestartConfirm(true)}>重新开始</button>}
              {!resumeSave && foundEndings.length > 0 && <button className="text-button" onClick={(event) => openPanel('endings', event.currentTarget)}>查看已解锁结局</button>}
            </div>
            <div className="cover-meta"><span>约 45–60 分钟</span><span>14 幕轻选择</span><span>6 个基础结局 + 1 隐章</span></div>
            <p className="notice">主要角色均为成年人 · 含职业压力、受伤与克制的成年暧昧</p>
            {!storageAvailable && <p className="storage-warning">浏览器拒绝了本机存储。你仍可阅读，但刷新后可能无法恢复进度。</p>}
            <p className="music-credit">故事版本 1.1 · 三首本地 CC0 配乐，可在阅读设置中切换</p>
          </div>
          <div className="cover-art" style={{ backgroundImage: "url('./og.png')" }} role="img" aria-label="山雾中的茶园、旧焙间、白瓷审评杯与撕开的封签" />
        </section>
      ) : (
        <>
          <div className="game-layout">
            <section className="story-card">
              <div className="scene-head">
                <span>{ending ? ending.no : `${scene.chapter} · ${scene.location}`}</span><i /><span>{ending ? '此程已至' : scene.countdown}</span>
              </div>
              {!ending && focused.length > 0 && (
                <div className="cast-strip" aria-label="本幕焦点人物">
                  <small>本幕同行</small>
                  {focused.map((key) => <span key={key}><b>{LEADS[key].mark}</b><em>{LEADS[key].title}</em><strong>{LEADS[key].name}</strong></span>)}
                </div>
              )}
              {ending ? (
                <article className="ending-view">
                  <p className="kicker">{ending.no}</p><h2>{ending.title}</h2><p className="ending-summary">{ending.summary}</p>
                  <div className="prose">{ending.paragraphs(state).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                   <div className="ending-actions"><button className="text-button" onClick={rewind}>回到最后选择</button><button className="outline" onClick={(event) => openHistory('all', event.currentTarget)}>查看全部节点</button><button className="outline" onClick={(event) => openHistory('key', event.currentTarget)}>回到关键节点</button><button className="primary" onClick={() => setRestartConfirm(true)}>开启新周目</button><button className="text-button" onClick={(event) => openPanel('endings', event.currentTarget)}>全部结局</button></div>
                </article>
              ) : (
                <article className="passage" key={sceneId}>
                  <div className="chapter-title"><span>{scene.chapter}</span><h2>{scene.title}</h2><p>{scene.question}</p></div>
                   {lastEcho && trail.length > 0 && <div className="choice-echo" ref={resultRef} tabIndex={-1} aria-live="polite"><small>你的选择已经发生</small><strong>{lastEcho}</strong><span>路线变化：{latestChoice?.tone} · 已在本机留下完整检查点</span></div>}
                  <div className="prose">{scene.paragraphs(state).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                  <div className="choices" aria-label="选择行动">
                    {choices.map((choice, index) => (
                      <button key={`${sceneId}-${index}`} onClick={() => choose(choice)}>
                        <b>{NUMBER_MARKS[index]}</b><span><small>{choice.tone}</small>{choice.label}</span><em>{index + 1}</em>
                      </button>
                    ))}
                  </div>
                </article>
              )}
            </section>

            <aside className="destiny-panel">
              <p className="panel-title">此刻手上有什么</p>
              <div className="progress-orb"><span>{ending ? 100 : scene.progress}</span><small>%</small></div>
              <dl>
                <div><dt>职业阶段</dt><dd>{ending ? '立名' : scene.stage}</dd></div>
                <div><dt>证据</dt><dd>{state.evidence >= 12 ? '四线成链' : state.evidence >= 7 ? '已有互证' : state.evidence >= 3 ? '不止气味' : '一缕旧火香'}</dd></div>
                <div><dt>信用</dt><dd>{state.credit >= 14 ? '敢把错写下' : state.credit >= 7 ? '经得起复核' : state.credit >= 3 ? '开始有人信' : '旧名未洗'}</dd></div>
                <div><dt>茶艺记录</dt><dd>{state.skills.length} 项</dd></div>
              </dl>
              <div className="skill-mini"><small>最近掌握</small><strong>{state.skills.at(-1)?.split('：')[0]}</strong><span>{state.skills.at(-1)?.split('：').slice(1).join('：')}</span></div>
              <div className="bond-card"><small>此刻关系最近</small><strong>{state.bonds[closest] > 0 ? LEADS[closest].name : '尚未相识'}</strong><span>{state.bonds[closest] > 0 ? relationship : '关系只会在共同经历里改变'}</span></div>
              <p className="key-hint">按数字键 1–4 也可选择</p>
            </aside>
          </div>
          <footer className="progress-row"><span>{ending ? ending.title : scene.title}</span><i><em style={{ width: `${ending ? 100 : scene.progress}%` }} /></i><span>{ending ? '本次故事完成' : `${SCENE_ORDER.indexOf(sceneId) + 1} / ${SCENE_ORDER.length}`}</span></footer>
        </>
      )}

       {activePanel === 'people' && (
         <div className="modal-backdrop" role="presentation" onMouseDown={closePanel}>
           <section className="modal" role="dialog" aria-modal="true" aria-label="人物录" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">四位成年同行者</p><h2>人物录</h2></div><button onClick={closePanel}>关闭</button></div>
            <div className="people-grid">{(Object.keys(LEADS) as LeadKey[]).map((key) => { const lead = LEADS[key]; return (
              <article key={key}><span className="person-mark">{lead.mark}</span><div><small>{lead.title} · {lead.age} 岁</small><h3>{lead.name}</h3><p>{lead.tell}</p><p><b>她要做的事</b>{lead.goal}</p><p><b>关系边界</b>{lead.boundary}</p></div><em>{state.bonds[key] >= 6 ? '愿意共同承担' : state.bonds[key] >= 3 ? '已经互相信任' : state.bonds[key] > 0 ? '已经相识' : '尚未相遇'}</em></article>
            ); })}</div>
          </section>
        </div>
      )}

       {activePanel === 'skills' && (
         <div className="modal-backdrop" role="presentation" onMouseDown={closePanel}>
           <section className="modal skills-modal" role="dialog" aria-modal="true" aria-label="茶艺记录" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">不是等级，是做过的事</p><h2>茶艺记录</h2></div><button onClick={closePanel}>关闭</button></div>
            <p className="route-note">每一项都来自一次失败、一次练习或一次被复核的判断。记香只能提供线索，不能替代检测与记录。</p>
            <ol className="skill-list">{state.skills.map((skill, index) => { const [name, ...rest] = skill.split('：'); return <li key={skill}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{name}</strong><p>{rest.join('：')}</p></div></li>; })}</ol>
          </section>
        </div>
      )}

       {activePanel === 'endings' && (
         <div className="modal-backdrop" role="presentation" onMouseDown={closePanel}>
           <section className="modal route-modal" role="dialog" aria-modal="true" aria-label="结局收集" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">走过的路留在本机</p><h2>结局收集</h2></div><button onClick={closePanel}>关闭</button></div>
            <p className="route-note">六个基础结局没有“答错”。解锁任意三个基础结局后，最后一幕会出现联合计划。</p>
            <div className="ending-grid">{(Object.keys(ENDINGS) as EndingKey[]).map((key) => { const item = ENDINGS[key]; const unlocked = foundEndings.includes(key); return (
              <article key={key} className={unlocked ? 'unlocked' : ''}><small>{unlocked ? item.no : '未解锁'}</small><strong>{unlocked ? item.title : '？？？'}</strong><p>{unlocked ? item.summary : key === 'union' ? '走过三条路，才看得见共同的下一站' : '换一种承担方式抵达这里'}</p></article>
            ); })}</div>
          </section>
         </div>
       )}

       {activePanel === 'history' && (
         <div className="modal-backdrop" role="presentation" onMouseDown={closePanel}>
           <section className="modal history-modal" role="dialog" aria-modal="true" aria-label={historyMode === 'key' ? '关键节点' : '已走节点'} onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">完整状态检查点</p><h2>{historyMode === 'key' ? '关键节点' : '已走节点'}</h2></div><button onClick={closePanel}>关闭</button></div>
             <p className="route-note">回到旧节点会剪去它之后的本周目路线，但已解锁结局永久保留。抵达前需要再确认一次。</p>
             {historyItems.length ? <ol className="history-list">{historyItems.map(({ item, index }) => (
               <li key={`${item.createdAt}-${index}`}>
                 <button onClick={() => setPendingCheckpoint(index)}>
                   <span>{String(index + 1).padStart(2, '0')}</span><div><small>{item.chapter} · {item.title}{item.critical ? ' · 关键节点' : ''}</small><strong>{item.selectedTone}</strong><p>{item.selectedLabel}</p><time>{new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</time></div>
                 </button>
                 {pendingCheckpoint === index && <div className="checkpoint-confirm" role="alert"><p>回到这里重新选择？此节点之后的本周目路线会被剪去，结局收集不受影响。</p><div><button className="primary" onClick={() => jumpToCheckpoint(index)}>确认回到这里</button><button className="text-button" onClick={() => setPendingCheckpoint(null)}>留在当前路线</button></div></div>}
               </li>
             ))}</ol> : <p className="empty-state">还没有可回到的节点。作出第一个选择后，它会出现在这里。</p>}
           </section>
         </div>
       )}

       {activePanel === 'settings' && (
         <div className="modal-backdrop" role="presentation" onMouseDown={closePanel}>
           <section className="modal settings-modal" role="dialog" aria-modal="true" aria-label="阅读设置" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">字、声与动效</p><h2>阅读设置</h2></div><button onClick={closePanel}>关闭</button></div>
             <div className="setting-block"><h3>正文字号</h3><div className="segmented">{([['medium', '标准'], ['large', '大'], ['xlarge', '特大']] as [TextScale, string][]).map(([id, label]) => <button key={id} className={textScale === id ? 'selected' : ''} aria-pressed={textScale === id} onClick={() => changeTextScale(id)}>{label}</button>)}</div></div>
             <div className="setting-block setting-row"><div><h3>减少动态效果</h3><p>关闭雾气、入场和滚动动画，选择仍会立即反馈。</p></div><button className="switch" aria-pressed={reducedMotion} onClick={() => changeMotion(!reducedMotion)}>{reducedMotion ? '已开启' : '未开启'}</button></div>
             <div className="setting-block setting-row"><div><h3>背景音乐</h3><p>音乐文件已随页面存于本地，不依赖在线播放。</p></div><button className="switch" aria-pressed={musicOn} onClick={toggleMusic}>{musicOn ? '播放中' : '已暂停'}</button></div>
             <div className="setting-block"><h3>茶席曲目</h3><div className="track-list">{(Object.keys(TRACKS) as TrackId[]).map((id) => <button key={id} className={selectedTrackId === id ? 'selected' : ''} aria-pressed={selectedTrackId === id} onClick={() => switchTrack(id)}><strong>{TRACKS[id].label}</strong><span>{TRACKS[id].mood}</span></button>)}</div></div>
             <div className="setting-block"><h3>音量</h3><div className="segmented">{([['low', '低'], ['medium', '中'], ['high', '高']] as [VolumeLevel, string][]).map(([id, label]) => <button key={id} className={volume === id ? 'selected' : ''} aria-pressed={volume === id} onClick={() => changeVolume(id)}>{label}</button>)}</div></div>
             <div className="credits"><strong>配乐与许可</strong>{(Object.keys(TRACKS) as TrackId[]).map((id) => <a key={id} href={TRACKS[id].source} target="_blank" rel="noreferrer">{TRACKS[id].title} · {TRACKS[id].author} · {TRACKS[id].license}</a>)}<span>故事版本 1.1</span></div>
           </section>
         </div>
       )}

       {activePanel === 'more' && (
         <div className="modal-backdrop mobile-drawer" role="presentation" onMouseDown={closePanel}>
           <section className="modal more-modal" role="dialog" aria-modal="true" aria-label="更多功能" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">本周目工具</p><h2>更多</h2></div><button onClick={closePanel}>关闭</button></div>
             <div className="more-grid"><button onClick={() => openHistory('all')}>已走节点 <i>{history.length}</i></button><button onClick={() => openPanel('people')}>人物录</button><button onClick={() => openPanel('skills')}>茶艺记录 <i>{state.skills.length}</i></button><button onClick={() => openPanel('endings')}>结局收集 <i>{foundEndings.length}/7</i></button><button onClick={rewind} disabled={!history.length}>回到上一选择</button><button onClick={toggleMusic}>音乐 {musicOn ? '播放中' : '已暂停'}</button><button onClick={() => openPanel('settings')}>阅读与音乐设置</button><button className="danger-link" onClick={() => { setActivePanel(null); setRestartConfirm(true); }}>开启新周目</button></div>
             <p className="drawer-status">{storageAvailable ? saveTime ? `已自动保存 · ${saveTime}` : '自动保存已开启' : '本机存档目前不可用'} · 故事版本 1.1</p>
           </section>
         </div>
       )}

       {restartConfirm && (
         <div className="modal-backdrop" role="presentation" onMouseDown={() => setRestartConfirm(false)}>
           <section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-label="确认开启新周目" onMouseDown={(event) => event.stopPropagation()}>
             <p className="kicker">新的火候</p><h2>从第一幕重新开始？</h2><p>当前周目的节点与路线会被清空；已解锁结局、音乐和阅读设置都会保留。</p>
             <div><button className="primary" onClick={restart}>确认开启新周目</button><button className="text-button" onClick={() => setRestartConfirm(false)}>继续当前阅读</button></div>
           </section>
         </div>
       )}
    </main>
  );
}
