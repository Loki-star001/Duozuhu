import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMorphGeometries } from '../src/components/useConversationMorph.ts';

test('computeMorphGeometries calculates smooth start and end rectangles for 1080x1920 canvas', () => {
  const vBox = { x: 42, y: 73, w: 16, h: 9 };
  const dBox = { x: 12.2, y: 30.1, w: 75.6, h: 23.2 };
  const { startRect, endRect, orbSize } = computeMorphGeometries(1080, 1920, vBox, dBox, 80);

  // Center of voice: (42 + 8) * 10.8 = 540, (73 + 4.5) * 19.2 = 1488
  // Start rect should be centered at (540, 1488) with size 80x80
  assert.equal(startRect.width, 80);
  assert.equal(startRect.height, 80);
  assert.equal(startRect.borderRadius, '50%');
  assert.equal(startRect.activeCapsule, false);
  assert.equal(startRect.left + startRect.width / 2, 540);
  assert.equal(startRect.top + startRect.height / 2, 1488);

  // End rect matches the input bar (24.5% of the dialogue height).
  // Bottom: (30.1 + 23.2) * 19.2 = 1023
  assert.equal(endRect.height, 109);
  assert.equal(endRect.borderRadius, '22px');
  assert.equal(endRect.activeCapsule, true);
  assert.equal(endRect.width, 816);
  assert.equal(endRect.left, 132);
  assert.equal(endRect.top + endRect.height, 1023);
});

test('computeMorphGeometries supports custom dimensions and positions', () => {
  const vBox = { x: 80, y: 50, w: 10, h: 10 };
  const dBox = { x: 10, y: 20, w: 80, h: 30 };
  const { startRect, endRect } = computeMorphGeometries(1000, 2000, vBox, dBox, 60);

  assert.equal(startRect.width, 60);
  assert.equal(startRect.height, 60);
  assert.equal(startRect.left, 820);
  assert.equal(startRect.top, 1070);

  assert.equal(endRect.width, 800);
  assert.equal(endRect.height, 147);
  assert.equal(endRect.left, 100);
  assert.equal(endRect.top, 853);
});
