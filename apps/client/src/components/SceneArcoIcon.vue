<template>
  <svg
    class="scene-arco-icon"
    :data-arco-icon="definition.name"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="butt"
    stroke-linejoin="miter"
    aria-hidden="true"
    focusable="false"
    :style="size ? { width: `${size}px`, height: `${size}px` } : undefined"
  >
    <component v-for="(shape, index) in definition.shapes" :is="shape.tag" :key="index" v-bind="shape.attrs" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import icons from './sceneArcoIcons.json';

// Exact outline paths from @arco-design/web-react 2.66.16, MIT.
// The Vue renderer shares these paths across the canvas, runtime and picker.
const props = defineProps<{ name: string; size?: number }>();
const definition = computed(() => icons[props.name] || icons.search);
</script>

<style scoped>
.scene-arco-icon { display: inline-block; width: 1em; height: 1em; flex-shrink: 0; vertical-align: middle; }
</style>
