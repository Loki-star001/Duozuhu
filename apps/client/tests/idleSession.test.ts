import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleSession } from '../src/components/interaction/idleSession.ts';

test('50秒进入倒计时；继续使用保留输入并重新计时；60秒清除一次', () => {
  let time = 0, draft = '未发送的问题', expirations = 0;
  const clock = createIdleSession(() => { draft = ''; expirations++; }, () => time);
  time = 49_000; assert.equal(clock.tick(true, false), 11);
  time = 50_000; assert.equal(clock.tick(true, false), 10);
  time = 55_000; assert.equal(clock.tick(true, false), 5);
  assert.equal(clock.touch(), 60); assert.equal(draft, '未发送的问题');
  time = 60_000; assert.equal(clock.tick(true, false), 55); assert.equal(expirations, 0);
  time = 115_000; assert.equal(clock.tick(true, false), 0); assert.equal(draft, '');
  clock.tick(true, false); assert.equal(expirations, 1);
});

test('生成/聆听中不清屏；空会话不反复结束；新的活动可开启下一次计时', () => {
  let time = 0, expirations = 0;
  const clock = createIdleSession(() => expirations++, () => time);
  time = 120_000; assert.equal(clock.tick(true, true), 60); assert.equal(expirations, 0);
  time = 170_000; assert.equal(clock.tick(true, false), 10);
  assert.equal(clock.tick(false, false), 60); assert.equal(expirations, 0);
  time = 230_000; clock.tick(true, false); assert.equal(expirations, 1);
  clock.touch(); time = 290_000; clock.tick(true, false); assert.equal(expirations, 2);
});

test('后台计时延迟不会延长隐私留存，恢复检查时立即过期', () => {
  let time = 0, expired = false;
  const clock = createIdleSession(() => { expired = true; }, () => time);
  time = 180_000; assert.equal(clock.tick(true, false), 0); assert.equal(expired, true);
});
