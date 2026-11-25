import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrystalMotion, advanceCrystalMotion } from '../src/components/crystalMotion.ts';

const settle = (state, duration) => {
  let motion = createCrystalMotion(45);
  for (let i = 0; i < 180; i++) motion = advanceCrystalMotion(motion, state, duration, 1 / 60);
  return motion;
};

test('idle has no light ribbons; listening and speaking have different visible motion', () => {
  const idle = settle('idle', 45), listening = settle('listening', 7.5), speaking = settle('speaking', 3.5);
  assert.equal(idle.strength, 0);
  assert.ok(listening.strength > .6 && speaking.strength > .75);
  assert.ok(listening.streamSpeed > speaking.streamSpeed);
  assert.ok(speaking.softness > listening.softness);
});

test('switching states preserves phase and eases the ribbon instead of restarting it', () => {
  const previous = settle('listening', 7.5);
  const next = advanceCrystalMotion(previous, 'speaking', 3.5, 1 / 60);
  const distance = (next.streamAngle - previous.streamAngle + 360) % 360;
  assert.ok(distance > 0 && distance < 3);
  assert.ok(next.strength > previous.strength && next.strength < .78);
  assert.ok(next.streamSpeed < previous.streamSpeed && next.streamSpeed > 72);
});

test('angle wrap and a resumed background tab keep a bounded forward step', () => {
  const previous = { ...settle('listening', 7.5), streamAngle: 359.9 };
  const next = advanceCrystalMotion(previous, 'listening', 7.5, 4);
  assert.ok(next.streamAngle >= 0 && next.streamAngle < 360);
  assert.ok((next.streamAngle - previous.streamAngle + 360) % 360 < 12);
  assert.deepEqual(advanceCrystalMotion(previous, 'idle', 45, 0), previous);
});
