<template>
  <div
    class="scene-voice-feedback"
    :class="{
      'is-listening': state === 'listening',
      'has-answer-row': state === 'thinking' || state === 'speaking',
      'is-answer': state === 'speaking',
      'is-idle': !text
    }"
    :style="{ '--feedback-unit': `${scale}px` }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="scene-voice-feedback-question">{{ state === 'listening' ? text : (question || '请给我一直说人工智能四个字') }}</span>
    <div class="scene-voice-feedback-answer-collapse" :aria-hidden="state === 'listening'">
      <div class="scene-voice-feedback-answer-inner">
        <Transition name="scene-voice-text" mode="out-in">
          <span v-if="state !== 'listening' && text" :key="state" class="scene-voice-feedback-text">{{ text }}</span>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { voiceFeedbackText, type VoiceFeedbackState } from './sceneVoiceFeedback';
const props = withDefaults(defineProps<{ state: VoiceFeedbackState; question?: string; answer?: string; scale?: number }>(), { question: '', answer: '', scale: 1 });
const text = computed(() => voiceFeedbackText(props.state, props.answer));
</script>

<style scoped>
.scene-voice-feedback {
  position:absolute; box-sizing:border-box; z-index:100;
  padding:20px 28px;
  min-height:88px;
  display:flex; flex-direction:column; justify-content:center;
  border:calc(1 * var(--feedback-unit)) solid rgba(255,255,255,.85);
  border-radius:24px;
  background:linear-gradient(160deg,rgba(255,255,255,.68),rgba(244,247,255,.52));
  box-shadow:0 calc(6 * var(--feedback-unit)) calc(20 * var(--feedback-unit)) rgba(35,55,83,.08), inset 0 1px 0 rgba(255,255,255,.9);
  backdrop-filter:blur(calc(14 * var(--feedback-unit)));
  -webkit-backdrop-filter:blur(calc(14 * var(--feedback-unit)));
  color:#1D2129; font-size:var(--scene-dialog-font-size,28px); font-weight:400; line-height:var(--scene-dialog-line-height,1.5); letter-spacing:var(--scene-dialog-letter-spacing,0.07em);
  transform-origin:center bottom;
  transition:opacity .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1), padding .28s cubic-bezier(.22,1,.36,1);
  pointer-events:none;
}
.scene-voice-feedback.is-idle { opacity:0; transform:translateY(8px) scale(.985); }
.scene-voice-feedback-question {
  display:block; padding-bottom:0;
  background:linear-gradient(90deg,#279BFF 0%,#10D6FB 100%);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  color:#279BFF; font-size:var(--scene-dialog-font-size,28px); font-weight:500; line-height:var(--scene-dialog-line-height,1.5); letter-spacing:var(--scene-dialog-letter-spacing,0.07em);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  transition:padding-bottom .28s cubic-bezier(.22,1,.36,1);
}
.scene-voice-feedback.has-answer-row .scene-voice-feedback-question {
  padding-bottom:calc(10 * var(--feedback-unit));
}
.scene-voice-feedback-answer-collapse {
  display:grid; grid-template-rows:0fr; opacity:0;
  transition:grid-template-rows .28s cubic-bezier(.22,1,.36,1), opacity .22s cubic-bezier(.22,1,.36,1);
}
.scene-voice-feedback.has-answer-row .scene-voice-feedback-answer-collapse { grid-template-rows:1fr; opacity:1; }
.scene-voice-feedback-answer-inner { min-height:0; overflow:hidden; }
.scene-voice-feedback-text { display:block; min-width:0; overflow-wrap:anywhere; color:#1D2129; }
.scene-voice-feedback.is-answer .scene-voice-feedback-text {
  display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden;
}
.scene-voice-text-enter-active, .scene-voice-text-leave-active { transition:opacity .16s ease, transform .16s ease; }
.scene-voice-text-enter-from { opacity:0; transform:translateY(3px); }
.scene-voice-text-leave-to { opacity:0; transform:translateY(-3px); }
</style>
