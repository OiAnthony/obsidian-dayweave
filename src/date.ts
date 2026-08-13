const FORMAT_TOKENS = ['YYYY', 'MM', 'DD'] as const;

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';

export function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
	const result = startOfLocalDay(date);
	result.setDate(result.getDate() + amount);
	return result;
}

export function compareDates(left: Date, right: Date): number {
	return startOfLocalDay(left).getTime() - startOfLocalDay(right).getTime();
}

export function formatDate(date: Date, format: string): string {
	const values: Record<(typeof FORMAT_TOKENS)[number], string> = {
		YYYY: String(date.getFullYear()).padStart(4, '0'),
		MM: String(date.getMonth() + 1).padStart(2, '0'),
		DD: String(date.getDate()).padStart(2, '0'),
	};

	return FORMAT_TOKENS.reduce(
		(result, token) => result.replaceAll(token, values[token]),
		format,
	);
}

export function isValidDateFormat(format: string): boolean {
	return (
		format.length > 0 &&
		!/[\\/:*?"<>|]/.test(format) &&
		FORMAT_TOKENS.every((token) => format.split(token).length === 2)
	);
}

export function parseDate(value: string, format: string): Date | null {
	if (!isValidDateFormat(format)) {
		return null;
	}

	let pattern = escapeRegExp(format);
	pattern = pattern
		.replace('YYYY', '(?<year>\\d{4})')
		.replace('MM', '(?<month>\\d{2})')
		.replace('DD', '(?<day>\\d{2})');
	const match = new RegExp(`^${pattern}$`).exec(value);
	if (!match?.groups) {
		return null;
	}

	const year = Number(match.groups.year);
	const month = Number(match.groups.month);
	const day = Number(match.groups.day);
	const result = new Date(year, month - 1, day);
	if (
		result.getFullYear() !== year ||
		result.getMonth() !== month - 1 ||
		result.getDate() !== day
	) {
		return null;
	}
	return result;
}

export function toDateKey(date: Date): string {
	return formatDate(date, DEFAULT_DATE_FORMAT);
}

export function fromDateKey(value: string): Date | null {
	return parseDate(value, DEFAULT_DATE_FORMAT);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
