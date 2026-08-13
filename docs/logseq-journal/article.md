# Logseq Journal：把“今天”变成知识系统的默认入口

> 研究快照：2026-08-12。本文调查 Logseq DB graph 的 Journal 产品设计，并用旧版官方文档说明长期设计理念。DB version 仍处于 beta，文中会单独标出 file graph 差异。

Logseq Journal 的关键设计，可以概括成一句话：**用今天替用户完成第一次归档，再允许结构逐步出现。**

用户打开 Logseq 时，不必先创建 notebook、folder 或 page，也不用给一条尚未成形的想法命名。当天的 Journal 已经提供了一个合理容器。用户先写 block，之后再按需要加入 page reference、tag、property、task date 或 query。内容始终保留发生时间，同时进入主题和任务视图。

这套设计把捕获、组织和回顾连成一条渐进链路。它也带来明确代价：Journal 成为产品核心后，连续滚动、日期身份、自动创建、模板和退出路径都会变成基础设施问题。

## 1. Journal-first 解决什么问题

传统层级笔记在写入前就要求用户回答三个问题：这条内容属于哪里，页面叫什么，它和现有分类是什么关系。对于已经成形的文档，这些问题合理；对于会议中的一句话、临时 TODO 或刚冒出的想法，它们会中断输入。

Logseq 的旧版官方入门文档直接建议用户把所有内容写到当天的 Journals page，尤其在尚未熟悉 page 与 block linking 时。每天午夜生成新页面，日期自动说明“这条内容何时进入系统”。时间成为零配置元数据。

这个默认值有三个作用：

1. **消除空白容器决策。** 今天永远是一个可接受的临时位置。
2. **保留发生现场。** 几个月后看到某条记录时，周围 block 仍能还原当天上下文。
3. **延后分类。** 用户只在结构确实有用时添加引用、tag 或 property。

DB version 把这个入口扩展到了桌面外。`Quick add` 可以在不离开当前上下文时把内容发送到今日 Journal；新 iOS App 的 Capture tab、语音捕获和系统 Share 也汇入今天。多种输入方式共享同一个默认落点，降低了用户对“内容究竟保存到哪里”的心智负担。

## 2. 基本对象不是“日记条目”，而是 block

Journal page 是日期容器，真正承载工作的单位是 block。block 可以嵌套、折叠、引用、加 tag 和 property，也可以成为 task。用户不必把一天写成一篇完整日记，可以把会议记录、想法、链接和任务作为同级或嵌套 block 混合记录。

DB graph 进一步统一了 page 与 block，并称它们为 node。两者都可使用 `[[]]` 引用，都有 linked references，也都能设置 property。Journal 则是带 `#Journal` tag 的 page。这意味着“日期页面”没有另起一套封闭模型，它直接复用 node、tag、property 和 view 能力。

一个典型输入可以是：

```text
- 和 [[Alex]] 讨论 [[Project Atlas]] 的发布范围
  - /todo 整理回滚检查项
  - Deadline: 2026-08-15
  - 决定先关闭匿名导出
```

这组 block 同时拥有多种上下文：

- 它位于 2026-08-12 Journal，保留讨论发生时间。
- `[[Alex]]` 和 `[[Project Atlas]]` 页面能通过 linked references 找到它。
- TODO 通过 `Status` 成为 task。
- `Deadline` 作为 Date property 指向 2026-08-15 Journal。

用户没有移动或复制内容，时间流、主题图和任务视图已经共享同一个对象。

## 3. 结构在写入后逐步增加

Journal-first 并不等于永远不整理。Logseq 提供了一条由轻到重的结构阶梯：

| 层级 | 用户动作 | 得到的结构 |
|---|---|---|
| 1 | 直接写 block | 日期上下文 |
| 2 | 缩进子 block | 局部层级和上下文 |
| 3 | 加 `[[]]` reference | 主题关系与反向引用 |
| 4 | 加 tag/property | 类型和字段 |
| 5 | 转为 task | 状态、优先级、计划与截止日期 |
| 6 | 建 query/view | 跨日期聚合和操作界面 |

这条阶梯允许用户停在任意一层。一条临时想法可以只留在当天，一项项目决定可以引用项目页面，一个需要推进的动作再增加 task property。产品没有要求所有输入从第一刻就满足统一 schema。

DB graph 让结构更显式。Task 是带 `#Task` tag 的 block，并使用 `Status`、`Priority`、`Deadline` 和 `Scheduled` property。Query 也成为带 `#Query` tag 的 node，可通过 Query Builder 创建并以 table 等 view 展示。Journal 由此承担 inbox 的角色，结构化视图负责后续提取。

## 4. 时间既是导航，也是引用目标

Journal 的日期不只是标题。当前实现会把日期转换为 `yyyyMMdd` 形式的 `journal-day`，同时允许 UI 根据 formatter 显示为其他格式。解析逻辑接受用户 formatter、默认的 `MMM do, yyyy`、`yyyy-MM-dd` 和 `yyyy_MM_dd`。

显示名称与日期身份分离很重要。用户可能修改地区格式，导入旧 graph，或在 Markdown 文件名中使用下划线。若实体身份直接依赖可变标题，改 formatter 就可能制造重复页面或断开引用。官方 changelog 记录过相关修复：自定义 formatter 改变时，`:block/name` 不应跟着变化；导入也要保留指向自定义日期标题的 property value。

用户可以用多种方式创建和访问日期：

- Journals view 自动创建今天。
- `g n`、`g p` 前往下一天或前一天，并在缺失时创建页面。
- `/Date picker` 支持键盘操作和自然语言输入。
- `[[Today]]`、`[[Next Friday]]` 等引用解析为具体日期。
- Date property，例如 `Deadline`，会指向对应 Journal。

日期因此兼有三种角色：页面主键、浏览坐标和业务字段值。

## 5. 回顾机制在写入时已经启动

旧版官方文档给出一个很有代表性的用法：在今天写下对未来日期的引用，这条记录会在未来 Journal 的 linked references 中出现。用户不需要把原 block 移到未来，也不必创建第二份提醒。

DB graph 把同样思路纳入 property。任务的 `Scheduled` 或 `Deadline` 指向日期，今日 Journal 会显示相关 scheduled/deadline section。当前页面还可以包含 today queries 与 linked references。回顾并非独立的“整理阶段”，写入引用或日期 property 时，内容已经获得未来的返回路径。

这解决了个人知识系统中的常见问题：捕获很容易，重新遇见内容却很难。Logseq 同时提供四种召回方式：

- 按时间连续滚动 Journals。
- 通过日期选择器或前后日导航定位。
- 从主题 page 的 linked references 返回原 block。
- 用 query 聚合 task、tag 和 property。

这些入口使用同一批 node，不要求用户维护重复清单。

## 6. Template 提供脚手架，也可能破坏低摩擦

DB graph 中，template 是带 `#Template` tag 的 block tree。用户可以手动通过 `/Template` 插入，也可设置 `Apply template to tags`。当目标 tag 为 `#Journal` 时，每个新 Journal 会自动在顶部应用 template；多个 template 会依次执行。

适度模板可以形成稳定回顾线索，例如：

```text
- Focus
- Notes
- Decisions
- Follow-ups
```

它仍保留 outliner 的开放性，用户可忽略、删除或继续嵌套。若模板变成长表单，Journal 的优势就会反转。用户每天面对大量空字段，会先思考“怎样正确填写”，再开始记录。

因此，Journal template 更适合提供轻提示，不适合承载完整日报 schema。一个实用判断是观察模板字段的长期空置率和删除率。如果多数用户反复跳过某项，它不该默认出现。

## 7. 连续时间流的工程成本

Journals view 不是日期标题列表。当前实现为每个 Journal 渲染完整 page，其中可能包含长 block tree、embed、today query、Scheduled/Deadline section 和 linked references。用户还能在连续时间流中选择和编辑内容。

这种完整性让回顾自然，却让列表虚拟化很难稳定。Logseq 的 ADR 0020 记录了一个具体问题：外层 Journals Virtuoso 与内层 block virtualizer 同时测量同一滚动面；动态内容在卸载、重挂载后短暂报告较小高度，导致页面向上滚动时收缩和跳动。

团队最终让外层 Journals Virtuoso 成为唯一测量者，缓存每个 Journal 上次高度，并让长 Journal 渐进渲染。linked references 必须继续显示，不能靠默认折叠来绕过性能问题。

这项决策透露了产品优先级：连续时间流和完整上下文属于 Journal 体验的一部分。若一个新产品只需要“最近日期列表”，不必照搬这种实现；只有当跨日连续阅读和原地编辑确实重要时，这笔复杂度才有价值。

## 8. DB graph 改写了持久化边界

File graph 时代，Journal 对用户也是 `journals/` 目录中的 Markdown 或 Org 文件。用户可配置 journal directory、file name format 和 page title format，也能用外部工具直接操作文件。

DB graph 把 SQLite 作为数据源。旧的 `:journals-directory`、`:journal/file-name-format`、`:journal/page-title-format` 和 `:default-templates` 等配置不再生效，Org mode 也不再受支持。Template、task 和 Journal customization 转到 tag/property 模型。

2026 年 5 月的官方 changelog 引入 Markdown Mirror，为 DB graph 生成只读的 Markdown projection。示例仍把内容分为 `journals/YYYY_MM_DD.md` 与 `pages/*.md`，但当时的两向同步仍在 feature branch。这里存在一项明确取舍：DB graph 获得统一 node 模型、typed property、query 和 RTC 基础，用户对文件路径与直接文本编辑的控制则暂时减弱。

本文不把两者判成简单升级关系。Journal 的产品概念保持稳定，存储契约和可扩展方式已经改变。

## 9. Journal-first 的产品张力

### 强默认与退出路径

Logseq 把 Journal 设为启动页，并在 DB 文档中继续把自动创建写成核心行为。一条 2026 年的公开 issue 显示，至少有用户尝试在 Settings 中关闭 Journals，但 toggle 没有生效。单个 issue 不能证明普遍需求，却揭示了一个设计问题：强默认需要可靠的退出路径，否则默认值会被体验为强制流程。

### 捕获与整理债务

“先全部写进今天”能减少首次决策，却不会自动产生长期结构。若用户从不增加 reference、property 或 query，信息会积累为按日分片的流水。产品需要让后补结构足够轻，并让 linked references 和搜索即使在低整理水平下仍能工作。

### 自然语言日期与可预期性

`next Friday` 很快，但受当前日期、locale 和语言影响。日期 parser 提升输入速度的同时，必须即时展示解析结果，并允许用户用 date picker 校正。自然语言只能是快捷输入，不能成为隐藏规则。

### 自动化与仪式负担

自动 template、today queries 和任务区能让每天的页面更有用，也会让一个原本轻量的捕获界面越来越重。Logseq 的渲染 ADR 已经证明这些动态区域会累积工程成本；对用户而言，它们也会累积注意力成本。

## 10. 哪些设计值得迁移

Journal-first 适合时间语义天然重要的产品，例如工作日志、个人 CRM、研发决策记录、健康追踪和现场采集。迁移时应保留五条原则：

1. **提供有意义的默认容器。** 默认值必须对大多数输入都合理，且无需命名。
2. **让结构渐进出现。** 裸记录可以成立，reference、property 和 view 按需增加。
3. **同一对象保留时间与主题入口。** 避免通过复制实现 timeline 和 category 两套视图。
4. **把召回接到写入动作。** 日期、引用和状态一旦填写，就应自动进入未来视图。
5. **保留退出路径。** 用户应能隐藏、更换默认页或关闭自动创建。

可以用一组行为指标判断设计是否奏效：首次输入耗时、每条输入所需交互数、一周后的找回率、linked references 与 query 的召回占比、模板空置率，以及用户绕过 Journal 的比例。

Logseq Journal 最值得借鉴的部分，不是“每天建一个页面”这个表面功能。它把时间设为低成本的初始结构，又允许 block 在主题图和任务系统中逐步获得第二、第三种身份。产品先保证写得进去，再让内容有机会回来。
