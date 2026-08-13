# Dayweave 项目目标

## 产品愿景

Dayweave 为 Obsidian 提供连续的 Journal 工作流。用户可以通过一个可配置快捷键进入 Journal，在按日期排列的连续视图中快速记录、回顾和编辑 Daily Notes，而不必逐个打开文件。

产品保留 Obsidian 的 Markdown 文件、链接和本地优先模型。Dayweave 只提供新的浏览与输入入口，不创建另一套笔记格式，也不把 Vault 内容发送到外部服务。

## 核心用户价值

- 用“今天”作为默认输入上下文，减少新建、命名和归档笔记的操作。
- 在同一个视图中连续浏览多天内容，保留记录发生时的时间上下文。
- 直接编辑现有 Daily Notes，使 Journal 与 Obsidian 原生文件和链接保持一致。
- 按需加载可见日期，确保长期使用后的滚动性能和内存占用可控。

## 首个可用版本

首个可用版本必须完成以下闭环：

1. 注册稳定的 `Open Dayweave journal` 命令，用户可通过 Obsidian 为其配置快捷键。
2. 打开独立的 Journal View，并定位到今天。
3. 按日期连续展示 Daily Notes；不存在的日期应提供明确且低摩擦的创建入口。
4. 支持向过去和未来滚动，并按需加载内容，不能一次挂载全部 Daily Notes。
5. 用户可以从连续视图进入内容编辑流程，修改结果仍写入对应的 Markdown 文件。
6. 提供 Daily Notes 目录、文件名日期格式和默认打开位置等必要设置。
7. 插件卸载或 View 关闭后，不残留事件监听器、计时器或失效的 Workspace 状态。

## 成功标准

- 用户可从任意 Obsidian 页面通过快捷键进入 Journal，并在一次操作内开始记录今天的内容。
- 用户可连续浏览至少一年的 Daily Notes，滚动过程中没有明显的长时间阻塞或持续增长的 DOM 节点。
- Dayweave 创建和修改的笔记可被 Obsidian 原生 Daily Notes、文件浏览器、搜索和链接正常识别。
- 重载插件、切换 Vault 布局和重复打开 Journal 不会创建重复 View 或丢失当前日期位置。
- 插件默认离线工作，不读取 Vault 外文件，不发送遥测或笔记内容。
- `npm run lint` 和 `npm run build` 通过，核心日期解析与排序逻辑具有自动化测试。

## 非目标

首个可用版本不包含：

- 复刻 Logseq 的 block 数据模型、query、linked references 或任务系统。
- 替代 Obsidian 原生 Daily Notes 或 Periodic Notes 的全部能力。
- 云同步、多人协作、账号系统、遥测或外部 AI 服务。
- 自然语言日期解析、完整日历、周记和月记聚合。
- 富文本编辑器、移动端专属交互或主题系统。

## 产品原则

- **文件是事实来源**：现有 Markdown Daily Notes 始终是唯一持久化数据。
- **今天优先**：默认入口直接定位今天，但用户可以退出时间流并打开普通笔记。
- **渐进加载**：连续体验不能依赖一次读取和渲染整个 Journal 历史。
- **原生兼容**：优先使用 Obsidian 稳定 API、命令、View 和设置机制。
- **本地与私密**：功能默认完全离线，最小化 Vault 扫描和内存驻留。
- **范围克制**：先解决捕获和连续回顾，不在首版重建 Logseq。

## 研究资料

- [`docs/logseq-journal/`](./docs/logseq-journal/)：Logseq Journal 的产品模型、实现演进和可迁移经验。
- [`docs/obsidian-plugin-quickstart/`](./docs/obsidian-plugin-quickstart/)：Obsidian 官方插件开发路径、API 入口和快速参考。
