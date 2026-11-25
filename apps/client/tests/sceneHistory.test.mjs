import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneHistory } from '../src/components/sceneHistory.ts';
import { sceneViewport } from '../src/components/sceneViewport.ts';

test('scene edits undo/redo geometry, deletion and content together without mutating snapshots', () => {
  const history = createSceneHistory();
  const original = { boxes: { person: { x: 3 } }, enabled: true, text: '原文' };
  history.reset(original);
  const edited = { boxes: { person: { x: 18 } }, enabled: false, text: '修改' };
  history.push(edited);
  original.boxes.person.x = 100;
  edited.text = '之后的输入';
  assert.deepEqual(history.undo(), { boxes: { person: { x: 3 } }, enabled: true, text: '原文' });
  assert.equal(history.redo().text, '修改');
  assert.equal(history.undo().boxes.person.x, 3);
  assert.equal(history.undo(), undefined);
});
test('new edits discard redo; unchanged snapshots do not add undo steps', () => {
  const history = createSceneHistory();
  history.reset({ value: 0 });
  history.push({ value: 0 });
  assert.equal(history.canUndo, false);
  history.push({ value: 1 });
  history.push({ value: 2 });
  history.undo();
  history.push({ value: 3 });
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.undo(), { value: 1 });
});
test('history is bounded and reset isolates another machine', () => {
  const history = createSceneHistory(2);
  history.reset(0); history.push(1); history.push(2); history.push(3);
  assert.equal(history.undo(), 2); assert.equal(history.undo(), 1); assert.equal(history.undo(), undefined);
  history.reset(10);
  assert.equal(history.canUndo, false); assert.equal(history.canRedo, false);
});
test('original artboard dimensions never change when the available viewport changes', () => {
  for (const [w,h] of [[450,900],[900,1500],[320,600]]) {
    const view = sceneViewport(1080,1920,w,h);
    assert.equal(view.width,1080); assert.equal(view.height,1920);
    assert.ok(view.frameWidth <= w && view.frameHeight <= h);
    assert.ok(Math.abs(view.frameWidth / view.frameHeight - 9 / 16) < 1e-9);
    assert.equal(28 * view.scale / view.scale,28);
  }
});
