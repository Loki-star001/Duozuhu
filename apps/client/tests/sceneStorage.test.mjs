import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readScene, writeScene, readSettingSelection, writeSettingSelection } from '../src/components/sceneStorage.ts';

// Isolated storage with delayed/failing transactions; never uses browser data.
const disk = new Map(), checkpoints = new Map();
let failRead = false, failWrite = false, fullCheckpoint = false;
globalThis.localStorage = {
  getItem: key => checkpoints.get(key) ?? null,
  setItem: (key, value) => { if (fullCheckpoint) throw new Error('quota'); checkpoints.set(key, value); }
};
const database = {
  objectStoreNames: { contains: () => true }, close() {},
  transaction(_name, mode) {
    const transaction = {
      objectStore: () => ({
        get(key) {
          const request = {};
          setTimeout(() => {
            if (failRead) { request.error = new Error('read failed'); request.onerror?.(); }
            else { request.result = structuredClone(disk.get(key)); request.onsuccess?.(); }
          }, 1);
          return request;
        },
        put(value, key) {
          assert.equal(mode, 'readwrite');
          setTimeout(() => {
            if (failWrite) { transaction.error = new Error('write failed'); transaction.onabort?.(); }
            else { disk.set(key, structuredClone(value)); transaction.oncomplete?.(); }
          }, 8);
        }
      })
    };
    return transaction;
  }
};
globalThis.indexedDB = {
  open() {
    const request = { result: database };
    setTimeout(() => request.onsuccess?.(), 1);
    return request;
  }
};
beforeEach(() => { disk.clear(); checkpoints.clear(); failRead = failWrite = fullCheckpoint = false; });

test('legacy scenes remain readable, including deliberately empty fields', async () => {
  disk.set('legacy', { screenHeight: 1080, subtitleText: '', voiceTheme: 'mist' });
  assert.deepEqual(await readScene('legacy'), { screenHeight: 1080, subtitleText: '', voiceTheme: 'mist' });
});

test('edits get a synchronous checkpoint before asynchronous saving', async () => {
  const value = { voiceTheme: 'mist', boxes: { topbar: { x: 9, y: 3, w: 80, h: 10 } } };
  const writing = writeScene('a', value);
  const checkpoint = JSON.parse(checkpoints.get('duozuhu_scene_checkpoint_v2:a'));
  assert.deepEqual(checkpoint.scene, value);
  value.boxes.topbar.x = 100;
  await writing;
  assert.equal((await readScene('a')).boxes.topbar.x, 9);
});

test('rapid edits and device switching retain the latest separate scenes', async () => {
  const writes = [writeScene('a', { revision: 1 }), writeScene('a', { revision: 2 }), writeScene('b', { revision: 9 })];
  await Promise.resolve();
  writes.push(writeScene('a', { revision: 3 }));
  await Promise.all(writes);
  assert.deepEqual(await readScene('a'), { revision: 3 });
  assert.deepEqual(await readScene('b'), { revision: 9 });
  assert.equal(disk.get('a').scene.revision, 3);
});

test('a read during a write waits for the latest uploaded media', async () => {
  const scene = { multimediaUrl: 'data:video/webm;base64,' + 'a'.repeat(600 * 1024) };
  const writing = writeScene('media', scene);
  assert.equal(checkpoints.has('duozuhu_scene_checkpoint_v2:media'), false);
  assert.deepEqual(await readScene('media'), scene);
  await writing;
});

test('a newer checkpoint wins over stale IndexedDB after interrupted saving', async () => {
  await writeScene('a', { revision: 2 });
  disk.set('a', { revision: 1 });
  assert.deepEqual(await readScene('a'), { revision: 2 });
});

test('a stored checkpoint recovers from database read/write failures', async () => {
  failWrite = true;
  await writeScene('a', { voiceTheme: 'mist' });
  failRead = true;
  assert.deepEqual(await readScene('a'), { voiceTheme: 'mist' });
  await assert.rejects(readScene('missing'), /read failed/);
});

test('failure of both stores is reported and a later save can recover', async () => {
  failWrite = fullCheckpoint = true;
  await assert.rejects(writeScene('a', { revision: 1 }), /write failed/);
  failWrite = fullCheckpoint = false;
  await writeScene('a', { revision: 2 });
  assert.deepEqual(await readScene('a'), { revision: 2 });
});

test('the last edited machine survives even if synchronous storage is unavailable', async () => {
  fullCheckpoint = true;
  await writeSettingSelection('DEV-02');
  assert.equal(await readSettingSelection(), 'DEV-02');
});

test('R01: custom box dimensions and content are preserved on restore', async () => {
  const customScene = {
    boxes: {
      input: { x: 30, y: 55, w: 50, h: 6 },
      dialogue: { x: 15, y: 25, w: 70, h: 35 }
    },
    showBanner: true,
    showMultimedia: true,
    previewQuestion: '我自定义的问题（包含西湖关键词也不会被覆盖）',
    previewAnswer: '这是针对西湖的详细回答',
    kingkongList: [
      { id: 1, label: '我的特色展区导览', prompt: '介绍特色', answer: '特色回答', enabled: true }
    ]
  };

  await writeScene('custom-machine', customScene);
  const loaded = await readScene('custom-machine');
  assert.equal(loaded.boxes.input.x, 30);
  assert.equal(loaded.boxes.dialogue.h, 35);
  assert.equal(loaded.showBanner, true);
  assert.equal(loaded.showMultimedia, true);
  assert.equal(loaded.previewQuestion, '我自定义的问题（包含西湖关键词也不会被覆盖）');
  assert.equal(loaded.kingkongList[0].label, '我的特色展区导览');
});
