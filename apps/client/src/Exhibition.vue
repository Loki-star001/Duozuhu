<template>
  <SceneInteractionPreview standalone :scene="currentScene" :content-mode="browsing"
    :dialogue-visibility="dialogueVisible ? 'shown' : 'hidden'"
    :class="{ 'exhibit-portrait': portrait, 'person-switching': personPhase === 'fade-out', 'exhibit-in-motion': switching }"
    @dialogue-hidden="onDialogueHidden" @transitionend="onPersonTransitionEnd">
    <template #navigation>
      <ExhibitionLibrary @change="changeMode" />
    </template>
    <template #topbar="{ volume, setVolume }">
      <ExhibitionStatusBar :logo-url="scene.logoUrl" :volume="volume" @update:volume="setVolume" />
    </template>
  </SceneInteractionPreview>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import SceneInteractionPreview from './components/SceneInteractionPreview.vue';
import { personMediaForMachine } from './components/scenePersonMedia';

import ExhibitionLibrary from './components/ExhibitionLibrary.vue';
import ExhibitionStatusBar from './components/ExhibitionStatusBar.vue';

const browsing = ref(false);
const portrait = ref(false);
const dialogueVisible = ref(true);
const personPhase = ref<'still' | 'fade-out' | 'fade-in'>('still');
const switching = computed(() => personPhase.value !== 'still' || portrait.value !== browsing.value ||
  dialogueVisible.value === browsing.value);
let dialogueHidden = false;
let fadeTimer: number | undefined;

function changeMode(next: boolean) {
  if (browsing.value === next) return;
  browsing.value = next;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setPersonPhase('still');
    portrait.value = next;
    dialogueVisible.value = !next;
    dialogueHidden = next;
    return;
  }
  reconcileMode();
}

function reconcileMode() {
  // Don't move the person while the dialogue is still compositing its exit.
  if (browsing.value && !dialogueHidden) {
    dialogueVisible.value = false;
    return;
  }
  if (portrait.value !== browsing.value) {
    if (personPhase.value !== 'fade-out') setPersonPhase('fade-out');
  } else if (personPhase.value === 'fade-out') {
    setPersonPhase('fade-in');
  } else if (personPhase.value === 'still' && !browsing.value) {
    dialogueHidden = false;
    dialogueVisible.value = true;
  }
}

function onDialogueHidden() {
  if (dialogueVisible.value) return;
  dialogueHidden = true;
  reconcileMode();
}

function setPersonPhase(phase: typeof personPhase.value) {
  window.clearTimeout(fadeTimer);
  personPhase.value = phase;
  // A transition can be skipped by a rapid reversal or a backgrounded browser.
  if (phase !== 'still') fadeTimer = window.setTimeout(finishPersonFade, 220);
}

function finishPersonFade() {
  if (personPhase.value === 'fade-out') {
    portrait.value = browsing.value;
    setPersonPhase('fade-in');
  } else {
    setPersonPhase('still');
    reconcileMode();
  }
}

function onPersonTransitionEnd(event: TransitionEvent) {
  if (event.propertyName === 'opacity' && event.target instanceof HTMLElement &&
    event.target.matches('.scene-person-preview') && personPhase.value !== 'still') finishPersonFade();
}

onBeforeUnmount(() => window.clearTimeout(fadeTimer));

// Keep terminal typography in its native coordinate system; the full scene scales to 1440 × 2560.
const scene = {
  width: 1080, height: 1920, bgColor: '#e3ecfa', bgType: 'IMAGE', bgImageUrl: '/scene-presets/blue-tech-hall.png',
  personMedia: personMediaForMachine('DEV-01'), logoUrl: '/logos/pinxin-smart.png', timezone: '', clock: '',
  layers: ['person', 'topbar', 'kingkong-rail', 'dialogue'].map(id => ({ id, label: id })),
  boxes: {
    person: { x: -4, y: -2.8, w: 108, h: 108 },
    topbar: { x: 5, y: 2.2, w: 90, h: 4.2 },
    'kingkong-rail': { x: 5, y: 11.6, w: 11.5, h: 29 },
    dialogue: { x: 9.5, y: 45.7, w: 81, h: 23 },
  },
  buttons: [], showKingkong: true,
  showDialogue: true, showInput: true, showVoiceButton: false, voiceTheme: 'mist' as const,
  multimediaUrl: '', isImageMedia: false, welcome: '', question: '请介绍一下数字人展厅。',
  answer: '欢迎来到品信数字人展厅。您可以浏览展区路线、了解数字人产品，或查找感兴趣的展示内容。',
};

const portraitBox = { x: 73.9, y: 10.8, w: 16.5, h: 9.28125 };
const currentScene = computed(() => ({
  ...scene,
  boxes: portrait.value ? { ...scene.boxes, person: portraitBox } : scene.boxes,
}));
</script>

<style>
.exhibition-page .kiosk-screen {
  /* 数字人大屏2.svg，尺寸按原生 1080 × 1920 画布。
     文本在 SVG 中已转曲，字体大小按字形高度及版面估算。 */
  --exhibit-ink: #212630;
  --exhibit-muted: #525e71;
  --exhibit-accent: #0468fe;
  --exhibit-accent-tint: #f0f5ff;
  --exhibit-divider: rgba(82, 94, 113, .2);
  --exhibit-rail-glass: rgba(255, 255, 255, .6);
  --exhibit-panel-glass: rgba(255, 255, 255, .8);
  --exhibit-outline: inset 0 0 0 2px #fff;
  --exhibit-frame-radius: 32px;
  --exhibit-inner-radius: 24px;
  --exhibit-pill-radius: 20px;
  --exhibit-panel-inset: 24px;
  --exhibit-block-gap: 32px;
  --exhibit-row-gap: 12px;
  --exhibit-title: 28px;
  --exhibit-heading: 24px;
  --exhibit-body: 20px;
}
.exhibit-portrait .scene-person-preview {
  overflow: hidden;
  border-radius: 50%;
  border: 2px solid #fff;
  background: linear-gradient(145deg, #f6f9ff, #d9e6fa);
  box-shadow: 0 3px 16px #314a7020;
}
.exhibit-portrait .scene-person-preview :is(.scene-person-fallback, .scene-person-canvas) {
  inset: auto;
  top: -22%;
  left: 50%;
  width: 173%;
  max-width: none;
  height: auto;
  aspect-ratio: 9 / 16;
  transform: translateX(-50%);
}
.exhibition-page .scene-person-preview { transition: opacity 150ms ease; }
.person-switching .scene-person-preview { opacity: 0; }
.exhibition-page .exhibit-dialog-enter-active,
.exhibition-page .exhibit-dialog-leave-active { transition: opacity 185ms ease, transform 185ms ease; }
.exhibition-page .exhibit-dialog-enter-from,
.exhibition-page .exhibit-dialog-leave-to { opacity: 0; transform: translateY(12px) scale(.985); }
.exhibit-in-motion .hall-sheet,
.exhibition-page :is(.exhibit-dialog-enter-active, .exhibit-dialog-leave-active)
  :is(.scene-qa-surface, .scene-qa-input-bar) {
  background: rgba(248, 250, 255, .94);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
@media (prefers-reduced-motion: reduce) {
  .exhibition-page .scene-person-preview,
  .exhibition-page .exhibit-dialog-enter-active,
  .exhibition-page .exhibit-dialog-leave-active { transition: none; }
}
</style>
