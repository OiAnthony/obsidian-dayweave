import type moment from 'moment';

export function expandDailyNoteTemplate(
	template: string,
	date: moment.Moment,
	format: string,
	now: moment.Moment,
): string {
	const filename = date.format(format);
	return template
		.replace(/{{\s*date\s*}}/gi, filename)
		.replace(/{{\s*time\s*}}/gi, now.format('HH:mm'))
		.replace(/{{\s*title\s*}}/gi, filename)
		.replace(
			/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
			(
				_match: string,
				_kind: string,
				calculation: string | undefined,
				delta: string | undefined,
				unit: moment.unitOfTime.DurationConstructor | undefined,
				outputFormat: string | undefined,
			) => {
				const value = date.clone().set({
					hour: now.hour(),
					minute: now.minute(),
					second: now.second(),
				});
				if (calculation && delta && unit) {
					value.add(Number(delta), unit);
				}
				return value.format(outputFormat ? outputFormat.slice(1).trim() : format);
			},
		)
		.replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, 'day').format(format))
		.replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, 'day').format(format));
}
