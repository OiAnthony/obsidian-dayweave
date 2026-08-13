# Logseq Journal 研究来源

> 抓取与核对日期：2026-08-12。研究优先使用官方文档、官方仓库、源码、ADR、changelog 和 issue。正文中的产品意图与实现事实分开处理。

## 来源索引

| 编号 | 来源 | 用于确认 |
|---|---|---|
| S1 | [Logseq README](https://github.com/logseq/logseq/blob/master/README.md) | 产品定位、DB version 状态、file graph 分离、隐私与用户控制原则 |
| S2 | [Getting started with the Journals page](https://github.com/logseq/docs/blob/master/pages/Getting%20started%20with%20the%20Journals%20page.md) | Journal 作为启动页、默认捕获位置、linked references 与未来提醒 |
| S3 | [DB version documentation](https://github.com/logseq/docs/blob/master/db-version.md) | Journal tag、block/node、task、query、template、Quick add 与移动 Capture |
| S4 | [DB version changes](https://github.com/logseq/docs/blob/master/db-version-changes.md) | file graph 与 DB graph 在 template、query、task、配置和持久化上的差异 |
| S5 | [ADR 0020: Journals UI Stability](https://github.com/logseq/logseq/blob/master/docs/adr/0020-journals-ui-stability.md) | 连续 Journal 渲染、动态区块、虚拟化冲突与稳定性取舍 |
| S6 | [Journal frontend implementation](https://github.com/logseq/logseq/tree/master/src/main/frontend) | Journal resource、日期导航、自动创建、显示 formatter 与 NLP 日期 |
| S7 | [DB changelog, 2026-05-16](https://discuss.logseq.com/t/logseq-db-changelog/30013/37) | Markdown Mirror、日期格式修复、缺失 Journal 创建与 QuickCapture 演进 |
| S8 | [Turning off Journals, issue #12481](https://github.com/logseq/logseq/issues/12481) | 特定版本中用户关闭 Journal 的需求和失效设置 |

## 本地材料

完整或节选材料保存在 [`sources/`](./sources/)：

- `01-logseq-readme.md`
- `02-getting-started-journals.md`
- `03-db-version.md`
- `04-db-version-changes.md`
- `05-adr-journals-ui-stability.md`
- `06-journal-implementation.md`
- `07-db-changelog-2026-05-16.md`
- `08-journals-disable-issue.md`

消化过程保存在 [`notes/`](./notes/)；文章的来源映射见 [`outline.md`](./outline.md)。

## 证据标签

- **[O] Observed**：官方文档、源码、ADR 或 changelog 直接确认。
- **[I] Inferred**：由多个已确认行为推导出的产品设计解释，不代表 Logseq 团队原话。
- **[R] Reported**：公开 issue 中单个用户报告的行为，只证明该环境中的问题。

## 关键边界

- 旧官方入门页用于说明长期 Journal-first 理念，不用于确认当前 DB UI 细节。
- `logseq/logseq` 的 `master` 是 2026-08-12 快照，可能领先稳定版。
- 官方 README 将 DB version 标为 beta，新移动端和 RTC 标为 alpha，行为仍可能变化。
- File graph 已拆分到 `logseq/og`。旧配置不能直接套用到 DB graph。
- S8 是单个 issue，不能推断关闭 Journal 是多数用户需求。
- Markdown Mirror 在 S7 的时间点是只读 projection，两向同步仍属 upcoming。

## 未纳入正文的二手材料

搜索阶段发现了个人 workflow、迁移文章和竞品比较，但深度研究正文未用它们支持产品事实。这些材料可以描述使用偏好，不能替代官方行为、源码和设计决策。
