# 产品模型笔记

## 一句话模型

Logseq Journal 是按天自动生成的默认 outliner，用时间替用户完成第一次归档，再让引用、属性和查询逐步补充结构。

## 核心对象

| 对象 | 产品作用 | DB graph 表示 |
|---|---|---|
| Journal page | 当天的捕获容器、日期索引和回顾界面 | 带 `#Journal` 的 page/node |
| Block | 最小输入、组织和引用单位 | 可嵌套、可引用、可加 tag/property 的 node |
| Page reference | 在写作时给内容增加主题上下文 | `[[]]` node reference |
| Date reference | 把未来提醒、任务日期和当天页面连接起来 | 指向 Journal page 的 Date 值或引用 |
| Linked references | 从目标页面反向聚合上下文 | page/node 的引用视图 |
| Query | 从日流水中提取任务或主题视图 | `#Query` node 与 table/view |
| Template | 给每日页面提供重复结构 | `#Template`，可自动应用到 `#Journal` |

## 用户闭环

1. 打开 Logseq，进入 Journals view。
2. 在今天的页面直接写 block，不先决定目录或页面。
3. 在输入中加入 page reference、tag、task status 或 date property。
4. 内容继续留在当天的时间上下文中，同时出现在相关页面的 linked references 或 query 结果里。
5. 用户通过滚动 Journals、日期导航、目标页面和查询重新找到内容。
6. 高频结构可用 template 固化，移动端内容可经 Capture、Share 和 Quick add 送入今天的 Journal。

## 设计原则

- 默认提供容器，减少空白页和归档选择。
- 时间是零配置元数据，任何输入天然拥有日期上下文。
- block 是工作单位，页面不要求在捕获前创建。
- 结构可以后补，输入不因分类中断。
- 时间流和主题图同时保留，同一内容无需复制。
- 回顾不是单一入口，既可按日期浏览，也可由 linked references、task sections 和 query 回流。

## 主要张力

- 默认入口降低了捕获门槛，也可能让不需要日记的用户感到产品强迫。
- 无限时间流方便回看，但每个 Journal 都可能包含 embeds、queries、linked references 和长 block tree，滚动稳定性成本很高。
- 自定义日期标题更适合地区和个人习惯，却会影响识别、导入和迁移，因此内部需要稳定的 `journal-day`。
- 自动模板能形成习惯，也容易把低摩擦收件箱变成每日表单。
- DB graph 提升结构化能力，但减少了 file graph 的目录、文件名和直接文本操作自由。
