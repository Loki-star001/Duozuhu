export function replaceKeyboardSelection(value: string, text: string, start: number, end = start, limit = 200) {
  const left = Math.max(0, Math.min(start, value.length));
  const right = Math.max(left, Math.min(end, value.length));
  const available = Math.max(0, limit - Array.from(value.slice(0, left) + value.slice(right)).length);
  const inserted = Array.from(text).slice(0, available).join('');
  return { value: value.slice(0, left) + inserted + value.slice(right), cursor: left + inserted.length };
}

export function deleteKeyboardSelection(value: string, start: number, end = start) {
  if (end > start) return replaceKeyboardSelection(value, '', start, end);
  if (start <= 0) return { value, cursor: 0 };
  const before = Array.from(value.slice(0, start));
  const last = before.pop() || '';
  return replaceKeyboardSelection(value, '', start - last.length, start);
}

export function keyboardSafeBox<T extends { x: number; y: number; w: number; h: number }>(box: T, height: number, keyboardHeight: number): T {
  const safeBottom = height - keyboardHeight - 48;
  return { ...box, y: Math.min(box.y, Math.max(0, safeBottom / height * 100 - box.h)) };
}
