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
    name: '沈知微', age: 27, title: '独立审评师', mark: '审',
    tell: '白衬衫，细边眼镜；紧张时会把杯号转正，再转正一次',
    goal: '让刚起步的审评室通过资质复核，也把三年前私留的样品处理干净',
    boundary: '她肯帮忙，但每一项越过程序的事都会单独算账，包括她自己的',
  },
  wan: {
    name: '唐照晚', age: 26, title: '共用焙间主理人', mark: '火',
    tell: '深色工装，木簪，右腕一圈旧烫痕；骂人以前先把炭门关小',
    goal: '在十天内补齐焙间租金，保住三个跟着她吃饭的制茶工',
    boundary: '借设备、接急单都明码标价；她最恨别人拿手艺人的苦处讲情怀',
  },
  qiu: {
    name: '苏砚秋', age: 30, title: '渠道并购经理', mark: '局',
    tell: '深红伞，窄金戒；谈价前总替对方添半杯，轮到自己却常忘了喝',
    goal: '拿下听雨坪的渠道合约，也查清父亲经手的旧批次为何被拆卖',
    boundary: '她会利用好感，却不掩饰自己要拿佣金、要权限、也可能随时退出',
  },
  qing: {
    name: '林见青', age: 25, title: '茶树病理研究员', mark: '叶',
    tell: '绿色雨衣，旧帆布包，口袋里常有压碎的饼干；看叶时会忘记回答人',
    goal: '完成地方种质项目的年度样方，也摆脱资助企业对结论的干预',
    boundary: '她会看错病斑，也会为项目抢地；肯改结论，不肯替谁保证老树值钱',
  },
};

const TRACKS: Record<TrackId, { label: string; mood: string; src: string; title: string; author: string; source: string; license: string }> = {
  morning: {
    label: '山风初晴', mood: '开阔、安静，适合长时间阅读', src: './audio/morning-hills.ogg',
    title: 'Sunset Plains', author: 'Yoiyami', source: 'https://opengameart.org/content/sunset-plains', license: 'CC0',
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
    no: '终章 · 一', title: '秤归众人', summary: '茶园留了下来，也不再只归你一个人',
    paragraphs: (s) => [
      '听雨坪合作社挂牌那天，没有请鼓队。田桂香把二十九枚红手印贴在旧账房的墙上，贴到最后一张，发现陆崇岭的名字写重了，便揭下来叫他重按。老人嘴里嫌麻烦，拇指在印泥里滚得很慢，像怕多占旁人一点地方。',
      has(s, 'workers_share')
        ? '你把茶园经营权折成六成股，采茶、做青、仓管按工龄和现金认领；陆家的土地还在，收青价、用工和大额借款却要过社员会。第一次投票，你提议先修审评室，二十九个人把钱投给了漏雨的女工宿舍。你脸上发热，仍在决议上签了字。'
        : '你卖掉靠公路的包装仓，补足违约金，再把生产地租给新成立的职工合作社。地契还姓陆，明年的茶却由所有出工的人一起算成本、分收益。田桂香在合同末尾加了一句：老板下地也按天记工。她叫你按手印时，故意把印泥推得很远。',
      '春火一号的订单只够撑过一个采季。小茶馆第二次来催货，唐照晚把焦边样摊在桌上，让对方先选“香一点”还是“稳一点”；沈知微按杯号复开，苏砚秋重算账期，林见青在东坡喊人别踩样方。几个人说话互相压着，桌上的茶凉了两回。',
      '祖父从医院回来，拄杖走到收青棚，先摸秤砣，再问今年一斤鲜叶多少钱。听到比往年多四块，他点点头；听到你只有一票，皱了皱眉。田桂香递给他一碗茶：“老陆叔，一票不少。我们也都是一票。”老人喝完，没再问。',
      '新季第一篓是雨水叶。你伸手要把它并进大堆，二十七张脸一齐看过来。那只手在半空停了停，转去拿蓝色地块牌。有人笑，陆崇岭咳一声，笑声又憋回去，只剩竹篓挪动的沙沙响。',
      '秤盘沉下去。田桂香报数，年轻记账员复诵一遍，你在经手栏后签名。墨还没干，第二篓已经到了。山雾从棚脚穿过去，带来湿土、青叶和早饭蒸笼的气味。听雨坪没有翻身成传奇，它只是让一群人继续在这里做工、吃饭、吵下一笔账。',
    ],
  },
  zhi: {
    no: '终章 · 二', title: '第七码杯', summary: '她留下杯号，你留下能被推翻的判断', lead: 'zhi',
    paragraphs: (s) => [
      '沈知微的审评室通过资质复核那天，检查员在样品柜前站了很久。柜门内侧贴着一张处分说明：三年前，她把未登记的 H17 余样带离茶厂，保存条件不合规，不得用于责任认定。她没有把纸藏到合同后面。',
      has(s, 'admit_swap')
        ? '你的换样说明贴在同一面墙上。第一批客户有两家取消委托，第三家却提着破纸箱上门，说自家的留样也乱了，能不能从现在重建。沈知微没接那句“相信你们”，先给他一张收费表。房租和校准费不会被信任抵掉。'
        : '你后来补交了换样说明。提交前，她与你争了整夜，删掉替师父开脱的句子，也删掉把自己写成受害者的句子。天亮时只剩日期、样号、谁说了什么、你拿了哪一袋。她看完说：“这样够了。”没有说原谅。',
      '两个人搭档并不省事。你习惯先闻，她习惯先称；你爱用“像”字，她见一个划一个。某次第七码杯出现仓味，你认定是旧纸箱，她坚持先换水，复开后气味果然消失。你赔她一顿饭。隔月又遇相同气味，纸箱检测出了问题，她把上次饭钱连利息转给你，备注写“本次判断，不含永久胜诉”。',
      '关门以后，她才肯泡一杯不编号的茶。也并非每天。有时她摘下眼镜就趴在桌上睡着，你把杯子挪远，继续洗碗；有时你们为一句报告争到半夜，她拎包走人，第二天九点准时回来。感情没有让工作变温柔，只让争完以后还有人肯回来。',
      '冬天第一场霜过后，你们接到听雨坪的新样。沈知微把杯号转正，又习惯性地转了一次。你笑出声，她抬眼：“哪里错了？”你伸手按住杯子，说这样也朝外。她看了看你的手，过了片刻，手覆上来。',
      '水沸了。她没有松开，只用另一只手关火：“今天第七码先不审。”窗外偏偏有人敲门，带来三箱刚到的普通茶。你们同时叹气，还是起身开灯、校秤、登记。那杯没编号的茶在桌角慢慢凉下去，等到最后一个客户离开，仍旧是两个人的。',
    ],
  },
  wan: {
    no: '终章 · 三', title: '一笼六名', summary: '焙间保住了，火上也不再只写一个师傅', lead: 'wan',
    paragraphs: (s) => [
      '共用焙间的新门牌只写六个名字，唐照晚排在第四。安装的人问谁是老板，她正蹲在炭坑边挑碎炭，头也不抬：“欠租的时候我是，分钱的时候不是。”三个老师傅哄笑，笑完一人搬一块门板，谁也没让她独自抬。',
      has(s, 'equipment_sale')
        ? '听雨坪卖掉闲置包装线，换回焙间两年使用权和一笔现金。有人骂你贱卖家当，机器装车那天你也心疼。唐照晚没劝，只把买方尾款核了三遍，确认到账后才说：“空机器不发工资。以后想它，就多做两笼。”'
        : '茶馆预付款救了第一期租金，第二期仍要靠接单。唐照晚把过去嫌小的散单重新捡回来，五十斤、三十斤也做。你们白天制自己的茶，夜里替别人复焙，困得最狠时，她会用木簪戳你的记录本：“字写直，我看得见。”',
      '她右腕发作的日子并未减少。有一次木铲落地，她脸色比火灰还白，第一句话却是叫人别停笼。你接过铲，先报笼温、茶条断面和炭门风。她靠墙听完，纠正一个位置，才允许你继续。后来那张记录上有六个签名。',
      '新徒弟做焦第一锅茶，躲到仓门后哭。唐照晚把焦茶倒在桌上，只问几点起火、谁看温度、什么时候闻到不对。孩子抽噎着答完，她递去一碗冷饭：“吃。明天赔，怎么赔明天算。”转身看见你，她低声补了一句：“饭热过，忘拿出来了。”',
      '共同值夜久了，她偶尔会把额头抵在你肩后歇一会儿。你若回头，她就拿木簪敲你。某个冬夜，最后一笼起焙，她在值班表第二栏写下你的名字，问：“明早走不走？”你说不走。她嗯一声，把钥匙扔进你掌心。',
      '装车前，唐照晚问你闻见什么。你说茶、炭，还有厨房的米饭糊了。她骂了一声，拉着你往后院跑。六个人的名字在纸箱侧面排成很小一行，货车一动便看不清；焙间的灯还亮着，锅底那层糊饭也得有人认领。',
    ],
  },
  qiu: {
    no: '终章 · 四', title: '第四十七页', summary: '她带来钱和去路，也把自己的价码写在纸上', lead: 'qiu',
    paragraphs: (s) => [
      '苏砚秋递来的渠道合同有四十七页。独家区域、最低采购量、退货、抽检、账期，密密麻麻。她把自己的佣金用红笔圈出来：“先看这个。看完还肯和我吃饭，饭再算我的。”',
      has(s, 'exclusive_channel')
        ? '三年独家换来十二万元预付款，听雨坪因此跨过违约线。第一年采购价并不好看，你和她为每斤两块钱争了两个小时。她把红伞忘在会议室，走到停车场又回来，见你仍在改成本表，靠着门笑：“陆闻川，你现在很难骗了。这个变化不讨喜。”'
        : '你拒绝独家，只签分区代销。现金来得慢，茶园卖掉一处边仓才补齐缺口。苏砚秋少拿一大笔佣金，三天没回消息；第四天，她发来六家小茶馆地址，服务费照旧，一分没少。',
      '她父亲留下的旧批次从港口追回一半，茶已经拆散，箱号也有涂改。苏砚秋没办寻回仪式，能确认原主的逐箱退还，确认不了的计提赔款。她因此退出家族公司，在县城租了一间窄办公室。第一次自己拜访门店，老板让她在塑料凳上等了四十分钟，她喝完两杯凉茶，照样把合同谈下来。',
      '你们的关系像那四十七页纸，改过许多次。她会在酒会上挽你的手，也会在回程车里把账单一人一半；她能替你挡下一句难听话，转头又把你报价里的漏洞讲给买方。有次吵到凌晨，她推门要走，外面正落大雨。你把红伞递过去。半分钟后，她又回来：“车坏了。沙发借我，按夜算。”',
      '第二年，春火一号没获奖，却按时交完六家门店。仓门上有人贴纸：渠道就是谁在什么时候把多少钱付给谁。下面添了一行：以及谁又把伞落在厂里。苏砚秋看了很久，问是不是你写的。你否认得太快，她决定从下一笔佣金里扣一把伞钱。',
      '傍晚下山，她一手拿合同，一手来牵你。牵到一半又松开，翻出第四十七页：“自动续约，重谈。”你说先回家吃饭。她把纸折好，这次把手伸得更稳。远处收青秤正在报数，日子麻烦得像永远签不完的附件，你们还有时间一页页看。',
    ],
  },
  qing: {
    no: '终章 · 五', title: '三亩样方', summary: '老树留下来，失败和花销也一起留下', lead: 'qing',
    paragraphs: (s) => [
      '东坡三亩划成样方的第一天，林见青就与田桂香吵了一架。她把红线画进上山近路，采茶队每天要多绕二十分钟。两个人隔着地桩谁也不让。最后线往里退半米，项目出钱铺石阶，科研结论没变，人的腿少走许多冤路。',
      has(s, 'protect_germplasm')
        ? '你用五年租约换到第一笔项目款，也答应母株区不得追肥催芽。第一年三组试制茶都很普通，一组病斑还更重。林见青在汇报会上把失败照片放在第一张，资助方当场砍了预算。回山车上，她吃完口袋里最后半块碎饼干，问你后不后悔。你说今天后悔，明天再看。她认真记进了工作日志。'
        : '你们只保留十二株核心母树，其余地块继续生产。第二年低温来得早，十二株里死了两株。林见青蹲在树旁一上午，回去后把“保存成功”改成“保存中”。她没说选少了，你也没说早知如此。',
      '论文致谢里列了所有允许取样的农户。有人名字写错，她骑车下山重新确认。夜里回来，绿色雨衣滴一路水，显微镜边的面已经坨了。你替她加热，她嫌汤少，又倒半壶开水，吃得毫无滋味。',
      '相处久了，你学会在她看叶时等一会儿。她也学会抬头回答人。有回你问晚上看不看电影，她蹲在地里说“这株不行”；你走出两垄，她才追上来：“我是说这株不进样。电影几点？”跑得急，样签掉了一地。你们在山风里笑着捡到天黑。',
      '第三年，编号 Q-17 的植株在低温后抽芽整齐，制成的茶谈不上惊艳，却比同地块稳定。苗圃准备扩繁三十株。林见青把结果贴在村务栏，第一行写样本数小、仍需观察。田桂香问明年能不能多算五块一斤。她老实答：“现在不能。”两个人又吵起来。',
      '太阳落到东坡后，她把最后一支地桩敲稳，掌心震得发红。你接过锤子，她顺势把肩膀靠在你背上。山下有人喊吃饭。三亩地没有长成神话，只多了石阶、工资、失败记录和一群肯继续看的人。她在你背后说：“走吧，明天它们还在。”',
    ],
  },
  leave: {
    no: '终章 · 六', title: '山外一席茶', summary: '卖掉一部分旧山，也能带着手艺往前走',
    paragraphs: () => [
      '听雨坪卖掉靠公路的包装仓和两亩荒地。钱到账，你先给二十九名采茶工发清欠薪，再到医院缴费。余款还掉大半债务，剩下的按三年分期。那块掉漆的旧招牌没带走，田桂香说留着遮雨比当纪念强。',
      '祖父出院，在院子里坐了半天，问你舍不舍得。你说舍不得。他慢慢剥一只橘子：“舍不得也能卖。人不能拿别人的工钱替自己守祖业。”橘络沾在他手背上，你替他拂掉，他把最甜的两瓣塞进你嘴里，嫌你哭得难看。',
      '你到邻省一家合作社做驻厂技术员，带走审评杯、两袋失败样和改得发黑的批次册。老板第一天端来高香茶，要一句能印包装的评语。你喝三泡，说杀青偏轻、仓味未退。老板愣了很久：“难怪原来的园子守不住。”你说，也可能正因为这样，才没全丢。',
      '山外的宿舍很窄，窗下两盆薄荷死了一半。工资按月到账，你准时给听雨坪还款。手机不时响：杯号照片、骂人的语音、新合同、叶背病斑。没有谁因距离停在原地，也没有谁被一句承诺绑住。',
      '第二年春天，你请三天假回栖云。旧厂少了一排房，茶垄还在。田桂香见面先问外面工资，随后把一篓湿叶推来：“回来就别站着。挑。”你蹲在门槛边分叶，手指很快染上青汁。',
      '傍晚你又离山。车过西岭，听雨坪在后窗里缩成深绿一片。你没说一定回来。新厂催你确认明早水样，祖父发来一张模糊饭桌。包里那只旧杯磕掉一角，仍能盛茶。山路转弯，前面还有另一锅火等人看。',
    ],
  },
  union: {
    no: '隐藏终章', title: '长桌没有主位', summary: '五种打算坐到一起，先删愿景，再算工资',
    paragraphs: () => [
      '联合计划第一次开会就散得难看。沈知微要求审评独立收费，唐照晚不拿焙间替茶园兜底，苏砚秋把独家渠道写进草案，林见青圈走东坡三亩。田桂香看到最后，只问：“工钱在哪页？”五个人沉默半晌，从第一页开始删。',
      '第二版剩下能执行的数字：项目租地付固定费用，焙间按批收费，渠道预付最低采购量，审评共同出资却单独出报告；采茶工拿日薪与批次分红。每项都有退出条款。签字那天没人拍照，核账户就用掉整个下午。',
      '计划并不和气。沈知微退回唐照晚最得意的一批茶，后者三天不说话；苏砚秋为交货想动保育区边缘鲜叶，被林见青堵在山路上；你擅自答应老客户延长账期，田桂香把工资表拍到你面前。长桌的用处，是让争执有地方落笔。',
      '人与人的远近也不断变化。有人同你亲密，有人把你当可靠同事，有人一年只上山两次，回来仍能从柜里找出旧杯。合同能规定职责，规定不了谁愿意坐近一点。',
      '第三个春天，合作茶只卖掉预计的七成。五个人围着冷饭复盘退货，唐照晚忽然问谁吃了唯一一块排骨。所有人看向苏砚秋。她面不改色，让出下一季度零点一个点的渠道费。林见青认真算那块排骨值不值，笑声把窗外的雨压远了一点。',
      '天亮前，新一篓鲜叶送到桌边。叶面带水，采时少写一位。沈知微转杯号，唐照晚摸梗，苏砚秋改交期，林见青下山补地块签。你拿着表去找田桂香。长桌没有主位，只有五只不同的杯子和一张又要重写的账。',
    ],
  },
};

const SCENES: Record<string, Scene> = {
  auction: {
    chapter: '第一幕', title: '十二万六千元', location: '听雨坪 · 旧茶厂账房', countdown: '距债权人会议 12 天', progress: 5, stage: '看账', question: '茶园还没卖，你要先救哪一笔账？',
    paragraphs: () => [
      '雨从账房的破瓦上漏下来，落进搪瓷盆，一滴一声。桌上也有三种数：逾期本息十二万六，采茶队欠薪三万八，祖父住院押金两万一。你把计算器按了两遍，数字没肯少。',
      '院里停着一辆黑色越野车。澄江茶业的贺敬山没带律师，只带来两页收购意向：七十六万接走茶园、旧厂和品牌；欠薪当天结，医院费用另给两万，山上二十九名工人留用一年。条件也短——今天收三万定金，十二天后不再向别家报价。',
      '“祖业不能当饭吃。”田桂香站在门边，雨水顺着斗笠往下淌。她在听雨坪采了二十七年茶，丈夫刚做完腰椎手术，最晚后天要拿到一半工钱。她没劝你卖，也没替你讲情，只把二十九个人的签名压到欠薪表下。',
      '贺敬山自己泡了杯茶。白瓷盖一掀，你闻到晒热麻袋、柴油，还有极淡的一线辛辣，像旧农药瓶盖在指间留下的味道。三年前 H17 送检样开袋时，也是这股气。那批茶查出禁用除草剂，订单取消，你因“私换样、代签”被逐出厂，从此全县都知道你鼻子好，也知道这只鼻子没救下自己。',
      '杯中茶叶底有听雨坪地方种。你伸手去翻，贺敬山按住杯沿：“今年东坡收的。手续齐，钱也给了。”他看你一眼，“别把每片老叶都当案子。先看你欠谁的钱。”',
      '另一只手把杯号转向你。沈知微三年前是茶厂质控，如今在县城租了间审评室。她看了看你的脸，没问旧事：“你闻见什么先写，别说是谁干的。”说罢又把杯号转了一次，自己也愣了半秒。',
      '深红伞靠在门外。苏砚秋翻到意向书第二页，提醒你定金并非白拿：一旦收下，听雨坪十二天内只能同澄江谈；若反悔，双倍退。她受澄江委托做这笔并购，成交有佣金。话说得坦白，笑意却让人猜不出她希望你签还是不签。',
      '医院又来电话。田桂香没催，贺敬山也不催，屋里只剩漏雨声。三万元足够把眼前两处窟窿各塞一半，也足以在茶园脖子上拴一根十二天的绳。你拿起笔。',
    ],
    choices: () => [
      { label: '收下三万元定金，先发一半欠薪、补医院押金', tone: '拿时间换约束', impact: '钱当天到账，田桂香带走工资表。苏砚秋在排他期旁写下截止时分：十二天，一分钟也不会多', next: 'receipt', apply: (s) => evolve(s, { credit: 1, bond: ['qiu', 2], flags: ['sign_option'], skills: ['经营：定金能救急，也会锁住报价权'] }) },
      { label: '不签排他，向贺敬山要四十八小时核清这杯茶', tone: '留住报价权', impact: '医院押金只能再拖两天。沈知微封起杯中余茶，田桂香临走前只说：“后天我再来。”', next: 'receipt', apply: (s) => evolve(s, { evidence: 1, bond: ['zhi', 2], flags: ['hold_sale'], skills: ['看账：先分清现金缺口与资产价格'] }) },
    ],
  },
  receipt: {
    chapter: '第二幕', title: '祖父卖过的叶', location: '栖云县医院 · 六楼走廊', countdown: '距债权人会议 11 天', progress: 12, stage: '查单', question: '一条对你不利的线索，也要不要查到底？',
    paragraphs: (s) => [
      has(s, 'sign_option')
        ? '定金到账后，你先往医院缴了两万一，再按名单给采茶队转出八千九。二十九个人分不到多少，转账提示却响了很久。田桂香收起手机，说余下的照旧算利息。她怕你难堪，故意讲得像句玩笑。'
        : '你向医院求了两天宽限。收费窗口把承诺写在便签背面，既没盖章，也不保证第三天还有床位。回到六楼，你在自动售货机前数零钱，最后只买一瓶水，午饭仍旧算了。',
      '祖父陆守山刚做完心脏介入，鼻下挂着氧气管。你把杯中地方种的照片放大给他看，本想问谁进过东坡，他盯了半晌，先问：“茶卖了多少钱？”',
      '床头柜最下层塞着一张皱巴巴的收购联。三月二十八日，东坡地方种，鲜叶四十八斤，收购方是澄江旗下的临时站点。签名歪得厉害，确是祖父的手。所谓偷偷进园、调包老叶，都不存在。老人趁你下山筹钱，把答应留作母株的头采卖了六千四。',
      '“你住院的钱？”你问。',
      '“桂香她们过年那一笔。”他说。声音轻，脾气却没轻，“茶树活着，人就不吃饭了？”',
      '你在第一幕认出的叶片是真的，推出来的故事却错了。苏砚秋随后发来收购站流水，重量、车号、转账都对得上。她又添一句：这批鲜叶被拼进了“外县老丛”，标签夸张，买卖本身合法。查下去能揭出虚标，救不了三年前的 H17。',
      '沈知微来送封样袋，听完没安慰你。她把那张收购联与 H17 的旧车号并排放好：“错线索也留。下次你再闻到熟悉气味，先想想它有没有一条不阴谋的路。”她说完去扶眼镜，手在半空停住，改为把杯号转正。',
      '病房熄灯前，祖父从枕下摸出一把旧货车钥匙。三年前送 H17 去检测的人叫刘满仓，后来替澄江的农资站拉货。老人说那辆蓝色小货车还在西河口，只是司机未必肯见你。钥匙齿缝里有柴油垢，也有一点你忘不了的辛辣味。',
    ],
    choices: () => [
      { label: '当着祖父的面核完收购联，把这条错线索写进调查记录', tone: '让误判留下痕迹', impact: '祖父骂你把家丑写成论文，还是补上了经手人电话。沈知微把“合法出售”四字圈了两遍', next: 'rain', apply: (s) => evolve(s, { credit: 2, bond: ['zhi', 1], flags: ['record_false_lead'], skills: ['查单：来源真实，不等于标签真实'] }) },
      { label: '先收起收购联，不追问祖父，连夜去找刘满仓', tone: '顺车号查旧路', impact: '祖父没有拦，只让你把钥匙带走。苏砚秋查到旧车最后一次年检在西河口农资站', next: 'rain', apply: (s) => evolve(s, { evidence: 2, bond: ['qiu', 1], flags: ['trace_driver'], skills: ['追溯：车号能连接互不相同的货单'] }) },
    ],
  },
  rain: {
    chapter: '第三幕', title: '雨前不下篓', location: '听雨坪 · 西坡收青棚', countdown: '距债权人会议 9 天', progress: 19, stage: '收青', question: '工钱没到手，谁还肯替你抢这一场春茶？',
    paragraphs: (s) => [
      has(s, 'sign_option')
        ? '三万元定金解决了医院押金，也只够给采茶队发四分之一旧账。田桂香把转账逐个核完，仍让所有人把竹篓放在棚下。她说澄江的钱既然拴着茶园，就别装成是你凭本事挣来的。'
        : '后天就到医院宽限期，账上仍不到五千。田桂香带着采茶队来了，却没有一个人下篓。她们先在棚里吃完自带的冷馒头，等你把旧工资讲清。',
      '西岭压着乌云。头采再拖一天，叶子会展开；大雨一落，嫩叶带水，做青又要多一层麻烦。你算过，今年要做出够参赛、够送样、还能换钱的批次，至少需要一千二百斤鲜叶。眼前一山新芽，偏偏每一只竹篓都有主。',
      '田桂香把两条路说得比你清楚。山脚陈老板肯现款收鲜叶，每斤比往年低六块，卖一半能补旧工资，听雨坪便没有足量原料；另一条是十二名老工把欠薪转成这批茶的份额，茶卖不掉，她们一块亏。她自己愿意，不能替另外十一家做主。',
      '穿绿色雨衣的林见青从东坡下来，手里捏着几片卷叶。她是县农技站合作项目的研究员，去年就在听雨坪做样方。她看见叶背黄斑，第一句是“可能有药害”，第二句才想起问你们最近施过什么。',
      '“贺敬山的项目给你经费，你替他来封园？”田桂香问。',
      '林见青脸一下红了。项目设备确由澄江捐助，她申请时没告诉茶园。她蹲下来刮开叶背，半天不说话。田桂香等得不耐烦：“小林，叶子比人会答话？”',
      '“叶子也不一定会。”林见青终于起身，“我刚才说快了。先查螨、冻伤和药害，东坡这几垄暂缓，西坡没有同样症状。”她从口袋摸出半包压碎的苏打饼，想分给人，碎屑落了一地。',
      '第一滴雨砸在棚顶。田桂香让十二个人站到秤边，谁愿意把欠薪转份额，自己按手印；不愿的，今天卖鲜叶先发钱。你若把决定说得好听，明天挨骂的仍是她们。你只报数字。',
    ],
    choices: () => [
      { label: '现款卖掉一半鲜叶，先结清最急的十二户工资', tone: '茶可以少，人先拿钱', impact: '收购车在雨里装走六百五十斤鲜叶。剩下的原料只够做一批小茶，你失去用数量接大单的余地', next: 'review', apply: (s) => evolve(s, { credit: 3, craft: 1, flags: ['cash_wages'], skills: ['收青：现金流会直接决定批次规模'] }) },
      { label: '请自愿者把欠薪转成批次份额，逐户签风险说明', tone: '一起押这批茶', impact: '九户签了，三户要求现结。田桂香最后一个按手印，把“老板说了算”划掉，改成“按份额表决”', next: 'review', apply: (s) => evolve(s, { credit: 2, flags: ['workers_share'], skills: ['经营：欠薪转份额必须自愿、可计算、能表决'] }) },
    ],
  },
  review: {
    chapter: '第四幕', title: '八十克私样', location: '栖云县 · 知微审评室', countdown: '距债权人会议 8 天', progress: 27, stage: '审评', question: '一份来路不合规的样品，能够证明什么？',
    paragraphs: (s) => [
      has(s, 'cash_wages')
        ? '卖鲜叶的钱发下去，西坡安静了，旧厂却空出一半水筛。你把剩下的茶青分成三个小批，任何一锅失手都没有原料补。'
        : '九户采茶工成了春茶的债主兼股东。第一张意见单已经送来：不得拿她们的份额免费参赛。你忽然有了原料，也多了九个会追问成本的人。',
      '沈知微的审评室开在理发店楼上。楼下吹风机一响，桌上的秤会跟着轻颤。她等声音停了才称样，随后从带锁的铁盒取出一只牛皮袋。袋上没有公章，只有她自己的字：H17，八十克。',
      '三年前报告出来那晚，她从待清理的湿评叶底里拣出一份，烘干，带回家。公司制度不许，保存温湿度也不连续。它进不了正式证据链。沈知微把这些缺点一口气说完，杯号又被她转正一次。',
      '“你偷样？”',
      '“你换样。”她抬眼，“我们先别比谁的动词好听。”',
      '袋口一开，旧麻袋和柴油气已经淡了，辛辣味仍贴在干茶底下。你想起的却不是实验室，而是师父陆崇岭在封样台边压低的声音：拿左边那袋，快。你一直对外说自己只替司机签了名。那天你还把正式 H17 换成了同批较干净的平行样。',
      '沈知微见你失神，没追问。她把私样分成三份：一份感官对照，一份可做非诉检测，一份继续保存。检测要六千元，结果只能指示方向；若把私样写入公开材料，她的审评室资质复核很可能过不了。',
      '楼下吹风机又响，天平数字来回跳。沈知微把砝码收起来：“样不稳的时候不称。人也一样。你今天只决定这八十克怎么用，其他话等你能说全再说。”',
    ],
    choices: () => [
      { label: '把私样与违规保存一并登记，送做非诉检测', tone: '用结果指路，也承担来源缺陷', impact: '六千元检测费记入茶园成本。沈知微主动向资质复核员报备，复核日期被推迟', next: 'roast', apply: (s) => evolve(s, { evidence: 3, bond: ['zhi', 3], flags: ['declare_private_sample'], skills: ['审评：参考样可指路，不能冒充法定留样'] }) },
      { label: '不公开私样，只用气味和旧车号寻找运输环节', tone: '护住审评室，另找可核材料', impact: '八十克茶重新上锁。沈知微接受决定，却问了一句：“你还有多少没告诉我？”', next: 'roast', apply: (s) => evolve(s, { evidence: 1, credit: 1, flags: ['use_sample_as_lead'], skills: ['取证：来源有缺口的样品只能生成线索'] }) },
    ],
  },
  roast: {
    chapter: '第五幕', title: '焙间欠租', location: '栖云老街 · 照晚共用焙间', countdown: '距债权人会议 7 天', progress: 35, stage: '听火', question: '你拿什么付一间焙间今晚的租？',
    paragraphs: (s) => [
      has(s, 'declare_private_sample')
        ? '非诉检测已经收样，报告最快五天。六千元从账上划走时，你盯着余额看了半分钟。沈知微把收费凭证也订进材料，免得以后有人把这次检测说成朋友帮忙。'
        : 'H17 私样继续锁在铁盒里，只给你留下一股麻袋、柴油和辛辣混杂的旧气。刘满仓的电话始终关机，旧车年检地址却指向老街背后的农资站。',
      '照晚焙间就在农资站隔壁。卷帘门抬到一半，被房东用链锁拴住。唐照晚蹲在门里数钱，桌上三摞钞票，怎么挪都少一万八。三个跟她做工的人装作收炭，耳朵全朝这边。',
      '你需要焙她的设备做完春火一号。她需要今晚交租。两个人互相缺钱，谁也没有资格先谈情分。',
      '恰好有家茶商送来八十斤返青茶，要求天亮前起焙，工费两万二。唐照晚接了，第一笼升温却慢，茶香闷在叶里。她断定来料含水高，正要加火。你用手背试笼边，又捏断茶梗：梗心干，火温比表上高得多。',
      '“你在教我？”她问。',
      '“温度探头坏了。”',
      '唐照晚盯你一眼，拔下木簪拨开炭灰，手背沿笼心走了一圈。右腕的旧伤让她在某个位置微微一缩。她没嘴硬，转身把备用表插进去——整整高十一度。再迟三分钟，这批茶就要从返青变焦。',
      '房东在门外敲链锁。唐照晚关小炭门才骂：“催命也等我把火看完。”随后她从废纸箱里翻备用探头，带出一块褪色货签：满仓运输，车牌尾号 37。那批设备是三年前茶厂清仓时拉来的，连同几个沾农资味的旧周转箱。',
      '急单能付租，却会占掉你今夜唯一的制茶时段；听雨坪仓里还有一条闲置包装线，抵给房东可换两年焙间使用权，往后装箱便要外包。唐照晚把木铲递来：“选快点。鼻子金贵，手别闲着。”',
    ],
    choices: () => [
      { label: '接下返青急单，与你的人一起守到天亮', tone: '先替焙间挣租', impact: '两万二到账，扣除炭和人工后刚够解锁。春火一号的焙期推迟一天，唐照晚分给你一碗热过头的夜饭', next: 'banquet', apply: (s) => evolve(s, { craft: 3, bond: ['wan', 3], flags: ['take_night_job'], skills: ['听火：仪表、手感和茶条断面要互相校验'] }) },
      { label: '用闲置包装线作抵，换两年焙间使用权', tone: '拿设备押产能', impact: '房东按五万八估值接受抵押，不再锁门；十二天内还不上约定款，包装线便归他', next: 'banquet', apply: (s) => evolve(s, { craft: 2, credit: 1, bond: ['wan', 2], flags: ['equipment_sale'], skills: ['经营：闲置资产可以换现金，也会增加以后成本'] }) },
    ],
  },
  banquet: {
    chapter: '第六幕', title: '半杯茶的佣金', location: '西河口 · 顺意土菜馆', countdown: '距债权人会议 6 天', progress: 43, stage: '谈价', question: '肯告诉你价码的人，就一定站在你这边吗？',
    paragraphs: (s) => [
      has(s, 'take_night_job')
        ? '返青茶在凌晨四点起焙，唐照晚把工费先付房租，再给三名工人各转八百。轮到自己，只剩一百三十六。她把手机揣回去，说够吃一个月馒头。你没有接这个笑话。'
        : '包装线作价五万八，恰好与评估报告上的数字相同。苏砚秋看到转让草案，问你有没有算外包装每斤会多出多少钱。你算过，没有把答案算到两年以后。',
      '顺意土菜馆的包间闻不到名贵沉香，只有辣椒炒肉、消毒水和窗外河泥。苏砚秋特意约在这里，因为刘满仓的妻弟是老板。司机本人没有出现，后厨却停着那辆尾号 37 的蓝色小货车。',
      '她给你添半杯茶，自己那杯从进门就没动。桌上摊着两份东西：一份是听雨坪收购意向，一份是三年前澄江取消 H17 订单的内部邮件。邮件写着“检测责任待复核”，第二天，贺敬山仍批准中止合作；七天后，他关联的投资公司买下陆家第一笔债权。',
      '“他知道结果可能翻，也不愿等。”你说。',
      '“因为等一天，货价和债价都可能变。”苏砚秋夹了一筷子青椒，“很难听，但不违法。你若想证明他下药、换样，趁早换条路。”',
      '她承认自己想促成收购。七十六万里有百分之一点五的佣金，够她在省城付一年房租。若听雨坪不卖，她也能替你找门店，但要三年区域独家；货不稳定，她会第一批退。她把利害说得像菜单价，连小数点都不藏。',
      '你问她父亲经手的旧批次。苏家过去替澄江拆售过 H17 的库存和包装，后来父亲退出公司，留下一本缺页的装箱簿。苏砚秋找的不是失踪的人，是那批被换过名字、分到各处的茶。她需要听雨坪的流转记录，才能把箱号接回去。',
      '后厨有人发动货车。柴油味越过半扇窗，辛辣气紧跟着浮上来。你起身，老板挡在门口，说刘满仓不见“来找替死鬼的人”。苏砚秋没有拿名片压他，只把两杯茶都倒了：“今晚追也追不到。先决定我们明天用什么身份来。”',
      '她可以以准收购方名义调车辆与旧货单，代价是你给她七十二小时独家谈判；也可以只做收费渠道顾问，帮春火一号公开询价，刘满仓那条线则靠你自己磨。门外的红伞滴着水，包间那碟辣椒已经凉透。',
    ],
    choices: () => [
      { label: '给她七十二小时独家谈判，让她以准收购方调旧货单', tone: '借她的权限', impact: '苏砚秋收走意向书，却把佣金页留给你。第二天，她拿到 H17 当日的派车单和农资站入库联', next: 'field', apply: (s) => evolve(s, { evidence: 3, bond: ['qiu', 3], flags: ['channel_option'], skills: ['谈价：先问代理人靠哪一种结果挣钱'] }) },
      { label: '只签公开询价顾问，让春火一号同时给六家茶馆送样', tone: '不把去路押给一家', impact: '她收两千元顾问费，列出六个真实联系人。刘满仓的门，仍要你自己敲', next: 'field', apply: (s) => evolve(s, { credit: 2, bond: ['qiu', 1], flags: ['public_quote'], skills: ['渠道：多家报价会慢，却保留议价权'] }) },
    ],
  },
  field: {
    chapter: '第七幕', title: '尾号三七', location: '西河口 · 农资站后院', countdown: '距债权人会议 5 天', progress: 51, stage: '追车', question: '一个怕丢饭碗的司机，肯替你证明多少？',
    paragraphs: (s) => [
      has(s, 'channel_option')
        ? '苏砚秋用准收购方权限调出两张旧单。H17 送检当日，尾号 37 先到农资站提了十二箱除草剂，又在下午三点二十接走茶样。派车单上两趟被人用红笔并成一趟，理由写“节油”。'
        : '六家茶馆收了样，三家回复愿意试，没人给预付款。你拿着旧货签在农资站后院等了四小时，终于看见刘满仓开着尾号 37 回来。',
      '蓝色货车比记忆里矮，车厢地板补过两块铁皮。门一开，柴油、胶垫、化肥和陈年烟味一齐涌出来。那股辛辣并不神秘：角落有一圈洗不掉的白印，正是高浓度除草剂渗漏后留下的盐斑。',
      '刘满仓五十多岁，左耳听力不好。你刚报名字，他就去关车门。田桂香从外面抵住：“跑什么？三年前扣的是孩子的饭碗，又不是你的命。”',
      '司机蹲在轮胎边抽完一支烟，才承认那天下午运过 H17。农资站老板怕另叫一辆车费钱，让他把开封退回的药桶放在样箱旁边。路上急刹，桶倒过一次。到检测站时外纸箱有湿痕，他用仓库麻袋重新裹了。',
      '“我没往茶里倒。”他反复说。',
      '没人说他倒过。可这趟混装足以让送检样失去清白，也足以说明当年的阳性结果未必来自茶园。刘满仓保留着车辆维修册，药桶渗漏后第二天换过车厢胶垫；维修店盖章还在。若要他签陈述，他会失去农资站的工作，也可能承担赔偿。',
      '林见青带来东坡检测结果。卷叶是茶橙瘿螨叠加前期干旱，没有除草剂漂移。她站在众人面前，把自己“可能药害”的第一判断和澄江资助关系一起说了。田桂香问：“那几垄明天能采？”林见青答能，又补一句自己会先重挂样方牌。',
      '刘满仓看她一眼，把烟掐了：“说错也能这么算？”',
      '“能。要留着。”林见青递给他一张空白陈述，又从口袋摸饼干，发现只剩碎末，索性连袋一起倒进嘴里。后院一时没人说话。',
      '维修册能证明车厢受过药液污染，不能证明 H17 当天一定沾到；司机签字可以补上那一段，也会把他推到所有人面前。你来时只想找到责任人，如今人就在面前，穿着一件洗白的工装，月底还有两千七百元工资要领。',
    ],
    choices: () => [
      { label: '请刘满仓签下混装经过，同时写明是谁下的调度令', tone: '让口供进入材料', impact: '他签完手一直抖。你承诺不把“违规混装”写成“故意投毒”，林见青做了见证人', next: 'batch', apply: (s) => evolve(s, { evidence: 4, credit: 1, flags: ['driver_statement'], skills: ['追溯：陈述要把行为、命令和推测分开'] }) },
      { label: '只复印维修册和派车单，暂不公开司机姓名', tone: '先证车，不先证人', impact: '证据少一环，刘满仓却答应出席债权人会议；到时他可以自己决定是否开口', next: 'batch', apply: (s) => evolve(s, { evidence: 2, bond: ['qing', 2], flags: ['truck_log'], skills: ['追溯：物证能保护人，也可能留下解释空档'] }) },
    ],
  },
  batch: {
    chapter: '第八幕', title: '九户人的春火', location: '听雨坪 · 旧厂做青间', countdown: '距债权人会议 4 天', progress: 60, stage: '制茶', question: '这一批做坏了，亏的是谁的钱？',
    paragraphs: (s) => [
      has(s, 'cash_wages')
        ? '卖掉一半鲜叶以后，水筛只铺开七排。田桂香把秤砣擦得很亮，仿佛秤干净些，茶就能凭空多出来。你要从这六百五十斤鲜叶里留下参赛样和交货样，连失败都得按斤计算。'
        : '九户人家的手印贴在做青间门口。谁要求加摇、谁决定停青，都要在批次表上签名。田桂香不懂做青，却搬了张凳子坐在门边：“我看不懂叶子，看得懂谁进谁出。”',
      '午后日光斜进窗，靠窗三筛走水快，中间四筛仍青硬。你把不同地块和嫩度拆开摇青，没有追着第一股花香加力。叶缘慢慢起红，梗从硬直转软，青气沉下去，甜香才从叶片受伤处一点点浮上来。',
      '唐照晚来得晚，进门先摸记录卡，没摸茶。她看完靠窗批次的温湿度，说一句“还能做”，又去灶边吃田桂香留下的冷饭。沈知微送来水样，苏砚秋在院里接六家茶馆的电话，林见青补挂东坡样方牌。没人围着你等奇迹。',
      '杀青第一锅还是出了错。锅壁旧，右侧升温快，你听见叶片爆点变密，手却慢了半拍。起锅后有七八片焦边。第二锅你怕重犯，温度压得太低，叶梗里的水没退净，揉捻后透出生青。',
      '陆崇岭这时从门外进来。三年前开除你的师父瘦了许多，左手提着住院保温桶。他捏断两根茶梗，一根焦脆，一根湿软：“一个急着赢，一个怕再错。都不像茶。”',
      '你问他当年为什么叫你拿左边那袋。他没有装听不见，只把保温桶放到桌上：“先把今天的做完。旧账说开了，这锅火也不会等你。”田桂香在门边冷笑：“会等。我们九户的钱在里头，他今天得一块说。”',
      '两批初焙后分别开汤。焦边批汤厚，火气压香；轻杀青批香清，入口发空。拼配可能互补，也可能把两个缺点合成一个更大的缺点。报废焦边批更稳，数量却将低于几家茶馆要求的最低交付。',
      '你做了十三只比例样。第十一杯仍焦，第十二杯偏青。第十三杯温度落下去以后，木甜终于接住了薄香，尾水仍有一线火痕。九户股东、三名焙工和你师父都在等。田桂香只问：“能不能卖？退了算谁的？”',
    ],
    choices: () => [
      { label: '保留缺点说明，用第十三个比例做小批拼配', tone: '让两锅互相补', impact: '春火一号成品多出四十斤，批次页也多出十三次试配和一项“冷后微火痕”', next: 'blind', apply: (s) => evolve(s, { craft: 3, flags: ['blend_both'], skills: ['拼配：比例能调整呈现，抹不掉原批缺陷'] }) },
      { label: '报废焦边批，只把轻杀青批复焙到稳定', tone: '少交货，不赌退货', impact: '损耗三成七。田桂香把报废重量念给九户人听，没人鼓掌，也没人要求你藏起来', next: 'blind', apply: (s) => evolve(s, { craft: 2, credit: 3, flags: ['discard_scorched'], skills: ['制茶：报废重量也属于批次成本'] }) },
    ],
  },
  blind: {
    chapter: '第九幕', title: '第六名的订单', location: '栖云县 · 春社斗茶场', countdown: '距债权人会议 3 天', progress: 69, stage: '卖茶', question: '没有拿第一的茶，能不能救一笔债？',
    paragraphs: (s) => [
      has(s, 'blend_both')
        ? '春火一号送样前又复开两次。热时木甜清楚，冷后那线火痕仍在。你把十三次比例和两锅缺陷写进随样卡，田桂香在“同意参赛”一栏按了九户人的手印。'
        : '报废焦边批以后，正式样只装满两只罐。一只参赛，一只留底，摔碎任何一只都没有补样。唐照晚用旧毛巾把罐子裹了三层，嘴上说破茶也摆谱，抱得比谁都紧。',
      '春社斗茶在县文化馆院里举行。棚布被风吹得鼓起，十八张长桌一边坐评茶员，一边挤着茶农、茶商和来看热闹的人。规则写在白板上：统一水、统一器具，香气二十五、滋味三十五、叶底与稳定性各二十。没有暗门，也没人专程来害你。',
      '第一轮喝完，你就知道拿不了头名。九号兰香高，十二号汤厚，十五号冷杯还有清甜。春火一号排在中段，香不抢，第三泡倒没塌。评委给出的评语很平常：火工基本稳，原料一般，尾段略燥。',
      '成绩公布，第六。',
      '田桂香盯着榜看半晌：“第六有钱吗？”',
      '没有奖金。她转身就去收茶罐。围观席却有个穿旧夹克的男人拦住她。陈惟在省城开三家小茶馆，头五名的报价超出菜单，春火一号恰好落在他能卖的价位。他不要故事，要二百四十斤同批茶，先付三成，七日内交货。',
      has(s, 'cash_wages')
        ? '你手里的成茶远远不够。若只接一百二十斤小单，预付款三万六，能塞进债务缺口，却救不了全部；若与山下两户同工艺茶拼成联合批次，数量够，批次名和利润都得分。'
        : '九户人的份额加起来勉强够交货，预付款却要先扣旧工资和加工费。若再联合山下两户，可以接更多门店；听雨坪三个字便不能独占包装正面。',
      '陈惟把合同放在塑料茶盘上，油墨还没干。苏砚秋提醒他写抽检与退货，沈知微把“同批”改成“同工艺联合批次”，唐照晚算复焙损耗，林见青正蹲在桌下捡被风吹走的样签。第六名的桌前，比冠军那边还吵。',
      '债权人会议需要的不是奖牌，是能落到账上的钱和下一季收入。你第一次发现，茶不必压过全场，也能在一个具体价位上被具体的人需要。',
    ],
    choices: () => [
      { label: '只接一百二十斤小单，按现有批次保质交付', tone: '订单小一点，口径清一点', impact: '三万六预付款当场入账。陈惟删掉第四家门店，要求每箱附一张批次卡', next: 'fire', apply: (s) => evolve(s, { credit: 3, craft: 1, flags: ['small_order'], skills: ['卖茶：名次不等于成交，价格、数量和稳定性才是订单'] }) },
      { label: '联合山下两户接足订单，共用工艺和批次收益', tone: '把名字和利润分出去', impact: '预付款增至六万二，听雨坪只占联合批次四成。两户茶农带着自己的留样与签名加入', next: 'fire', apply: (s) => evolve(s, { credit: 2, flags: ['joint_order'], skills: ['经营：联合批次要共享名字、责任与退货成本'] }) },
    ],
  },
  fire: {
    chapter: '第十幕', title: '封仓以前', location: '听雨坪 · 抵押仓', countdown: '距债权人会议 2 天', progress: 77, stage: '保全', question: '一台叉车，先搬能卖的钱，还是能说清过去的纸？',
    paragraphs: (s) => [
      has(s, 'joint_order')
        ? '六万二预付款进了监管账户，联合批次也多出两户人的名字。合同规定七日交货，少一箱便按整批比例退款。田桂香把交期写在仓门上，数字大得隔一片晒场也看得见。'
        : '三万六预付款只填上违约金的一角。陈惟没催你讲获奖故事，只催装箱清单。第一批十二箱茶已经堆在抵押仓东墙，那里偏偏最先漏雨。',
      '傍晚，资产管理公司送来封仓通知。听雨坪的仓库和旧设备都在抵押清单内，次日中午完成盘点后不得擅自移动。通知有章，程序也齐。贺敬山没有放火，他甚至让人送来一卷防雨布：“我买的是资产，不想买一仓霉茶。”',
      '夜里雨势加大，东墙渗水。成品茶要转去干燥的做青间，三十七箱旧档案也得搬离地面。仓里只有一台电动叉车，电量剩两格；人工能搬，却慢。更糟的是，档案架后方的排水沟堵了，水正沿地面往两边铺。',
      '唐照晚带三名焙工给茶箱套袋，右腕抬不动时便换左手。苏砚秋照着封仓清单标明每一件移动物，免得明天被说成转移资产。她收了澄江的佣金，也清楚资产方会从哪一个字找麻烦。',
      '沈知微在档案里找到 H17 的两张封样卡：正式综合样 A，平行样 B。A 卡右上角有你写的“异味待核”，B 卡的送检栏却签着你的名字。旁边缺了一页出车联。她没有问，先把两张卡放进透明袋。',
      '陆崇岭站在仓门口，雨水从伞骨落到鞋边。他看见封样卡，脸色灰下去：“纸先放回去。”田桂香正在搬工资档案，闻言把箱子重重一放：“为什么？纸怕见人？”',
      '叉车警报响了一次，只剩一格电。先运成品，订单和六万二不会泡水，旧档案可能受潮；先抬档案，H17 的流转与历年工资能保住，成品茶若返潮，陈惟会退单。两样都属于别人的钱。',
      '贺敬山的车停在院外，灯一直亮着。他的人没有进仓，只按通知每半小时拍一张现场。合法的期限比黑烟安静，也更难靠勇气冲过去。',
    ],
    choices: () => [
      { label: '叉车先运成品茶，人工把档案逐箱垫高、编号', tone: '先保交货', impact: '十二箱茶转入干燥间，档案底层仍湿了三箱。H17 两张封样卡保住，缺页是否还能找到无人保证', next: 'sample', apply: (s) => evolve(s, { credit: 3, craft: 1, flags: ['save_stock'], skills: ['保全：移动抵押物也要登记位置与见证人'] }) },
      { label: '叉车先转档案柜，成品拆箱分散搬运除湿', tone: '先保旧账', impact: '档案完整离地，四箱成品吸潮，需要返焙并延迟交货。陈惟同意等一天，扣掉一笔复检费', next: 'sample', apply: (s) => evolve(s, { evidence: 3, bond: ['wan', 1], flags: ['save_ledger'], skills: ['仓储：纸与茶各有失效时限，选择会留下成本'] }) },
    ],
  },
  sample: {
    chapter: '第十一幕', title: '你拿了左边那袋', location: '听雨坪 · 做青间', countdown: '距债权人会议 1 天', progress: 84, stage: '认错', question: '被冤枉三年的人，还能不能承认自己也换过样？',
    paragraphs: (s) => [
      has(s, 'save_ledger')
        ? '档案柜里找到了缺失的出车联：H17-A 原定送检，铅笔划去；H17-B 改为送检，旁边是陆崇岭的工号。纸边没有烧痕，也没有密室机关，只沾了仓库三年的灰。'
        : '受潮档案里只保住 A、B 两张封样卡，出车联已经糊成一团。陆崇岭看了许久，从口袋拿出当年那份复印件。原来缺页一直在他手里。',
      has(s, 'workers_share')
        ? '做青间的人都到了。田桂香代表九户份额参与者，陈惟开着视频，刘满仓坐在门边，始终不肯抬头。沈知微把自己私留八十克样的违规说明放在第一张，随后才轮到你。'
        : '做青间的人都到了。田桂香代表仍在等余款的采茶工，陈惟开着视频，刘满仓坐在门边，始终不肯抬头。沈知微把自己私留八十克样的违规说明放在第一张，随后才轮到你。',
      '三年前 H17 装箱前，你在综合样 A 里闻到一线辛辣。陆崇岭担心错过交货，叫你拿同批上层较干净的平行样 B 去检测。你知道那不是随机留样，也知道换完以后，报告无论好坏都不能代表整批茶。你仍照做了，还在经手栏签了刘满仓的名字。',
      '后来 B 样在尾号 37 的车里与渗漏药桶混装，检测查出禁用除草剂。陆崇岭立刻开除你，对外只公布代签；你便抓住这一半事实，三年里反复说自己没碰过样。你的确没有往茶里下药，也未策划检测事故。可你拿了左边那袋。',
      '刘满仓嗓子发哑：“那我呢？”',
      '“你违规混装。”沈知微说，“陆师傅指示换样，陆闻川执行并冒签，我私留样品，贺敬山在知悉可复核时中止订单。分开写。”',
      '陆崇岭想把责任全揽过去。田桂香不肯：“你一句‘我叫的’，他那只手就没拿袋子？一个个来，别抢。”她把椅子拖近，鞋底带进一小片湿泥。',
      '真相没有把 H17 变回清白。A 样当年的异味从未依法复检，B 样又在运输中受污染，没人还能证明整批茶究竟有没有问题。你们能证明的，是检测链怎样被几次省钱、赶时间和怕担责的决定弄断。',
      '公开说明会触发陈惟的诚信条款，他有权撤单；参与份额或同意延期的工户也可以退出。若先让直接受损的人逐户选择，再于明早公开，外界会说你把最难看的部分拖到会前最后一刻。两种顺序都要付钱，都没有洗白。',
    ],
    choices: () => [
      { label: '今晚立即公开完整换样经过，接受客户和工户退出', tone: '先让所有人看见', impact: '陈惟暂停第二批订单，却保留已付款小单。两户退出后续合作，其余人要求把陆崇岭也写进说明', next: 'eve', apply: (s) => evolve(s, { credit: 4, evidence: 1, bond: ['zhi', 2], flags: ['admit_swap'], skills: ['信用：承认事实不等于消灭事实造成的损失'] }) },
      { label: '先逐户告知客户与会直接受损的工户', tone: '先对会亏钱的人说', impact: '田桂香带着说明逐家敲门。凌晨一点，九户里回了七户；沈知微提醒你，明早仍要面对所有人', next: 'eve', apply: (s) => evolve(s, { credit: 2, flags: ['stakeholders_first'], skills: ['沟通：重大披露先后顺序会改变谁能及时止损'] }) },
    ],
  },
  eve: {
    chapter: '第十二幕', title: '四份不一样的救法', location: '听雨坪 · 旧账房', countdown: '债权人会议前夜', progress: 90, stage: '筹钱', question: '还差的钱从哪里来，控制权就会到哪里去',
    paragraphs: (s) => [
      has(s, 'admit_swap')
        ? '换样说明公开两小时，电话先响后停。有人骂你三年都在撒谎，也有人追问陆崇岭和刘满仓。陈惟暂停追加订单，已签的小单不撤。最难熬的不是骂声，是每隔几分钟刷新一次账户，看预付款会不会被原路扣回。'
        : '田桂香带着说明逐户回来。七户愿意继续，两户退出，份额按原价退。凌晨前，你把完整换样经过上传，外界仍批评你拖到最后；至少直接会亏钱的人先做了选择。',
      has(s, 'joint_order')
        ? '监管账户里有六万二，扣掉复检、返焙和两户退出款，可用于违约金的不到五万。'
        : '小单预付款三万六，扣掉检测与包装，只余两万七。',
      '债权人要求明早先付十二万六的逾期款，或拿出有现金、有担保、有未来收入的重组方案。证据可以让贺敬山解释当年为何拒绝复检，却不会替你多出九万。',
      '四个人各带来一份方案。没有一份免费。',
      '沈知微建议把旧厂二楼改成联合审评点：四家小茶园预购全年检测服务，能进四万六；九户工人用剩余工资债权、工时或小额现金认领合作社份额，换取债权人对余款展期。条件是审评报告独立出具，你和茶园都无权要求改字，合作社对收青价有否决权。',
      '唐照晚的方案最快：包装线连同两年闲置仓使用权公开转让，底价五万八；焙间把三家代加工订单转到旧厂，提供可核收入。听雨坪以后包装外包，老厂一半夜间产能归焙间。她说：“机器会想你吗？工人会。”',
      '苏砚秋带来十二万元渠道预付。三年区域独家，最低采购量写死，也有连续两批不合格即可退出的条款。她拿百分之三服务费，还要一个经营观察席。“这份最像救命钱，也最像绳子。”她把自己的佣金页推到最上。',
      '林见青争取到研究院五年样方租约，东坡与边缘林地一次付八万二，另补农户绕行和停采费用。地块五年不得抵押、改种或作为商品茶宣传。她的名字不进经营层，项目若中止，未履行部分要退。',
      '四盏灯照着四份合同。沈知微的最慢，也最分散；唐照晚拿设备换现金；苏砚秋拿渠道换控制；林见青拿土地用途换时间。你同谁走进会议室，明天先谈的就会是哪一种代价。',
    ],
    choices: () => [
      { label: '采用沈知微的联合审评与职工合作方案', tone: '把监督权分出去', impact: '她删掉方案里的“陆家茶园”，改成“听雨坪合作社”。九户人的手印被放到出资页第一页', next: 'auction_day', apply: (s) => evolve(s, { bond: ['zhi', 3], flags: ['ally_zhi', 'plan_coop'] }) },
      { label: '采用唐照晚的设备转让与共用焙间方案', tone: '卖闲置，换产能', impact: '她给包装线拍完最后一组照片，挂牌五万八。旧厂夜班表第一次写进三家外来订单', next: 'auction_day', apply: (s) => evolve(s, { bond: ['wan', 3], flags: ['ally_wan', 'plan_roastery'] }) },
      { label: '采用苏砚秋的三年独家渠道预付方案', tone: '拿现款，交出部分渠道权', impact: '十二万元进入有条件监管。她把佣金和退出条款念给每一个在场的人听', next: 'auction_day', apply: (s) => evolve(s, { bond: ['qiu', 3], flags: ['ally_qiu', 'exclusive_channel'] }) },
      { label: '采用林见青的五年样方租约方案', tone: '用土地用途换资金', impact: '东坡三亩与边缘林地从抵押评估中单列。她在“不得宣传百年母树”后面亲手加粗', next: 'auction_day', apply: (s) => evolve(s, { bond: ['qing', 3], flags: ['ally_qing', 'protect_germplasm'] }) },
    ],
  },
  auction_day: {
    chapter: '第十三幕', title: '会议桌上的十二万六', location: '栖云农商行 · 二号会议室', countdown: '债权人会议', progress: 96, stage: '重组', question: '事实说清以后，谁肯为下一季现金流签字？',
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      const openings: Record<LeadKey, string[]> = {
        zhi: [
          '沈知微先交四份审评服务预购函，再交自己的违规留样说明。她没把八十克私样写成铁证，只说明它怎样引向尾号 37。资质复核因此延后，她的四万六服务款也被要求进入监管账户。',
          '田桂香把九户份额表推到桌中央：“欠我们的，不抹。转成股，是我们愿意押下一季。”合作社章还刻得粗糙，印出来一边深一边浅。银行的人看了三遍，要求重盖，她当场又按一次。',
        ],
        wan: [
          '唐照晚带来的包装线报价已经有两家竞买，最高六万一。她同时提交三份代加工合同，夜间产能归共用焙间，租金按月抵扣。银行问设备卖了如何发货，她报出外包厂、单价和来回运费，连每斤多出的八毛都算了。',
          '她没有把自己的手伤写进风险说明。你提醒后，她脸色不好看，仍补上一项替班制度。贺敬山看见，笑说一个连主理人都未必能上火的焙间不值钱。唐照晚回他：“所以卖的是排班，不是我的手。”',
        ],
        qiu: [
          '苏砚秋把十二万元预付凭证放在第一份，三年独家合同放第二份，百分之三服务费放第三份。有人问她到底代表谁，她答得干脆：今天代表自己的渠道公司，也代表愿意买茶的六家门店，不再代表澄江。',
          '贺敬山提醒众人，她上个月还拿澄江并购佣金。苏砚秋点头，把已收的定金与退款凭证一起提交：“所以利益冲突写在第一页。你们可以不信我，钱已经在监管账户，条款也可以逐项拒绝。”',
        ],
        qing: [
          '林见青展开样方租约和地块图。八万二一次付清，五年用途受限；生产区、样方和抵押物重新测绘。银行最关心若项目中止谁退钱，她报出研究院担保账户。田桂香最关心绕路补贴，她把每户金额贴在图角。',
          '她也提交资助披露：早期设备由澄江捐助，药害初判错误，复检结论为螨害与干旱。贺敬山问这样的研究员凭什么保证地方种有价值。她说：“不保证。租金买五年观察，不买一个好听结论。”',
        ],
      };
      return [
        '二号会议室没有拍卖槌。长桌一端坐农商行、工资债权代表和医院财务，另一端是你、陆崇岭、田桂香与方案提供方。贺敬山的黑色文件夹摆在正中，里面仍是七十六万收购价。他把留用期从一年加到两年，条件比十二天前更好。',
        '他先读你的换样说明。H17-A 换成 H17-B，冒签司机姓名，隐瞒三年。读到最后，贺敬山合上纸：“诸位，这个人今天诚实，不等于他明天能经营。”会议室里没有人替你反驳，因为这句话有一半说中了。',
        has(s, 'admit_swap')
          ? '你在前一晚公开，客户与工户的退出已经计入新方案。损失难看，却有数字。'
          : '你先告知会受损的客户与股东，再公开说明。顺序引来质疑，七户继续、两户退出也都有签字。你把这项争议留在桌上，没有改成一致支持。',
        '沈知微的八十克私样、车辆维修册、派车单与刘满仓陈述依次提交。它们不能证明 H17 整批无问题，却能说明送检样在混装运输中可能受到药液污染。陆崇岭承认指示换样。刘满仓站到门口时腿发抖，还是亲口说了药桶怎样倒下。',
        '三年前的内部邮件随后投上屏幕。贺敬山在“结果待复核”时批准取消订单，又在七天后买入陆家债权。他不否认：“我判断复核来不及，茶厂会倒。债权便宜，我买了。商业判断不是慈善，也不是投毒。”',
        '这句话同样有一半说中。调查组要求另查当年检测与信息披露，农商行却不会因此免掉本金。桌上的问题重新回到十二万六，以及未来六个月能不能付息。',
        ...openings[ally],
        `前两小时结束，${LEADS[ally].name}把笔放到你面前。她带来的钱和合同都够进入表决，也都带着一项你过去没有的约束。`,
        '债权人最终同意暂缓处置九十天：监管款先补欠薪和逾期利息，其余债务按新现金流重排；听雨坪不得再新增担保。贺敬山投了反对票，又在决议后签收材料。他没有倒台，只失去按原计划低价接走整座山的机会。',
        '还剩最后一项。你可以接受现方案，把定价、审评、产能、渠道或土地用途中的一项交给别人共同决定；也可以卖掉靠公路的边仓和两亩荒地，把计划缩小，少欠人情，也少留一块祖产。',
      ];
    },
    choices: () => [
      { label: '按现方案签字，接受共同表决与持续复核', tone: '用控制权换继续经营', impact: '章盖下去，九十天开始计时。你的名字仍在第一行，旁边多出许多以前不必征求的签名', next: 'dawn', apply: (s) => evolve(s, { credit: 3, flags: ['accept_plan', 'workers_share'], skills: ['重组：钱从哪里来，监督权就会到哪里去'] }) },
      { label: '再卖边仓和两亩荒地，缩小债务与经营规模', tone: '割下一块，少借一点', impact: '评估师当场标出红线。祖父看了很久，叫你把最靠公路、最不长茶的那块先划出去', next: 'dawn', apply: (s) => evolve(s, { credit: 2, flags: ['sell_parcel'], skills: ['重组：出售部分资产也能保住核心生产'] }) },
    ],
  },
  dawn: {
    chapter: '第十四幕', title: '第一篓以前', location: '听雨坪 · 旧厂门前', countdown: '暂缓处置第 1 天', progress: 100, stage: '开工', question: '九十天到手以后，你准备把名字签在哪里？',
    paragraphs: (s) => {
      const ally = chosenAlly(s);
      return [
        has(s, 'accept_plan')
          ? '暂缓决议贴上旧厂门，下面跟着一张更长的监督清单。以后你调一次价、借一笔钱、改一个样方，都要让另一群人看见。田桂香读完，说这才像能管住老板的纸。'
          : '测绘员一早去边仓打桩。那两亩荒地几乎不长茶，你仍站在坡上看了半小时。祖父拄杖走来，用鞋尖踢踢碎石：“卖路边，留水源。别把舍不得装成会经营。”',
        '九十天听起来很长，落到日历上，不过一季茶。欠薪先发，医院账先结，陈惟的订单还要复焙、抽检、装箱。昨天会议上的掌声一声也没有，今早照样有人来上工。',
        `昨夜与你并肩的${LEADS[ally].name}在长桌留下一样东西：${ally === 'zhi' ? '四只编号杯和一张收费表' : ally === 'wan' ? '东侧焙笼钥匙与新排班' : ally === 'qiu' ? '四十七页合同和一把又被忘下的红伞' : '五年地块图与一袋压碎的饼干'}。没有情书，也没有“永远”。她今天还有自己的客户、工人、门店或样方要顾。`,
        '陆崇岭去医院给祖父送早饭，临走前把 H17-A、B 两张卡交给沈知微。他没有求你恢复师徒名分。刘满仓回农资站办离职，田桂香替他问焙间缺不缺搬货人。三年前那条链断开以后，每个人都得另找一处站。',
        has(s, 'joint_order')
          ? '山下两户茶农送来各自的成茶，联合批次开始复开。三家的火功不齐，第一轮就吵起来。谁也没提第六名，大家只问这一箱若被退，损失按什么比例分。'
          : '一百二十斤小单排在仓门边。箱数少得寒酸，却已经付过钱。陈惟发来消息：先别讲山，按时发货。',
        '田桂香把新收青单压在秤边，叫你去看第一篓。叶面有水，嫩度也不齐。你摸梗、问地块、重写采时，动作不快。没人夸你长进，只在你挡路时叫你让开。',
        '你曾把救下茶园想成一次翻案。走到今天，翻案只占桌角一叠纸。桌面更大的地方放着工资表、租约、订单、退股单、检测费和午饭菜单。人要在这些东西之间活，茶也一样。',
        '山雾正在退。秤盘、杯碗和旧机器逐渐亮起来。你可以留下来，把茶园的每一天过成一笔有人复核的账；可以走向那位与你签过最重一份合同的人；也可以卖去更多负担，到别处重新做茶。走过三条以上道路后，还有一张长桌会等所有人回来。',
      ];
    },
    choices: (s, found) => {
      const ally = chosenAlly(s);
      const options: Choice[] = [
        { label: '留在听雨坪，让第一篓鲜叶上秤', tone: '茶园继续', impact: '秤砣落下，田桂香报出重量。你在经手栏签名，旁边留着复核人的空格', next: 'ending:garden' },
        { label: `走向${LEADS[ally].name}，把下一份具体工作接过来`, tone: `与${LEADS[ally].name}同行`, impact: `${LEADS[ally].name}先让你把合同看完，随后才把手伸过来`, next: `ending:${ally}` },
        { label: '卖掉更多非生产资产，到新的产区做驻厂技术员', tone: '离山，不赖账', impact: '你带走两只审评杯和失败样，余下的钱按计划留在监管账户', next: 'ending:leave' },
      ];
      if (found.filter((id) => id !== 'union').length >= 3) {
        options.push({ label: '请所有人回到长桌，从工资那一页重新写联合计划', tone: '长桌没有主位', impact: '第一版愿景被删得只剩标题，第二版从现金、工时和退出条件开始', next: 'ending:union' });
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
  if (sceneId === 'fire') return ['wan', 'qiu'];
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
      version: '1.3',
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
      version: '1.3', updatedAt: new Date().toISOString(), currentSceneId: sceneId, currentState: state,
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
          <span className="seal">火</span><span><small>栖云县 · 十二日</small><strong>春山听火</strong></span>
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
            <h1>十二天后，茶园可能易主<br />而你还欠所有人一句真话</h1>
            <p className="lede">祖父住院，采茶工等着工资，债权买家把收购合同摆上桌。为了留下听雨坪，你得做成一笔能到账的春茶订单，也得承认三年前那袋样品，确实由你亲手换过</p>
            {resumeSave ? (
              <div className="resume-card">
                <small>上次读到</small><strong>{resumeSave.currentEndingId ? '一段已经抵达的结局' : `${resumeScene?.chapter} · ${resumeScene?.title}`}</strong>
                <span>{new Date(resumeSave.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 已走 {resumeSave.choiceHistory.length} 个节点</span>
              </div>
            ) : <p className="autosave-note">从第一步开始，故事会在每次选择后自动保存到这台设备。</p>}
            <div className="cover-actions">
              {resumeSave ? <button className="primary" onClick={continueStory}>继续上次阅读 <span>→</span></button> : <button className="primary" onClick={beginStory}>打开第一本欠薪账 <span>→</span></button>}
              {resumeSave && <button className="outline" onClick={(event) => openHistory('all', event.currentTarget)}>查看已走节点</button>}
              {resumeSave && <button className="text-button" onClick={() => setRestartConfirm(true)}>重新开始</button>}
              {!resumeSave && foundEndings.length > 0 && <button className="text-button" onClick={(event) => openPanel('endings', event.currentTarget)}>查看已解锁结局</button>}
            </div>
            <div className="cover-meta"><span>约 55–80 分钟</span><span>14 幕完整剧情</span><span>6 个基础结局 + 1 隐章</span></div>
            <p className="notice">主要角色均为成年人 · 含职业压力、受伤与克制的成年暧昧</p>
            {!storageAvailable && <p className="storage-warning">浏览器拒绝了本机存储。你仍可阅读，但刷新后可能无法恢复进度。</p>}
            <p className="music-credit">故事版本 1.3 · 现实因果重构版 · 三首本地 CC0 配乐</p>
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
             <div className="credits"><strong>配乐与许可</strong>{(Object.keys(TRACKS) as TrackId[]).map((id) => <a key={id} href={TRACKS[id].source} target="_blank" rel="noreferrer">{TRACKS[id].title} · {TRACKS[id].author} · {TRACKS[id].license}</a>)}<span>故事版本 1.3 · 现实因果重构版</span></div>
           </section>
         </div>
       )}

       {activePanel === 'more' && (
         <div className="modal-backdrop mobile-drawer" role="presentation" onMouseDown={closePanel}>
           <section className="modal more-modal" role="dialog" aria-modal="true" aria-label="更多功能" onMouseDown={(event) => event.stopPropagation()}>
             <div className="modal-head"><div><p className="kicker">本周目工具</p><h2>更多</h2></div><button onClick={closePanel}>关闭</button></div>
             <div className="more-grid"><button onClick={() => openHistory('all')}>已走节点 <i>{history.length}</i></button><button onClick={() => openPanel('people')}>人物录</button><button onClick={() => openPanel('skills')}>茶艺记录 <i>{state.skills.length}</i></button><button onClick={() => openPanel('endings')}>结局收集 <i>{foundEndings.length}/7</i></button><button onClick={rewind} disabled={!history.length}>回到上一选择</button><button onClick={toggleMusic}>音乐 {musicOn ? '播放中' : '已暂停'}</button><button onClick={() => openPanel('settings')}>阅读与音乐设置</button><button className="danger-link" onClick={() => { setActivePanel(null); setRestartConfirm(true); }}>开启新周目</button></div>
             <p className="drawer-status">{storageAvailable ? saveTime ? `已自动保存 · ${saveTime}` : '自动保存已开启' : '本机存档目前不可用'} · 故事版本 1.3</p>
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
