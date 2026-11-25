export function createSceneHistory<T>(limit = 50) {
  let entries: T[] = [], cursor = -1;
  const clone = (value: T): T => structuredClone(value);
  const same = (a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);
  return {
    get canUndo() { return cursor > 0; },
    get canRedo() { return cursor >= 0 && cursor < entries.length - 1; },
    isCurrent(value: T) { return cursor >= 0 && same(entries[cursor], value); },
    reset(value: T) { entries = [clone(value)]; cursor = 0; },
    push(value: T) {
      if (cursor >= 0 && same(entries[cursor], value)) return;
      entries = entries.slice(0, cursor + 1);
      entries.push(clone(value));
      if (entries.length > limit + 1) entries.shift();
      cursor = entries.length - 1;
    },
    undo(): T | undefined { return cursor > 0 ? clone(entries[--cursor]) : undefined; },
    redo(): T | undefined { return cursor < entries.length - 1 ? clone(entries[++cursor]) : undefined; },
  };
}

export function isNativeTextTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,[contenteditable="true"],[role="textbox"]'));
}
