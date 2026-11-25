<template>
  <div class="scene-person-preview" role="img" :aria-label="speaking ? '数字人正在说话' : '数字人待机'" :data-person-state="speaking ? 'speaking' : 'idle'">
    <img v-show="!hasFrame" class="scene-person-fallback" :src="posters[activeState]" alt="" aria-hidden="true" draggable="false" />
    <canvas ref="displayCanvas" v-show="hasFrame" class="scene-person-canvas" aria-hidden="true" />
    <video
      v-for="clip in clips"
      :key="clip.state"
      :ref="element => setVideo(clip.state, element)"
      :src="clip.src"
      :autoplay="speaking === (clip.state === 'speaking')"
      muted
      loop
      playsinline
      preload="auto"
      disablepictureinpicture
      aria-hidden="true"
      tabindex="-1"
      draggable="false"
      @loadeddata="resumeActive"
      @canplay="resumeActive"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue';
import { personMediaForMachine, type ScenePersonMedia } from './scenePersonMedia';

const props = defineProps<{ speaking: boolean; media?: ScenePersonMedia }>();
type ClipState = 'idle' | 'speaking';
const media = computed(() => props.media ?? personMediaForMachine());
const clips = computed(() => [
  { state: 'idle', src: media.value.idle },
  { state: 'speaking', src: media.value.speaking },
] as const);
const posters = computed<Record<ClipState, string>>(() => ({
  idle: media.value.idlePoster,
  speaking: media.value.speakingPoster,
}));

const CROSSFADE_DURATION = 260; // ms: 既保证响应迅速，又实现丝滑无感的动作融合

const activeState = computed<ClipState>(() => (props.speaking ? 'speaking' : 'idle'));
const hasFrame = ref(false);
const displayCanvas = ref<HTMLCanvasElement>();
const videos: Partial<Record<ClipState, HTMLVideoElement>> = {};

let mounted = false;
let probe: CanvasRenderingContext2D | null = null;
let renderLoopId = 0;

let transitionFrom: ClipState | null = null;
let transitionTarget: ClipState = props.speaking ? 'speaking' : 'idle';
let transitionStartTime = 0;

const clipValidated: Record<ClipState, boolean> = {
  idle: false,
  speaking: false,
};

const setVideo = (state: ClipState, element: Element | ComponentPublicInstance | null) => {
  if (!(element instanceof HTMLVideoElement)) {
    delete videos[state];
    return;
  }
  element.muted = true;
  element.defaultMuted = true;
  videos[state] = element;
};

const isValidVideoFrame = (video: HTMLVideoElement | undefined, state: ClipState): boolean => {
  if (!video || video.error || video.paused || video.readyState < 2 || !video.videoWidth) {
    return false;
  }
  if (clipValidated[state]) {
    return true;
  }
  if (!probe) return true;
  try {
    probe.globalCompositeOperation = 'copy';
    probe.drawImage(video, 0, 0, 16, 16);
    const pixels = probe.getImageData(0, 0, 16, 16).data;
    let foreground = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 64) foreground++;
    }
    if (foreground >= 8) {
      clipValidated[state] = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

const resumeActive = () => {
  if (!mounted || document.visibilityState === 'hidden') return;
  const targetVideo = videos[transitionTarget];
  if (targetVideo && !targetVideo.error) {
    targetVideo.muted = true;
    targetVideo.defaultMuted = true;
    if (targetVideo.paused) {
      void targetVideo.play().catch(() => {});
    }
  }
  if (transitionFrom) {
    const fromVideo = videos[transitionFrom];
    if (fromVideo && !fromVideo.error && fromVideo.paused) {
      fromVideo.muted = true;
      fromVideo.defaultMuted = true;
      void fromVideo.play().catch(() => {});
    }
  }
};

const render = (now: number) => {
  if (!mounted) return;

  const canvas = displayCanvas.value;
  if (canvas) {
    const targetVideo = videos[transitionTarget];
    const fromVideo = transitionFrom ? videos[transitionFrom] : null;

    const isTargetReady = isValidVideoFrame(targetVideo, transitionTarget);
    const isFromReady = transitionFrom ? isValidVideoFrame(fromVideo, transitionFrom) : false;

    if (transitionFrom && fromVideo && isFromReady) {
      if (isTargetReady && transitionStartTime === 0) {
        transitionStartTime = now;
      }

      if (transitionStartTime > 0) {
        const elapsed = now - transitionStartTime;
        const progress = Math.min(1, Math.max(0, elapsed / CROSSFADE_DURATION));
        // 平滑的缓入缓出融合曲线
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const vw = (targetVideo && targetVideo.videoWidth) || fromVideo.videoWidth;
        const vh = (targetVideo && targetVideo.videoHeight) || fromVideo.videoHeight;
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);

          // 保持人物轮廓 100% 实体不透明，杜绝交叉淡入时的半透明透光感
          const alphaFrom = ease < 0.7 ? 1.0 : (1.0 - ease) / 0.3;
          if (alphaFrom > 0) {
            context.globalAlpha = Math.max(0, Math.min(1, alphaFrom));
            context.drawImage(fromVideo, 0, 0, canvas.width, canvas.height);
          }

          context.globalAlpha = Math.max(0, Math.min(1, ease));
          context.drawImage(targetVideo!, 0, 0, canvas.width, canvas.height);

          context.globalAlpha = 1.0;
          hasFrame.value = true;
        }

        if (progress >= 1) {
          transitionFrom = null;
          transitionStartTime = 0;
          fromVideo.pause();
        }
      } else {
        // 新视频尚未完全就绪前，原视频平滑保持播放与绘制，绝不画面冻结
        const vw = fromVideo.videoWidth;
        const vh = fromVideo.videoHeight;
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.globalAlpha = 1.0;
          context.drawImage(fromVideo, 0, 0, canvas.width, canvas.height);
          hasFrame.value = true;
        }
      }
    } else if (isTargetReady && targetVideo) {
      // 稳定状态下的单视频连贯渲染
      const vw = targetVideo.videoWidth;
      const vh = targetVideo.videoHeight;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1.0;
        context.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
        hasFrame.value = true;
      }
    }
  }

  renderLoopId = requestAnimationFrame(render);
};

watch(activeState, (nextState, prevState) => {
  if (nextState === prevState) return;
  if (hasFrame.value) {
    transitionFrom = prevState ?? (nextState === 'speaking' ? 'idle' : 'speaking');
    transitionTarget = nextState;
    transitionStartTime = 0;
  } else {
    transitionTarget = nextState;
    transitionFrom = null;
    transitionStartTime = 0;
  }
  resumeActive();
});

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    cancelAnimationFrame(renderLoopId);
    for (const clip of clips.value) videos[clip.state]?.pause();
  } else {
    resumeActive();
    renderLoopId = requestAnimationFrame(render);
  }
};

onMounted(() => {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 16;
  probe = surface.getContext('2d', { willReadFrequently: true });
  mounted = true;
  resumeActive();
  renderLoopId = requestAnimationFrame(render);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', resumeActive);
  window.addEventListener('focus', resumeActive);
  window.addEventListener('pointerdown', resumeActive, { passive: true, capture: true });
});

onBeforeUnmount(() => {
  mounted = false;
  cancelAnimationFrame(renderLoopId);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pageshow', resumeActive);
  window.removeEventListener('focus', resumeActive);
  window.removeEventListener('pointerdown', resumeActive, true);
  for (const clip of clips.value) {
    videos[clip.state]?.pause();
  }
  probe = null;
});
</script>

<style scoped>
.scene-person-preview { position:relative; width:100%; height:100%; pointer-events:none; }
.scene-person-fallback,.scene-person-canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none; }
.scene-person-preview video { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; opacity:0; pointer-events:none; }
</style>
