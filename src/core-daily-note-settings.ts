export interface CoreDailyNoteSettings {
	folder: string;
	format: string;
	template: string;
}

const DEFAULT_DAILY_NOTE_FORMAT = 'YYYY-MM-DD';

export interface InternalDailyNotesPlugin {
	enabled?: boolean;
	instance?: {
		options?: {
			folder?: string;
			format?: string;
			template?: string;
		};
	};
}

export function readCoreDailyNoteSettings(
	plugin: InternalDailyNotesPlugin | undefined,
): CoreDailyNoteSettings {
	if (!plugin?.enabled) {
		throw new Error('Enable the core Daily Notes plugin to use Dayweave');
	}
	const options = plugin.instance?.options;
	return {
		folder: typeof options?.folder === 'string' ? options.folder.trim() : '',
		format: typeof options?.format === 'string' && options.format
			? options.format
			: DEFAULT_DAILY_NOTE_FORMAT,
		template: typeof options?.template === 'string' ? options.template.trim() : '',
	};
}
