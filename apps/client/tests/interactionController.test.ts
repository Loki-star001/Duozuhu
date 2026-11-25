import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteractionController, createDemoAdapter, type AnswerAdapter } from '../src/components/interaction/interactionController.ts';

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
const answer: AnswerAdapter = async function* () { yield { type: 'text', text: '第一段' }; yield { type: 'text', text: '第二段' }; };

test('快捷与文字输入共用完整回答流程；空白与超长不能提交', async () => {
  const phases: string[] = [];
  const c = createInteractionController(answer, s => phases.push(s.phase));
  assert.equal(await c.submit('  '), false);
  assert.equal(await c.submit('字'.repeat(201)), false);
  await c.submit(' 问题 ');
  assert.deepEqual(phases, ['thinking', 'answering', 'answering', 'answered']);
  assert.equal(c.getState().current?.question, '问题');
  assert.equal(c.getState().current?.answer, '第一段第二段');
  assert.equal(c.getState().current?.complete, true);
});

test('等待中拦截重复提交；停止后忽略未遵守abort的迟到返回', async () => {
  const gate = deferred();
  const c = createInteractionController(async function* () { await gate.promise; yield { type: 'text', text: '迟到内容' }; });
  const pending = c.submit('A');
  assert.equal(await c.submit('A'), false);
  c.stop(); gate.resolve(); await pending;
  assert.equal(c.getState().phase, 'interrupted');
  assert.equal(c.getState().current?.answer, '');
});

test('流式中可切换新问题，旧流不覆盖新问题', async () => {
  const gate = deferred(), started = deferred();
  const c = createInteractionController(async function* (q) {
    yield { type: 'text', text: q };
    if (q === 'A') { started.resolve(); await gate.promise; yield { type: 'text', text: '旧流' }; }
  });
  const first = c.submit('A'); await started.promise;
  await c.submit('B'); gate.resolve(); await first;
  assert.equal(c.getState().current?.answer, 'B');
  assert.equal(c.getState().history[0].answer, 'A');
});

test('重试替换失败尝试；未命中与服务错误有不同状态', async () => {
  let fail = true;
  const c = createInteractionController(async function* () { if (fail) throw new Error('服务暂不可用'); yield { type: 'text', text: '恢复成功' }; });
  await c.submit('问题'); assert.equal(c.getState().phase, 'error');
  fail = false; await c.retry();
  assert.equal(c.getState().phase, 'answered'); assert.equal(c.getState().history.length, 0);
  const missed = createInteractionController(async function* () { yield { type: 'no-answer' }; });
  await missed.submit('问题'); assert.equal(missed.getState().phase, 'no-answer');
});

test('结束和卸载都会取消在途回答；新会话没有旧记录', async () => {
  const gate = deferred(); let emissions = 0;
  const c = createInteractionController(async function* () { await gate.promise; yield { type: 'text', text: '旧答案' }; }, () => emissions++);
  const pending = c.submit('问题'); c.reset();
  assert.equal(c.getState().current, null); assert.deepEqual(c.getState().history, []);
  c.dispose(); const before = emissions; gate.resolve(); await pending;
  assert.equal(emissions, before); assert.equal(await c.submit('新问题'), false);
});

test('语音识别结果需确认，取消识别后不能回填旧文本', async () => {
  const c = createInteractionController(answer), gate = deferred();
  c.beginListening(); const pending = c.finishListening('模拟语音', () => gate.promise);
  assert.equal(c.getState().phase, 'recognizing'); c.reset(); gate.resolve(); await pending;
  assert.equal(c.getState().transcript, '');
  c.beginListening(); await c.finishListening('模拟语音', () => Promise.resolve());
  assert.equal(c.getState().phase, 'confirming'); assert.equal(c.getState().current, null);
  await c.submit(c.getState().transcript); assert.equal(c.getState().current?.question, '模拟语音');
});

test('语音不可用可切换文字；空识别不发送空问题', async () => {
  const c = createInteractionController(answer);
  assert.equal(c.beginListening(true), false); assert.match(c.getState().error, /文字输入/);
  await c.submit('文字替代'); assert.equal(c.getState().phase, 'answered');
  c.reset(); c.beginListening(); await c.finishListening('', () => Promise.resolve());
  assert.equal(c.getState().phase, 'idle'); assert.equal(c.getState().current, null);
});

test('反馈互斥可撤销；历史只保留最近六轮且快照无法修改内部状态', async () => {
  const c = createInteractionController(answer);
  for (let i = 0; i < 10; i++) await c.submit(`问题${i}`);
  assert.equal(c.getState().history.length, 6);
  c.feedback('helpful'); assert.equal(c.getState().current?.feedback, 'helpful');
  c.feedback('unhelpful'); assert.equal(c.getState().current?.feedback, 'unhelpful');
  c.feedback('unhelpful'); assert.equal(c.getState().current?.feedback, null);
  const copy = c.getState(); copy.current!.answer = '修改'; assert.notEqual(c.getState().current?.answer, '修改');
});

test('真实演示适配器的取消会及时结束等待，不产生内容', async () => {
  const c = createInteractionController(createDemoAdapter(() => 'timeout', () => '回答'));
  const pending = c.submit('问题'); c.stop(); await pending;
  assert.equal(c.getState().phase, 'interrupted'); assert.equal(c.getState().current?.answer, '');
});

test('回答中尝试不可用语音不会卡在回答中；文字仍可继续', async () => {
  const gate = deferred(), started = deferred();
  const c = createInteractionController(async function* () { yield { type: 'text', text: '部分内容' }; started.resolve(); await gate.promise; yield { type: 'text', text: '旧内容' }; });
  const pending = c.submit('A'); await started.promise;
  assert.equal(c.beginListening(true), false);
  assert.equal(c.getState().phase, 'interrupted');
  gate.resolve(); await pending;
  assert.equal(c.getState().current?.answer, '部分内容');
});
