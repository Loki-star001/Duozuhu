export const kingkongRailId = 'kingkong-rail';
export const defaultKingkongRailBox = { x: 5.2, y: 11.3, w: 11.5, h: 29 };
export const isKingkongButtonId = (id: string) => /^kk-\d+$/.test(id);

export function groupKingkongOrder(order: string[]): string[] {
  const ids = order.map(id => isKingkongButtonId(id) ? kingkongRailId : id);
  return [...new Set([...ids].reverse())].reverse();
}

export function railScrollLayout(height: number, count: number) {
  const viewport = Math.max(1, height);
  const visibleCount = 4;
  const gap = viewport * .035;
  const cardHeight = viewport / visibleCount - gap;
  const inset = gap / 2;
  return { cardHeight, gap, inset, step: cardHeight + gap, maxScroll: Math.max(0, count - visibleCount) * (cardHeight + gap) };
}

export function isRailDrag(dx: number, dy: number, scrollDelta: number) {
  return Math.hypot(dx, dy) > 8 || Math.abs(scrollDelta) > 2;
}

export function getLoopRange(count: number, minCards = 20) {
  if (count <= 0) return { copies: 1, midCopy: 0 };
  let copies = Math.max(5, Math.ceil(minCards / count));
  if (copies % 2 === 0) copies++;
  return { copies, midCopy: Math.floor(copies / 2) };
}

export function wrapLoopScroll(
  scrollTop: number,
  count: number,
  step: number,
  copies: number,
  midCopy: number
): { nextScroll: number; delta: number } {
  if (count <= 0 || step <= 0 || copies <= 1) return { nextScroll: scrollTop, delta: 0 };
  const cycle = count * step;
  const lowerBound = (midCopy - 1) * cycle;
  const upperBound = (midCopy + 1) * cycle;
  let target = scrollTop;
  while (target >= upperBound) target -= cycle;
  while (target < lowerBound) target += cycle;
  return { nextScroll: target, delta: target - scrollTop };
}

