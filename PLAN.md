# Zhlin Photography 网站完善规划（按板块）

## Summary
- 已完成对 `web` 全量扫描：`11` 个 HTML、`1` 个 CSS、`1` 个 JS，站点结构完整（about me / photography / hobby / travel / contact）。
- 现状核心问题：`About Me` 与 `Travel` 详情有占位文案；`Contact` 社媒链接和表单未接通；`Photography` 图片引用到 `web` 目录外（`../../内容/摄影`）；SEO/无障碍/性能标准不统一。
- 本计划按“先可用、再专业、再增长”执行，分为 `P0 基础完成`、`P1 体验提升`、`P2 品牌与增长` 三阶段。

## Implementation Changes（按板块）
| 板块 | P0（必须） | P1（增强） | P2（品牌化） |
|---|---|---|---|
| About Me | 将 `Your Name`、邮箱、个人简介改为真实信息；补齐研究方向+摄影方向+城市定位三段式介绍；统一中英文标点与语气。 | 增加“时间线”模块（学习/项目/展览/获奖）；增加“可合作内容”清单（人像/活动/城市纪实等）。 | 增加个人方法论与价值观短文，形成“学术+摄影”的个人品牌叙事。 |
| Photography | 将图片统一迁移至 `web/assets/photos/`（不再依赖站外相对路径）；每张图补齐标题、地点、时间、拍摄说明。 | 分类展示（Portrait/Street/Landscape/Abstract）；支持筛选与排序；Lightbox 增加键盘焦点管理与前后切换。 | 增加“系列作品页”（每个系列 1 个叙事页），形成作品集深度阅读。 |
| Hobby | 从“3 个词列表”升级为卡片化内容：阅读/电影/游戏各 3-5 条推荐；每条包含一句“为什么喜欢”。 | 增加“最近更新”与“年度清单”；与 photography/travel 建立互链（例如电影灵感对应摄影系列）。 | 加入轻量博客式条目（每月 1 篇），沉淀长期兴趣标签。 |
| Travel | 保留当前 6 城市入口，补齐每个详情页正文结构：行程概览、地点清单、照片故事、个人感受；去掉“此处为…”占位文。 | 增加城市页模板化区块（最佳季节、交通、预算、拍摄建议）；加入城市间相关推荐。 | 增加“旅行地图总览”与“按季节/主题浏览”，形成可检索旅行档案。 |
| Contact | 替换 `#` 社媒链接为真实链接；保留邮箱可见；表单接入可用提交链路并提供成功/失败提示。 | 新增合作类型下拉（拍摄合作/学术交流/其他）与反垃圾字段；增加回复时效说明。 | 增加下载媒体包（Bio + 头像 + 作品样张）与合作 FAQ。 |

## Public Interfaces / Data Contracts
- 新增内容数据层：`web/data/site-content.json`，统一存放个人信息、社媒、作品元数据、旅行条目元数据，HTML 仅负责渲染。
- 新增图片目录规范：`web/assets/photos/`、`web/assets/travel/`、`web/assets/profile/`，所有页面只引用 `web` 内资源。
- 新增联系表单接口（默认方案）：`POST /api/contact`，请求体 `{ firstName, lastName, email, message, type }`；返回 `{ ok: true }` 或 `{ ok: false, error }`。
- 统一 SEO 字段：每页必须有 `title`、`meta description`、`canonical`、`og:title/description/image`。

## Test Plan / Acceptance
- 链接与资源：所有 `href/src` 本地可达；导航无死链；图片 404 为 0。
- 内容质量：无占位文本（如 `Your Name`、`此处为...`）；中英文混排规范一致。
- 响应式：`375px / 768px / 1280px` 三断点布局正常；导航、卡片、表单无溢出。
- 无障碍：键盘可完整操作导航与 Lightbox；表单字段有可读 `label`；图片 `alt` 不为空。
- 性能：首页与 Travel 列表首屏图片懒加载；压缩后首屏资源显著下降（以 Lighthouse 移动端性能不低于 80 为验收线）。
- 表单可用性：成功提交可见反馈；异常返回可见错误信息；邮件通知或落库可追踪。

## Assumptions（默认决策）
- 主语言为中文，保留必要英文副标题与地名。
- 部署环境默认 Vercel（当前已接入 Vercel Insights）；表单接口按该环境落地。
- 视觉风格延续当前简洁基调，仅做信息密度与可读性增强，不做大改版重设计。
- 执行顺序固定：`P0（内容与可用性）→ P1（交互与结构）→ P2（品牌与增长）`。
