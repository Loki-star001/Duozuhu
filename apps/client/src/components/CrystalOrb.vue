<template>
  <div class="crystal-orb" :style="orbStyle" aria-hidden="true">
    <div class="crystal-halo crystal-halo-northwest" />
    <div class="crystal-halo crystal-halo-southeast" />
    <div ref="shellRef" class="crystal-shell">
      <div class="crystal-flow" />
      <div class="crystal-volume" />
      <div class="crystal-stream crystal-stream-far" />
      <div class="crystal-stream crystal-stream-near" />
      <div class="crystal-light crystal-light-northwest" />
      <div class="crystal-light crystal-light-southeast" />
      <div class="crystal-rim" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { advanceCrystalMotion, createCrystalMotion, type CrystalState } from './crystalMotion';

const props = withDefaults(defineProps<{ size?: string; animationDuration?: number; state?: CrystalState }>(), {
  size: '96px',
  animationDuration: 45,
  state: 'idle',
});

const orbStyle = computed(() => ({
  width: props.size,
  height: props.size,
  '--crystal-unit': `${Math.max(0.28, (parseFloat(props.size) || 96) / 100)}px`,
}));

const shellRef = ref<HTMLDivElement>();
let motion = createCrystalMotion(props.animationDuration), lastTimestamp = 0, frame = 0;
const animate = (timestamp: number) => {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, .1);
  lastTimestamp = timestamp;
  motion = advanceCrystalMotion(motion, props.state, props.animationDuration, dt);
  const shell = shellRef.value;
  if (shell) {
    shell.style.setProperty('--crystal-angle', `${motion.angle.toFixed(3)}deg`);
    shell.style.setProperty('--crystal-stream-angle', `${motion.streamAngle.toFixed(3)}deg`);
    shell.style.setProperty('--crystal-stream-strength', (motion.strength * (.92 + Math.sin(motion.phase) * .08)).toFixed(4));
    shell.style.setProperty('--crystal-stream-softness', `${motion.softness.toFixed(3)}`);
  }
  frame = requestAnimationFrame(animate);
};

onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) frame = requestAnimationFrame(animate);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.crystal-orb { position:relative; flex-shrink:0; isolation:isolate; border-radius:50%; pointer-events:none; }
.crystal-shell {
  --crystal-angle:24deg;
  --crystal-stream-angle:24deg;
  --crystal-stream-strength:0;
  --crystal-stream-softness:4;
  position:absolute; inset:0; overflow:hidden; border-radius:50%; isolation:isolate;
  background-color:#7796C3;
  background-image:
    radial-gradient(ellipse at 76% 24%,rgba(39,62,105,.27),transparent 62%),
    radial-gradient(ellipse at 34% 73%,rgba(129,169,228,.32),transparent 68%),
    linear-gradient(140deg,#789BC4,#7194C8 48%,#9894C6);
  box-shadow:
    inset calc(2 * var(--crystal-unit)) calc(3 * var(--crystal-unit)) calc(8 * var(--crystal-unit)) rgba(231,249,255,.48),
    inset calc(-2 * var(--crystal-unit)) calc(-3 * var(--crystal-unit)) calc(9 * var(--crystal-unit)) rgba(202,219,255,.62),
    inset 0 0 calc(2 * var(--crystal-unit)) rgba(245,252,255,.9);
}
.crystal-flow {
  position:absolute; inset:-18%; border-radius:50%; opacity:.42;
  background:
    conic-gradient(from 0deg at 50% 50%,rgba(116,150,225,.05),rgba(91,151,222,.45) 70deg,rgba(170,161,235,.40) 160deg,rgba(97,153,219,.12) 260deg,rgba(116,150,225,.05) 360deg);
  filter:blur(calc(5 * var(--crystal-unit)));
  transform:rotate(var(--crystal-angle)); will-change:transform;
}
.crystal-volume {
  position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background:
    radial-gradient(ellipse 42% 32% at 36% 42%,rgba(141,213,247,.45),transparent 75%),
    radial-gradient(ellipse 58% 48% at 42% 42%,rgba(39,66,113,.13),transparent 78%),
    radial-gradient(ellipse 72% 46% at 54% 93%,rgba(191,183,246,.52),transparent 78%),
    radial-gradient(ellipse 75% 65% at 49% 44%,transparent 45%,rgba(210,235,255,.17) 76%,rgba(245,249,255,.36));
}
.crystal-stream {
  position:absolute; inset:-20%; border-radius:50%; pointer-events:none;
  opacity:var(--crystal-stream-strength); mix-blend-mode:screen;
  background:conic-gradient(from 0deg at 50% 50%,
    transparent 0deg 32deg,rgba(72,152,228,.06) 58deg,rgba(82,166,240,.42) 84deg,
    rgba(100,180,248,.52) 101deg,rgba(75,145,225,.28) 123deg,transparent 153deg 215deg,
    rgba(138,126,225,.08) 241deg,rgba(148,136,236,.42) 265deg,rgba(162,148,245,.48) 281deg,
    rgba(118,126,220,.20) 308deg,transparent 338deg 360deg);
  mask-image:radial-gradient(ellipse 50% 44% at 50% 50%,transparent 33%,#000 52%,#000 67%,transparent 85%);
  -webkit-mask-image:radial-gradient(ellipse 50% 44% at 50% 50%,transparent 33%,#000 52%,#000 67%,transparent 85%);
  filter:blur(calc(var(--crystal-stream-softness) * var(--crystal-unit)));
  will-change:transform,opacity;
}
.crystal-stream-near { transform:rotate(var(--crystal-stream-angle)); }
.crystal-stream-far {
  inset:-12%; opacity:calc(var(--crystal-stream-strength) * .48);
  transform:rotate(calc(var(--crystal-stream-angle) * -1 + 110deg)) scale(.82,1.12);
  filter:blur(calc((var(--crystal-stream-softness) + 1.5) * var(--crystal-unit)));
}
/* These two light sources stay anchored; only the inner refraction rotates. */
.crystal-light { position:absolute; inset:0; border-radius:50%; mix-blend-mode:screen; pointer-events:none; }
.crystal-light-northwest {
  background:
    radial-gradient(ellipse 12% 15% at 23% 23%,rgba(255,255,255,.97),rgba(230,255,255,.76) 36%,rgba(194,245,255,.16) 72%,transparent),
    radial-gradient(ellipse 27% 30% at 25% 24%,rgba(204,252,255,.85),rgba(166,226,255,.5) 42%,rgba(166,226,255,.12) 73%,transparent),
    radial-gradient(ellipse 48% 39% at 27% 25%,rgba(173,229,255,.44),rgba(173,229,255,.16) 47%,transparent 90%);
  filter:blur(calc(3.5 * var(--crystal-unit)));
}
.crystal-light-southeast {
  background:
    radial-gradient(ellipse 13% 16% at 77% 79%,rgba(255,255,255,.98),rgba(233,252,255,.8) 38%,rgba(213,235,255,.15) 74%,transparent),
    radial-gradient(ellipse 29% 31% at 75% 77%,rgba(219,243,255,.88),rgba(188,211,255,.5) 44%,rgba(195,204,255,.12) 75%,transparent),
    radial-gradient(ellipse 49% 40% at 72% 76%,rgba(201,199,255,.46),rgba(201,199,255,.15) 48%,transparent 90%);
  filter:blur(calc(3.8 * var(--crystal-unit)));
}
.crystal-rim {
  position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background:conic-gradient(from -45deg,rgba(247,255,255,.95),rgba(209,230,255,.2) 75deg,rgba(224,231,255,.3) 130deg,rgba(247,255,255,.94) 180deg,rgba(215,208,249,.42) 245deg,rgba(194,218,255,.25) 300deg,rgba(247,255,255,.95));
  mask-image:radial-gradient(closest-side,transparent 91%,#000 99%);
  -webkit-mask-image:radial-gradient(closest-side,transparent 91%,#000 99%);
  opacity:.6;
  filter:blur(calc(.55 * var(--crystal-unit)));
}
.crystal-halo { position:absolute; width:58%; height:54%; z-index:-1; border-radius:50%; filter:blur(calc(11 * var(--crystal-unit))); }
.crystal-halo-northwest { top:-2%; left:-2%; background:rgba(152,226,255,.28); }
.crystal-halo-southeast { bottom:-2%; right:-2%; background:rgba(191,215,255,.32); }
@media(prefers-reduced-motion:reduce) { .crystal-flow,.crystal-stream { will-change:auto; } }
</style>
