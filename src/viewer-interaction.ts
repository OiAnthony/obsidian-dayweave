export function shouldActivateViewer(
	event: Pick<KeyboardEvent, 'currentTarget' | 'key' | 'target'>,
): boolean {
	return event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ');
}
