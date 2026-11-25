import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneElementCatalog, extraElementKinds, extraElementId, createSceneExtraElement, extraElementBox, restoreExtraElements, elementRows } from '../src/components/sceneElements.ts';

test('the catalog covers all 26 requested element names without duplicates', () => {
  const expected = ['背景','虚拟人','Logo','金刚区','横幅','公告','列表卡片','信息对照栏','问答','多媒体','日期时间','自定义控件','弹层','输入框','音量控制','刷新页面','文本','形状色块','纹理底纹','图标','分隔线','动态特效','数值指标','二维码','倒计时','图表'];
  assert.deepEqual(sceneElementCatalog.map(item => item.label), expected);
  assert.equal(new Set(sceneElementCatalog.map(item => item.id)).size, 26);
});

test('every additional element has valid defaults and editable geometry', () => {
  assert.equal(extraElementKinds.length, 18);
  for (const kind of extraElementKinds) {
    const element = createSceneExtraElement(kind), box = extraElementBox(kind);
    assert.equal(element.kind, kind);
    assert.equal(element.enabled, true);
    assert.ok(element.title);
    assert.ok(box.x >= 0 && box.y >= 0 && box.w > 0 && box.h > 0);
    assert.ok(box.x + box.w <= 100 && box.y + box.h <= 100);
  }
});

test('saved disabled elements and edited content are retained on restore', () => {
  const id = extraElementId('list');
  const restored = restoreExtraElements(JSON.parse(JSON.stringify({ [id]: {kind:'list',enabled:false,title:'服务列表',content:'咨询|服务台'} })));
  assert.equal(restored[id].enabled, false);
  assert.equal(restored[id].content, '咨询|服务台');
  assert.equal(restored[id].fontSize, 20);
  assert.deepEqual(restoreExtraElements(undefined), {});
  assert.deepEqual(restoreExtraElements({ 'unknown-kind': {} }), {});
});

test('list, comparison, and chart rows preserve paired values and ignore blank lines', () => {
  assert.deepEqual(elementRows(' 展区一 | 65 \n\n展区二|82\n|缺少名称'), [['展区一','65'],['展区二','82']]);
});
