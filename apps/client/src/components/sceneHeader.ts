export const defaultTopBarBox = { x: 5.2, y: 1.8, w: 89.6, h: 5.2 };

// Old scenes stored Logo and time as separate layers. Keep their highest position
// in the stack, replacing them with one parent without duplicating its children.
export function groupHeaderOrder(order: string[]): string[] {
  const ids = order.map(id => id === 'logo' || id === 'kk-time' ? 'topbar' : id);
  return [...new Set([...ids].reverse())].reverse();
}
