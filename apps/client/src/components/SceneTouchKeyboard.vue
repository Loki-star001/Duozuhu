<template>
  <section
    ref="keyboardRef"
    class="scene-touch-keyboard"
    :class="{ 'is-dragging': isDragging }"
    :style="keyboardStyle"
    aria-label="屏幕键盘"
    @pointerdown="emit('activity')"
    @click.stop
    @keydown.stop="emit('activity')"
  >
    <!-- 顶部拖拽把手：用户可拖拽移动键盘位置 -->
    <div
      class="scene-keyboard-drag-handle"
      aria-label="拖动键盘"
      title="按住拖拽移动键盘"
      @pointerdown="startDrag"
    >
      <span class="scene-keyboard-drag-pill" />
    </div>

    <div class="scene-keyboard-candidates" @pointerdown="handleHeaderPointerDown">
      <span class="scene-keyboard-composition" aria-live="polite">{{ composition || (language === 'zh' ? '中文拼音' : 'English') }}</span>
      <div class="scene-keyboard-candidate-list">
        <button v-for="candidate in pageCandidates" :key="candidate.text" type="button" :aria-label="`候选词 ${candidate.text}`" @click="choose(candidate)">{{ candidate.text }}</button>
      </div>
      <template v-if="candidates.length > pageSize">
        <button type="button" class="scene-keyboard-page" aria-label="上一页候选词" :disabled="page === 0" @click="page--"><ChevronLeft :size="32" /></button>
        <button type="button" class="scene-keyboard-page" aria-label="下一页候选词" :disabled="(page + 1) * pageSize >= candidates.length" @click="page++"><ChevronRight :size="32" /></button>
      </template>
      <button type="button" class="scene-keyboard-close" aria-label="收起键盘" @click="close"><ChevronDown :size="40" /></button>
    </div>
    <div class="scene-keyboard-row">
      <button v-for="key in numberKeys" :key="key" type="button" :aria-label="`输入 ${key}`" @click="press(key)">{{ key }}</button>
    </div>
    <div v-for="(row, index) in letterRows" :key="index" class="scene-keyboard-row" :class="{ 'is-middle': !symbols && index === 1 }">
      <button v-if="index === 2 && !symbols" type="button" class="scene-keyboard-modifier" aria-label="切换大小写" :aria-pressed="uppercase" @click="toggleUppercase"><ArrowUp :size="32" /></button>
      <button v-for="key in row" :key="key" type="button" :aria-label="`输入 ${key}`" @click="press(key)">{{ key }}</button>
      <button v-if="index === 2" type="button" class="scene-keyboard-modifier" aria-label="退格" @click="backspace"><Delete :size="36" /></button>
    </div>
    <div class="scene-keyboard-row scene-keyboard-bottom">
      <button type="button" class="scene-keyboard-modifier" aria-label="切换中英文" @click="toggleLanguage">{{ language === 'zh' ? '中 / EN' : 'EN / 中' }}</button>
      <button type="button" class="scene-keyboard-modifier" aria-label="切换字母与符号" @click="toggleSymbols">{{ symbols ? 'ABC' : '#+=' }}</button>
      <button type="button" :aria-label="`输入 ${language === 'zh' ? '，' : ','}`" @click="press(language === 'zh' ? '，' : ',')">{{ language === 'zh' ? '，' : ',' }}</button>
      <button type="button" class="scene-keyboard-space" aria-label="空格" @click="space">空格</button>
      <button type="button" :aria-label="`输入 ${language === 'zh' ? '。' : '.'}`" @click="press(language === 'zh' ? '。' : '.')">{{ language === 'zh' ? '。' : '.' }}</button>
      <button type="button" class="scene-keyboard-send" aria-label="键盘发送问题" :disabled="!modelValue.trim() && !composition" @click="submit">发送</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Delete } from 'lucide-vue-next';
import { pinyinCandidates, type PinyinCandidate } from './keyboardPinyin';
import { deleteKeyboardSelection, replaceKeyboardSelection } from './keyboardEditing';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    start?: number;
    end?: number;
    phrases?: string[];
    anchorEl?: HTMLElement | null;
    targetEl?: HTMLElement | null;
  }>(),
  {
    start: 0,
    end: 0,
    phrases: () => [],
    anchorEl: null,
    targetEl: null
  }
);

const emit = defineEmits<{
  edit: [value: string, cursor: number];
  close: [];
  submit: [];
  activity: [];
  height: [height: number];
}>();

const keyboardRef = ref<HTMLElement>();
let observer: ResizeObserver | undefined;

// 键盘拖拽移动与默认定位位置（默认在输入框下面一点位置）
const position = ref<{ x: number; y: number } | null>(null);
const isDragging = ref(false);
const isUserMoved = ref(false);

const initPosition = () => {
  if (isUserMoved.value && position.value) return;
  if (!keyboardRef.value) return;
  const target = props.targetEl || keyboardRef.value.parentElement;
  if (!target) return;

  const targetRect = target.getBoundingClientRect();
  const kw = keyboardRef.value.offsetWidth || 960;
  const kh = keyboardRef.value.offsetHeight || 420;
  const containerWidth = target.offsetWidth || 1080;
  const containerHeight = target.offsetHeight || 1920;
  const scaleX = targetRect.width / containerWidth || 1;
  const scaleY = targetRect.height / containerHeight || 1;

  let initX = (containerWidth - kw) / 2;
  let initY = containerHeight - kh - 24;

  if (props.anchorEl) {
    const anchorRect = props.anchorEl.getBoundingClientRect();
    const relLeft = (anchorRect.left - targetRect.left) / scaleX;
    const relTop = (anchorRect.top - targetRect.top) / scaleY;
    const relBottom = (anchorRect.bottom - targetRect.top) / scaleY;
    const relWidth = anchorRect.width / scaleX;

    // 默认在输入框下面一点位置 (约 16px 间隙)
    const gap = 16;
    const belowY = relBottom + gap;
    const maxPossibleY = containerHeight - kh - 16;

    if (belowY <= maxPossibleY) {
      initY = belowY;
    } else {
      const aboveY = relTop - kh - gap;
      if (aboveY >= 16) {
        initY = aboveY;
      } else {
        initY = Math.max(16, maxPossibleY);
      }
    }

    // 水平居中对齐输入框，同时限制在视口内
    initX = relLeft + (relWidth - kw) / 2;
  }

  const minX = 16;
  const maxX = Math.max(minX, containerWidth - kw - 16);
  const minY = 16;
  const maxY = Math.max(minY, containerHeight - kh - 16);

  position.value = {
    x: Math.max(minX, Math.min(initX, maxX)),
    y: Math.max(minY, Math.min(initY, maxY))
  };
};

let dragStartPointer = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return;
  if (!keyboardRef.value) return;

  emit('activity');
  isDragging.value = true;
  isUserMoved.value = true;

  if (!position.value) {
    initPosition();
  }
  dragStartPos = {
    x: position.value?.x ?? 24,
    y: position.value?.y ?? 1000
  };
  dragStartPointer = {
    x: event.clientX,
    y: event.clientY
  };

  const target = (event.currentTarget as HTMLElement) || keyboardRef.value;
  try {
    target.setPointerCapture(event.pointerId);
  } catch {}

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging.value || !keyboardRef.value) return;
    const host = props.targetEl || keyboardRef.value.parentElement;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    const containerW = host.offsetWidth || 1080;
    const containerH = host.offsetHeight || 1920;
    const scaleX = hostRect.width / containerW || 1;
    const scaleY = hostRect.height / containerH || 1;

    const dx = (e.clientX - dragStartPointer.x) / scaleX;
    const dy = (e.clientY - dragStartPointer.y) / scaleY;

    const kw = keyboardRef.value.offsetWidth || 960;
    const kh = keyboardRef.value.offsetHeight || 420;

    const minX = 12;
    const maxX = Math.max(minX, containerW - kw - 12);
    const minY = 12;
    const maxY = Math.max(minY, containerH - kh - 12);

    position.value = {
      x: Math.max(minX, Math.min(dragStartPos.x + dx, maxX)),
      y: Math.max(minY, Math.min(dragStartPos.y + dy, maxY))
    };
    emit('activity');
  };

  const onPointerUp = (e: PointerEvent) => {
    isDragging.value = false;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {}
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerUp);
  };

  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerUp);
};

const handleHeaderPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button')) return;
  startDrag(event);
};

const keyboardStyle = computed(() => {
  if (!position.value) {
    return {
      opacity: 0,
      pointerEvents: 'none' as const
    };
  }
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    bottom: 'auto',
    right: 'auto',
    opacity: 1
  };
});

onMounted(() => {
  observer = new ResizeObserver(() => {
    if (keyboardRef.value) {
      emit('height', keyboardRef.value.offsetHeight);
      if (!isUserMoved.value && !position.value) {
        initPosition();
      }
    }
  });
  if (keyboardRef.value) observer.observe(keyboardRef.value);
  void nextTick(initPosition);
});

onBeforeUnmount(() => observer?.disconnect());

const language = ref<'zh' | 'en'>('zh'), symbols = ref(false), uppercase = ref(false), composition = ref(''), page = ref(0);
const pageSize = 6;
const candidates = computed(() => composition.value ? pinyinCandidates(composition.value, props.phrases) : []);
const pageCandidates = computed(() => candidates.value.slice(page.value * pageSize, (page.value + 1) * pageSize));
watch(composition, () => { page.value = 0; });
const numberKeys = Array.from('1234567890');
const letterRows = computed(() => symbols.value
  ? [Array.from('@#$%&*()-='), Array.from('!?/\\:;\'"[]'), Array.from('{}<>_+~`|')]
  : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map(row => Array.from(language.value === 'en' && uppercase.value ? row.toUpperCase() : row)));
const edit = (change: { value: string; cursor: number }) => { emit('activity'); emit('edit', change.value, change.cursor); };
const insert = (text: string) => edit(replaceKeyboardSelection(props.modelValue, text, props.start, props.end));
const choose = (candidate: PinyinCandidate) => {
  insert(candidate.text);
  composition.value = composition.value.slice(candidate.consumed);
};
const commit = () => {
  if (!composition.value) return;
  let remaining = composition.value, value = props.modelValue, start = props.start, end = props.end;
  while (remaining) {
    const next = pinyinCandidates(remaining, props.phrases)[0];
    const result = replaceKeyboardSelection(value, next?.text || remaining, start, end);
    value = result.value; start = end = result.cursor;
    remaining = next ? remaining.slice(next.consumed) : '';
  }
  composition.value = '';
  edit({ value, cursor: start });
};
const press = async (key: string) => {
  emit('activity');
  if (language.value === 'zh' && !symbols.value && /^[a-z]$/.test(key)) {
    if (composition.value.length < 24) composition.value += key;
  } else {
    if (composition.value) { commit(); await nextTick(); }
    insert(key);
  }
};
const backspace = () => {
  emit('activity');
  if (composition.value) composition.value = composition.value.slice(0, -1);
  else edit(deleteKeyboardSelection(props.modelValue, props.start, props.end));
};
const space = () => { emit('activity'); if (composition.value) choose(candidates.value[0] || { text: composition.value, consumed: composition.value.length }); else insert(' '); };
const toggleLanguage = () => { commit(); language.value = language.value === 'zh' ? 'en' : 'zh'; symbols.value = false; emit('activity'); };
const toggleSymbols = () => { commit(); symbols.value = !symbols.value; emit('activity'); };
const toggleUppercase = () => { commit(); language.value = 'en'; uppercase.value = !uppercase.value; emit('activity'); };
const close = () => { commit(); emit('close'); };
const submit = async () => { commit(); await nextTick(); emit('submit'); };
</script>

<style scoped>
.scene-touch-keyboard {
  position: absolute;
  width: min(960px, calc(100% - 32px));
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 20px 20px;
  box-sizing: border-box;
  border: 1.5px solid rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  background: rgba(244, 248, 253, 0.98);
  color: #263B52;
  box-shadow: 0 12px 40px rgba(35, 55, 83, 0.16), 0 2px 8px rgba(35, 55, 83, 0.08);
  pointer-events: auto;
  touch-action: none;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  user-select: none;
  -webkit-user-select: none;
  transition: box-shadow 0.2s ease;
}

.scene-touch-keyboard.is-dragging {
  box-shadow: 0 18px 56px rgba(35, 55, 83, 0.28), 0 4px 16px rgba(35, 55, 83, 0.12);
}

.scene-keyboard-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 18px;
  cursor: grab;
  touch-action: none;
  padding-bottom: 2px;
}

.scene-keyboard-drag-handle:active,
.scene-touch-keyboard.is-dragging .scene-keyboard-drag-handle {
  cursor: grabbing;
}

.scene-keyboard-drag-pill {
  width: 54px;
  height: 5px;
  border-radius: 999px;
  background: rgba(107, 119, 133, 0.28);
  transition: background 0.18s ease, transform 0.18s ease;
}

.scene-keyboard-drag-handle:hover .scene-keyboard-drag-pill {
  background: rgba(39, 155, 255, 0.65);
  transform: scaleX(1.1);
}

.scene-keyboard-candidates {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  margin-bottom: 6px;
  min-width: 0;
  cursor: grab;
}

.scene-keyboard-candidates:active {
  cursor: grabbing;
}

.scene-keyboard-composition {
  max-width: 180px;
  font-size: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-keyboard-candidate-list {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  overflow: auto;
  scrollbar-width: none;
}

.scene-keyboard-candidate-list button {
  flex-shrink: 0;
  min-width: 56px;
  height: 52px;
  padding: 0 12px;
  font-size: 28px;
}

.scene-keyboard-row {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.scene-keyboard-row.is-middle {
  padding: 0 48px;
}

button {
  margin: 0;
  border: 0;
  border-radius: 10px;
  color: inherit;
  background: #fff;
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
}

.scene-keyboard-row button {
  flex: 1 1 0;
  min-width: 0;
  height: 64px;
  padding: 0 8px;
  display: grid;
  place-items: center;
  font-size: 28px;
}

.scene-keyboard-row .scene-keyboard-modifier {
  flex: 1.3 1 0;
  background: #E4EAF2;
  font-size: 24px;
}

.scene-keyboard-bottom .scene-keyboard-space {
  flex: 4 1 0;
  font-size: 24px;
}

.scene-keyboard-bottom .scene-keyboard-send {
  flex: 1.6 1 0;
  background: #165DFF;
  color: #fff;
  font-size: 24px;
}

.scene-keyboard-close,
.scene-keyboard-page {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  background: transparent;
}

.scene-keyboard-page {
  width: 40px;
}

button:active {
  background: #DDE9FC;
}

button:focus-visible {
  outline: 3px solid #165DFF;
  outline-offset: -3px;
}

button:disabled {
  opacity: .35;
  cursor: default;
}

.scene-keyboard-send:active {
  background: #0E42D2;
}
</style>
