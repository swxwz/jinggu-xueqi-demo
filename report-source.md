# 《烬骨录》快速阅读与情绪叙事改版研究底稿

受众：习惯在手机或网页上快速扫读的中文网文、视觉小说与互动小说玩家  
日期：2026-09-01  
用途：指导试玩版改稿与界面实现；不是对任何在世作者的模仿提示词。

## 范围与假设

- 决策问题：怎样在保留强制主线与多结局的前提下，降低人物记忆负担、提高扫读效率，让选择更有爽感并留下情绪余韵。
- 假设：玩家主要使用中文界面，单局目标约 18–25 分钟；五位成年关键女性角色保留，但同一场景只突出 1–3 位。
- 排除：不比较网文作者个人风格，不复制特定作者的句法、措辞或标志性段落；不加入露骨性描写。
- 来源优先级：认知与叙事一手研究、W3C 官方可读性指导、互动叙事实验论文、Creative Commons 与素材原始授权页。

## 直接结论

本次改版采用“一个情绪主轴、身份标签先于姓名、短段信息前置、选择后立即兑现、爽点后保留代价”的结构。五位角色都与“姐姐六年前失踪”这一件旧案相连，避免读者同时维护五套互不相关的背景。每个选择进入下一幕后先显示一条具体后果，随后用更长的场景发展证明关系、处境或风险确实发生了变化。

## 证据与落地

### 1. 人名不是越少越好，关键是减少同时竞争的心理表征

Gernsbacher 等人的三组实验显示，主角被再次提及时，读者对该角色的访问更快、更准确；引入新角色则会削弱旧角色的可及性。这支持“角色首次出现用姓名＋身份，后续重复稳定身份称谓；单幕限制焦点角色”的做法。[Managing Mental Representations During Narrative Comprehension](https://pmc.ncbi.nlm.nih.gov/articles/PMC4266406/)

落地：正文主要使用“剑首、丹师、知客、执律使、魔君”；界面的“本幕只需记住”条固定重复姓名与身份；前半程每条路线只深写一位核心同伴。

### 2. 扫读需要短块、信息前置与合适行宽

W3C 认知无障碍指导建议每段只承载一个主题，把段落目的放在开头，使用短句与短文本块。[Keep Text Succinct](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p05-succinct-text/) W3C 的视觉呈现说明还指出，CJK 文本每行不宜超过约 40 个字形，较窄文本块和更充分的行间、段间空间有助于读者不丢失阅读位置。[Understanding SC 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation)

落地：正文由长段改成多数 1–2 句的短段；冲突、结果或动作放在段首；正文栏宽缩至约 700px，正文改为屏幕更易扫读的无衬线字体，标题保留宋体气质。

### 3. 选择的爽感来自“可预见的差异＋看得见的后果”

Cardona-Rivera 等人让 88 名参与者体验选择式故事，发现当选项被理解为会导向不同情境内容时，参与者报告更高的能动感。论文也指出，即时确认选择的反馈可能改变玩家对后续影响的判断。[Foreseeing Meaningful Choices](https://ojs.aaai.org/index.php/AIIDE/article/view/12716)

落地：选项不再只是不同语气，而是明确对应“公开真相、留下底牌、共同担责”等不同处境；点击后，下一幕先出现一条选择后果，再由正文继续兑现；分支可以在中后段收束，但人物关系、证据来源和结局入口保持差异。

### 4. 共鸣不等于连续煽情；温暖与失落可以同时存在

一项关于长篇串流剧的横断面研究发现，角色认同与故事沉浸有关，沉浸又与“温暖和悲伤并存”的苦甜情绪及关系价值反思相关。该研究不能证明因果，但能支持把牺牲、照顾、亏欠和迟到的补偿放在同一情节中的设计判断。[Bittersweet emotion and narrative transportation](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1815433/full)

落地：姐姐的遗言不是要求主角复仇，而是“别只救我”；每位核心角色都承担一项六年前没完成的责任；胜利后仍需面对补偿、信任和权力的新代价。

### 5. 音乐用于承接情绪，不代替情节

数字互动叙事研究综述将戏剧问题、情绪内容以及用声音和音乐辅助情节列为常见构成，同时强调选择应放在具体而有意义的节点。[History education done different](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2022.942834/full)

素材选用 Tozan 的 `Asianoriental2`。OpenGameArt 原始条目将其标为 CC0，并提供 OGG 文件。[Asianoriental2](https://opengameart.org/content/asianoriental2) Creative Commons 的 CC0 说明允许复制、修改、分发和表演，包括商业用途，且无需另行申请；同时明确不提供权利状态担保。[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)

落地：音乐随项目本地分发，不依赖外链；首次点击“踏入山门”后播放，默认低音量，可随时关闭；页面仍保留自愿署名链接。

## 证据缺口矩阵

| 关键判断 | 支持证据 | 置信度 | 限制/矛盾 | 处理方式 |
| --- | --- | --- | --- | --- |
| 新角色会干扰旧角色记忆 | 角色心理表征实验 | 高 | 实验材料不是中文网文 | 采用语言无关的稳定称谓与重复提示，不宣称具体最优人数 |
| 短句短段提高快速理解 | W3C 官方认知无障碍指导 | 高 | 指导面向可访问性，不直接测“爽文” | 只用于版式和信息组织，不推导文学质量 |
| 情境差异增强选择能动感 | 88 人互动故事实验 | 中高 | 样本与游戏类型有限 | 让分支改变证据、关系与风险，不用分支数量代替差异 |
| 苦甜混合提高余韵 | 300 人横断面剧集研究 | 中 | 相关不能证明因果，且为韩剧观众 | 作为叙事设计启发，不写成确定心理定律 |
| 选定音乐可分发 | 原始素材页＋CC0 官方说明 | 高 | CC 不为具体作品权利状态担保 | 保留来源、作者与许可记录，并在页面署名 |

## 停止条件与验证

高影响判断已有一手或官方来源；音乐许可已由素材原页和 CC 官方条款交叉核验；继续搜索较难改变当前改稿决策，因此停止扩展检索。交付验证重点转为 TypeScript/ESLint、Vinext 构建、Vite 静态构建、音频是否复制到产物、GitHub Pages 相对路径是否正确。

## 来源台账

- Gernsbacher, M. A., et al. “Managing Mental Representations During Narrative Comprehension.” 2004. PMC. https://pmc.ncbi.nlm.nih.gov/articles/PMC4266406/
- W3C WAI. “Cognitive Accessibility Design Pattern: Keep Text Succinct.” 2021/2022. https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p05-succinct-text/
- W3C WAI. “Understanding Success Criterion 1.4.8: Visual Presentation.” accessed 2026-09-01. https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation
- Cardona-Rivera, R., et al. “Foreseeing Meaningful Choices.” AIIDE, 2014-10-08. https://doi.org/10.1609/aiide.v10i1.12716
- Petousi, D., et al. “History education done different.” Frontiers in Education, 2022. https://doi.org/10.3389/feduc.2022.942834
- “Bittersweet emotion and narrative transportation in streaming drama.” Frontiers in Psychology, 2026. https://doi.org/10.3389/fpsyg.2026.1815433
- Tozan. “Asianoriental2.” OpenGameArt, 2015-09-07. https://opengameart.org/content/asianoriental2
- Creative Commons. “CC0 1.0 Universal.” https://creativecommons.org/publicdomain/zero/1.0/
