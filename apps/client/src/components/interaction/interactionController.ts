export type Phase = 'idle' | 'listening' | 'recognizing' | 'confirming' | 'thinking' | 'answering' | 'answered' | 'interrupted' | 'no-answer' | 'error';
export type DemoScenario = 'normal' | 'no-answer' | 'timeout' | 'service' | 'microphone';
export type Feedback = 'helpful' | 'unhelpful' | null;
export interface Turn { id: number; question: string; answer: string; complete: boolean; feedback: Feedback }
export interface InteractionState { phase: Phase; current: Turn | null; history: Turn[]; transcript: string; error: string }
export type AnswerEvent = { type: 'text'; text: string } | { type: 'no-answer' };
export type AnswerAdapter = (question: string, signal: AbortSignal) => AsyncIterable<AnswerEvent>;

// Session data lives only in memory. Request revisions also guard adapters that ignore abort.
export function createInteractionController(adapter: AnswerAdapter, onChange: (state: InteractionState) => void = () => {}) {
  let state: InteractionState = { phase: 'idle', current: null, history: [], transcript: '', error: '' };
  let revision = 0, nextId = 0, disposed = false;
  let abort: AbortController | undefined;
  const notify = () => { if (!disposed) onChange(structuredClone(state)); };
  const invalidate = () => { revision++; abort?.abort(); abort = undefined; };
  const active = () => ['thinking', 'answering', 'listening', 'recognizing'].includes(state.phase);
  const publish = (phase: Phase) => { state.phase = phase; notify(); };

  async function submit(question: string): Promise<boolean> {
    const text = question.trim();
    if (disposed || !text || text.length > 200 || ['thinking', 'listening', 'recognizing'].includes(state.phase)) return false;
    invalidate();
    const request = revision;
    if (state.current) state.history = [...state.history, structuredClone(state.current)].slice(-6);
    state.current = { id: ++nextId, question: text, answer: '', complete: false, feedback: null };
    state.error = ''; state.transcript = '';
    const controller = new AbortController(); abort = controller;
    publish('thinking');
    try {
      let missed = false;
      for await (const event of adapter(text, controller.signal)) {
        if (disposed || request !== revision) return true;
        if (event.type === 'no-answer') { missed = true; break; }
        state.current!.answer += event.text;
        publish('answering');
      }
      if (disposed || request !== revision) return true;
      if (missed || !state.current!.answer.trim()) { publish('no-answer'); return true; }
      state.current!.complete = true;
      publish('answered');
    } catch (error) {
      if (disposed || request !== revision) return true;
      state.error = error instanceof Error ? error.message : '暂时无法回答，请重试。';
      publish('error');
    }
    return true;
  }

  return {
    getState: () => structuredClone(state),
    submit,
    stop() { if (!active()) return; invalidate(); state.transcript = ''; publish(state.current ? 'interrupted' : 'idle'); },
    retry() {
      if (disposed || active() || !state.current) return Promise.resolve(false);
      const question = state.current.question;
      state.current = null; // Retry replaces the failed attempt, not another history entry.
      return submit(question);
    },
    beginListening(unavailable = false) {
      if (disposed || state.phase === 'thinking' || state.phase === 'listening' || state.phase === 'recognizing') return false;
      invalidate(); state.transcript = ''; state.error = '';
      if (unavailable) { state.error = '语音暂不可用，请使用文字输入或快捷问题。'; publish(state.current ? state.current.complete ? 'answered' : 'interrupted' : 'idle'); return false; }
      publish('listening'); return true;
    },
    async finishListening(transcript: string, recognize: (signal: AbortSignal) => Promise<void>) {
      if (disposed || state.phase !== 'listening') return;
      invalidate(); const request = revision; const controller = new AbortController(); abort = controller;
      publish('recognizing');
      try {
        await recognize(controller.signal);
        if (disposed || request !== revision) return;
        state.transcript = transcript.trim().slice(0, 200);
        if (!state.transcript) { state.error = '没有听清，请再说一次，或使用文字输入。'; publish(state.current ? 'interrupted' : 'idle'); return; }
        publish('confirming');
      } catch {
        if (disposed || request !== revision) return;
        state.error = '语音识别失败，请使用文字输入。'; publish(state.current ? 'interrupted' : 'idle');
      }
    },
    feedback(value: Feedback) {
      if (disposed || !state.current?.complete || state.phase !== 'answered') return;
      state.current.feedback = state.current.feedback === value ? null : value; notify();
    },
    reset() { invalidate(); state = { phase: 'idle', current: null, history: [], transcript: '', error: '' }; notify(); },
    dispose() { invalidate(); disposed = true; }
  };
}

export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('aborted')); return; }
    const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(new Error('aborted')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

// This is deliberately a demo adapter, never a knowledge retrieval or real speech service.
export function createDemoAdapter(getScenario: () => DemoScenario, getAnswer: (question?: string) => string): AnswerAdapter {
  return async function* (question, signal) {
    const scenario = getScenario(), answer = (getAnswer(question) || '').trim();
    await abortableDelay(scenario === 'timeout' ? 3500 : 2600, signal);
    if (scenario === 'timeout') throw new Error('等待回答超时，请重试或换个问题。');
    if (scenario === 'service') throw new Error('服务暂不可用，请稍后重试。');
    if (scenario === 'no-answer' || !answer) { yield { type: 'no-answer' }; return; }
    const characters = Array.from(answer);
    for (let i = 0; i < characters.length; i += 3) {
      await abortableDelay(90, signal);
      yield { type: 'text', text: characters.slice(i, i + 3).join('') };
    }
  };
}
