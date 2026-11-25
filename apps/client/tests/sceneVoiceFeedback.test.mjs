import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceFeedbackText, voiceFeedbackPosition } from '../src/components/sceneVoiceFeedback.ts';

test('idle is hidden; listening/thinking show status; speaking uses the existing answer', () => {
  assert.equal(voiceFeedbackText('idle', '回答'), '');
  assert.equal(voiceFeedbackText('listening', '旧回答'), '倾听中…');
  assert.equal(voiceFeedbackText('thinking', '旧回答'), '思考中…');
  assert.equal(voiceFeedbackText('speaking', '  当前回答  '), '当前回答');
  assert.equal(voiceFeedbackText('speaking', ''), '正在播报…');
});

test('the bubble follows its anchor and remains within the screen when the anchor moves outside it', () => {
  const first = voiceFeedbackPosition({ x: 42, y: 73, w: 16 });
  const moved = voiceFeedbackPosition({ x: 47, y: 63, w: 16 });
  assert.equal(parseFloat(moved.left) - parseFloat(first.left), 5);
  assert.equal(parseFloat(moved.bottom) - parseFloat(first.bottom), 10);
  for (const x of [-100, 0, 95, 250]) {
    const box = voiceFeedbackPosition({ x, y: -20, w: 16 });
    assert.ok(parseFloat(box.left) >= 2);
    assert.ok(parseFloat(box.left) + parseFloat(box.width) <= 98);
    assert.ok(parseFloat(box.bottom) <= 84);
  }
});
