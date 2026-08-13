import { App, Component, MarkdownRenderer } from 'obsidian';

export async function renderMarkdownPreview(
	app: App,
	content: string,
	container: HTMLElement,
	sourcePath: string,
	component: Component,
): Promise<void> {
	container.addClass('markdown-rendered', 'dayweave-preview');
	if (content.trim() === '') {
		container.createDiv({
			cls: 'dayweave-preview-empty',
			text: 'Empty note',
		});
		return;
	}
	await MarkdownRenderer.render(app, content, container, sourcePath, component);
}
