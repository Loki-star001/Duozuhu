<template>
  <div ref="picker" class="hall-picker" @focusout="onFocusOut">
    <button ref="trigger" type="button" class="picker-trigger" aria-label="选择展厅"
      aria-haspopup="listbox" :aria-expanded="open" :aria-controls="open ? listId : undefined"
      @click="open ? dismiss(true) : show()" @keydown.down.prevent="show" @keydown.up.prevent="show">
      <span>{{ options.halls.find(hall => hall.id === value)?.title }}</span>
      <ChevronDown :size="22" aria-hidden="true" />
    </button>
    <Transition name="hall-options">
      <div v-if="open" ref="list" :id="listId" role="listbox" aria-label="可选展厅" class="picker-list"
        @keydown.esc.stop.prevent="dismiss(true)">
        <button v-for="(hall, index) in options.halls" :key="hall.id" type="button" role="option"
          :aria-selected="value === hall.id" :tabindex="index === cursor ? 0 : -1"
          @click="choose(hall.id)" @keydown.down.prevent="focusAt(index + 1)"
          @keydown.up.prevent="focusAt(index - 1)" @keydown.home.prevent="focusAt(0)"
          @keydown.end.prevent="focusAt(options.halls.length - 1)">
          {{ hall.title }}<Check v-if="value === hall.id" :size="22" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';
import type { halls } from './exhibitionContent';

type Hall = typeof halls[number];
const options = defineProps<{ halls: readonly Hall[] }>();
const value = defineModel<Hall['id']>({ required: true });
const open = ref(false);
const cursor = ref(0);
const picker = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const list = ref<HTMLElement>();
const listId = useId();
function focusAt(index: number) {
  cursor.value = (index + options.halls.length) % options.halls.length;
  list.value?.querySelectorAll('button')[cursor.value]?.focus({ preventScroll: true });
}
async function show() {
  open.value = true;
  await nextTick();
  if (open.value) focusAt(Math.max(0, options.halls.findIndex(hall => hall.id === value.value)));
}
function dismiss(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus({ preventScroll: true });
}
function choose(id: Hall['id']) {
  value.value = id;
  dismiss(true);
}
function onOutside(event: PointerEvent) {
  if (open.value && picker.value && !event.composedPath().includes(picker.value)) dismiss();
}
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && !picker.value?.contains(event.relatedTarget)) dismiss();
}
onMounted(() => document.addEventListener('pointerdown', onOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside));
</script>

<style scoped>
.hall-picker { position: relative; z-index: 2; }
.picker-trigger, .picker-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 52px;
  padding: 8px 16px;
  border-radius: 15px;
  color: var(--exhibit-muted);
  font-size: var(--exhibit-body);
  touch-action: manipulation;
}
.picker-trigger { background: #f2f4f8; }
.picker-trigger[aria-expanded=true], .picker-list [aria-selected=true] {
  color: #0456d1;
  background: var(--exhibit-accent-tint);
}
.picker-trigger svg { transition: transform 160ms ease; }
.picker-trigger[aria-expanded=true] svg { transform: rotate(180deg); }
.picker-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: max-content;
  min-width: max(100%, 228px);
  padding: 8px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #e6e9f0;
  box-shadow: 0 8px 24px #2126301a;
  transform-origin: top left;
}
.picker-list button { width: 100%; min-height: 58px; color: var(--exhibit-ink); }
.picker-list button + button { margin-top: 4px; }
.picker-list button:active, .picker-trigger:active { background: #d2e3ff; }
.hall-picker button:focus-visible { outline: 2px solid var(--exhibit-accent); outline-offset: -2px; }
.hall-options-enter-active, .hall-options-leave-active { transition: opacity 130ms, transform 130ms; }
.hall-options-enter-from, .hall-options-leave-to { opacity: 0; transform: translateY(-5px) scale(.97); }
.hall-options-leave-active { pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .picker-trigger svg, .hall-options-enter-active, .hall-options-leave-active { transition: none; }
}
</style>
