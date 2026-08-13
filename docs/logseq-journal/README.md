# Logseq Journal 产品设计深度研究

> 研究快照：2026-08-12。主题聚焦 Logseq Journal 的默认捕获、时间索引、block 组织、引用回流、任务、模板和版本演进。

## 核心结论

Logseq Journal 用当天页面承担默认 inbox。用户无需先命名和分类，输入天然获得日期上下文；随后可通过 page reference、tag、property、task 和 query 渐进增加结构。

它同时保留两种组织方式：

- **时间流**记录内容何时发生，并支持跨日连续回顾。
- **知识图**通过 linked references 和 query 把同一 block 放回主题与任务上下文。

DB graph 延续了 Journal-first，但把 Journal 重构为带 `#Journal` tag 的 page/node。Template、task 和日期都进入 tag/property 模型，原先 file graph 的目录和日期文件名配置不再适用。

## 文档地图

| 文档 | 内容 |
|---|---|
| [article.md](./article.md) | 完整产品设计调查与可迁移启示 |
| [outline.md](./outline.md) | 文章提纲及逐节来源映射 |
| [sources.md](./sources.md) | primary sources、证据标签和研究边界 |
| [notes/01-product-model.md](./notes/01-product-model.md) | 产品对象、用户闭环与核心张力 |
| [notes/02-implementation-evolution.md](./notes/02-implementation-evolution.md) | DB/file graph 差异、日期身份和渲染实现 |
| [notes/03-product-lessons.md](./notes/03-product-lessons.md) | 可迁移设计、适用边界与评估指标 |
| [sources/](./sources/) | 保存的官方原始材料与必要节选 |

## 一句话模型

> 用今天替用户完成第一次归档，再允许结构逐步出现。

## 研究范围

本 topic 调查：

- Journal 为什么是默认入口。
- block、page、reference 和日期如何协作。
- linked references、task date 和 query 如何让内容重新出现。
- template 如何塑造每日工作流。
- DB graph 相对 file graph 改变了哪些产品契约。
- 连续 Journal view 带来哪些 UI 和工程成本。
- 哪些原则可以迁移到其他产品，哪些不应照搬。

不覆盖 Logseq 的完整 query 语法、插件开发、同步协议或通用竞品矩阵。
