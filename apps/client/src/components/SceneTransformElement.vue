<template>
  <div class="scene-edit-element" :class="{ selected, locked }" :style="style" tabindex="0" :aria-label="label" @pointerdown="start($event, 'move')" @keydown="moveKey">
    <slot />
    <template v-if="selected">
      <div class="scene-element-label" :class="{ 'label-bottom': box.y < 3.5 }">
        <span class="truncate max-w-[120px]">{{ label }}</span>
        <button
          v-if="canDelete !== false"
          type="button"
          class="scene-element-delete-btn"
          title="删除图层"
          @click.stop="emit('remove')"
          @pointerdown.stop
        >
          <X :size="10" />
        </button>
      </div>
      <template v-if="!locked"><button v-for="corner in corners" :key="corner" type="button" :class="['scene-resize-handle', corner]" :aria-label="`缩放${label}${corner}`" @pointerdown.stop="start($event, corner)" /></template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
export interface ElementBox { x: number; y: number; w: number; h: number }
const props = defineProps<{
  box: ElementBox;
  selected: boolean;
  label: string;
  z: number;
  lockAspect?: boolean;
  locked?: boolean;
  canDelete?: boolean;
}>();
const emit = defineEmits<{
  select: [];
  activate: [];
  change: [box: ElementBox];
  remove: [];
}>();
const corners = ['nw', 'ne', 'sw', 'se'];
const style = computed(() => ({ left: `${props.box.x}%`, top: `${props.box.y}%`, width: `${props.box.w}%`, height: `${props.box.h}%`, zIndex: props.z }));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const moveKey = (event: KeyboardEvent) => {
  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault(); emit('activate'); return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (props.canDelete !== false) {
      event.preventDefault();
      emit('remove');
      return;
    }
  }
  const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (!delta[event.key]) return;
  event.preventDefault(); emit('select');
  if (props.locked) return;
  const [dx, dy] = delta[event.key]; const step = event.shiftKey ? 5 : 1;
  emit('change', { ...props.box, x: clamp(props.box.x + dx * step, -300, 300), y: clamp(props.box.y + dy * step, -300, 300) });
};
const start = (event: PointerEvent, mode: string) => {
  if (event.button !== 0) return;
  if (mode === 'move' && (event.target as Element).closest('.kingkong-rail-item')) return;
  event.preventDefault(); emit('select');
  const element = event.currentTarget as HTMLElement;
  (element.closest('.scene-edit-element') as HTMLElement)?.focus({ preventScroll: true });
  if (props.locked) return;
  const canvas = element.closest('.scene-edit-canvas') as HTMLElement;
  const rect = canvas.getBoundingClientRect();
  const original = { ...props.box }; const sx = event.clientX; const sy = event.clientY;
  element.setPointerCapture(event.pointerId);
  const move = (e: PointerEvent) => {
    const dx = (e.clientX - sx) / rect.width * 100, dy = (e.clientY - sy) / rect.height * 100;
    let next = { ...original };
    if (mode === 'move') {
      next.x = clamp(original.x + dx, -300, 300); next.y = clamp(original.y + dy, -300, 300);
    } else {
      const west = mode.includes('w'), north = mode.includes('n');
      let w = clamp(original.w + (west ? -dx : dx), 2, 300);
      let h = clamp(original.h + (north ? -dy : dy), 2, 300);
      if (props.lockAspect) {
        const factor = Math.abs(dx / original.w) >= Math.abs(dy / original.h) ? w / original.w : h / original.h;
        const bounded = clamp(factor, Math.max(2 / original.w, 2 / original.h), Math.min(300 / original.w, 300 / original.h));
        w = original.w * bounded; h = original.h * bounded;
      }
      next = { x: west ? original.x + original.w - w : original.x, y: north ? original.y + original.h - h : original.y, w, h };
    }
    emit('change', next);
  };
  let moved = false;
  const trackMovement = (e: PointerEvent) => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 5) moved = true; };
  const finish = (e: PointerEvent) => {
    element.removeEventListener('pointermove', move); element.removeEventListener('pointermove', trackMovement);
    element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', finish);
    if (e.type === 'pointerup' && mode === 'move' && !moved && Math.hypot(e.clientX - sx, e.clientY - sy) <= 5) emit('activate');
  };
  element.addEventListener('pointermove', trackMovement);
  element.addEventListener('pointermove', move); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', finish);
};
</script>
