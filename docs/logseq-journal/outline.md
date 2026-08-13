# Logseq Journal 产品设计调查提纲

> 每节只保留有 primary source 支撑的内容。`S1` 至 `S8` 对应 [sources.md](./sources.md)。

## 1. 结论：Journal 是默认捕获层

- Logseq 打开即进入 Journals，官方建议初学者先把所有内容写在当天。[S2]
- Journal 为输入自动附加日期上下文，block reference 和 page reference 再补充语义结构。[S2][S3]

## 2. Journal-first 解决的问题

- 降低新建页面、命名和分类的首次决策成本。[S2]
- 保留内容发生时间，并通过 linked references 形成第二个入口。[S2][S3]
- 用 Quick add、Capture 和 Share 扩展低摩擦写入。[S3]

## 3. 核心对象与交互

- Journal page、block、reference、tag/property、task、query、template。[S3]
- 今天自动创建，前后日期导航，date picker 和自然语言日期。[S3][S6]
- 当前 Journal 追加 today queries、Scheduled/Deadline 和 linked references。[S5][S6]

## 4. 从时间流到知识图

- 内容留在当天，同时通过引用进入主题上下文。[S2][S3]
- 指向未来日期可让内容在未来 Journal 的 linked references 中回流。[S2]
- Date property 与 Journal 统一，任务日期不再是孤立字段。[S3]

## 5. 模板与习惯塑造

- DB template 是 `#Template` node，可按 tag 自动应用。[S3][S4]
- 自动应用到 `#Journal` 能提供每日结构，也可能增加填写负担。[S3，后半为推断]

## 6. 数据模型和版本演进

- DB graph 中 Journal 是 `#Journal` page，日期身份与显示 formatter 分离。[S3][S6][S7]
- File graph 的目录、文件名和默认模板配置在 DB graph 中失效。[S4]
- Markdown Mirror 恢复 `journals/` 文件投影，但当时仍为只读。[S7]

## 7. 连续浏览的工程代价

- 一项 Journal 可包含完整 page、动态查询、任务区、embed 和 references。[S5]
- ADR 选择单一虚拟化测量者，保留 linked references 和连续滚动。[S5][S6]

## 8. 产品张力和限制

- Journal-first 与用户关闭该功能的需求存在冲突。[S8]
- 日期格式、导入和内部身份需跨版本保持稳定。[S4][S7]
- DB beta、移动端 alpha 和 file graph 分离使当前行为仍在变化。[S1][S4]

## 9. 对其他产品的启示

- 用有意义的默认上下文降低捕获成本。
- 同一记录同时保留时间归属和主题引用。
- 让 schema 渐进出现，避免把 inbox 变成表单。
- 将回顾机制接入写入动作。
- 提供退出路径，并用行为指标判断 Journal-first 是否适合目标用户。
