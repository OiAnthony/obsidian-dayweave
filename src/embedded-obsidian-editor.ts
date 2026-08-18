import type { App, Component, Editor, TFile } from 'obsidian';
import { Compartment, EditorSelection, EditorState, Prec, StateEffect } from '@codemirror/state';
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

export interface EditorCoordinates {
	x: number;
	y: number;
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

export class EmbeddedObsidianDocument {
	private readonly readOnlyMode = new Compartment();
	private readonly editableMode = new Compartment();
	private instance: InternalEditorInstance | null = null;
	private callbacks: EmbeddedEditorCallbacks | null = null;
	private controller: InternalEditorController | null = null;
	private eventRoot: HTMLElement | null = null;
	private eventWindow: Window | null = null;
	private editingSession: Component | null = null;
	private editing = false;
	private runtimeEditorState: typeof EditorState = EditorState;
	private runtimeEditorView: typeof EditorView = EditorView;

	constructor(
		private readonly app: App,
		private readonly owner: Component,
		private readonly EditorClass: InternalEditorConstructor,
	) {}

	mount(
		parent: HTMLElement,
		file: TFile,
		value: string,
	): void {
		this.destroy();
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
		this.eventRoot = parent;
		this.eventWindow = parent.ownerDocument.defaultView;
		instance.set(value);
		const stateConstructor = instance.cm.state.constructor as typeof EditorState;
		const viewConstructor = instance.cm.constructor as typeof EditorView;
		this.runtimeEditorState = stateConstructor.readOnly ? stateConstructor : EditorState;
		this.runtimeEditorView = viewConstructor.editable ? viewConstructor : EditorView;
		instance.cm.dispatch({
			effects: StateEffect.appendConfig.of([
				this.readOnlyMode.of(Prec.highest(this.runtimeEditorState.readOnly.of(true))),
				this.editableMode.of(Prec.highest(this.runtimeEditorView.editable.of(false))),
				this.runtimeEditorView.updateListener.of((update: ViewUpdate) => {
					if (this.editing && update.docChanged) {
						this.callbacks?.onChange(update.state.doc.toString());
					}
				}),
			]),
		});
	}

	beginEditing(
		callbacks: EmbeddedEditorCallbacks,
		coordinates?: EditorCoordinates,
	): void {
		const instance = this.instance;
		const controller = this.controller;
		const eventRoot = this.eventRoot;
		const eventWindow = this.eventWindow;
		if (!instance || !controller || !eventRoot || !eventWindow) {
			throw new Error('Embedded editor is not initialized');
		}
		this.callbacks = callbacks;
		this.editing = true;
		this.configureEditingMode(false);
		const SessionComponent = this.owner.constructor as new () => Component;
		const session = this.owner.addChild(new SessionComponent());
		session.registerDomEvent(eventWindow, 'keydown', this.handleKeydown, true);
		session.registerDomEvent(eventRoot, 'focusout', this.handleFocusout, true);
		this.editingSession = session;
		this.app.workspace.activeEditor = controller;
		(this.app as PrivateApp).mobileToolbar?.update();
		const position = coordinates
			? instance.cm.posAtCoords({ x: coordinates.x, y: coordinates.y })
			: null;
		const cursor = position ?? instance.cm.state.doc.length;
		instance.cm.dispatch({ selection: EditorSelection.cursor(cursor), scrollIntoView: true });
		instance.editor.focus();
	}

	endEditing(): void {
		const instance = this.instance;
		if (!instance || !this.editing) {
			return;
		}
		if (this.editingSession) {
			this.owner.removeChild(this.editingSession);
			this.editingSession = null;
		}
		this.configureEditingMode(true);
		this.editing = false;
		this.callbacks = null;
		if (this.app.workspace.activeEditor === this.controller) {
			this.app.workspace.activeEditor = null;
			(this.app as PrivateApp).mobileToolbar?.update();
		}
	}

	getValue(): string {
		return this.instance?.editor.getValue() ?? '';
	}

	setEditingReadOnly(readOnly: boolean): void {
		if (this.editing) {
			this.configureReadOnly(readOnly);
		}
	}

	focus(): void {
		this.instance?.editor.focus();
	}

	destroy(): void {
		const instance = this.instance;
		if (!instance) {
			return;
		}
		this.endEditing();
		this.owner.removeChild(instance);
		this.instance = null;
		this.controller = null;
		this.eventRoot = null;
		this.eventWindow = null;
		this.callbacks = null;
	}

	private configureReadOnly(readOnly: boolean): void {
		const instance = this.instance;
		if (!instance) {
			return;
		}
		instance.cm.dispatch({
			effects: this.readOnlyMode.reconfigure(
				Prec.highest(this.runtimeEditorState.readOnly.of(readOnly)),
			),
		});
	}

	private configureEditingMode(readOnly: boolean): void {
		const instance = this.instance;
		if (!instance) {
			return;
		}
		instance.cm.dispatch({
			effects: [
				this.readOnlyMode.reconfigure(
					Prec.highest(this.runtimeEditorState.readOnly.of(readOnly)),
				),
				this.editableMode.reconfigure(
					Prec.highest(this.runtimeEditorView.editable.of(!readOnly)),
				),
			],
		});
	}

	private isEditorTarget(target: EventTarget | null): target is Node {
		return Boolean(
			target &&
			typeof (target as { nodeType?: unknown }).nodeType === 'number' &&
			this.instance?.cm.dom.contains(target as Node),
		);
	}

	private readonly handleKeydown = (event: KeyboardEvent): void => {
		if (
			event.key !== 'Escape' ||
			!this.isEditorTarget(event.target)
		) {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		this.callbacks?.onCommit(this.getValue());
	};

	private readonly handleFocusout = (event: FocusEvent): void => {
		const nextTarget = event.relatedTarget;
		if (this.isEditorTarget(nextTarget)) {
			return;
		}
		this.callbacks?.onCommit(this.getValue());
	};
}
