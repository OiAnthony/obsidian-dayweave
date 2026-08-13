# Dayweave

Dayweave adds a continuous daily-note journal to Obsidian. It uses normal Markdown files as its only data source, so notes remain available to Daily Notes, search, links, and the file explorer.

## Features

- Open the journal from the `Open Dayweave journal` command or ribbon icon.
- Start writing in today's note in one action.
- Scroll continuously into past and future dates.
- Create missing daily notes without leaving the journal.
- Edit the complete file in Obsidian's own embedded Live Preview editor.
- Keep Obsidian's Markdown decorations, properties, folding, spelling, editor settings, and registered editor extensions.
- Use normal multiline editing: Enter creates a line, and Escape saves and returns to the rendered viewer.
- Keep only one embedded Obsidian editor and a bounded 21-day viewer window mounted while scrolling.
- Restore the current journal position through Obsidian workspace state.

## Daily Notes integration

Dayweave uses the folder, Moment date format, and template configured under **Settings -> Daily Notes**. Both interfaces read and edit the same Markdown files, so no content is copied or synchronized. The Daily Notes core plugin must be enabled before opening Dayweave.

Under **Settings -> Dayweave**, configure:

- **Default open position**: today or the last viewed date.

Dayweave has two states for each date: a rendered viewer and an embedded Obsidian Live Preview editor for the complete Markdown file. Click anywhere in the viewer outside an interactive link or control to edit. Enter behaves as a normal newline; press **Escape** to save and return to the rendered viewer. Only one date can be in edit mode at a time.

The embedded editor uses Obsidian's internal Markdown editor because the public plugin API does not expose a mountable Live Preview editor. Dayweave checks this integration at startup. If an Obsidian update changes the internal interface, the journal remains readable and reports that editing is unavailable instead of opening a second pane or falling back to a different editor.

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
