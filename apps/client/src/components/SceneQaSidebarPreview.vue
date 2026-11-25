<template>
  <div ref="containerRef" data-scene-presentation class="scene-qa-sidebar-preview w-full flex items-center justify-center overflow-hidden select-none">
    <!-- 外层视口：以缩放后的真实几何尺寸撑开容器，严格保证与画布完全一致的长宽比与平滑过渡 -->
    <div
      class="qa-scale-viewport relative overflow-hidden flex items-center justify-center transition-all duration-300 ease-out"
      :style="{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`
      }"
    >
      <!-- 内层真实画布尺寸：与画布 1:1 相同尺寸与组件树，通过 transform: scale 整体等比缩放 -->
      <div
        ref="canvasRef"
        class="qa-scale-canvas-root scene-conversation-appearance absolute top-0 left-0"
        :style="{
          width: `${resolvedCanvasWidth}px`,
          height: `${resolvedCanvasHeight}px`,
          transform: `scale(${scaleRatio}) translateY(-${resolvedCanvasHeight - viewportHeight}px)`,
          transformOrigin: '0 0'
        }"
      >
        <SceneConversationAppearance
          :width="resolvedCanvasWidth"
          :height="resolvedCanvasHeight"
          :state="state"
          :card-state="cardState"
          :question="question"
          :answer="answer"
          :placeholder="placeholder"
          :show-dialogue="showDialogue"
          :show-input="showInput"
          :show-voice="showVoice"
          :voice-theme="voiceTheme"
          :animation-duration="animationDuration"
          :answer-lines="3.5"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SceneConversationAppearance from './SceneConversationAppearance.vue';
import type { QaCardState } from './SceneQaCard.vue';
import type { VoiceState, VoiceTheme } from './SceneVoiceButton.vue';

const props = withDefaults(
  defineProps<{
    state?: VoiceState;
    cardState?: QaCardState;
    question?: string;
    answer?: string;
    placeholder?: string;
    voiceTheme?: VoiceTheme;
    animationDuration?: number;
    showVoice?: boolean;
    showDialogue?: boolean;
    showInput?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
  }>(),
  {
    state: 'idle',
    cardState: 'idle',
    question: '',
    answer: '',
    placeholder: '点击左侧，开启对话交流',
    voiceTheme: 'siri',
    animationDuration: 3,
    showVoice: true,
    showDialogue: true,
    showInput: true,
    canvasWidth: 816,
    canvasHeight: 445
  }
);

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const containerWidth = ref(330);
const occupiedHeight = ref<number | null>(null);

const resolvedCanvasWidth = computed(() => Math.max(100, Math.round(props.canvasWidth || 816)));

// Keep the actual scene geometry in every state. Only crop empty space from
// the viewport in standby; reducing the render height also shrinks cqh sizes.
const resolvedCanvasHeight = computed(() => Math.max(1, Math.round(props.canvasHeight || 445)));
const viewportHeight = computed(() => props.state === 'idle'
  ? Math.ceil(resolvedCanvasHeight.value * 0.245)
  : Math.min(resolvedCanvasHeight.value, occupiedHeight.value ?? resolvedCanvasHeight.value));

const scaleRatio = computed(() => {
  const w = resolvedCanvasWidth.value;
  return Math.min(1, Math.max(0.1, containerWidth.value / w));
});

const scaledWidth = computed(() => {
  return Math.round(resolvedCanvasWidth.value * scaleRatio.value);
});

const scaledHeight = computed(() => {
  return Math.round(viewportHeight.value * scaleRatio.value);
});

let observer: ResizeObserver | undefined;
let contentObserver: ResizeObserver | undefined;

// Crop the empty area above the rendered content without changing its geometry.
const measureContent = () => {
  const sample = canvasRef.value?.querySelector<HTMLElement>('.scene-conversation-sample');
  if (!sample) return;
  const children = [...sample.children].map(child => child.getBoundingClientRect()).filter(box => box.height > 0);
  if (!children.length) return;
  const firstTop = Math.min(...children.map(box => box.top));
  occupiedHeight.value = Math.ceil((sample.getBoundingClientRect().bottom - firstTop) / scaleRatio.value);
};
const observeContent = async () => {
  await nextTick();
  contentObserver?.disconnect();
  const sample = canvasRef.value?.querySelector<HTMLElement>('.scene-conversation-sample');
  if (sample && contentObserver) {
    contentObserver.observe(sample);
    for (const child of sample.children) contentObserver.observe(child);
  }
  measureContent();
};

watch([scaleRatio, resolvedCanvasHeight, () => props.state, () => props.showDialogue,
  () => props.showInput, () => props.showVoice], observeContent);

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') contentObserver = new ResizeObserver(measureContent);
  void observeContent();
  if (containerRef.value) {
    if (containerRef.value.clientWidth > 0) {
      containerWidth.value = containerRef.value.clientWidth;
    }
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width;
        }
      });
      observer.observe(containerRef.value);
    }
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  contentObserver?.disconnect();
});
</script>

<style scoped>
.scene-qa-sidebar-preview {
  width: 100%;
  box-sizing: border-box;
}

.qa-scale-viewport {
  flex-shrink: 0;
  box-sizing: border-box;
  border-radius: 8px;
}

.qa-scale-canvas-root {
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
}

/* ============================================================
   右侧独立问答预览专项规则：
   只展示三行半 (3.5行)，第四行文字露出一半形成明显可滚动心理暗示。
   滚动条在有溢出内容时常态保持微妙透显，支持鼠标滚轮平滑滚动体验。
   ============================================================ */

/* The shared card enforces 3.5 native lines using its 28px typography,
   rather than em on the 14px preview wrapper. */

.scene-qa-sidebar-preview :deep(.scene-conversation-sample) {
  justify-content: flex-end !important;
  gap: 16px !important;
}

/* 提示悬浮滚动条：内容溢出时常态半透明展示，hover或滚动时清晰高亮，让用户一眼明确可滚动 */
.scene-qa-sidebar-preview :deep(.scene-qa-minimal-scrollbar) {
  pointer-events: auto !important;
  opacity: 0.75 !important;
  width: 5px !important;
  background: rgba(107, 119, 133, 0.08) !important;
}
.scene-qa-sidebar-preview :deep(.scene-qa-minimal-scrollbar:hover),
.scene-qa-sidebar-preview :deep(.scene-qa-minimal-scrollbar.is-visible) {
  opacity: 1 !important;
}
.scene-qa-sidebar-preview :deep(.scene-qa-minimal-thumb) {
  background: rgba(39, 155, 255, 0.6) !important;
}
</style>
