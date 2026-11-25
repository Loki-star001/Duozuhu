<template>
  <!-- 展开后：光球嵌在输入条左侧，右侧保留键盘、发送和停止操作。 -->
  <form ref="formRef" v-bind="$attrs" data-scene-presentation class="scene-qa-input" @pointerdown.stop="emit('activity')" @keydown.stop="emit('activity')" @submit.prevent="submitInput">
    <div class="scene-qa-input-bar">
      <slot name="orb" />
      <input
        v-if="editable || keyboardOpen"
        ref="fieldRef"
        :value="modelValue"
        type="text"
        class="scene-qa-input-field"
        :placeholder="placeholder"
        :disabled="disabled"
        maxlength="200"
        autocomplete="off"
        :inputmode="keyboardOpen ? 'none' : 'text'"
        @select="rememberSelection" @click="openFromField" @keyup="rememberSelection"
        @compositionstart="composing = true" @compositionend="composing = false"
        @keydown.enter="guardComposition"
        aria-label="输入问题"
        @input="handleInput"
      />
      <span v-else class="scene-qa-input-field is-static">{{ placeholder }}</span>
      <button
        v-if="(editable || keyboardOpen) && modelValue?.trim() && !stoppable"
        type="submit"
        class="scene-qa-input-action is-send"
        aria-label="发送消息"
        :disabled="disabled"
      >
        <svg class="scene-qa-input-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M42 6 22 26" />
          <path d="M42 6 28 42 22 26 6 20 42 6Z" />
        </svg>
      </button>
      <button
        v-else-if="stoppable"
        type="button"
        class="scene-qa-input-action is-stop"
        aria-label="停止回答"
        @pointerdown.stop
        @click.stop="emit('stop')"
      >
        <svg class="scene-qa-input-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="20" stroke="#F53F3F" stroke-width="4" />
          <rect x="16" y="16" width="16" height="16" rx="3" fill="#F53F3F" />
        </svg>
      </button>
      <button
        v-else
        type="button"
        class="scene-qa-input-action"
        aria-label="软键盘输入"
        :aria-expanded="keyboardOpen"
        :disabled="disabled"
        @pointerdown.prevent
        @click="toggleKeyboard"
      >
        <svg class="scene-qa-input-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="6" y="10" width="36" height="28" rx="2" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
          <g fill="currentColor">
            <rect x="10" y="16" width="4" height="4" /><rect x="18" y="16" width="4" height="4" /><rect x="26" y="16" width="4" height="4" /><rect x="34" y="16" width="4" height="4" />
            <rect x="10" y="23" width="4" height="4" /><rect x="18" y="23" width="4" height="4" /><rect x="26" y="23" width="4" height="4" /><rect x="34" y="23" width="4" height="4" />
            <rect x="16" y="30" width="16" height="4" />
          </g>
        </svg>
      </button>
    </div>
  </form>
  <Teleport v-if="keyboardOpen && keyboardTarget" :to="keyboardTarget">
    <SceneTouchKeyboard :model-value="modelValue" :start="selection.start" :end="selection.end" :phrases="phrases"
      :anchor-el="formRef" :target-el="keyboardTarget"
      @edit="editFromKeyboard" @close="closeKeyboard" @submit="submitInput" @activity="emit('activity')" @height="height => emit('keyboard-height', height)" />
  </Teleport>
</template>

<script setup lang="ts">
import { defineAsyncComponent, nextTick, onBeforeUnmount, reactive, ref, shallowRef } from 'vue';
import { Send } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    editable?: boolean;
    modelValue?: string;
    disabled?: boolean;
    stoppable?: boolean;
    phrases?: string[];
  }>(),
  {
    placeholder: '点击左侧，开启对话交流',
    editable: false,
    modelValue: '',
    disabled: false,
    stoppable: false
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string]; submit: []; stop: [];
  'keyboard-change': [open: boolean]; 'keyboard-height': [height: number]; activity: [];
}>();
const SceneTouchKeyboard = defineAsyncComponent(() => import('./SceneTouchKeyboard.vue'));
const fieldRef = ref<HTMLInputElement>(), formRef = ref<HTMLFormElement>();
const keyboardTarget = shallowRef<HTMLElement>();
const keyboardOpen = ref(false), composing = ref(false);
const selection = reactive({ start: 0, end: 0 });
const rememberSelection = () => {
  selection.start = fieldRef.value?.selectionStart ?? props.modelValue.length;
  selection.end = fieldRef.value?.selectionEnd ?? selection.start;
};
const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
  rememberSelection(); emit('activity');
};
const guardComposition = (event: KeyboardEvent) => {
  if (event.isComposing || composing.value || event.keyCode === 229) event.preventDefault();
};
const closeKeyboard = () => {
  if (!keyboardOpen.value) return;
  keyboardOpen.value = false; emit('keyboard-change', false); emit('activity');
};
const toggleKeyboard = async () => {
  if (keyboardOpen.value) { closeKeyboard(); return; }
  keyboardTarget.value = formRef.value?.closest<HTMLElement>('.kiosk-screen,.scene-edit-canvas');
  if (!keyboardTarget.value) return;
  rememberSelection(); keyboardOpen.value = true; emit('keyboard-change', true); emit('activity');
  await nextTick(); fieldRef.value?.focus({ preventScroll: true });
};
const openFromField = () => {
  rememberSelection();
  if (!keyboardOpen.value) void toggleKeyboard();
};
const editFromKeyboard = async (value: string, cursor: number) => {
  selection.start = selection.end = cursor;
  emit('update:modelValue', value); emit('activity');
  await nextTick(); fieldRef.value?.setSelectionRange(cursor, cursor);
};
const submitInput = () => { if (!composing.value) emit('submit'); };
onBeforeUnmount(closeKeyboard);
defineExpose({ focus: () => fieldRef.value?.focus(), closeKeyboard, openKeyboard: toggleKeyboard });
</script>

<style scoped>
.scene-qa-input {
  width: 100%; height: 100%; min-width: 0; min-height: 0;
  margin: 0; container-type: size; pointer-events: auto;
}
.scene-qa-input-bar {
  display: flex; align-items: center; gap: 20cqh;
  width: 100%; height: 100%; box-sizing: border-box;
  padding: 0 32cqh 0 16cqh;
  border-radius: var(--scene-dialog-radius, 24px);
  border: var(--scene-control-glass-border, 1.5px solid #fff);
  background: var(--scene-control-glass-background, linear-gradient(160deg, rgba(255,255,255,.86), rgba(246,249,255,.74)));
  box-shadow: var(--scene-control-glass-shadow, 0 4px 16px rgba(35,55,83,.07), inset 0 1px 0 #fff);
  backdrop-filter: blur(var(--scene-control-glass-blur, 14px)); -webkit-backdrop-filter: blur(var(--scene-control-glass-blur, 14px));
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
.scene-qa-input-field {
  flex: 1 1 0; min-width: 0; height: 100%; padding: 0; border: 0 !important;
  outline: none !important; box-shadow: none !important; background: transparent; color: #1D2129;
  font-size: var(--scene-input-font-size,24px); line-height: 1.5; letter-spacing: .02em;
}
.scene-qa-input-field:focus, .scene-qa-input-field:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: 0 !important;
}
.scene-qa-input-field::placeholder, .scene-qa-input-field.is-static { color: #4E5969; }
.scene-qa-input-field.is-static {
  display: flex; align-items: center; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; user-select: none;
}
.scene-qa-input-action {
  display: grid; place-items: center; flex-shrink: 0; width: 64px; height: 64px;
  padding: 0; margin-right: -4cqh; border: 0; border-radius: 8cqh;
  background: transparent; color: #263B52; cursor: pointer; touch-action: manipulation;
  transition: transform .18s ease, opacity .18s ease;
}
.scene-qa-input-action.is-stop { color: #F53F3F; }
.scene-qa-input-action:active { transform: scale(.96); }
.scene-qa-input-action:focus-visible { outline: 3px solid #165DFF; outline-offset: 4px; }
.scene-qa-input-action.is-send {
  background: transparent;
  color: #165DFF;
}
.scene-qa-input-action.is-send:hover {
  color: #279BFF;
}
.scene-qa-input-action.is-send:active {
  color: #0E42D2;
}
.scene-qa-input-icon { width: var(--scene-icon-small-size,40px); height: var(--scene-icon-small-size,40px); }
</style>
