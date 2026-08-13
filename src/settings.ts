import { App, PluginSettingTab, Setting } from 'obsidian';
import {
	DefaultOpenPosition,
} from './settings-data';
import type DayweavePlugin from './main';

export { DEFAULT_SETTINGS, parseSettings } from './settings-data';
export type { DayweaveSettings } from './settings-data';

export class DayweaveSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: DayweavePlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName('Daily Notes integration')
			.setDesc('Dayweave uses the folder, date format, and template from the Daily Notes core plugin.');

		new Setting(this.containerEl)
			.setName('Default open position')
			.setDesc('Choose where the journal opens when using the command.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('today', 'Today')
					.addOption('last-viewed', 'Last viewed date')
					.setValue(this.plugin.settings.defaultOpenPosition)
					.onChange(async (value) => {
						this.plugin.settings.defaultOpenPosition = value as DefaultOpenPosition;
						await this.plugin.saveSettings();
					}),
			);
	}
}
