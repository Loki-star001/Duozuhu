export type VoiceFeedbackState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function voiceFeedbackText(state: VoiceFeedbackState, answer = '') {
  if (state === 'listening') return '倾听中…';
  if (state === 'thinking') return '思考中…';
  if (state === 'speaking') return answer.trim() || '正在播报…';
  return '';
}

export function voiceFeedbackPosition(anchor: { x: number; y: number; w: number }) {
  const width = Math.min(64, Math.max(44, anchor.w));
  const left = Math.max(2, Math.min(98 - width, anchor.x + anchor.w / 2 - width / 2));
  const bottom = Math.max(2, Math.min(84, 100 - anchor.y + 1.5));
  return { left: `${left}%`, bottom: `${bottom}%`, width: `${width}%` };
}
