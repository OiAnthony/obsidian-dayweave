import assert from 'node:assert/strict';
import test from 'node:test';
import { DailyNoteStore } from '../src/daily-note-store.ts';
import type { DailyNoteSource } from '../src/core-daily-notes.ts';

function createSource(overrides: Partial<DailyNoteSource> = {}): DailyNoteSource {
	return {
		isAvailable: () => true,
		getPath: () => '01_DailyNote/2026-08-13.md',
		getFile: () => null,
		create: async () => ({ path: '01_DailyNote/2026-08-13.md' }) as never,
		...overrides,
	};
}

test('creates recovery notes beside the conflicted daily note without overwriting', async () => {
	const existing = new Set(['01_DailyNote/2026-08-13.dayweave-recovery.md']);
	const created: Array<{ path: string; content: string }> = [];
	const vault = {
		getAbstractFileByPath: (path: string) => existing.has(path) ? { path } : null,
		create: async (path: string, content: string) => {
			created.push({ path, content });
			return { path };
		},
	} as never;
	const store = new DailyNoteStore(vault, createSource());
	const file = {
		path: '01_DailyNote/2026-08-13.md',
		name: '2026-08-13.md',
		basename: '2026-08-13',
	} as never;

	const recovery = await store.createRecovery(file, 'unsaved draft');

	assert.equal(recovery.path, '01_DailyNote/2026-08-13.dayweave-recovery-1.md');
	assert.deepEqual(created, [{
		path: '01_DailyNote/2026-08-13.dayweave-recovery-1.md',
		content: 'unsaved draft',
	}]);
});

test('delegates daily note paths and creation to the configured source', async () => {
	const source = createSource();
	const vault = { cachedRead: async () => '' } as never;
	const store = new DailyNoteStore(vault, source);

	assert.equal(store.isAvailable(), true);
	assert.equal(store.getPath(new Date(2026, 7, 13)), '01_DailyNote/2026-08-13.md');
	assert.equal((await store.create(new Date(2026, 7, 13))).path, '01_DailyNote/2026-08-13.md');
});

test('reads the exact file returned by the daily note source', async () => {
	const file = { path: '01_DailyNote/2026-08-13.md' } as never;
	const source = createSource({ getFile: () => file });
	const vault = { cachedRead: async (target: unknown) => target === file ? 'shared content' : '' } as never;
	const store = new DailyNoteStore(vault, source);

	assert.equal(await store.read(new Date(2026, 7, 13)), 'shared content');
});

test('returns null without reading when the daily note does not exist', async () => {
	let read = false;
	const vault = { cachedRead: async () => { read = true; return ''; } } as never;
	const store = new DailyNoteStore(vault, createSource());

	assert.equal(await store.read(new Date(2026, 7, 13)), null);
	assert.equal(read, false);
});
