export function shouldDiscardNewNote(created: boolean, content: string): boolean {
	return created && content.trim() === '';
}
