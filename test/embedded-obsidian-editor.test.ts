import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState, Facet, Prec, TransactionSpec } from '@codemirror/state';
import type { App, Component, TFile } from 'obsidian';
import {
	EmbeddedObsidianDocument,
	InternalEditorConstructor,
} from '../src/embedded-obsidian-editor';

class FakeContentDom {
	readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
	readonly nodeType = 1;
	private editable = 'inherit';
	focused = false;
	onDisabledWhileFocused: (() => void) | null = null;
	ownerDocument: { defaultView: FakeContentDom | null } = { defaultView: null };

	get contentEditable(): string {
		return this.editable;
	}

	set contentEditable(value: string) {
		const losesFocus = this.focused && this.editable === 'true' && value === 'false';
		this.editable = value;
		if (losesFocus) {
			this.focused = false;
			this.onDisabledWhileFocused?.();
		}
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
		const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
		listeners.add(listener);
		this.listeners.set(type, listeners);
	}

	removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
		this.listeners.get(type)?.delete(listener);
	}

	contains(target?: unknown): boolean {
		return target === this;
	}
}

class FakeCodeMirror {
	static readonly editable = Facet.define<boolean, boolean>({
		combine: (values) => values.length > 0 ? values[0]! : true,
	});
	static readonly updateListener = Facet.define<(update: never) => void>();

	readonly contentDOM: FakeContentDom;
	readonly dom = new FakeContentDom();
	state = EditorState.create({
		extensions: [
			Prec.high(EditorState.readOnly.of(false)),
			Prec.high(FakeCodeMirror.editable.of(true)),
		],
	});

	constructor(private readonly owner: FakeInternalEditor) {
		this.contentDOM = owner.contentDOM;
	}

	dispatch(spec: TransactionSpec): void {
		this.state = this.state.update(spec).state;
		this.owner.lastSelection = this.state.selection.main.head;
		this.contentDOM.contentEditable = this.state.facet(FakeCodeMirror.editable)
			? 'true'
			: 'false';
	}

	posAtCoords(): number {
		return 2;
	}
}

class FakeInternalEditor {
	readonly contentDOM = new FakeContentDom();
	focusCount = 0;
	lastSelection = 0;
	readonly cm = new FakeCodeMirror(this);
	readonly editor = {
		focus: () => {
			this.focusCount += 1;
			this.contentDOM.focused = true;
		},
		getValue: () => this.cm.state.doc.toString(),
	};

	set(value: string): void {
		this.cm.state = this.cm.state.update({
			changes: { from: 0, to: this.cm.state.doc.length, insert: value },
		}).state;
	}
}

let fakeInstance: FakeInternalEditor | null = null;

class FakeEditorClass {
	constructor() {
		fakeInstance = new FakeInternalEditor();
		return fakeInstance;
	}
}

class FakeComponent {
	private readonly cleanup: Array<() => void> = [];

	constructor(private readonly removed?: { count: number }) {}

	addChild<T>(child: T): T {
		return child;
	}

	removeChild(child: unknown): void {
		if (child instanceof FakeComponent) {
			child.unload();
			return;
		}
		if (this.removed) {
			this.removed.count += 1;
		}
	}

	registerDomEvent(
		target: FakeContentDom,
		type: string,
		listener: EventListenerOrEventListenerObject,
	): void {
		target.addEventListener(type, listener);
		this.cleanup.push(() => target.removeEventListener(type, listener));
	}

	private unload(): void {
		for (const cleanup of this.cleanup.splice(0)) {
			cleanup();
		}
	}
}

function createDocument(): {
	document: EmbeddedObsidianDocument;
	instance: FakeInternalEditor;
	app: { workspace: { activeEditor: unknown } };
	removed: { count: number };
	eventRoot: FakeContentDom;
	eventWindow: FakeContentDom;
} {
	const app = { workspace: { activeEditor: null } };
	const removed = { count: 0 };
	const owner = new FakeComponent(removed);
	const eventRoot = new FakeContentDom();
	const eventWindow = new FakeContentDom();
	eventRoot.ownerDocument.defaultView = eventWindow;
	const document = new EmbeddedObsidianDocument(
		app as unknown as App,
		owner as unknown as Component,
		FakeEditorClass as unknown as InternalEditorConstructor,
	);
	document.mount(eventRoot as unknown as HTMLElement, { path: 'daily.md' } as TFile, 'alpha');
	assert.ok(fakeInstance);
	fakeInstance.contentDOM.onDisabledWhileFocused = () => {
		invokeDomListeners(eventRoot, 'focusout', { relatedTarget: null });
	};
	return { document, instance: fakeInstance, app, removed, eventRoot, eventWindow };
}

function invokeUpdateListeners(instance: FakeInternalEditor, docChanged: boolean): void {
	for (const listener of instance.cm.state.facet(FakeCodeMirror.updateListener)) {
		listener({ docChanged, state: instance.cm.state } as never);
	}
}

function invokeDomListeners(target: FakeContentDom, type: string, event: unknown): void {
	for (const listener of target.listeners.get(type) ?? []) {
		if (typeof listener === 'function') {
			listener(event as never);
		} else {
			listener.handleEvent(event as never);
		}
	}
}

test('mounts with both CodeMirror read-only gates enabled', () => {
	const { document, instance, app } = createDocument();
	assert.equal(instance.cm.state.facet(EditorState.readOnly), true);
	assert.equal(instance.cm.state.facet(FakeCodeMirror.editable), false);
	assert.equal(instance.contentDOM.contentEditable, 'false');
	assert.equal(app.workspace.activeEditor, null);
	document.destroy();
});

test('switches one instance between read-only and editable modes', () => {
	const { document, instance, app, eventRoot, eventWindow } = createDocument();
	let changes = 0;
	document.beginEditing({
		onChange: () => {
			changes += 1;
		},
		onCommit: () => undefined,
	}, { x: 10, y: 20 });

	assert.equal(instance.cm.state.facet(EditorState.readOnly), false);
	assert.equal(instance.cm.state.facet(FakeCodeMirror.editable), true);
	assert.equal(instance.contentDOM.contentEditable, 'true');
	assert.notEqual(app.workspace.activeEditor, null);
	assert.equal(instance.lastSelection, 2);
	assert.equal(eventWindow.listeners.get('keydown')?.size, 1);
	assert.equal(eventRoot.listeners.get('focusout')?.size, 1);
	invokeUpdateListeners(instance, true);
	assert.equal(changes, 1);

	document.endEditing();
	assert.equal(instance.cm.state.facet(EditorState.readOnly), true);
	assert.equal(instance.cm.state.facet(FakeCodeMirror.editable), false);
	assert.equal(instance.contentDOM.contentEditable, 'false');
	assert.equal(app.workspace.activeEditor, null);
	assert.equal(eventWindow.listeners.get('keydown')?.size, 0);
	assert.equal(eventRoot.listeners.get('focusout')?.size, 0);
	invokeUpdateListeners(instance, true);
	assert.equal(changes, 1);
});

test('handles edit-session events without ambient DOM constructors', () => {
	const { document, instance, eventRoot, eventWindow } = createDocument();
	let commits = 0;
	document.beginEditing({
		onChange: () => undefined,
		onCommit: () => {
			commits += 1;
		},
	});

	invokeDomListeners(eventWindow, 'keydown', {
		key: 'Escape',
		target: instance.cm.dom,
		preventDefault: () => undefined,
		stopImmediatePropagation: () => undefined,
	});
	assert.equal(commits, 1);
	invokeDomListeners(eventRoot, 'focusout', { relatedTarget: instance.cm.dom });
	assert.equal(commits, 1);
	document.destroy();
});

test('locks transactions during save without ending the focused edit session', () => {
	const { document, instance, removed, eventRoot } = createDocument();
	let commits = 0;
	document.beginEditing({
		onChange: () => undefined,
		onCommit: () => {
			commits += 1;
		},
	});
	document.setEditingReadOnly(true);
	assert.equal(commits, 0);
	assert.equal(instance.cm.state.facet(EditorState.readOnly), true);
	assert.equal(instance.cm.state.facet(FakeCodeMirror.editable), true);
	assert.equal(instance.contentDOM.contentEditable, 'true');
	assert.equal(instance.contentDOM.focused, true);

	document.setEditingReadOnly(false);
	assert.equal(instance.cm.state.facet(EditorState.readOnly), false);
	assert.equal(instance.cm.state.facet(FakeCodeMirror.editable), true);
	assert.equal(instance.contentDOM.contentEditable, 'true');
	assert.equal(instance.contentDOM.focused, true);
	assert.equal(commits, 0);
	invokeDomListeners(eventRoot, 'focusout', { relatedTarget: null });
	assert.equal(commits, 1);
	document.destroy();
	document.destroy();
	assert.equal(removed.count, 1);
});
