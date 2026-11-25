import test from 'node:test';
import assert from 'node:assert/strict';
import { pinyinCandidates } from '../src/components/keyboardPinyin.ts';
import { deleteKeyboardSelection, keyboardSafeBox, replaceKeyboardSelection } from '../src/components/keyboardEditing.ts';

test('offline pinyin returns real words and preserves the unselected syllables', () => {
  const candidates = pinyinCandidates('nihao');
  assert.deepEqual(candidates[0], { text: '你好', consumed: 5 });
  const prefix = candidates.find(item => item.text === '你');
  assert.equal('nihao'.slice(prefix!.consumed), 'hao');
  assert.ok(pinyinCandidates('hao').some(item => item.text === '好'));
  assert.ok(pinyinCandidates('lv').some(item => item.text === '绿'));
  assert.equal(pinyinCandidates('').length, 0);
});

test('configured scene names can be entered with their pinyin without replacing user content', () => {
  const result = pinyinCandidates('zhanting', ['展厅导览', '产品中心']);
  assert.deepEqual(result[0], { text: '展厅', consumed: 8 });
  assert.ok(pinyinCandidates('chanpin').some(item => item.text === '产品'));
});

test('touch keyboard inserts at the caret, replaces selection and deletes a whole Unicode character', () => {
  assert.deepEqual(replaceKeyboardSelection('你好世界', 'ABC', 2, 4), { value: '你好ABC', cursor: 5 });
  assert.deepEqual(replaceKeyboardSelection('你好', '，', 1), { value: '你，好', cursor: 2 });
  assert.deepEqual(deleteKeyboardSelection('A😀B', 3), { value: 'AB', cursor: 1 });
  assert.deepEqual(deleteKeyboardSelection('你好', 0), { value: '你好', cursor: 0 });
  assert.deepEqual(replaceKeyboardSelection('ABCDE', '界界', 2, 3, 5), { value: 'AB界DE', cursor: 3 });
});

test('keyboard keeps the input above itself without changing saved scene geometry', () => {
  const original = { x: 12.2, y: 78, w: 75.6, h: 23.2 };
  for (const height of [1920,1080]) {
    const displayed = keyboardSafeBox(original, height, 456);
    assert.ok((displayed.y + displayed.h) * height / 100 <= height - 456 - 48 + 1e-8);
    assert.equal(displayed.x, original.x); assert.equal(displayed.w, original.w);
  }
  assert.equal(original.y, 78);
});
