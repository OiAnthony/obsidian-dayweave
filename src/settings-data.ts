export type DefaultOpenPosition = 'today' | 'last-viewed';

export interface DayweaveSettings {
	defaultOpenPosition: DefaultOpenPosition;
}

export const DEFAULT_SETTINGS: DayweaveSettings = {
	defaultOpenPosition: 'today',
};

export function parseSettings(data: unknown): DayweaveSettings {
	const position = (data as Partial<DayweaveSettings> | null)?.defaultOpenPosition;
	return {
		defaultOpenPosition: position === 'last-viewed' ? 'last-viewed' : 'today',
	};
}
