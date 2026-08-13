import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addDays,
	compareDates,
	formatDate,
	isValidDateFormat,
	parseDate,
} from '../src/date.ts';

test('formats dates with supported tokens', () => {
	assert.equal(formatDate(new Date(2026, 0, 9), 'YYYY-MM-DD'), '2026-01-09');
	assert.equal(formatDate(new Date(2026, 10, 2), 'DD.MM.YYYY'), '02.11.2026');
});

test('validates formats and rejects duplicate or missing tokens', () => {
	assert.equal(isValidDateFormat('YYYY-MM-DD'), true);
	assert.equal(isValidDateFormat('DD.MM.YYYY'), true);
	assert.equal(isValidDateFormat('YYYY-MM'), false);
	assert.equal(isValidDateFormat('YYYY-YYYY-MM-DD'), false);
	assert.equal(isValidDateFormat('YYYY/MM/DD'), false);
	assert.equal(isValidDateFormat('../YYYY-MM-DD'), false);
});

test('parses valid calendar dates and rejects invalid dates', () => {
	assert.deepEqual(parseDate('2024-02-29', 'YYYY-MM-DD'), new Date(2024, 1, 29));
	assert.equal(parseDate('2023-02-29', 'YYYY-MM-DD'), null);
	assert.equal(parseDate('2024-2-09', 'YYYY-MM-DD'), null);
});

test('adds and compares local calendar days across month boundaries', () => {
	const januaryLast = new Date(2026, 0, 31, 23, 45);
	const februaryFirst = addDays(januaryLast, 1);
	assert.deepEqual(februaryFirst, new Date(2026, 1, 1));
	assert.ok(compareDates(januaryLast, februaryFirst) < 0);
	assert.equal(compareDates(new Date(2026, 0, 31, 1), januaryLast), 0);
});

test('sorts daily dates chronologically', () => {
	const dates = [new Date(2026, 6, 2), new Date(2025, 11, 31), new Date(2026, 0, 1)];
	dates.sort(compareDates);
	assert.deepEqual(dates, [
		new Date(2025, 11, 31),
		new Date(2026, 0, 1),
		new Date(2026, 6, 2),
	]);
});
