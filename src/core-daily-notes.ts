import { App, moment, normalizePath, TFile, TFolder } from 'obsidian';
import {
	readCoreDailyNoteSettings,
} from './core-daily-note-settings';
import type {
	CoreDailyNoteSettings,
	InternalDailyNotesPlugin,
} from './core-daily-note-settings';
import { expandDailyNoteTemplate } from './daily-note-template';

export interface DailyNoteSource {
	isAvailable(): boolean;
	getPath(date: Date): string;
	getFile(date: Date): TFile | null;
	create(date: Date): Promise<TFile>;
}

interface AppWithInternalPlugins extends App {
	internalPlugins?: {
		getPluginById?(id: string): InternalDailyNotesPlugin | undefined;
		plugins?: Record<string, InternalDailyNotesPlugin | undefined>;
	};
	foldManager?: {
		load(file: TFile): unknown;
		save(file: TFile, foldInfo: unknown): void;
	};
}

export class CoreDailyNoteSource implements DailyNoteSource {
	constructor(private readonly app: App) {}

	isAvailable(): boolean {
		return this.getPlugin()?.enabled === true;
	}

	getPath(date: Date): string {
		const settings = this.getSettings();
		const formattedName = moment(date).format(settings.format);
		const filename = formattedName.endsWith('.md') ? formattedName : `${formattedName}.md`;
		const path = normalizePath(
			settings.folder ? `${settings.folder}/${filename}` : filename,
		);
		if (path.startsWith('/') || path.split('/').includes('..')) {
			throw new Error('The Daily Notes configuration resolves outside the vault');
		}
		return path;
	}

	getFile(date: Date): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(this.getPath(date));
		return file instanceof TFile ? file : null;
	}

	async create(date: Date): Promise<TFile> {
		const existing = this.getFile(date);
		if (existing) {
			return existing;
		}

		const settings = this.getSettings();
		const path = this.getPath(date);
		const template = await this.readTemplate(settings.template);
		await this.ensureFolder(path);
		const file = await this.app.vault.create(
			path,
			expandDailyNoteTemplate(
				template.content,
				moment(date),
				settings.format,
				moment(),
			),
		);
		if (template.foldInfo !== null) {
			(this.app as AppWithInternalPlugins).foldManager?.save(file, template.foldInfo);
		}
		return file;
	}

	private getPlugin(): InternalDailyNotesPlugin | undefined {
		const internalPlugins = (this.app as AppWithInternalPlugins).internalPlugins;
		return internalPlugins?.getPluginById?.('daily-notes')
			?? internalPlugins?.plugins?.['daily-notes'];
	}

	private getSettings(): Required<CoreDailyNoteSettings> {
		return readCoreDailyNoteSettings(this.getPlugin());
	}

	private async readTemplate(
		templatePath: string,
	): Promise<{ content: string; foldInfo: unknown }> {
		if (!templatePath) {
			return { content: '', foldInfo: null };
		}
		const file = this.app.metadataCache.getFirstLinkpathDest(templatePath, '');
		if (!(file instanceof TFile)) {
			throw new Error(`Daily Notes template not found: ${templatePath}`);
		}
		return {
			content: await this.app.vault.cachedRead(file),
			foldInfo: (this.app as AppWithInternalPlugins).foldManager?.load(file) ?? null,
		};
	}

	private async ensureFolder(filePath: string): Promise<void> {
		const parts = filePath.split('/').slice(0, -1);
		let current = '';
		for (const part of parts) {
			current = normalizePath(current ? `${current}/${part}` : part);
			const entry = this.app.vault.getAbstractFileByPath(current);
			if (entry instanceof TFolder) {
				continue;
			}
			if (entry) {
				throw new Error(`Cannot create folder because a file exists at ${current}`);
			}
			await this.app.vault.createFolder(current);
		}
	}
}
