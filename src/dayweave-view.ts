import { Notice, Component, ItemView, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import { DailyNoteStore } from './daily-note-store';
import { compareDates, fromDateKey, startOfLocalDay, toDateKey } from './date';
import {
	EmbeddedObsidianEditor,
	InternalEditorConstructor,
} from './embedded-obsidian-editor';
import {
	BoundaryPushState,
	BOUNDARY_PROMPT_DURATION_MS,
	getCenteredScrollTop,
	getLockedAnchorDate,
	getWindowDates,
	JOURNAL_WINDOW_RADIUS,
	registerBoundaryPush,
	shouldRelockFutureDates,
	shiftWindow,
} from './journal-window';
import { renderMarkdownPreview } from './markdown-preview';
import { shouldActivateViewer, shouldHandleBoundaryKey } from './viewer-interaction';
import { shouldDiscardNewNote } from './journal-draft';
import { renderAfterFinishing, renderNavigationTarget } from './journal-navigation';

export const DAYWEAVE_VIEW_TYPE = 'dayweave-journal-view';

const EDGE_THRESHOLD = 240;
const TOP_BOUNDARY_THRESHOLD = 2;
const SAVE_DELAY_MS = 400;
const DAILY_NOTES_UNAVAILABLE_MESSAGE = 'Enable the core Daily Notes plugin to use Dayweave.';

interface DayweaveViewState {
	anchorDate?: string;
}

interface ActiveFile {
	date: Date;
	file: TFile;
	baseContent: string;
	created: boolean;
	dirty: boolean;
	conflicted: boolean;
}

export class DayweaveView extends ItemView {
	private anchorDate = startOfLocalDay(new Date());
	private windowCenter = this.anchorDate;
	private scrollEl: HTMLElement | null = null;
	private boundaryPromptEl: HTMLElement | null = null;
	private boundaryPromptTimer: number | null = null;
	private boundaryPush: BoundaryPushState | null = null;
	private futureDatesUnlocked = false;
	private visitedFutureDate = false;
	private windowComponent: Component | null = null;
	private readonly cardComponents = new Map<string, Component>();
	private readonly cardRefreshVersions = new Map<string, number>();
	private readonly writingPaths = new Set<string>();
	private readonly inlineEditor: EmbeddedObsidianEditor;
	private activeFile: ActiveFile | null = null;
	private saveTimer: number | null = null;
	private savePromise: Promise<void> | null = null;
	private finishPromise: Promise<void> | null = null;
	private recoveryPromise: Promise<TFile | null> | null = null;
	private renderVersion = 0;
	private shifting = false;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly store: DailyNoteStore,
		private readonly EditorClass: InternalEditorConstructor | null,
		private readonly onAnchorChange: (date: Date) => void,
	) {
		super(leaf);
		this.inlineEditor = new EmbeddedObsidianEditor(
			this.app,
			this,
			EditorClass ?? UnavailableEditor as unknown as InternalEditorConstructor,
		);
	}

	getViewType(): string {
		return DAYWEAVE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Dayweave journal';
	}

	getIcon(): string {
		return 'calendar-days';
	}

	getState(): Record<string, unknown> {
		return { anchorDate: toDateKey(this.anchorDate) };
	}

	async setState(state: unknown): Promise<void> {
		const value = (state as DayweaveViewState | null)?.anchorDate;
		const date = value ? fromDateKey(value) : null;
		if (date) {
			const lockedDate = getLockedAnchorDate(date, startOfLocalDay(new Date()));
			this.anchorDate = lockedDate;
			this.windowCenter = lockedDate;
			this.futureDatesUnlocked = false;
			this.visitedFutureDate = false;
		}
		if (this.scrollEl) {
			await this.finishEditing();
			if (!this.activeFile) {
				await this.renderWindow(this.anchorDate);
			}
		}
	}

	async onOpen(): Promise<void> {
		this.containerEl.addClass('dayweave-view');
		this.registerEvent(this.app.vault.on('create', (file) => this.handleVaultChange(file)));
		this.registerEvent(this.app.vault.on('modify', (file) => this.handleVaultChange(file)));
		this.registerEvent(this.app.vault.on('delete', (file) => this.handleVaultChange(file)));
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => this.handleVaultRename(file, oldPath)),
		);
		if (!this.store.isAvailable()) {
			this.renderUnavailable();
			return;
		}
		await this.initializeJournal();
	}

	async onClose(): Promise<void> {
		await this.finishEditing();
		await this.preserveConflictedDraft();
		this.renderVersion += 1;
		this.clearBoundaryPrompt();
		this.unloadWindowComponent();
		this.scrollEl = null;
	}

	async goToDate(date: Date, openEditor = false): Promise<void> {
		await this.finishEditing();
		if (this.activeFile) {
			return;
		}
		if (!this.store.isAvailable()) {
			this.renderUnavailable();
			new Notice(DAILY_NOTES_UNAVAILABLE_MESSAGE);
			return;
		}
		if (!this.scrollEl) {
			await this.initializeJournal();
		}
		const targetDate = startOfLocalDay(date);
		const today = startOfLocalDay(new Date());
		this.futureDatesUnlocked = compareDates(targetDate, today) > 0;
		this.visitedFutureDate = this.futureDatesUnlocked;
		this.clearBoundaryPrompt();
		this.anchorDate = targetDate;
		this.windowCenter = targetDate;
		this.rememberAnchor();
		await renderNavigationTarget(
			targetDate,
			openEditor,
			(renderDate) => this.renderWindow(renderDate),
			(editDate) => this.editDate(editDate),
		);
	}

	private renderUnavailable(): void {
		this.renderVersion += 1;
		this.clearBoundaryPrompt();
		this.unloadWindowComponent();
		this.contentEl.empty();
		this.contentEl.createDiv({
			cls: 'dayweave-unavailable',
			text: DAILY_NOTES_UNAVAILABLE_MESSAGE,
		});
		this.boundaryPromptEl = null;
		this.scrollEl = null;
	}

	private async initializeJournal(): Promise<void> {
		this.renderShell();
		this.registerDomEvent(this.scrollEl!, 'scroll', () => this.handleScroll());
		this.registerDomEvent(this.scrollEl!, 'wheel', (event) => this.handleWheel(event));
		this.registerDomEvent(this.scrollEl!, 'keydown', (event) => this.handleScrollKey(event));
		await this.renderWindow(this.anchorDate);
	}

	private renderShell(): void {
		this.contentEl.empty();
		const toolbar = this.contentEl.createDiv({ cls: 'dayweave-toolbar' });
		const titleGroup = toolbar.createDiv({ cls: 'dayweave-title-group' });
		titleGroup.createEl('h2', { text: 'Dayweave' });
		titleGroup.createSpan({ text: 'Journal', cls: 'dayweave-toolbar-subtitle' });
		const todayButton = toolbar.createEl('button', {
			cls: 'dayweave-today-button',
			text: 'Today',
			attr: { 'aria-label': 'Go to today' },
		});
		this.registerDomEvent(todayButton, 'click', () => {
			this.futureDatesUnlocked = false;
			this.clearBoundaryPrompt();
			void this.goToDate(new Date());
		});
		const journalSurface = this.contentEl.createDiv({ cls: 'dayweave-journal-surface' });
		this.boundaryPromptEl = journalSurface.createDiv({
			cls: 'dayweave-boundary-prompt',
			attr: { 'aria-live': 'polite', 'aria-hidden': 'true', inert: '' },
		});
		this.boundaryPromptEl.createSpan({ text: "You've reached today." });
		const unlockButton = this.boundaryPromptEl.createEl('button', {
			text: 'Show future days',
		});
		this.registerDomEvent(unlockButton, 'click', () => this.unlockFutureDates());
		this.scrollEl = journalSurface.createDiv({ cls: 'dayweave-scroll' });
		this.scrollEl.setAttribute('tabindex', '0');
		this.scrollEl.setAttribute('aria-label', 'Continuous daily notes');
	}

	private async renderWindow(targetDate: Date, preserveKey?: string): Promise<void> {
		if (!this.scrollEl) {
			return;
		}
		const version = ++this.renderVersion;
		const today = startOfLocalDay(new Date());
		const maxDate = this.futureDatesUnlocked ? undefined : today;
		const dates = getWindowDates(targetDate, JOURNAL_WINDOW_RADIUS, maxDate);
		const preservedElement = preserveKey
			? this.scrollEl.querySelector<HTMLElement>(`[data-date="${preserveKey}"]`)
			: null;
		const preservedOffset = preservedElement?.offsetTop ?? 0;
		const oldScrollTop = this.scrollEl.scrollTop;
		const nextComponent = new Component();
		this.addChild(nextComponent);
		const nextCardComponents = new Map<string, Component>();
		const fragment = createFragment();
		const cards = await Promise.all(dates.map((date) => {
			const component = new Component();
			nextComponent.addChild(component);
			nextCardComponents.set(toDateKey(date), component);
			return this.createDayCard(date, component);
		}));
		if (version !== this.renderVersion || !this.scrollEl) {
			this.removeChild(nextComponent);
			return;
		}
		for (const card of cards) {
			fragment.appendChild(card);
		}
		this.unloadWindowComponent();
		this.windowComponent = nextComponent;
		for (const [key, component] of nextCardComponents) {
			this.cardComponents.set(key, component);
		}
		this.scrollEl.replaceChildren(fragment);
		this.windowCenter = dates[JOURNAL_WINDOW_RADIUS]!;
		if (preserveKey) {
			const nextElement = this.scrollEl.querySelector<HTMLElement>(`[data-date="${preserveKey}"]`);
			if (nextElement) {
				this.scrollEl.scrollTop = oldScrollTop + nextElement.offsetTop - preservedOffset;
			}
		} else {
			const targetCard = this.getCard(targetDate);
			if (targetCard) {
				this.scrollEl.scrollTop = getCenteredScrollTop(
					targetCard.offsetTop,
					targetCard.offsetHeight,
					this.scrollEl.clientHeight,
				);
			}
		}
		this.updateVisibleAnchor();
	}

	private async createDayCard(date: Date, component: Component): Promise<HTMLElement> {
		const key = toDateKey(date);
		const content = await this.store.read(date);
		const card = createDiv({ cls: 'dayweave-day', attr: { 'data-date': key } });
		if (compareDates(date, new Date()) === 0) {
			card.addClass('is-today');
		}
		if (this.activeFile && compareDates(date, this.activeFile.date) === 0) {
			card.addClass('is-editing');
		}
		const header = card.createDiv({ cls: 'dayweave-day-header' });
		const dateButton = header.createEl('button', {
			cls: 'dayweave-date-button',
			attr: { 'aria-label': `Edit daily note for ${key}` },
		});
		dateButton.createSpan({
			text: new Intl.DateTimeFormat(undefined, {
				weekday: 'long', month: 'long', day: 'numeric',
			}).format(date),
			cls: 'dayweave-date-label',
		});
		dateButton.createSpan({ text: String(date.getFullYear()), cls: 'dayweave-year' });
		dateButton.addEventListener('click', () => void this.editDate(date));

		if (content === null) {
			const empty = card.createDiv({
				cls: 'dayweave-viewer dayweave-empty',
				attr: { role: 'button', tabindex: '0', 'aria-label': `Edit note for ${key}` },
				text: 'No note for this day.',
			});
			empty.addEventListener('click', () => void this.editDate(date));
			empty.addEventListener('keydown', (event) => {
				if (shouldActivateViewer(event)) {
					event.preventDefault();
					void this.editDate(date);
				}
			});
		} else {
			const viewer = card.createDiv({
				cls: 'dayweave-viewer',
				attr: { role: 'button', tabindex: '0', 'aria-label': `Edit note for ${key}` },
			});
			await renderMarkdownPreview(this.app, content, viewer, this.store.getPath(date), component);
			viewer.addEventListener('click', (event) => {
				if (!isInteractivePreviewTarget(event.target)) {
					event.preventDefault();
					void this.editDate(date);
				}
			});
			viewer.addEventListener('keydown', (event) => {
				if (shouldActivateViewer(event)) {
					event.preventDefault();
					void this.editDate(date);
				}
			});
		}
		return card;
	}

	private async editDate(date: Date): Promise<void> {
		try {
			if (!this.EditorClass) {
				new Notice('Dayweave cannot access the Obsidian editor in this app version.');
				return;
			}
			if (this.activeFile && compareDates(date, this.activeFile.date) === 0) {
				this.inlineEditor.focus();
				return;
			}
			await this.finishEditing();
			if (this.activeFile) {
				return;
			}
			const existingFile = this.store.getFile(date);
			const file = existingFile ?? await this.store.create(date);
			await this.refreshCard(date);
			const content = (await this.store.read(date)) ?? '';
			const card = this.getCard(date);
			const viewer = card?.querySelector<HTMLElement>('.dayweave-viewer');
			if (!card || !viewer) {
				return;
			}
			this.activeFile = {
				date: startOfLocalDay(date), file, baseContent: content,
				created: existingFile === null,
				dirty: false, conflicted: false,
			};
			card.addClass('is-editing');
			viewer.empty();
			viewer.removeAttribute('role');
			viewer.removeAttribute('tabindex');
			viewer.addClass('dayweave-editor-host');
			this.inlineEditor.mount(viewer, file, content, {
				onChange: () => this.handleEditorChange(),
				onCommit: () => void this.finishEditing(),
			});
			window.requestAnimationFrame(() => {
				this.inlineEditor.focus();
				viewer.scrollIntoView({ block: 'nearest' });
			});
		} catch (error) {
			new Notice(`Could not edit daily note: ${getErrorMessage(error)}`);
		}
	}

	private handleEditorChange(): void {
		if (!this.activeFile) {
			return;
		}
		this.activeFile.dirty = true;
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
		}
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			void this.saveActiveFile().catch(() => undefined);
		}, SAVE_DELAY_MS);
	}

	private saveActiveFile(): Promise<void> {
		this.savePromise ??= this.saveActiveFileOnce().finally(() => {
			this.savePromise = null;
		});
		return this.savePromise;
	}

	private async saveActiveFileOnce(): Promise<void> {
		const active = this.activeFile;
		if (!active || !active.dirty || active.conflicted) {
			return;
		}
		const value = this.inlineEditor.getValue();
		this.inlineEditor.setReadOnly(true);
		this.writingPaths.add(active.file.path);
		try {
			const saved = await this.app.vault.process(active.file, (current) => {
				if (current !== active.baseContent) {
					throw new Error('The note changed outside Dayweave');
				}
				return value;
			});
			if (this.activeFile === active) {
				active.baseContent = saved;
				active.dirty = false;
			}
		} catch (error) {
			if (this.activeFile === active) {
				this.markConflict();
			}
			throw error;
		} finally {
			this.writingPaths.delete(active.file.path);
			if (this.activeFile === active) {
				this.inlineEditor.setReadOnly(active.conflicted);
			}
		}
	}

	private finishEditing(): Promise<void> {
		this.finishPromise ??= this.finishEditingOnce().finally(() => {
			this.finishPromise = null;
		});
		return this.finishPromise;
	}

	private async finishEditingOnce(): Promise<void> {
		const active = this.activeFile;
		if (!active) {
			return;
		}
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		if (this.inlineEditor.getValue() !== active.baseContent) {
			active.dirty = true;
		}
		if (active.conflicted) {
			this.inlineEditor.focus();
			return;
		}
		if (shouldDiscardNewNote(active.created, this.inlineEditor.getValue())) {
			this.inlineEditor.destroy();
			this.activeFile = null;
			this.writingPaths.add(active.file.path);
			try {
				await this.app.fileManager.trashFile(active.file);
			} finally {
				this.writingPaths.delete(active.file.path);
			}
			await this.refreshCard(active.date);
			return;
		}
		try {
			await this.saveActiveFile();
		} catch {
			return;
		}
		this.inlineEditor.destroy();
		this.activeFile = null;
		await this.refreshCard(active.date);
	}

	private handleWheel(event: WheelEvent): void {
		if (event.deltaY < 0 && !isEmbeddedEditorEvent(event)) {
			this.handleBoundaryPush(performance.now());
		}
	}

	private handleScrollKey(event: KeyboardEvent): void {
		if (shouldHandleBoundaryKey(event.key, isEmbeddedEditorEvent(event))) {
			this.handleBoundaryPush(performance.now());
		}
	}

	private handleBoundaryPush(now: number): void {
		if (
			this.futureDatesUnlocked ||
			!this.scrollEl ||
			this.scrollEl.scrollTop > TOP_BOUNDARY_THRESHOLD ||
			!this.isTodayAtTop()
		) {
			return;
		}
		const result = registerBoundaryPush(this.boundaryPush, now);
		this.boundaryPush = result.state;
		if (result.unlock) {
			this.unlockFutureDates();
			return;
		}
		this.showBoundaryPrompt();
	}

	private handleScroll(): void {
		this.updateVisibleAnchor();
		if (!this.scrollEl || this.shifting) {
			return;
		}
		const nearTop = this.scrollEl.scrollTop < EDGE_THRESHOLD;
		const nearBottom = this.scrollEl.scrollHeight - this.scrollEl.scrollTop - this.scrollEl.clientHeight < EDGE_THRESHOLD;
		if (nearTop && !this.futureDatesUnlocked && this.isTodayAtTop()) {
			return;
		}
		if (nearTop || nearBottom) {
			void this.shiftDateWindow(nearTop ? 1 : -1);
		}
	}

	private async shiftDateWindow(direction: -1 | 1): Promise<void> {
		if (this.shifting) {
			return;
		}
		this.shifting = true;
		try {
			await this.finishEditing();
			if (this.activeFile) {
				return;
			}
			const nextWindow = shiftWindow(this.windowCenter, direction);
			this.windowCenter = nextWindow.centerDate;
			await this.renderWindow(this.windowCenter, toDateKey(nextWindow.preserveDate));
		} finally {
			this.shifting = false;
		}
	}

	private updateVisibleAnchor(): void {
		if (!this.scrollEl) {
			return;
		}
		const center = this.scrollEl.scrollTop + this.scrollEl.clientHeight / 2;
		let closest: HTMLElement | null = null;
		let closestDistance = Number.POSITIVE_INFINITY;
		for (const card of this.getDayCards()) {
			const distance = Math.abs(card.offsetTop + card.offsetHeight / 2 - center);
			if (distance < closestDistance) {
				closest = card;
				closestDistance = distance;
			}
		}
		const date = closest?.dataset.date ? fromDateKey(closest.dataset.date) : null;
		if (!date) {
			return;
		}
		const today = startOfLocalDay(new Date());
		if (this.futureDatesUnlocked && compareDates(date, today) > 0) {
			this.visitedFutureDate = true;
		}
		if (shouldRelockFutureDates(
			this.futureDatesUnlocked,
			this.visitedFutureDate,
			date,
			today,
		)) {
			void this.relockFutureDates(date);
			return;
		}
		if (compareDates(date, this.anchorDate) !== 0) {
			this.anchorDate = date;
			this.rememberAnchor();
		}
	}

	private async relockFutureDates(date: Date): Promise<void> {
		await renderAfterFinishing(
			date,
			() => this.finishEditing(),
			() => this.activeFile !== null,
			async (renderDate) => {
				this.futureDatesUnlocked = false;
				this.visitedFutureDate = false;
				this.clearBoundaryPrompt();
				this.anchorDate = renderDate;
				this.windowCenter = renderDate;
				this.rememberAnchor();
				await this.renderWindow(renderDate);
			},
		);
	}

	private rememberAnchor(): void {
		this.onAnchorChange(this.anchorDate);
		this.app.workspace.requestSaveLayout();
	}

	private isTodayAtTop(): boolean {
		const firstDate = this.getDayCards()[0]?.dataset.date;
		return firstDate === toDateKey(new Date());
	}

	private showBoundaryPrompt(): void {
		this.boundaryPromptEl?.removeAttribute('inert');
		this.boundaryPromptEl?.setAttribute('aria-hidden', 'false');
		this.boundaryPromptEl?.addClass('is-visible');
		this.scrollEl?.addClass('is-at-today-boundary');
		if (this.boundaryPromptTimer !== null) {
			window.clearTimeout(this.boundaryPromptTimer);
		}
		this.boundaryPromptTimer = window.setTimeout(() => {
			this.clearBoundaryPrompt();
		}, BOUNDARY_PROMPT_DURATION_MS);
	}

	private clearBoundaryPrompt(): void {
		if (this.boundaryPromptTimer !== null) {
			window.clearTimeout(this.boundaryPromptTimer);
			this.boundaryPromptTimer = null;
		}
		this.boundaryPush = null;
		this.boundaryPromptEl?.setAttribute('inert', '');
		this.boundaryPromptEl?.setAttribute('aria-hidden', 'true');
		this.boundaryPromptEl?.removeClass('is-visible');
		this.scrollEl?.removeClass('is-at-today-boundary');
	}

	private unlockFutureDates(): void {
		const restoreFocus = Boolean(
			this.boundaryPromptEl?.contains(this.containerEl.ownerDocument.activeElement),
		);
		this.futureDatesUnlocked = true;
		this.visitedFutureDate = false;
		this.clearBoundaryPrompt();
		if (restoreFocus) {
			this.scrollEl?.focus({ preventScroll: true });
		}
		void this.shiftDateWindow(1);
	}

	private getCard(date: Date): HTMLElement | null {
		return this.scrollEl?.querySelector<HTMLElement>(`[data-date="${toDateKey(date)}"]`) ?? null;
	}

	private async refreshCard(date: Date): Promise<void> {
		const current = this.getCard(date);
		if (!current || !this.windowComponent) {
			return;
		}
		const key = toDateKey(date);
		const version = (this.cardRefreshVersions.get(key) ?? 0) + 1;
		this.cardRefreshVersions.set(key, version);
		const parent = this.windowComponent;
		const previous = this.cardComponents.get(key);
		const next = new Component();
		parent.addChild(next);
		const replacement = await this.createDayCard(date, next);
		if (this.cardRefreshVersions.get(key) !== version || !current.isConnected || this.windowComponent !== parent) {
			if (this.windowComponent === parent) {
				parent.removeChild(next);
			}
			return;
		}
		if (previous) {
			parent.removeChild(previous);
		}
		this.cardComponents.set(key, next);
		current.replaceWith(replacement);
	}

	private handleVaultRename(file: TAbstractFile, oldPath: string): void {
		for (const card of this.getDayCards()) {
			const date = fromDateKey(card.dataset.date ?? '');
			if (date && (this.store.getPath(date) === oldPath || this.store.getPath(date) === file.path)) {
				if (this.activeFile && compareDates(date, this.activeFile.date) === 0) {
					this.markConflict();
				} else {
					void this.refreshCard(date);
				}
				break;
			}
		}
	}

	private handleVaultChange(file: TAbstractFile): void {
		if (!(file instanceof TFile) || this.writingPaths.has(file.path)) {
			return;
		}
		for (const card of this.getDayCards()) {
			const date = fromDateKey(card.dataset.date ?? '');
			if (date && this.store.getPath(date) === file.path) {
				if (this.activeFile && compareDates(date, this.activeFile.date) === 0) {
					if (this.activeFile.dirty) {
						this.markConflict();
					} else {
						void this.reloadActiveCard(date);
					}
				} else {
					void this.refreshCard(date);
				}
				break;
			}
		}
	}

	private markConflict(): void {
		if (!this.activeFile || this.activeFile.conflicted) {
			return;
		}
		this.activeFile.conflicted = true;
		this.inlineEditor.setReadOnly(true);
		new Notice('This note changed outside the journal. Your draft is preserved while this view remains open.');
	}

	private preserveConflictedDraft(): Promise<TFile | null> {
		if (!this.activeFile?.conflicted) {
			return Promise.resolve(null);
		}
		this.recoveryPromise ??= this.createRecoveryNote().finally(() => {
			this.recoveryPromise = null;
		});
		return this.recoveryPromise;
	}

	private async createRecoveryNote(): Promise<TFile | null> {
		const active = this.activeFile;
		if (!active?.conflicted) {
			return null;
		}
		try {
			const recovery = await this.store.createRecovery(
				active.file,
				this.inlineEditor.getValue(),
			);
			new Notice(`Dayweave saved the conflicted draft to ${recovery.path}.`);
			return recovery;
		} catch (error) {
			new Notice(`Could not save the Dayweave recovery note: ${getErrorMessage(error)}`);
			return null;
		}
	}

	private async reloadActiveCard(date: Date): Promise<void> {
		this.inlineEditor.destroy();
		this.activeFile = null;
		await this.refreshCard(date);
	}

	private getDayCards(): HTMLElement[] {
		return Array.from(this.scrollEl?.querySelectorAll<HTMLElement>('.dayweave-day') ?? []);
	}

	private unloadWindowComponent(): void {
		this.inlineEditor.destroy();
		this.activeFile = null;
		this.cardComponents.clear();
		this.cardRefreshVersions.clear();
		if (this.windowComponent) {
			this.removeChild(this.windowComponent);
			this.windowComponent = null;
		}
	}
}

class UnavailableEditor {
	constructor() {
		throw new Error('Obsidian embedded editor is unavailable');
	}
}

function isInteractivePreviewTarget(target: EventTarget | null): boolean {
	return target instanceof Element && Boolean(target.closest('a, button, input, textarea, select'));
}

function isEmbeddedEditorEvent(event: Event): boolean {
	return event.target instanceof Element && Boolean(event.target.closest('.dayweave-editor-host'));
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
