<template>
  <div ref="host" data-scene-presentation class="scene-conversation-appearance" :class="{ 'is-fitted': fit }" :style="fit ? { height: `${height * scale}px` } : undefined">
    <div
      class="scene-conversation-sample"
      :style="fit ? { width: `${width}px`, height: `${height}px`, transform: `scale(${scale})` } : undefined"
    >
      <SceneQaCard
        v-if="showCard"
        :state="resolvedCardState"
        :finished="state === 'speaking' || resolvedCardState === 'answer'"
        :appearance-only="true"
        :visible-answer-lines="answerLines"
        :listening-text="listeningText"
        :question="question"
        :answer="answer"
      />
      <div v-if="showInput" class="scene-conversation-sample-input">
        <SceneQaInput :placeholder="placeholder" :editable="false">
          <template #orb>
            <SceneVoiceButton v-if="showVoice" :theme="voiceTheme" :animation-duration="animationDuration" :size="orbSize" :state="state || 'idle'" :interactive="false" />
          </template>
        </SceneQaInput>
      </div>
      <div v-else-if="showVoice" class="scene-conversation-sample-orb">
        <SceneVoiceButton :theme="voiceTheme" :animation-duration="animationDuration" :size="orbSize" :state="state || 'idle'" :interactive="false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SceneQaCard, { type QaCardState } from './SceneQaCard.vue';
import SceneQaInput from './SceneQaInput.vue';
import SceneVoiceButton, { type VoiceState, type VoiceTheme } from './SceneVoiceButton.vue';

const props = withDefaults(defineProps<{
  question?: string;
  answer?: string;
  placeholder?: string;
  showDialogue?: boolean;
  showInput?: boolean;
  voiceTheme?: VoiceTheme;
  animationDuration?: number;
  width?: number;
  height?: number;
  fit?: boolean;
  state?: VoiceState;
  cardState?: QaCardState;
  showVoice?: boolean;
  answerLines?: number;
}>(), {
  fit: false,
  showVoice: true,
  answerLines: 3.5,
  showDialogue: true,
  showInput: true,
  placeholder: '请输入您想了解的问题...',
  state: 'idle',
  width: 480,
  height: 320,
  animationDuration: 3,
  voiceTheme: 'siri'
});

const showCard = computed(() => props.showDialogue && props.state !== 'idle');
const resolvedCardState = computed<QaCardState>(() => {
  if (props.cardState) return props.cardState;
  if (!props.state || props.state === 'speaking') return 'answer';
  if (props.state === 'thinking') return 'thinking';
  if (props.state === 'listening') return 'question';
  return 'idle';
});

const listeningText = computed(() => {
  if (props.state === 'listening' && (!props.question || !props.question.trim())) {
    return '倾听中…';
  }
  return '';
});
const host = ref<HTMLElement>();
const availableWidth = ref(0);
const scale = computed(() => Math.min(1, availableWidth.value / Math.max(1, props.width)));
// Screen typography belongs to the native scene (dialogue 28px / input 24px).
// Resizing the component must not shrink it again before the outer screen scale.
const orbSize = computed(() => `${Math.max(18, Math.round(props.height * 0.245 * 0.7))}px`);
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!props.fit || !host.value) return;
  observer = new ResizeObserver(([entry]) => { availableWidth.value = entry.contentRect.width; });
  observer.observe(host.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.scene-conversation-appearance { width: 100%; height: 100%; min-width: 0; }
.scene-conversation-appearance.is-fitted {
  display: flex;
  justify-content: center;
  overflow: hidden;
  pointer-events: auto;
}
.scene-conversation-sample {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  min-height: 0;
  container-type: size;
  transform-origin: top left;
  pointer-events: auto;
}
.scene-conversation-appearance.is-fitted .scene-conversation-sample {
  flex-shrink: 0;
  justify-content: flex-end;
  transform-origin: top center;
  margin: 0 auto;
}
.scene-conversation-sample-input {
  width: 100%;
  height: 24.5cqh; margin-top: 3.5cqh;
  flex-shrink: 0;
  pointer-events: none;
}
.scene-conversation-sample-orb {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24.5cqh; margin-top: 3.5cqh;
  flex-shrink: 0;
  pointer-events: none;
}
</style>
