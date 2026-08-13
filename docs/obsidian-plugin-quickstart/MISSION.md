# Mission: Obsidian 插件开发快速入门

## Why

能够基于官方 sample plugin 快速构建 Obsidian 自定义界面，不把时间消耗在完整 API 浏览和发布流程上。第一个成果是一个可打开、可复用、可正确卸载的侧边栏 View。

## Success looks like

- 能在独立测试 Vault 中构建、启用和重载本地插件。
- 能解释 `Plugin`、`ItemView` 和 `WorkspaceLeaf` 各自负责什么。
- 能注册自定义 View，并通过 ribbon icon 或 command 打开它。
- 能用 Obsidian 提供的注册方法管理 View 和事件的清理。

## Constraints

- 采用 Quick Reference 模式，只保留完成首个插件所需的知识。
- 以 Obsidian 官方开发文档和官方 sample plugin 为主要来源。
- 使用 TypeScript；第一阶段聚焦桌面端开发闭环。
- 所有实验都在独立测试 Vault 中进行。

## Out of scope

- 首次提交 Community plugins directory 的完整审核流程。
- CodeMirror 6 编辑器扩展、Markdown post processor 和 Bases 自定义 View。
- 移动端适配、付费能力、网络服务和复杂数据迁移。
