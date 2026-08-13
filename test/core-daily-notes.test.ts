import assert from 'node:assert/strict';
import test from 'node:test';
import moment from 'moment';
import { readCoreDailyNoteSettings } from '../src/core-daily-note-settings.ts';
import { expandDailyNoteTemplate } from '../src/daily-note-template.ts';

test('reads folder, format, and template from the enabled Daily Notes core plugin', () => {
	assert.deepEqual(
		readCoreDailyNoteSettings({
			enabled: true,
			instance: {
				options: {
					folder: ' 01_DailyNote ',
					format: 'YYYY/MM/DD',
					template: ' 00_Templates/DailyNote ',
				},
			},
		}),
		{
			folder: '01_DailyNote',
			format: 'YYYY/MM/DD',
			template: '00_Templates/DailyNote',
		},
	);
});

test('uses core defaults instead of legacy Dayweave path settings', () => {
	const legacyDayweaveData = {
		dailyNotesFolder: 'Legacy',
		dateFormat: 'DD.MM.YYYY',
	};
	const settings = readCoreDailyNoteSettings({ enabled: true });

	assert.deepEqual(settings, {
		folder: '',
		format: 'YYYY-MM-DD',
		template: '',
	});
	assert.equal('dailyNotesFolder' in settings, false);
	assert.notEqual(settings.folder, legacyDayweaveData.dailyNotesFolder);
});

test('rejects access when the Daily Notes core plugin is disabled', () => {
	assert.throws(
		() => readCoreDailyNoteSettings({ enabled: false }),
		/Enable the core Daily Notes plugin/,
	);
});

test('expands Daily Notes template variables for the selected date', () => {
	const date = moment('2026-08-13T00:00:00');
	const now = moment('2026-08-13T09:45:30');
	const template = [
		'# {{title}}',
		'{{date}} {{time}}',
		'{{yesterday}} -> {{tomorrow}}',
		'{{date+7d:YYYY-MM-DD}}',
	].join('\n');

	assert.equal(
		expandDailyNoteTemplate(template, date, 'YYYY-MM-DD', now),
		'# 2026-08-13\n2026-08-13 09:45\n2026-08-12 -> 2026-08-14\n2026-08-20',
	);
});

test('expands nested date formats exactly as Daily Notes names them', () => {
	const date = moment('2026-08-13T00:00:00');
	assert.equal(
		expandDailyNoteTemplate('{{date}}', date, 'YYYY/MM/DD', moment()),
		'2026/08/13',
	);
});
