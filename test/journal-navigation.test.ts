import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, toDateKey } from '../src/date.ts';
import { renderAfterFinishing, renderNavigationTarget } from '../src/journal-navigation.ts';

test('does not rerender while finishing leaves a conflicted editor active', async () => {
	const calls: string[] = [];
	const rendered = await renderAfterFinishing(
		new Date(2026, 7, 13),
		async () => { calls.push('finish'); },
		() => true,
		async () => { calls.push('render'); },
	);

	assert.equal(rendered, false);
	assert.deepEqual(calls, ['finish']);
});

test('renders only after the active editor finishes', async () => {
	const calls: string[] = [];
	let active = true;
	const rendered = await renderAfterFinishing(
		new Date(2026, 7, 13),
		async () => { calls.push('finish'); active = false; },
		() => active,
		async () => { calls.push('render'); },
	);

	assert.equal(rendered, true);
	assert.deepEqual(calls, ['finish', 'render']);
});

test('opens the requested date when rendering changes the visible anchor', async () => {
	const today = new Date(2026, 7, 13);
	let visibleAnchor = today;
	let editedDate: Date | null = null;

	await renderNavigationTarget(
		today,
		true,
		async () => {
			visibleAnchor = addDays(today, -1);
		},
		async (date) => {
			editedDate = date;
		},
	);

	assert.equal(toDateKey(visibleAnchor), '2026-08-12');
	assert.equal(editedDate && toDateKey(editedDate), '2026-08-13');
});

test('does not open an editor for navigation-only requests', async () => {
	let editCount = 0;

	await renderNavigationTarget(
		new Date(2026, 7, 13),
		false,
		async () => undefined,
		async () => {
			editCount += 1;
		},
	);

	assert.equal(editCount, 0);
});
