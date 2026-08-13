import assert from 'node:assert/strict';
import test from 'node:test';
import { compareDates } from '../src/date.ts';
import {
	BOUNDARY_GESTURE_GAP_MS,
	BOUNDARY_PROMPT_DURATION_MS,
	getCenteredScrollTop,
	getLockedAnchorDate,
	getWindowDates,
	JOURNAL_WINDOW_RADIUS,
	JOURNAL_WINDOW_SHIFT,
	registerBoundaryPush,
	shouldRelockFutureDates,
	shiftWindow,
} from '../src/journal-window.ts';

test('keeps a fixed-size reverse chronological DOM window', () => {
	const center = new Date(2026, 6, 1);
	const dates = getWindowDates(center);
	assert.equal(dates.length, JOURNAL_WINDOW_RADIUS * 2 + 1);
	assert.deepEqual(dates[JOURNAL_WINDOW_RADIUS], center);
	for (let index = 1; index < dates.length; index += 1) {
		assert.ok(compareDates(dates[index - 1]!, dates[index]!) > 0);
	}
});

test('clamps a persisted future anchor to today when the view locks', () => {
	const today = new Date(2026, 7, 13);
	assert.equal(
		compareDates(getLockedAnchorDate(new Date(2026, 7, 29), today), today),
		0,
	);
	assert.equal(
		compareDates(getLockedAnchorDate(new Date(2026, 7, 1), today), new Date(2026, 7, 1)),
		0,
	);
});

test('relocks only after visiting future dates and returning to today', () => {
	const today = new Date(2026, 7, 13);
	assert.equal(
		shouldRelockFutureDates(true, true, today, today),
		true,
	);
	assert.equal(
		shouldRelockFutureDates(true, true, new Date(2026, 7, 12), today),
		true,
	);
	assert.equal(
		shouldRelockFutureDates(true, false, today, today),
		false,
	);
	assert.equal(
		shouldRelockFutureDates(true, true, new Date(2026, 7, 14), today),
		false,
	);
	assert.equal(
		shouldRelockFutureDates(false, true, today, today),
		false,
	);
});

test('caps the reverse chronological window at today', () => {
	const today = new Date(2026, 6, 10);
	const dates = getWindowDates(today, JOURNAL_WINDOW_RADIUS, today);
	assert.equal(compareDates(dates[0]!, today), 0);
	assert.equal(compareDates(dates.at(-1)!, new Date(2026, 5, 20)), 0);
	assert.equal(dates.length, JOURNAL_WINDOW_RADIUS * 2 + 1);
});

test('keeps an older window unchanged when the cap is not reached', () => {
	const center = new Date(2026, 5, 1);
	assert.deepEqual(
		getWindowDates(center, JOURNAL_WINDOW_RADIUS, new Date(2026, 6, 10)),
		getWindowDates(center),
	);
});

test('requires a second independent boundary push to unlock', () => {
	const first = registerBoundaryPush(null, 1000);
	assert.equal(first.unlock, false);
	const sameGesture = registerBoundaryPush(first.state, 1000 + BOUNDARY_GESTURE_GAP_MS);
	assert.equal(sameGesture.unlock, false);
	const secondGesture = registerBoundaryPush(
		sameGesture.state,
		1001 + BOUNDARY_GESTURE_GAP_MS * 2,
	);
	assert.equal(secondGesture.unlock, true);
});

test('continuous wheel input never unlocks the boundary', () => {
	let state = registerBoundaryPush(null, 1000).state;
	for (let now = 1100; now <= 5000; now += 100) {
		const result = registerBoundaryPush(state, now);
		assert.equal(result.unlock, false);
		state = result.state;
	}
});

test('expires an armed boundary push', () => {
	const first = registerBoundaryPush(null, 1000);
	const expired = registerBoundaryPush(
		first.state,
		1001 + BOUNDARY_PROMPT_DURATION_MS,
	);
	assert.equal(expired.unlock, false);
	assert.equal(expired.state?.armedAt, 1001 + BOUNDARY_PROMPT_DURATION_MS);
});

test('centers the target card with scrollable content above it', () => {
	assert.equal(getCenteredScrollTop(1600, 200, 800), 1300);
	assert.equal(getCenteredScrollTop(100, 200, 800), 0);
	assert.equal(getCenteredScrollTop(1600, 1000, 800), 1600);
});

test('shifts repeatedly across a year without growing the window', () => {
	let center = new Date(2026, 0, 1);
	for (let index = 0; index < Math.ceil(365 / JOURNAL_WINDOW_SHIFT); index += 1) {
		const previousDates = getWindowDates(center);
		const shifted = shiftWindow(center, 1);
		const nextDates = getWindowDates(shifted.centerDate);
		assert.equal(nextDates.length, 21);
		assert.ok(previousDates.some((date) => compareDates(date, shifted.preserveDate) === 0));
		assert.ok(nextDates.some((date) => compareDates(date, shifted.preserveDate) === 0));
		center = shifted.centerDate;
	}
	assert.ok(compareDates(center, new Date(2027, 0, 1)) >= 0);
});
