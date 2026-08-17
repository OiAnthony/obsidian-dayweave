export function shouldActivateViewer(
	event: Pick<KeyboardEvent, 'currentTarget' | 'key' | 'target'>,
): boolean {
	return event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ');
}

export function shouldHandleBoundaryKey(key: string, fromEmbeddedEditor: boolean): boolean {
	return !fromEmbeddedEditor && (key === 'ArrowUp' || key === 'PageUp' || key === 'Home');
}
