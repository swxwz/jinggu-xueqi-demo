# 春山听火

一部以茶、制茶、审评、批次追溯与小人物成长为核心的中文互动小说。三十天后祖父茶园将被拍卖，陆闻川却在一只拍卖杯里闻见三年前问题茶的旧火香。

- 在线试玩：https://swxwz.github.io/jinggu-xueqi-demo/
- 单局约 45–60 分钟
- 14 幕轻选择，6 个基础结局与 1 个隐藏结局
- 所有主要角色均为成年人
- 支持单一自动存档、继续上次阅读、完整节点回跳、结局收集与移动端阅读
- 支持标准/大/特大字号、减少动态效果、三首本地音乐与独立音量设置
- 存档与设置只保存在当前浏览器；存储不可用时会显示警告，不影响本次阅读

研究与写作资料：`tea-research.md`、`story-bible.md`、`branch-map.md`、`female-character-audition.md`

## 本地运行

```bash
npm install
npm run dev
```

静态页面构建：

```bash
npm run build:pages
```

故事结构校验：

```bash
npm run validate:story
```

## 音乐许可

三首曲目均打包于 `public/audio`，不依赖在线播放，来源与许可如下：

- `Village In The Air` — Le Mandrill — CC0
- `Mystery Exploration` — PolygonDan — CC0
- `Calm Track` — pmiller — CC0

曲目原始页面与署名也可在游戏的“阅读设置”中查看。故事版本：1.1。
