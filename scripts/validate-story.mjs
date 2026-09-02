import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'app', 'page.tsx'), 'utf8');
const saveSource = fs.readFileSync(path.join(root, 'app', 'story-save.ts'), 'utf8');
const fail = (message) => { throw new Error(message); };

const endingsStart = source.indexOf('const ENDINGS:');
const scenesStart = source.indexOf('const SCENES:');
const scenesEnd = source.indexOf('const SCENE_ORDER');
if (endingsStart < 0 || scenesStart < 0 || scenesEnd < 0) fail('找不到故事数据区块');

const endingsBlock = source.slice(endingsStart, scenesStart);
const scenesBlock = source.slice(scenesStart, scenesEnd);
const endingMatches = [...endingsBlock.matchAll(/^  ([a-z_]+): \{/gm)];
const sceneMatches = [...scenesBlock.matchAll(/^  ([a-z_]+): \{/gm)];
const endingIds = endingMatches.map((match) => match[1]);
const sceneIds = sceneMatches.map((match) => match[1]);

if (endingIds.length !== 7) fail(`结局数量应为 7，实际为 ${endingIds.length}`);
if (sceneIds.length !== 14) fail(`场景数量应为 14，实际为 ${sceneIds.length}`);

const orderMatch = source.match(/const SCENE_ORDER = \[([^\]]+)\]/s);
if (!orderMatch) fail('找不到 SCENE_ORDER');
const sceneOrder = [...orderMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
if (sceneOrder.join('|') !== sceneIds.join('|')) fail('SCENE_ORDER 与场景定义顺序不一致');

const literalTargets = [...scenesBlock.matchAll(/next: ['`]([^'`]+)['`]/g)].map((match) => match[1]);
for (const target of literalTargets) {
  if (target.includes('${')) continue;
  if (target.startsWith('ending:')) {
    const ending = target.slice('ending:'.length);
    if (!endingIds.includes(ending)) fail(`选择指向不存在的结局：${target}`);
  } else if (!sceneIds.includes(target)) {
    fail(`选择指向不存在的场景：${target}`);
  }
}

for (let index = 0; index < sceneMatches.length; index += 1) {
  const start = sceneMatches[index].index;
  const end = index + 1 < sceneMatches.length ? sceneMatches[index + 1].index : scenesBlock.length;
  const block = scenesBlock.slice(start, end);
  const choiceCount = (block.match(/\bnext:/g) ?? []).length;
  if (choiceCount < 2 || choiceCount > 4) fail(`${sceneIds[index]} 的选择数为 ${choiceCount}，应在 2–4 之间`);
  if (index < sceneIds.length - 1 && !block.includes(`next: '${sceneIds[index + 1]}'`)) {
    fail(`${sceneIds[index]} 没有汇流到下一幕 ${sceneIds[index + 1]}`);
  }
}

for (const required of ['garden', 'leave', 'union']) {
  if (!literalTargets.includes(`ending:${required}`)) fail(`基础结局入口缺失：${required}`);
}
if (!source.includes('next: `ending:${ally}`')) fail('四位同行者的动态结局入口缺失');
if (!source.includes("found.filter((id) => id !== 'union').length >= 3")) fail('隐藏结局解锁条件缺失');

for (const age of [...source.matchAll(/age: (\d+)/g)].map((match) => Number(match[1]))) {
  if (age < 18) fail(`主要人物年龄不符合成年人要求：${age}`);
}

const forbidden = [
  '你忽然明白', '你终于知道', '那一刻你才懂得', '真正的茶人', '真正懂茶的人',
  '这杯茶让你明白', '命运的齿轮', '故事才刚刚开始', '娇躯一颤', '媚眼如丝', '吐气如兰',
];
for (const phrase of forbidden) {
  if (source.includes(phrase)) fail(`发现禁用或高风险句式：${phrase}`);
}

if (!source.includes('setState(previous.state)') || !source.includes('setEndingId(null)')) fail('回到上一选择未完整恢复故事状态');
if (source.includes('window.localStorage')) fail('页面组件不应直接访问 localStorage');
if (!saveSource.includes("interactive-fiction:chunshan-tea:auto-save")) fail('统一自动存档键缺失');
if (!saveSource.includes('window.localStorage.setItem') || !saveSource.includes('window.localStorage.getItem')) fail('集中存档读写模块缺失');
for (const eventName of ['visibilitychange', 'pagehide']) {
  if (!source.includes(eventName)) fail(`离开页面存档事件缺失：${eventName}`);
}
for (const track of ['audio/oriental-dawn.ogg', 'audio/mystery-trace.mp3', 'audio/warm-fire.ogg']) {
  if (!source.includes(track)) fail(`背景音乐资源引用缺失：${track}`);
  if (!fs.existsSync(path.join(root, 'public', track))) fail(`背景音乐文件缺失：${track}`);
}
for (const uiText of ['继续上次阅读', '已走节点', '回到关键节点', '阅读设置', '故事版本 1.2']) {
  if (!source.includes(uiText)) fail(`产品体验入口缺失：${uiText}`);
}
if (!source.includes('aria-live="polite"') || !source.includes('resultRef')) fail('选择结果无障碍反馈缺失');

const chineseChars = (source.match(/[\u3400-\u9fff]/g) ?? []).length;
if (chineseChars < 12000) fail(`正文规模不足，当前中文字符约 ${chineseChars}`);

console.log(`故事验证通过：${sceneIds.length} 幕，${literalTargets.length} 个选择目标，${endingIds.length} 个结局，约 ${chineseChars} 个中文字符。`);
