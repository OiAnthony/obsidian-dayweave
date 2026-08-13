import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSettings } from '../src/settings-data.ts';

test('loads the supported Dayweave setting', () => {
	assert.deepEqual(parseSettings({ defaultOpenPosition: 'last-viewed' }), {
		defaultOpenPosition: 'last-viewed',
	});
	assert.deepEqual(parseSettings({ defaultOpenPosition: 'invalid' }), {
		defaultOpenPosition: 'today',
	});
});

test('drops legacy daily note location settings', () => {
	assert.deepEqual(parseSettings({
		defaultOpenPosition: 'today',
		dailyNotesFolder: 'Legacy',
		dateFormat: 'DD.MM.YYYY',
	}), {
		defaultOpenPosition: 'today',
	});
});
