import { Notice, Plugin } from 'obsidian';
import { CoreDailyNoteSource } from './core-daily-notes';
import { DailyNoteStore } from './daily-note-store';
import { DAYWEAVE_VIEW_TYPE, DayweaveView } from './dayweave-view';
import { fromDateKey, startOfLocalDay, toDateKey } from './date';
import { getLockedAnchorDate } from './journal-window';
import {
	discoverInternalEditor,
	InternalEditorConstructor,
} from './embedded-obsidian-editor';
import {
	DayweaveSettings,
	DayweaveSettingTab,
	DEFAULT_SETTINGS,
	parseSettings,
} from './settings';

interface DayweaveData extends Partial<DayweaveSettings> {
	lastViewedDate?: string;
}

export default class DayweavePlugin extends Plugin {
	settings!: DayweaveSettings;
	private lastViewedDate: Date | null = null;
	private persistTimer: number | null = null;
	private store!: DailyNoteStore;
	private internalEditorClass: InternalEditorConstructor | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new DailyNoteStore(
			this.app.vault,
			new CoreDailyNoteSource(this.app),
		);
		this.internalEditorClass = discoverInternalEditor(this.app);

		this.registerView(
			DAYWEAVE_VIEW_TYPE,
			(leaf) =>
				new DayweaveView(
					leaf,
					this.store,
					this.internalEditorClass,
					(date) => {
						this.lastViewedDate = date;
						this.schedulePersistData();
					},
				),
		);

		this.addCommand({
			id: 'open-dayweave-journal',
			name: 'Open Dayweave journal',
			callback: () => void this.openJournal(),
		});

		this.addRibbonIcon('calendar-days', 'Open Dayweave journal', () => {
			void this.openJournal();
		});
		this.addSettingTab(new DayweaveSettingTab(this.app, this));
		this.register(() => {
			if (this.persistTimer !== null) {
				window.clearTimeout(this.persistTimer);
			}
			void this.persistData();
		});
	}

	async openJournal(): Promise<void> {
		if (!this.store.isAvailable()) {
			new Notice('Enable the core Daily Notes plugin to use Dayweave.');
			return;
		}
		const today = startOfLocalDay(new Date());
		const configuredDate =
			this.settings.defaultOpenPosition === 'last-viewed' && this.lastViewedDate
				? this.lastViewedDate
				: today;
		const targetDate = getLockedAnchorDate(configuredDate, today);
		let leaf = this.app.workspace.getLeavesOfType(DAYWEAVE_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeaf('tab');
			await leaf.setViewState({
				type: DAYWEAVE_VIEW_TYPE,
				active: true,
				state: { anchorDate: toDateKey(targetDate) },
			});
		}
		await this.app.workspace.revealLeaf(leaf);
		const view = leaf.view;
		if (view instanceof DayweaveView) {
			await view.goToDate(targetDate, true);
		}
	}

	async saveSettings(): Promise<void> {
		await this.persistData();
		for (const leaf of this.app.workspace.getLeavesOfType(DAYWEAVE_VIEW_TYPE)) {
			if (leaf.view instanceof DayweaveView) {
				await leaf.view.goToDate(this.lastViewedDate ?? new Date());
			}
		}
	}

	private async loadSettings(): Promise<void> {
		try {
			const data = (await this.loadData()) as DayweaveData | null;
			this.settings = parseSettings(data);
			this.lastViewedDate = data?.lastViewedDate
				? fromDateKey(data.lastViewedDate)
				: null;
		} catch (error) {
			this.settings = { ...DEFAULT_SETTINGS };
			new Notice(`Could not load Dayweave settings: ${getErrorMessage(error)}`);
		}
	}

	private schedulePersistData(): void {
		if (this.persistTimer !== null) {
			window.clearTimeout(this.persistTimer);
		}
		this.persistTimer = window.setTimeout(() => {
			this.persistTimer = null;
			void this.persistData();
		}, 500);
	}

	private async persistData(): Promise<void> {
		await this.saveData({
			...this.settings,
			lastViewedDate: this.lastViewedDate
				? toDateKey(this.lastViewedDate)
				: undefined,
		} satisfies DayweaveData);
	}
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
