import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationIdleSeconds, defaultConversationOrbBox } from '../src/components/sceneConversation.ts';
import { createIdleSession } from '../src/components/interaction/idleSession.ts';

test('conversation returns to the orb at 20 seconds and activity restarts the deadline', () => {
  let now = 0, expanded = true, collapses = 0;
  const clock = createIdleSession(() => { expanded = false; collapses++; }, () => now, conversationIdleSeconds);
  now = 19_999; clock.tick(expanded, false); assert.equal(expanded, true);
  clock.touch();
  now = 39_998; clock.tick(expanded, false); assert.equal(expanded, true);
  now = 39_999; clock.tick(expanded, false); assert.equal(expanded, false);
  clock.tick(expanded, false); assert.equal(collapses, 1);
  expanded = true; clock.touch();
  now += 20_000; clock.tick(expanded, false); assert.equal(collapses, 2);
});

test('entry orb sits on the right and remains circular at different artboard ratios', () => {
  for (const [width, height] of [[1080,1920],[1920,1080]]) {
    const box = defaultConversationOrbBox(width, height);
    assert.ok(box.x > 75 && box.x + box.w < 100);
    assert.equal(box.w * width / 100, box.h * height / 100);
  }
});
