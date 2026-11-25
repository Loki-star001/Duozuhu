import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioBreathDriver } from './helpers/audioBreathDriver.ts';

test('AudioBreathDriver idle and thinking strictly maintain 1.0 base size', () => {
  const driver = new AudioBreathDriver();
  const loudMetrics = { amplitude: 0.95, pitch: 0.8, rawRms: 0.5 };

  assert.equal(driver.computeScale('idle', loudMetrics), 1.0);
  assert.equal(driver.computeScale('thinking', loudMetrics), 1.0);
});

test('AudioBreathDriver listening contracts inward based on amplitude and pitch', () => {
  const driver = new AudioBreathDriver();
  const quietMetrics = { amplitude: 0.1, pitch: 0.5, rawRms: 0.05 };
  const loudMetrics = { amplitude: 0.85, pitch: 0.7, rawRms: 0.4 };

  const quietScale = driver.computeScale('listening', quietMetrics);
  const loudScale = driver.computeScale('listening', loudMetrics);

  // Listening scale is strictly < 1.0 (inward shrinking)
  assert.ok(quietScale < 1.0);
  assert.ok(loudScale < 1.0);
  // Higher amplitude causes deeper inward contraction (smaller scale)
  assert.ok(loudScale < quietScale);
  assert.ok(loudScale >= 0.84);
});

test('AudioBreathDriver speaking expands outward based on amplitude and pitch', () => {
  const driver = new AudioBreathDriver();
  const quietMetrics = { amplitude: 0.1, pitch: 0.5, rawRms: 0.05 };
  const loudMetrics = { amplitude: 0.85, pitch: 0.7, rawRms: 0.4 };

  const quietScale = driver.computeScale('speaking', quietMetrics);
  const loudScale = driver.computeScale('speaking', loudMetrics);

  // Speaking scale is strictly > 1.0 (outward expansion)
  assert.ok(quietScale > 1.0);
  assert.ok(loudScale > 1.0);
  // Higher amplitude causes larger outward expansion
  assert.ok(loudScale > quietScale);
  assert.ok(loudScale <= 1.20);
});
