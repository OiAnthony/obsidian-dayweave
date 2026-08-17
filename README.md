# Dayweave

Dayweave adds a continuous daily-note journal to Obsidian. It uses normal Markdown files as its only data source, so notes remain available to Daily Notes, search, links, and the file explorer.

## Features

- Open the journal from the `Open Dayweave journal` command or ribbon icon.
- Start writing in today's note in one action.
- Scroll continuously into past and future dates.
- Create missing daily notes without leaving the journal.
- Edit the complete file in Obsidian's own embedded Live Preview editor.
- Keep Obsidian's Markdown decorations, properties, folding, spelling, editor settings, and registered editor extensions.
- Use normal multiline editing: Enter creates a line, and Escape saves and returns to read-only Live Preview.
- Keep a bounded 21-day Live Preview window mounted while scrolling, with only one date editable at a time.
- Restore the current journal position through Obsidian workspace state.

## Daily Notes integration

Dayweave uses the folder, Moment date format, and template configured under **Settings -> Daily Notes**. Both interfaces read and edit the same Markdown files, so no content is copied or synchronized. The Daily Notes core plugin must be enabled before opening Dayweave.

Under **Settings -> Dayweave**, configure:

- **Default open position**: today or the last viewed date.

Dayweave renders each existing daily note with Obsidian's embedded Live Preview editor. Notes are read-only while browsing, so source blank lines and editor decorations stay consistent when switching modes. Click a note to edit it in place. Enter behaves as a normal newline; press **Escape** to save and return to read-only Live Preview. Only one date can be editable at a time, and the mounted journal window remains bounded to 21 days.

The embedded editor uses Obsidian's internal Markdown editor because the public plugin API does not expose a mountable Live Preview editor. Dayweave checks this integration at startup. If an Obsidian update changes the internal interface, affected notes fall back to rendered Markdown so the journal remains readable, while editing reports that Live Preview is unavailable.

Dayweave writes the complete editor value back to the same Markdown file. If another editor changes that file while Dayweave has an unsaved draft, Dayweave refuses to overwrite the external change and keeps the draft read-only while the journal remains open. Closing the journal saves that draft as a uniquely named `*.dayweave-recovery*.md` file beside the daily note.

Dayweave only reads files in the currently mounted date window. It makes no network requests and sends no telemetry.

## Development

Requires Node.js 18 or newer and npm.

```bash
npm install
npm test
npm run lint
npm run build
```

For local development, run `npm run dev`, then install `main.js`, `manifest.json`, and `styles.css` in `<vault>/.obsidian/plugins/dayweave/`.
