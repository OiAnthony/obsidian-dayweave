export async function renderAfterFinishing(
	date: Date,
	finish: () => Promise<void>,
	hasActiveEditor: () => boolean,
	render: (date: Date) => Promise<void>,
): Promise<boolean> {
	await finish();
	if (hasActiveEditor()) {
		return false;
	}
	await render(date);
	return true;
}

export async function renderNavigationTarget(
	targetDate: Date,
	openEditor: boolean,
	render: (date: Date) => Promise<void>,
	edit: (date: Date) => Promise<void>,
): Promise<void> {
	await render(targetDate);
	if (openEditor) {
		await edit(targetDate);
	}
}
