# 实现与演进笔记

## 稳定概念

旧官方入门文档和当前 DB 文档都把 Journal 放在默认入口。两代实现共同保留以下概念：

- 每天对应一个 Journal page。
- 输入以嵌套 block 组织。
- 日期页面可以被引用。
- 用户可按日期前后导航。
- Journal 与 linked references、任务和查询协同。

## DB graph 的变化

DB graph 把 Journal 明确定义为带 `#Journal` 的 page。Journal 因此进入统一的 node、tag 和 property 模型：

- 给 `#Journal` 增加 property，所有 Journal 都可显示该 property。
- Template 可通过 `Apply template to tags` 自动应用到 `#Journal`。
- Date property 会链接并创建对应 Journal。
- 任务使用 `Status`、`Priority`、`Deadline`、`Scheduled` property。
- Quick add、移动端 Capture 和系统 Share 都把内容发送到今天的 Journal。

File graph 中的 `:journals-directory`、`:journal/file-name-format`、`:journal/page-title-format` 和 `:default-templates` 在 DB graph 中不再使用。Markdown Mirror 又把 DB 内容投影为 `journals/YYYY_MM_DD.md`，但抓取时仍是只读 projection，两向同步尚未发布。

## 日期身份

UI 可以用用户配置的 formatter 显示 Journal 标题。实现同时把日期转为 `yyyyMMdd` 整数作为 `journal-day`。解析时接受用户 formatter、默认 `MMM do, yyyy`、`yyyy-MM-dd` 和 `yyyy_MM_dd`。

这体现了显示名称与实体身份分离。官方 changelog 还记录了两类相关修复：修改日期 formatter 不应改变 `:block/name`；导入应保留引用自定义日期格式 Journal 的 property value。

## 时间流渲染

当前 `all-journals` 从 `[:journals]` resource 取得 Journal UUID，并以虚拟列表渲染。每项内部是完整 page，包括长 block tree、embeds、today queries、scheduled/deadline sections 和 linked references。

ADR 0020 记录了双重虚拟化导致的高度震荡。最终决策让外层 Journals Virtuoso 成为唯一测量者，缓存每个 Journal 的上次高度，并让长页面渐进渲染。linked references 不得通过折叠或隐藏来规避问题。

这个实现约束反向确认了产品优先级：连续时间流与完整上下文属于核心体验，性能修复不能牺牲它们。

## 证据边界

- 官方入门文档较旧，适合说明长期产品理念，不足以单独证明 2026 年 UI 细节。
- `master` 源码是 2026-08-12 快照，可能领先稳定版。
- DB version 仍为 beta，新移动端和 RTC 仍有 alpha 边界。
- 单个 GitHub issue 只能证明具体用户和版本遇到问题，不能代表普遍需求。
