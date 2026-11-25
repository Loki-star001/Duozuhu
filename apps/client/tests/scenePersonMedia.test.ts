import test from 'node:test';
import assert from 'node:assert/strict';
import { personMediaForMachine } from '../src/components/scenePersonMedia.ts';

test('elder 2 uses its own video while elder 1 retains separate idle and speaking clips', () => {
  const elder1 = personMediaForMachine('DEV-01');
  const elder2 = personMediaForMachine('DEV-02');
  assert.notEqual(elder1.idle, elder1.speaking);
  assert.notEqual(elder2.idle, elder1.idle);
  assert.notEqual(elder2.speaking, elder1.speaking);
  assert.equal(elder2.idle, elder2.speaking);
  assert.deepEqual(personMediaForMachine('DEV-01'), elder1);
  assert.deepEqual(personMediaForMachine('DEV-03'), elder1);
  assert.ok(Object.isFrozen(elder1) && Object.isFrozen(elder2));
});
