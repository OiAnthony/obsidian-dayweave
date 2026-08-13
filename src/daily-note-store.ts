import { TFile, Vault } from 'obsidian';
import type { DailyNoteSource } from './core-daily-notes';

export class DailyNoteStore {
	constructor(
		private readonly vault: Vault,
		private readonly source: DailyNoteSource,
	) {}

	isAvailable(): boolean {
		return this.source.isAvailable();
	}

	getPath(date: Date): string {
		return this.source.getPath(date);
	}

	getFile(date: Date): TFile | null {
		return this.source.getFile(date);
	}

	async read(date: Date): Promise<string | null> {
		const file = this.getFile(date);
		return file ? this.vault.cachedRead(file) : null;
	}

	create(date: Date): Promise<TFile> {
		return this.source.create(date);
	}

	async createRecovery(file: TFile, content: string): Promise<TFile> {
		const directory = file.path.slice(0, -(file.name.length));
		const stem = `${file.basename}.dayweave-recovery`;
		for (let suffix = 0; ; suffix += 1) {
			const filename = suffix === 0 ? `${stem}.md` : `${stem}-${suffix}.md`;
			const path = `${directory}${filename}`;
			if (!this.vault.getAbstractFileByPath(path)) {
				return this.vault.create(path, content);
			}
		}
	}
}
