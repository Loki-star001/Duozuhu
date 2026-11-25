interface SceneRecord { format: 'scene-v2'; savedAt: number; scene: any }
const checkpointPrefix = 'duozuhu_scene_checkpoint_v2:';
let connection: Promise<IDBDatabase> | undefined;
const pending = new Map<string, SceneRecord>();
const writers = new Map<string, Promise<void>>();
let lastSavedAt = 0;

function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('duozuhu-scene-editor', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('scenes')) request.result.createObjectStore('scenes');
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('场景存储正在被其他页面占用')); };
  });
}

function checkpoint(machineId: string): SceneRecord | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(checkpointPrefix + machineId) || 'null');
    return value?.format === 'scene-v2' && value.scene && Number.isFinite(value.savedAt) ? value : undefined;
  } catch { return undefined; }
}

function saveCheckpoint(machineId: string, record: SceneRecord) {
  try {
    const json = JSON.stringify(record);
    // Uploaded media stays in IndexedDB rather than exhausting synchronous storage.
    if (json.length > 512 * 1024) return false;
    localStorage.setItem(checkpointPrefix + machineId, json);
    return true;
  } catch { return false; }
}

function asRecord(value: any): SceneRecord | undefined {
  if (!value) return undefined;
  return value.format === 'scene-v2' ? value : { format: 'scene-v2', savedAt: 0, scene: value };
}

export async function readScene(machineId: string): Promise<any> {
  // A just-edited scene must not be read before its pending write has finished.
  await writers.get(machineId)?.catch(() => {});
  let stored: SceneRecord | undefined;
  try {
    const db = await database();
    stored = asRecord(await new Promise((resolve, reject) => {
      const request = db.transaction('scenes').objectStore('scenes').get(machineId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  } catch (error) {
    const backup = checkpoint(machineId);
    if (backup) {
      lastSavedAt = Math.max(lastSavedAt, backup.savedAt);
      return structuredClone(backup.scene);
    }
    throw error;
  }
  const backup = checkpoint(machineId);
  const latest = backup && (!stored || backup.savedAt > stored.savedAt) ? backup : stored;
  if (latest) lastSavedAt = Math.max(lastSavedAt, latest.savedAt);
  return latest ? structuredClone(latest.scene) : undefined;
}

async function drainWrites(machineId: string) {
  while (pending.has(machineId)) {
    const record = pending.get(machineId)!;
    pending.delete(machineId);
    try {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('scenes', 'readwrite');
        transaction.objectStore('scenes').put(record, machineId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      // A successfully written checkpoint is also durable across page reloads.
      if ((checkpoint(machineId)?.savedAt ?? -1) < record.savedAt) throw error;
    }
  }
}

export function writeScene(machineId: string, value: unknown): Promise<void> {
  const record: SceneRecord = { format: 'scene-v2', savedAt: Math.max(Date.now(), lastSavedAt + 1), scene: structuredClone(value) };
  lastSavedAt = record.savedAt;
  // This happens synchronously, before navigation or reload can interrupt a write.
  saveCheckpoint(machineId, record);
  pending.set(machineId, record);
  const writer = (writers.get(machineId) ?? Promise.resolve()).catch(() => {}).then(() => drainWrites(machineId));
  writers.set(machineId, writer);
  return writer.finally(() => { if (writers.get(machineId) === writer) writers.delete(machineId); });
}

const selectionKey = '@settings:last-device';
export async function readSettingSelection(): Promise<string | null> {
  return (await readScene(selectionKey))?.machineId ?? null;
}
export function writeSettingSelection(machineId: string | null): Promise<void> {
  return writeScene(selectionKey, { machineId });
}
