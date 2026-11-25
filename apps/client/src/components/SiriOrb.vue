<template>
  <div
    ref="rootRef"
    class="siri-orb"
    :class="className"
    :style="styleObject"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

interface SiriOrbColors {
  bg?: string;
  c1?: string;
  c2?: string;
  c3?: string;
}

const props = withDefaults(
  defineProps<{
    size?: string;
    animationDuration?: number;
    colors?: SiriOrbColors;
    className?: string;
  }>(),
  {
    size: '96px',
    animationDuration: 20
  }
);

const defaultColors = {
  bg: '#ffffff',
  c1: 'oklch(82% 0.075 350)',
  c2: 'oklch(85% 0.065 200)',
  c3: 'oklch(83% 0.075 280)'
};

const finalColors = computed(() => ({
  ...defaultColors,
  ...props.colors
}));

const sizeValue = computed(() => {
  const match = String(props.size).match(/\d+/);
  return match ? parseInt(match[0], 10) : 96;
});

const blurAmount = computed(() => Math.max(sizeValue.value * 0.08, 2.5));
const contrastAmount = computed(() => Math.max(sizeValue.value * 0.003, 1.8));

const styleObject = computed(() => ({
  width: props.size,
  height: props.size,
  '--bg': finalColors.value.bg,
  '--c1': finalColors.value.c1,
  '--c2': finalColors.value.c2,
  '--c3': finalColors.value.c3,
  '--blur-amount': `${blurAmount.value}px`,
  '--contrast-amount': contrastAmount.value
}));

const rootRef = ref<HTMLDivElement>();
let currentAngle = 0;
let currentSpeed = 360 / Math.max(0.1, props.animationDuration || 20);
let lastTimestamp = 0;
let rafId = 0;

const updateAngle = (timestamp: number) => {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  const targetSpeed = 360 / Math.max(0.1, props.animationDuration || 20);
  // 平滑转速惯性插值，状态切换时速度自然过渡，角度严格连续，绝无断帧跳角度
  currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, dt * 6);
  currentAngle = (currentAngle + currentSpeed * dt) % 360;

  if (rootRef.value) {
    rootRef.value.style.setProperty('--angle', `${currentAngle.toFixed(2)}deg`);
  }

  rafId = requestAnimationFrame(updateAngle);
};

onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rafId = requestAnimationFrame(updateAngle);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
});
</script>

<style>
@property --angle {
  syntax: "<angle>";
  inherits: true;
  initial-value: 0deg;
}

.siri-orb {
  display: grid;
  grid-template-areas: "stack";
  overflow: hidden;
  border-radius: 50%;
  position: relative;
  background-color: #ffffff;
  background: var(--bg, #ffffff);
  box-sizing: border-box;
}

.dark .siri-orb {
  background-color: #ffffff;
  background: var(--bg, #ffffff);
}

.siri-orb::before {
  content: "";
  display: block;
  grid-area: stack;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  /* 经典流体渐变：全整型倍率 (1, -1, -2, 2, -1)，确保 360° 旋转到首尾完全闭环连贯 */
  background:
    conic-gradient(
      from calc(var(--angle) * 1) at 30% 65%,
      var(--c3) 0deg,
      transparent 45deg 315deg,
      var(--c3) 360deg
    ),
    conic-gradient(
      from calc(var(--angle) * -1) at 70% 35%,
      var(--c2) 0deg,
      transparent 60deg 300deg,
      var(--c2) 360deg
    ),
    conic-gradient(
      from calc(var(--angle) * -2) at 65% 75%,
      var(--c1) 0deg,
      transparent 90deg 270deg,
      var(--c1) 360deg
    ),
    conic-gradient(
      from calc(var(--angle) * 2) at 25% 25%,
      var(--c2) 0deg,
      transparent 30deg 330deg,
      var(--c2) 360deg
    ),
    conic-gradient(
      from calc(var(--angle) * -1) at 80% 80%,
      var(--c1) 0deg,
      transparent 45deg 315deg,
      var(--c1) 360deg
    ),
    radial-gradient(
      ellipse 120% 80% at 40% 60%,
      var(--c3) 0%,
      transparent 50%
    );
  filter: blur(var(--blur-amount)) contrast(var(--contrast-amount)) saturate(1.2);
  transform: translateZ(0);
  will-change: transform;
}

.siri-orb::after {
  content: "";
  display: block;
  grid-area: stack;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 45% 55%,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 30%,
    transparent 60%
  );
  mix-blend-mode: overlay;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .siri-orb::before {
    animation: none;
  }
}
</style>
