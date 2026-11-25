export const conversationIdleSeconds = 20;

// The entry orb is independent of the input bar and shares the native artboard scale.
export function defaultConversationOrbBox(width = 1080, height = 1920) {
  return { x: 81, y: 48, w: 12, h: 12 * width / height };
}
