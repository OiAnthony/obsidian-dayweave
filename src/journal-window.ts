import { addDays } from './date';

export const JOURNAL_WINDOW_RADIUS = 10;
export const JOURNAL_WINDOW_SHIFT = 7;
export const BOUNDARY_GESTURE_GAP_MS = 300;
export const BOUNDARY_PROMPT_DURATION_MS = 3000;

export interface BoundaryPushState {
	armedAt: number;
	lastInputAt: number;
}

export function registerBoundaryPush(
	state: BoundaryPushState | null,
	now: number,
): { state: BoundaryPushState | null; unlock: boolean } {
	if (
		state &&
		now - state.lastInputAt > BOUNDARY_GESTURE_GAP_MS &&
		now - state.armedAt <= BOUNDARY_PROMPT_DURATION_MS
	) {
		return { state: null, unlock: true };
	}
	if (!state || now - state.armedAt > BOUNDARY_PROMPT_DURATION_MS) {
		return { state: { armedAt: now, lastInputAt: now }, unlock: false };
	}
	return {
		state: { ...state, lastInputAt: now },
		unlock: false,
	};
}

export function shouldRelockFutureDates(
	unlocked: boolean,
	visitedFuture: boolean,
	visibleDate: Date,
	today: Date,
): boolean {
	return unlocked && visitedFuture && visibleDate.getTime() <= today.getTime();
}

export function getLockedAnchorDate(anchorDate: Date, today: Date): Date {
	return anchorDate.getTime() > today.getTime() ? today : anchorDate;
}

export function getCenteredScrollTop(
	elementTop: number,
	elementHeight: number,
	viewportHeight: number,
): number {
	const availableSpace = Math.max(0, viewportHeight - elementHeight);
	return Math.max(0, elementTop - availableSpace / 2);
}

export function getWindowDates(
	centerDate: Date,
	radius = JOURNAL_WINDOW_RADIUS,
	maxDate?: Date,
): Date[] {
	const effectiveCenter = maxDate && centerDate.getTime() > addDays(maxDate, -radius).getTime()
		? addDays(maxDate, -radius)
		: centerDate;
	return Array.from({ length: radius * 2 + 1 }, (_, index) =>
		addDays(effectiveCenter, radius - index),
	);
}

export function shiftWindow(
	centerDate: Date,
	direction: -1 | 1,
	shift = JOURNAL_WINDOW_SHIFT,
): { centerDate: Date; preserveDate: Date } {
	return {
		centerDate: addDays(centerDate, direction * shift),
		preserveDate: addDays(
			centerDate,
			direction * (JOURNAL_WINDOW_RADIUS - shift),
		),
	};
}
