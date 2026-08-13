# Obsidian 插件开发资源

> 核对日期：2026-08-12。优先使用官方开发文档、官方 sample plugin 和官方社区。

## Knowledge

- [Build a plugin — Obsidian Developer Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
  官方最短开发闭环：独立测试 Vault、sample plugin、`npm run dev`、启用和重载。第一课的必读来源。
- [Obsidian Sample Plugin — obsidianmd](https://github.com/obsidianmd/obsidian-sample-plugin)
  官方 TypeScript 工程模板。用于核对当前目录结构、构建脚本、manifest、lint 和 release assets。
- [Views — Obsidian Developer Documentation](https://docs.obsidian.md/Plugins/User+interface/Views)
  自定义 `ItemView`、`registerView()`、`WorkspaceLeaf` 和 `getLeavesOfType()` 的官方实现路径。
- [Events — Obsidian Developer Documentation](https://docs.obsidian.md/Plugins/Events)
  说明事件和 interval 必须随插件卸载，并使用 `registerEvent()`、`registerInterval()` 托管清理。
- [TypeScript API Reference — Obsidian Developer Documentation](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)
  API 契约入口。需要确认参数、返回值或版本支持时使用，不要求线性通读。
- [Submit your plugin — Obsidian Developer Documentation](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
  发布边界：仓库文件、SemVer、GitHub release tag，以及 `main.js`、`manifest.json`、可选 `styles.css` assets。

## Wisdom (Communities)

- [Obsidian Developers and API — Official Forum](https://forum.obsidian.md/c/developers-api/14)
  用于验证 API 使用方式、排查版本相关行为和获取开发者反馈。发问时附最小复现、Obsidian 版本和测试 Vault 条件。
- [Obsidian Members Group — Discord](https://discord.gg/obsidianmd)
  官方实时社区。适合短问题和插件开发交流；重要结论仍应回到官方文档或可复现代码核对。

## Research boundary

- 官方文档站为动态页面，本次通过 `/read` 的公开代理回退提取，原始抓取暂存于 `/tmp/obsidian-plugin-quickstart-sources/`。
- sample plugin 当前将入口放在 `src/main.ts`，构建输出仍为仓库根目录的 `main.js`。旧教程可能直接引用根目录 `main.ts`。
- 第一阶段不把社区插件实现当作 API 契约。社区代码只可作为后续模式参考。
