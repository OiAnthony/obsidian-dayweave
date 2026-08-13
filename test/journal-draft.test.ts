import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldDiscardNewNote } from '../src/journal-draft.ts';

test('discards a newly created note when it remains blank', () => {
	assert.equal(shouldDiscardNewNote(true, ''), true);
	assert.equal(shouldDiscardNewNote(true, ' \n\t'), true);
});

test('keeps new notes with content and existing empty notes', () => {
	assert.equal(shouldDiscardNewNote(true, 'Journal entry'), false);
	assert.equal(shouldDiscardNewNote(false, ''), false);
});
