import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldActivateViewer } from '../src/viewer-interaction';

test('activates the viewer from its own keyboard focus', () => {
	const viewer = {} as EventTarget;
	assert.equal(shouldActivateViewer({ currentTarget: viewer, key: 'Enter', target: viewer }), true);
	assert.equal(shouldActivateViewer({ currentTarget: viewer, key: ' ', target: viewer }), true);
});

test('does not intercept keyboard input from the embedded editor', () => {
	const viewer = {} as EventTarget;
	const editor = {} as EventTarget;
	assert.equal(shouldActivateViewer({ currentTarget: viewer, key: ' ', target: editor }), false);
	assert.equal(shouldActivateViewer({ currentTarget: viewer, key: 'Enter', target: editor }), false);
});
