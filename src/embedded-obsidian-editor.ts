import { App, Component, Editor, TFile } from 'obsidian';
import { Compartment, EditorSelection, StateEffect } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';

interface PrivateMarkdownEmbed extends Component {
	editable: boolean;
	editMode: object;
	showEditor(): void;
}

interface PrivateEmbedRegistry {
	embedByExtension: {
		md(
			context: { app: App; containerEl: HTMLElement; state: Record<string, unknown> },
			file: TFile | null,
			subpath: string,
		): PrivateMarkdownEmbed;
	};
}

interface PrivateApp extends App {
	embedRegistry: PrivateEmbedRegistry;
	mobileToolbar?: { update(): void };
}

interface InternalEditorInstance extends Component {
	cm: EditorView;
	editor: Editor;
	owner: InternalEditorController;
	set(value: string): void;
}

export interface InternalEditorController {
	app: App;
	file: TFile;
	hoverPopover: null;
	path: string;
	editMode: InternalEditorInstance | null;
	editor: Editor;
	getMode(): 'source';
	showSearch(): void;
	toggleMode(): void;
	onMarkdownScroll(): void;
	scroll: number;
}

export interface InternalEditorConstructor {
	new (
		app: App,
		container: HTMLElement,
		controller: InternalEditorController,
	): InternalEditorInstance;
}

export interface EmbeddedEditorCallbacks {
	onChange(value: string): void;
	onCommit(value: string): void;
}

export function discoverInternalEditor(app: App): InternalEditorConstructor | null {
	let embed: PrivateMarkdownEmbed | null = null;
	try {
		const privateApp = app as PrivateApp;
		embed = privateApp.embedRegistry.embedByExtension.md(
			{ app, containerEl: createDiv(), state: {} },
			null,
			'',
		);
		embed.load();
		embed.editable = true;
		embed.showEditor();
		const parent = Object.getPrototypeOf(embed.editMode) as object | null;
		const grandparent = parent ? Object.getPrototypeOf(parent) as object | null : null;
		const constructor = grandparent
			? Object.getOwnPropertyDescriptor(grandparent, 'constructor')?.value as unknown
			: null;
		return typeof constructor === 'function'
			? constructor as InternalEditorConstructor
			: null;
	} catch {
		return null;
	} finally {
		embed?.unload();
	}
}

export class EmbeddedObsidianEditor {
	private readonly editable = new Compartment();
	private instance: InternalEditorInstance | null = null;
	private callbacks: EmbeddedEditorCallbacks | null = null;
	private controller: InternalEditorController | null = null;

	constructor(
		private readonly app: App,
		private readonly owner: Component,
		private readonly EditorClass: InternalEditorConstructor,
	) {}

	mount(
		parent: HTMLElement,
		file: TFile,
		value: string,
		callbacks: EmbeddedEditorCallbacks,
	): void {
		this.destroy();
		this.callbacks = callbacks;
		let instance: InternalEditorInstance | null = null;
		const controller: InternalEditorController = {
			app: this.app,
			file,
			hoverPopover: null,
			path: file.path,
			editMode: null,
			get editor() {
				if (!instance) {
					throw new Error('Embedded editor is not initialized');
				}
				return instance.editor;
			},
			getMode: () => 'source',
			showSearch: () => undefined,
			toggleMode: () => undefined,
			onMarkdownScroll: () => undefined,
			scroll: 0,
		};
		instance = this.owner.addChild(new this.EditorClass(this.app, parent, controller));
		controller.editMode = instance;
		this.controller = controller;
		this.instance = instance;
		instance.set(value);
		instance.cm.dispatch({
			effects: StateEffect.appendConfig.of([
				this.editable.of(EditorView.editable.of(true)),
				EditorView.updateListener.of((update: ViewUpdate) => {
					if (update.docChanged) {
						this.callbacks?.onChange(update.state.doc.toString());
					}
				}),
				EditorView.domEventHandlers({
					focus: () => {
						this.app.workspace.activeEditor = controller;
						(this.app as PrivateApp).mobileToolbar?.update();
						return false;
					},
				}),
			]),
		});
		instance.cm.contentDOM.addEventListener('keydown', this.handleKeydown, true);
		instance.cm.contentDOM.addEventListener('focusout', this.handleFocusout);
		const end = instance.cm.state.doc.length;
		instance.cm.dispatch({ selection: EditorSelection.cursor(end), scrollIntoView: true });
		instance.editor.focus();
	}

	getValue(): string {
		return this.instance?.editor.getValue() ?? '';
	}

	setReadOnly(readOnly: boolean): void {
		this.instance?.cm.dispatch({
			effects: this.editable.reconfigure(EditorView.editable.of(!readOnly)),
		});
	}

	focus(): void {
		this.instance?.editor.focus();
	}

	destroy(): void {
		const instance = this.instance;
		if (!instance) {
			return;
		}
		instance.cm.contentDOM.removeEventListener('keydown', this.handleKeydown, true);
		instance.cm.contentDOM.removeEventListener('focusout', this.handleFocusout);
		if (this.app.workspace.activeEditor === this.controller) {
			this.app.workspace.activeEditor = null;
			(this.app as PrivateApp).mobileToolbar?.update();
		}
		this.owner.removeChild(instance);
		this.instance = null;
		this.controller = null;
		this.callbacks = null;
	}

	private readonly handleKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		this.callbacks?.onCommit(this.getValue());
	};

	private readonly handleFocusout = (event: FocusEvent): void => {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof Node && this.instance?.cm.dom.contains(nextTarget)) {
			return;
		}
		this.callbacks?.onCommit(this.getValue());
	};
}
