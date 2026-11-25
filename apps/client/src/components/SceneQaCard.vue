<template>
  <!-- 问答卡片：
       1. 待机（idle）：隐藏卡片，仅保留下方输入条
       2. 提问（question）：上方显示蓝色「聆听中…」，用户说话时渐变为蓝色问题文字
       3. 思考（thinking）：参考回答布局，上方蓝色问题文字 + 下方「思考中…」
       4. 回答（answer）：默认仅展示当前这一条问答（最多 5 行 + 极简悬浮胶囊滚动条），
          框内右下角提供「查看历史对话」展开按钮，点击后展开查看多轮历史对话 -->
  <div
    data-scene-presentation
    class="scene-qa-card"
    :class="[
      `is-${state}`,
      `is-active-${activeState}`,
      {
        'is-clamped': clamp,
        'has-line-limit': visibleAnswerLines != null,
        'is-idle': state === 'idle' && !forceVisible,
        'has-answer-row': activeState === 'thinking' || activeState === 'answer',
        'is-history': isHistoryOpen,
        'can-show-history': canShowHistory
      }
    ]"
    :style="{ '--answer-lines': answerLines, '--scene-qa-visible-lines': activeState === 'thinking' ? 1 : visibleAnswerLines }"
  >
    <div class="scene-qa-surface" @transitionend="syncAllScrolls">
      <template v-if="isHistoryOpen">
        <div class="scene-qa-history-header">
          <span class="scene-qa-history-title">历史对话（{{ resolvedHistory.length }}）</span>
        </div>
        <div class="scene-qa-scroll-wrap">
          <div
            ref="historyRef" class="scene-qa-history-list"
            @wheel.stop
            @scroll="updateHistoryScroll"
          >
            <div
              v-for="(item, idx) in resolvedHistory"
              :key="item.id ?? idx"
              class="scene-qa-history-item"
            >
              <p class="scene-qa-history-q">{{ item.question }}</p>
              <p class="scene-qa-history-a">{{ item.answer }}</p>
            </div>
          </div>
          <div
            class="scene-qa-minimal-scrollbar"
            :class="{ 'is-visible': isHistoryScrolling || isDraggingScroll, 'is-dragging': isDraggingScroll }"
          >
            <div
              class="scene-qa-minimal-thumb"
              :style="{ height: `${historyScroll.thumbH}%`, top: `${historyScroll.thumbTop}%` }"
              @pointerdown.stop="startThumbDrag($event, historyRef)"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 提问区（蓝色渐变 + 下方分割线） -->
        <div class="scene-qa-question-row">
          <Transition name="scene-qa-text" mode="out-in">
            <p :key="topBlueKey" class="scene-qa-question">
              <span v-if="activeState !== 'question' || isQuestionSpoken" class="scene-qa-sr-only">游客：</span>{{ topBlueText }}
            </p>
          </Transition>
        </div>

        <!-- 回答区（与提问连为完整一套） -->
        <div v-if="activeState === 'thinking' || activeState === 'answer'" class="scene-qa-answer-area">
          <div class="scene-qa-scroll-wrap">
            <div
              ref="answerRef"
              class="scene-qa-answer"
              :class="{ 'is-muted': muted && activeState === 'answer' }"
              @wheel.stop
              @scroll="updateAnswerScroll"
            >
              <Transition name="scene-qa-text" mode="out-in">
                <p v-if="bottomAnswerText" :key="bottomAnswerKey" class="scene-qa-answer-text">{{ bottomAnswerText }}</p>
              </Transition>
              <slot />
            </div>
            <!-- 极简悬浮胶囊滚动条 -->
            <div
              class="scene-qa-minimal-scrollbar"
              :class="{ 'is-visible': answerScroll.visible || isDraggingScroll, 'is-dragging': isDraggingScroll }"
            >
              <div
                class="scene-qa-minimal-thumb"
                :style="{ height: `${answerScroll.thumbH}%`, top: `${answerScroll.thumbTop}%` }"
                @pointerdown.stop="startThumbDrag($event, answerRef)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 框内右下角：查看历史 -->
      <div v-if="canShowHistory || isHistoryOpen" class="scene-qa-in-footer-collapse">
        <div class="scene-qa-in-footer-inner">
          <div class="scene-qa-in-footer">
            <button
              type="button"
              class="scene-qa-inline-btn"
              :class="{ 'is-active': isHistoryOpen, 'is-preview-only': appearanceOnly }"
              :disabled="appearanceOnly"
              :aria-disabled="appearanceOnly"
              @pointerdown.stop="appearanceOnly ? null : undefined"
              @click.stop="appearanceOnly ? null : toggleHistory()"
            >
              <svg class="scene-qa-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <template v-if="!isHistoryOpen">
                  <path d="M15 5h4v4" />
                  <path d="M5 15v4h4" />
                </template>
                <template v-else>
                  <path d="M19 9h-4V5" />
                  <path d="M9 19H5v-4" />
                </template>
              </svg>
              <span>{{ isHistoryOpen ? '收起历史' : '查看历史' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- 蓝色光带绕着对话框旋转 (Border Beam) -->
    <div
      v-if="isBeamActive"
      class="scene-qa-border-beam"
      aria-hidden="true"
    >
      <div class="scene-qa-border-beam-runner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

export type QaCardState = 'idle' | 'question' | 'thinking' | 'answer';
export interface QaHistoryTurn {
  id?: number | string;
  question: string;
  answer: string;
}

const props = withDefaults(
  defineProps<{
    state?: QaCardState;
    question?: string;
    listeningText?: string;
    answer?: string;
    history?: QaHistoryTurn[];
    muted?: boolean;
    clamp?: boolean;
    forceVisible?: boolean;
    finished?: boolean;
    appearanceOnly?: boolean;
    visibleAnswerLines?: number;
  }>(),
  {
    state: 'answer',
    question: '',
    listeningText: '',
    answer: '',
    history: () => [],
    muted: false,
    clamp: true,
    forceVisible: false
  }
);

const emit = defineEmits<{
  (e: 'phase-change', phase: 'thinking' | 'answering' | 'answered'): void;
  (e: 'finish'): void;
  (e: 'question-complete'): void;
}>();

const isHistoryOpen = ref(false);
const isDraggingScroll = ref(false);

const answerRef = ref<HTMLElement>();
const historyRef = ref<HTMLElement>();

const answerScroll = reactive({ visible: false, thumbH: 36, thumbTop: 0 });
const historyScroll = reactive({ visible: false, thumbH: 36, thumbTop: 0 });

const computeScrollMetrics = (el: HTMLElement | undefined, target: typeof answerScroll) => {
  if (!el) {
    target.visible = false;
    return;
  }
  const { scrollHeight, clientHeight, scrollTop } = el;
  if (scrollHeight <= clientHeight + 2) {
    target.visible = false;
    target.thumbH = 100;
    target.thumbTop = 0;
    return;
  }
  target.visible = true;
  const ratio = clientHeight / scrollHeight;
  const thumbH = Math.max(24, Math.min(82, ratio * 100));
  const maxScroll = Math.max(1, scrollHeight - clientHeight);
  const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
  target.thumbH = thumbH;
  target.thumbTop = progress * (100 - thumbH);
};

const updateAnswerScroll = () => computeScrollMetrics(answerRef.value, answerScroll);
const updateHistoryScroll = () => computeScrollMetrics(historyRef.value, historyScroll);
const syncAllScrolls = () => {
  updateAnswerScroll();
  updateHistoryScroll();
};

let resizeObserver: ResizeObserver | undefined;
watch([answerRef, historyRef], ([aEl, hEl]) => {
  resizeObserver?.disconnect();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => syncAllScrolls());
    if (aEl) resizeObserver.observe(aEl);
    if (hEl) resizeObserver.observe(hEl);
  }
  void nextTick(syncAllScrolls);
});

const startThumbDrag = (e: PointerEvent, container: HTMLElement | undefined) => {
  if (!container) return;
  e.preventDefault();
  const thumbEl = e.currentTarget as HTMLElement;
  const railEl = thumbEl.parentElement;
  if (!railEl) return;
  isDraggingScroll.value = true;
  thumbEl.setPointerCapture(e.pointerId);
  const startY = e.clientY;
  const startScrollTop = container.scrollTop;
  const railRect = railEl.getBoundingClientRect();
  const scrollable = Math.max(1, container.scrollHeight - container.clientHeight);
  const thumbH = container === answerRef.value ? answerScroll.thumbH : historyScroll.thumbH;
  const thumbTravel = Math.max(1, railRect.height * (1 - thumbH / 100));

  const onMove = (moveEvent: PointerEvent) => {
    const dy = moveEvent.clientY - startY;
    container.scrollTop = startScrollTop + (dy / thumbTravel) * scrollable;
  };
  const onUp = () => {
    isDraggingScroll.value = false;
    updateAnswerScroll();
    updateHistoryScroll();
    thumbEl.removeEventListener('pointermove', onMove);
    thumbEl.removeEventListener('pointerup', onUp);
    thumbEl.removeEventListener('pointercancel', onUp);
  };
  thumbEl.addEventListener('pointermove', onMove);
  thumbEl.addEventListener('pointerup', onUp);
  thumbEl.addEventListener('pointercancel', onUp);
};

const toggleHistory = async () => {
  isHistoryOpen.value = !isHistoryOpen.value;
  await nextTick();
  if (isHistoryOpen.value && historyRef.value) {
    historyRef.value.scrollTop = historyRef.value.scrollHeight;
  }
  syncAllScrolls();
};

const resolvedHistory = computed<QaHistoryTurn[]>(() => {
  if (props.history && props.history.length > 0) {
    return props.history;
  }
  return [
    {
      id: 'sample-1',
      question: '请介绍一下展厅的核心导览服务',
      answer: '欢迎来到智慧展厅！我们支持全天候实时语音问答、展区路线指引、核心产品讲解与多语种互动导览服务。'
    },
    {
      id: 'sample-2',
      question: '请问如何快速检索产品与案例资料？',
      answer: '您可以点击左侧金刚区的「产品中心」或「案例展示」，也可以直接对我说出您想了解的业务关键词。'
    },
    {
      id: 'sample-3',
      question: props.question?.trim() || '请给我一直说人工智能四个字',
      answer: props.answer?.trim() || '人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能...'
    }
  ];
});

const lastActiveState = ref<Exclude<QaCardState, 'idle'>>(props.state === 'idle' ? 'answer' : props.state);
watch(
  () => props.state,
  val => {
    if (val !== 'idle') lastActiveState.value = val;
    if (val !== 'answer') {
      isHistoryOpen.value = false;
    }
  }
);

const activeState = computed<Exclude<QaCardState, 'idle'>>(() =>
  props.state === 'idle' ? lastActiveState.value : props.state
);

const isInternalThinking = ref(false);
const isAnswerComplete = ref(false);
let thinkingDelayTimer: ReturnType<typeof setTimeout> | undefined;

const stopThinkingTimer = () => {
  if (thinkingDelayTimer) {
    clearTimeout(thinkingDelayTimer);
    thinkingDelayTimer = undefined;
  }
};

const canShowHistory = computed(() => {
  if (props.appearanceOnly) return activeState.value === 'answer';
  if (props.state === 'idle' && !props.forceVisible) return false;
  return activeState.value === 'answer' || isAnswerComplete.value;
});

// 回答/思考时：蓝色光带绕着对话框旋转 (Border Beam)；文字生成结束后光带自动消失
const isBeamActive = computed(() => {
  if (props.state === 'idle' && !props.forceVisible) return false;
  if (activeState.value === 'thinking') return true;
  if (activeState.value === 'answer') {
    if (props.finished !== undefined) {
      return !props.finished;
    }
    return !isAnswerComplete.value || isInternalThinking.value;
  }
  return false;
});

// 提问态：先显示蓝色「聆听中…」，用户说话时渐变为蓝色问题文字
const streamedQuestion = ref('');
const isQuestionSpoken = ref(false);
let questionDelayTimer: ReturnType<typeof setTimeout> | undefined;
let questionStreamTimer: ReturnType<typeof setInterval> | undefined;

const stopQuestionTimers = () => {
  if (questionDelayTimer) {
    clearTimeout(questionDelayTimer);
    questionDelayTimer = undefined;
  }
  if (questionStreamTimer) {
    clearInterval(questionStreamTimer);
    questionStreamTimer = undefined;
  }
};

const startQuestionSpeech = (fullQuestion: string) => {
  stopQuestionTimers();
  isQuestionSpoken.value = false;
  streamedQuestion.value = '';
  if (props.appearanceOnly) return;
  const target = (fullQuestion || '请给我一直说人工智能四个字').trim();
  const chars = Array.from(target);
  if (!chars.length) return;
  questionDelayTimer = setTimeout(() => {
    isQuestionSpoken.value = true;
    let idx = 1;
    streamedQuestion.value = chars.slice(0, idx).join('');
    questionStreamTimer = setInterval(() => {
      idx = Math.min(chars.length, idx + 1);
      streamedQuestion.value = chars.slice(0, idx).join('');
      if (idx >= chars.length && questionStreamTimer) {
        clearInterval(questionStreamTimer);
        questionStreamTimer = undefined;
        // 说完需求后保留等待时间，给用户充分确认和阅读时间
        questionDelayTimer = setTimeout(() => emit('question-complete'), 2800);
      }
    }, 65);
  }, 650);
};

// 回答态：下方慢慢流式呈现数字人回答（「慢慢进行回答」），超长时自动平滑滚动并显示极简滚动条
const streamedAnswer = ref(props.answer);
let answerStreamTimer: ReturnType<typeof setInterval> | undefined;

const stopAnswerStream = () => {
  if (answerStreamTimer) {
    clearInterval(answerStreamTimer);
    answerStreamTimer = undefined;
  }
};

const scrollAnswerToBottom = async () => {
  await nextTick();
  if (answerRef.value) {
    answerRef.value.scrollTop = answerRef.value.scrollHeight;
    updateAnswerScroll();
  }
};

const startAnswerStream = (fullText: string) => {
  stopAnswerStream();
  const chars = Array.from(fullText || '');
  if (!props.clamp || chars.length === 0) {
    streamedAnswer.value = fullText;
    isAnswerComplete.value = true;
    emit('phase-change', 'answered');
    emit('finish');
    void nextTick(updateAnswerScroll);
    return;
  }
  let idx = 1;
  streamedAnswer.value = chars.slice(0, idx).join('');
  isAnswerComplete.value = false;
  if (answerRef.value) answerRef.value.scrollTop = 0;
  updateAnswerScroll();
  answerStreamTimer = setInterval(() => {
    idx = Math.min(chars.length, idx + 1);
    streamedAnswer.value = chars.slice(0, idx).join('');
    void scrollAnswerToBottom();
    if (idx >= chars.length) {
      stopAnswerStream();
      isAnswerComplete.value = true;
      emit('phase-change', 'answered');
      emit('finish');
    }
  }, 42);
};

const triggerAnswerSequence = (skipThinking = false) => {
  stopQuestionTimers();
  stopThinkingTimer();
  stopAnswerStream();
  isHistoryOpen.value = false;

  if (props.appearanceOnly) {
    isInternalThinking.value = false;
    isAnswerComplete.value = Boolean(props.finished);
    streamedAnswer.value = props.answer;
    void nextTick(syncAllScrolls);
    return;
  }

  if (props.finished) {
    isInternalThinking.value = false;
    isAnswerComplete.value = true;
    streamedAnswer.value = props.answer;
    emit('phase-change', 'answered');
    void nextTick(syncAllScrolls);
    return;
  }

  if (skipThinking || !props.clamp) {
    isInternalThinking.value = false;
    emit('phase-change', 'answering');
    startAnswerStream(props.answer);
    return;
  }

  // 思考中一会后出现回答开始回答
  isInternalThinking.value = true;
  isAnswerComplete.value = false;
  emit('phase-change', 'thinking');
  thinkingDelayTimer = setTimeout(() => {
    isInternalThinking.value = false;
    emit('phase-change', 'answering');
    startAnswerStream(props.answer);
  }, 2800);
};

watch(
  () => props.state,
  (next, prev) => {
    if (next === 'question') {
      stopThinkingTimer();
      stopAnswerStream();
      isInternalThinking.value = false;
      isAnswerComplete.value = false;
      isHistoryOpen.value = false;
      startQuestionSpeech(props.question);
    } else if (next === 'answer') {
      stopQuestionTimers();
      triggerAnswerSequence(prev === 'thinking');
    } else {
      stopQuestionTimers();
      stopThinkingTimer();
      stopAnswerStream();
      isInternalThinking.value = false;
      isAnswerComplete.value = false;
      streamedAnswer.value = props.answer;
      void nextTick(syncAllScrolls);
    }
  },
  { immediate: true }
);

watch(
  () => props.finished,
  val => {
    if (val) {
      stopThinkingTimer();
      stopAnswerStream();
      isInternalThinking.value = false;
      isAnswerComplete.value = true;
      streamedAnswer.value = props.answer;
      emit('phase-change', 'answered');
      void nextTick(syncAllScrolls);
    }
  }
);

watch(
  () => props.answer,
  val => {
    stopAnswerStream();
    streamedAnswer.value = val;
    void scrollAnswerToBottom();
  }
);

watch(
  () => props.question,
  val => {
    if (props.state === 'question') {
      startQuestionSpeech(val);
    }
  }
);

onMounted(() => {
  void nextTick(syncAllScrolls);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  stopQuestionTimers();
  stopThinkingTimer();
  stopAnswerStream();
});

const topBlueText = computed(() => {
  if (activeState.value === 'question') {
    if (props.listeningText?.trim()) return props.listeningText.trim();
    if (isQuestionSpoken.value && streamedQuestion.value) return streamedQuestion.value;
    if (props.appearanceOnly && props.question?.trim()) return props.question.trim();
    return '聆听中…';
  }
  return props.question?.trim() || '请介绍一下西湖景区的核心游览路线、特色景点以及公共便民服务？';
});

const topBlueKey = computed(() => {
  if (activeState.value === 'question' && !props.listeningText?.trim() && !isQuestionSpoken.value && (!props.appearanceOnly || !props.question?.trim())) {
    return 'listening';
  }
  return 'spoken-question';
});

const bottomAnswerText = computed(() => {
  if (activeState.value === 'question') return '';
  if (activeState.value === 'thinking' || isInternalThinking.value) return '思考中…';
  return props.clamp ? streamedAnswer.value : props.answer;
});

const bottomAnswerKey = computed(() => {
  if (activeState.value === 'thinking' || isInternalThinking.value) return 'thinking';
  return 'answer';
});

const answerLines = computed(() => {
  if (activeState.value !== 'answer') return 1;
  const len = Array.from(bottomAnswerText.value || '').length;
  return Math.min(4, Math.max(1, Math.ceil(len / 26)));
});
</script>

<style scoped>
/* 提问态：自适应紧凑高度；进入思考中时立即展开为最大高度 72cqh，回答态与历史态维持最大高度 */
.scene-qa-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex: 0 1 auto;
  width: 100%;
  height: auto;
  max-height: 72cqh;
  min-width: 0;
  min-height: 0;
  pointer-events: auto;
  transition: height 0.36s cubic-bezier(0.16, 1, 0.3, 1);
}
.scene-qa-card.is-thinking,
.scene-qa-card.is-answer {
  height: 72cqh;
  flex: 1 1 auto;
}
/* 查看历史展开交互框：高度变高为大概 600px，展示所有历史对话 */
.scene-qa-card.is-history {
  height: 600px !important; max-height: 600px !important; flex: 0 0 600px !important;
}
.scene-qa-card.is-idle {
  pointer-events: none;
}
/* 对话框按状态自适应：提问态自适应高度；进入思考中与回答态填满 72cqh，查看历史展开至 600px */
.scene-qa-surface {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 0;
  max-height: 72cqh;
  padding: var(--scene-dialog-padding-y, 24px) var(--scene-dialog-padding-x, 36px);
  border-radius: var(--scene-dialog-radius, 24px);
  border: 1.5px solid #FFFFFF;
  background:
    linear-gradient(135deg, rgba(221, 239, 255, 0.5) 0%, rgba(238, 240, 250, 0.5) 100%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4));
  background-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 16px rgba(35, 55, 83, 0.06), inset 0 1px 0 #FFFFFF;
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  overflow: hidden;
  transform-origin: center bottom;
  transition:
    height 0.36s cubic-bezier(0.16, 1, 0.3, 1),
    max-height 0.36s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
.scene-qa-card.is-thinking .scene-qa-surface,
.scene-qa-card.is-answer .scene-qa-surface {
  height: 100%;
  max-height: 100%;
  justify-content: space-between;
}
.scene-qa-card.is-history .scene-qa-surface {
  height: 600px; max-height: 600px;
  justify-content: space-between;
}

/* Editor samples have a fixed native line budget; their container height must
   not increase the number of visible lines. Runtime cards keep their layout. */
.scene-qa-card.has-line-limit:not(.is-history):is(.is-thinking, .is-answer) {
  height: auto;
  flex: 0 1 auto;
}
.scene-qa-card.has-line-limit:not(.is-history) .scene-qa-surface {
  height: auto;
}
.scene-qa-card.has-line-limit:not(.is-history) .scene-qa-answer-area {
  height: calc(var(--scene-qa-visible-lines) * var(--scene-dialog-font-size, 28px) * var(--scene-dialog-line-height, 1.5));
  max-height: calc(var(--scene-qa-visible-lines) * var(--scene-dialog-font-size, 28px) * var(--scene-dialog-line-height, 1.5));
  min-height: 0;
  flex: 0 1 auto;
}

/* 旋转淡蓝光带 (Border Beam) - 回答时绕着对话框边框匀速旋转，置于卡片最上层，四周宽度完全一致 */
.scene-qa-border-beam {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: 24px;
  padding: 2.5px;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 1;
  transition: opacity 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.scene-qa-card.is-idle .scene-qa-border-beam {
  opacity: 0;
}

.scene-qa-border-beam-runner {
  position: absolute;
  width: 280px;
  height: 280px;
  offset-path: rect(0 auto auto 0 round 24px);
  offset-anchor: 100% 50%;
  animation: scene-beam-spin 3.8s linear infinite;
  background: linear-gradient(
    to left,
    rgba(39, 155, 255, 0.35) 0%,
    rgba(16, 214, 251, 0.25) 40%,
    rgba(16, 214, 251, 0.06) 75%,
    transparent 100%
  );
  filter: drop-shadow(0 0 4px rgba(39, 155, 255, 0.3));
}

@keyframes scene-beam-spin {
  from {
    offset-distance: 0%;
  }
  to {
    offset-distance: 100%;
  }
}

@supports not (offset-path: rect(0 auto auto 0 round 24px)) {
  .scene-qa-border-beam-runner {
    top: 50%;
    left: 50%;
    width: 260%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    background: conic-gradient(
      from 0deg at 50% 50%,
      transparent 0deg,
      transparent 280deg,
      rgba(16, 214, 251, 0.02) 300deg,
      rgba(16, 214, 251, 0.1) 325deg,
      rgba(39, 155, 255, 0.22) 348deg,
      rgba(39, 155, 255, 0.35) 360deg
    );
    animation: scene-beam-conic-spin 3.8s linear infinite;
  }
}

@keyframes scene-beam-conic-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-qa-border-beam-runner {
    animation: none;
  }
}
.scene-qa-card.is-idle .scene-qa-surface {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
  pointer-events: none;
}

/* 提问与回答连在一起，问题与答案间无白色分割线 */
.scene-qa-question-row {
  flex-shrink: 0;
  min-width: 0;
}
.has-answer-row .scene-qa-question-row {
  padding-bottom: 6px;
  margin-bottom: 8px;
  border-bottom: none;
}

/* 用户提问蓝色渐变：0% #279BFF -> 100% #10D6FB */
.scene-qa-question {
  margin: 0;
  padding: 0;
  background: linear-gradient(90deg, #279BFF 0%, #10D6FB 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #279BFF;
  font-size: var(--scene-dialog-font-size, 28px);
  font-weight: 500;
  line-height: var(--scene-dialog-line-height, 1.5);
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  width: fit-content;
  max-width: 100%;
}

/* 回答区与提问连成一体：在思考中与回答态中填满卡片主体高度 */
.scene-qa-answer-area {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 滚动容器与极简悬浮胶囊滚动条（彻底隐藏系统原生滚动条） */
.scene-qa-scroll-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.scene-qa-answer {
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  padding-right: 12px;
  color: #1D2129;
  font-size: var(--scene-dialog-font-size, 28px);
  font-weight: 400;
  line-height: var(--scene-dialog-line-height, 1.5);
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
  word-break: break-all;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  transition: color 0.2s ease;
}
.scene-qa-answer::-webkit-scrollbar,
.scene-qa-history-list::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* 极简悬浮胶囊滚动条（无箭头、无底槽、圆角细滑块） */
.scene-qa-minimal-scrollbar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  right: 2px;
  width: 4px;
  min-width: 3px;
  border-radius: 999px;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease, width 0.18s ease, background-color 0.18s ease;
}
.scene-qa-minimal-scrollbar.is-visible,
.scene-qa-minimal-scrollbar:hover {
  opacity: 1;
  pointer-events: auto;
}
.scene-qa-minimal-scrollbar.is-dragging {
  width: 5px;
  min-width: 4px;
  background: rgba(107, 119, 133, 0.08);
}
.scene-qa-minimal-thumb {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 999px;
  background: rgba(107, 119, 133, 0.28);
  cursor: pointer;
  transition: background-color 0.18s ease, top 0.06s linear, height 0.18s ease;
}
.scene-qa-minimal-scrollbar.is-dragging .scene-qa-minimal-thumb {
  background: rgba(39, 155, 255, 0.58);
}

.scene-qa-answer.is-muted { color: #86909C; }
.scene-qa-answer-text { margin: 0; white-space: pre-wrap; }

/* 历史对话列表样式 */
.scene-qa-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 10px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}
.scene-qa-history-title {
  color: #1D2129;
  font-size: var(--scene-dialog-font-size, 28px);
  font-weight: 500;
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
}
.scene-qa-history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  padding-right: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scene-qa-history-item {
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(107, 119, 133, 0.2);
}
.scene-qa-history-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.scene-qa-history-q {
  margin: 0 0 6px;
  color: #1D2129;
  font-size: var(--scene-dialog-font-size, 28px);
  font-weight: 500;
  line-height: var(--scene-dialog-line-height, 1.5);
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
  width: fit-content;
  max-width: 100%;
}
.scene-qa-history-a {
  margin: 0;
  color: #1D2129;
  font-size: var(--scene-dialog-font-size, 28px);
  font-weight: 400;
  line-height: var(--scene-dialog-line-height, 1.5);
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
}

/* 框内右下角紧凑操作项：查看历史对话 */
.scene-qa-in-footer-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  flex-shrink: 0;
}
.scene-qa-card.can-show-history:not(.is-idle) .scene-qa-in-footer-collapse,
.scene-qa-card.is-history .scene-qa-in-footer-collapse {
  grid-template-rows: 1fr;
  opacity: 1;
}
.scene-qa-in-footer-inner {
  min-height: 0;
  overflow: hidden;
}
.scene-qa-in-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 10px;
}
.scene-qa-inline-btn.is-preview-only { cursor: default !important; pointer-events: none !important; opacity: 0.88; }
.scene-qa-inline-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #4E5969;
  font-size: var(--scene-dialog-font-size, 26px);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: var(--scene-dialog-letter-spacing, 0.07em);
  cursor: pointer;
  transition: color 0.18s ease;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
.scene-qa-inline-btn:hover {
  color: #165DFF;
}
.scene-qa-inline-btn:active {
  color: #0E42D2;
}
.scene-qa-inline-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.scene-qa-text-enter-active,
.scene-qa-text-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.scene-qa-text-enter-from {
  opacity: 0;
  transform: translateY(3px);
}
.scene-qa-text-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
.scene-qa-answer :deep(p + p) { margin-top: 2.4cqh; }
.scene-qa-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
