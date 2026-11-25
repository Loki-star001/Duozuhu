<template>
  <div
    data-scene-presentation
    class="scene-voice-button-container group select-none flex items-center justify-center"
    :class="[
      className,
      `state-${internalState}`,
      { 'cursor-pointer': interactive, 'pointer-events-none': !interactive, 'is-crystal': theme === 'crystal' }
    ]"
    :style="themeStyles"
    @click="handleClick"
  >
    <!-- 光球容器 (内部白底不透明，无外层白色描边与留白) -->
    <div class="relative flex items-center justify-center rounded-full">
      <div
        ref="orbWrapperRef"
        class="voice-orb-wrapper"
      >
        <CrystalOrb
          v-if="theme === 'crystal'"
          :size="size"
          :animation-duration="activeDuration"
          :state="internalState"
        />
        <SiriOrb
          v-else
          :size="size"
          :animation-duration="activeDuration"
          :colors="activeColors"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SiriOrb from './SiriOrb.vue';
import CrystalOrb from './CrystalOrb.vue';

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'thinking';
export type VoiceTheme = 'siri' | 'deepblue' | 'aurora' | 'sunset' | 'cyberpunk' | 'mist' | 'crystal';

export interface VoiceThemeConfig {
  bg?: string;
  c1: string;
  c2: string;
  c3: string;
}

const themePresets: Record<VoiceTheme, VoiceThemeConfig> = {
  crystal: {
    bg: '#7796C3',
    c1: '#8CB9E6',
    c2: '#C5EDF6',
    c3: '#ADA9DC'
  },
  mist: {
    bg: '#F7F9FC',
    c1: '#6CA0D8',
    c2: 'oklch(83% 0.025 230)',
    c3: 'oklch(76% 0.032 280)'
  },
  siri: {
    bg: '#ffffff',
    c1: 'oklch(82% 0.075 350)', // 淡雅柔粉（低饱和清透）
    c2: 'oklch(85% 0.065 200)', // 淡雅晴青（低饱和清澈）
    c3: 'oklch(83% 0.075 280)'  // 淡雅薰衣草（低饱和柔和）
  },
  deepblue: {
    bg: '#ffffff',
    c1: 'oklch(77% 0.14 245)', // 科技天蓝（提亮通透）
    c2: 'oklch(86% 0.11 210)', // 浅湖青
    c3: 'oklch(80% 0.12 270)'  // 亮靛青
  },
  aurora: {
    bg: '#ffffff',
    c1: 'oklch(83% 0.13 150)', // 极光嫩绿
    c2: 'oklch(87% 0.11 185)', // 荧光薄荷
    c3: 'oklch(83% 0.12 280)'  // 幽兰淡紫
  },
  sunset: {
    bg: '#ffffff',
    c1: 'oklch(81% 0.15 25)',  // 珊瑚粉红
    c2: 'oklch(86% 0.13 65)',  // 晨曦暖金
    c3: 'oklch(80% 0.14 340)'  // 玫瑰樱粉
  },
  cyberpunk: {
    bg: '#ffffff',
    c1: 'oklch(81% 0.17 330)', // 亮桃红
    c2: 'oklch(85% 0.14 190)', // 冰蓝电光
    c3: 'oklch(88% 0.15 95)'   // 明黄亮彩
  }
};

const props = withDefaults(
  defineProps<{
    size?: string;
    animationDuration?: number;
    theme?: VoiceTheme;
    customColors?: VoiceThemeConfig;
    state?: VoiceState;
    interactive?: boolean;
    className?: string;
    audioEnergy?: number;
    audioPitch?: number;
  }>(),
  {
    size: '96px',
    animationDuration: 45,
    theme: 'siri',
    state: 'idle',
    interactive: true
  }
);

const emit = defineEmits<{
  'update:state': [state: VoiceState];
  'start-listening': [];
  'stop-listening': [];
  'interrupt': [];
  'click': [state: VoiceState];
}>();

const internalState = ref<VoiceState>(props.state);

watch(() => props.state, (newVal) => {
  if (newVal) internalState.value = newVal;
});

const activeColors = computed(() => {
  if (props.customColors?.c1) return props.customColors;
  return themePresets[props.theme] || themePresets.siri;
});

const themeStyles = computed(() => ({
  '--voice-wave-1': activeColors.value.c1,
  '--voice-wave-2': activeColors.value.c2,
  '--voice-wave-3': activeColors.value.c3
}));

const activeDuration = computed(() => {
  // 播报中：流动速度稍微放慢至 3.5s，充沛灵动且舒缓平稳
  if (internalState.value === 'speaking') {
    return 3.5;
  }
  // 思考中：流速加快，内部光带高速流转（2.0s）
  if (internalState.value === 'thinking') {
    return 2.0;
  }
  // 倾听中：流动速度不要太快（7.5s 稳健流动）
  if (internalState.value === 'listening') {
    return 7.5;
  }
  // 待命状态：适当提速至舒缓流转（默认 45s，优雅自然且动态可辨）
  return props.animationDuration ?? 45;
});

const orbWrapperRef = ref<HTMLDivElement>();
let currentBaseScale = 1.0;
let currentBreathIn = 0;
let currentBreathOut = 0;
let currentJitterAmp = 0;
let breathTime = 0;
let lastTimestamp = 0;
let rafId = 0;

const animateWrapper = (timestamp: number) => {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  // 待命、倾听中、思考中和播报中基础大小都是一样的 (targetScale 始终为 1.0)
  const targetScale = 1.0;
  let targetBreathIn = 0;
  let targetBreathOut = 0;
  let targetJitter = 0;
  let breathSpeed = 2.8;

  const hasAudioTrack = props.audioEnergy !== undefined && props.audioEnergy > 0.005;
  const audioAmp = hasAudioTrack ? Math.min(1, Math.max(0, props.audioEnergy!)) : 0;
  const audioPitchVal = props.audioPitch ?? 0.5;
  const pitchFactor = 0.85 + audioPitchVal * 0.3;

  if (internalState.value === 'listening') {
    // 倾听中：缩小的呼吸 (随说话声波能量越大，向内收缩越深)
    targetBreathIn = hasAudioTrack
      ? (0.04 + 0.10 * audioAmp) * pitchFactor
      : 0.08;
    targetJitter = hasAudioTrack ? (0.2 + 0.45 * audioAmp) : 0.45;
    breathSpeed = hasAudioTrack ? (3.2 + 1.8 * audioPitchVal) : 3.6;
  } else if (internalState.value === 'thinking') {
    // 思考中的大小也和待命一样，只是流速加快（基础大小相同，不呼吸）
    targetBreathIn = 0;
    targetBreathOut = 0;
    targetJitter = 0;
  } else if (internalState.value === 'speaking') {
    // 播报中：放大的呼吸感 (随播报声波能量越大，向外膨胀越明显)
    targetBreathOut = hasAudioTrack
      ? (0.04 + 0.12 * audioAmp) * pitchFactor
      : 0.085;
    targetJitter = 0;
    breathSpeed = hasAudioTrack ? (2.4 + 1.4 * audioPitchVal) : 2.6;
  } else {
    // 待命 (idle): 大小与各状态基础大小完全一致，平稳不呼吸
    targetBreathIn = 0;
    targetBreathOut = 0;
    targetJitter = 0;
  }

  // 连续微分平滑插值：任意模式快速切换均无缝平滑演进，零跳帧、零断层
  currentBaseScale += (targetScale - currentBaseScale) * Math.min(1, dt * 7);
  currentBreathIn += (targetBreathIn - currentBreathIn) * Math.min(1, dt * 6);
  currentBreathOut += (targetBreathOut - currentBreathOut) * Math.min(1, dt * 6);
  currentJitterAmp += (targetJitter - currentJitterAmp) * Math.min(1, dt * 8);

  breathTime += breathSpeed * dt;

  // 倾听中：缩小呼吸（从 1.0 向内缩小至 ~0.92）
  const inwardOffset = currentBreathIn * (0.5 + 0.5 * Math.sin(breathTime));
  // 播报中：放大呼吸（从 1.0 向外放大至 ~1.085）
  const outwardOffset = currentBreathOut * (0.5 + 0.5 * Math.sin(breathTime));

  let jx = 0, jy = 0;
  if (currentJitterAmp > 0.01) {
    jx = Math.sin(breathTime * 7.1) * currentJitterAmp;
    jy = Math.cos(breathTime * 5.7) * currentJitterAmp;
  }

  const finalScale = currentBaseScale - inwardOffset + outwardOffset;

  if (orbWrapperRef.value) {
    orbWrapperRef.value.style.transform = `scale(${finalScale.toFixed(4)}) translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)`;
  }

  rafId = requestAnimationFrame(animateWrapper);
};

onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rafId = requestAnimationFrame(animateWrapper);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
});

const handleClick = () => {
  if (!props.interactive) return;

  if (internalState.value === 'idle') {
    // 待命状态 -> 触发开启说话/倾听
    internalState.value = 'listening';
    emit('update:state', 'listening');
    emit('start-listening');
    emit('click', 'listening');
  } else if (internalState.value === 'listening') {
    // 倾听状态 -> 触发倾听完毕，进入思考中
    internalState.value = 'thinking';
    emit('update:state', 'thinking');
    emit('stop-listening');
    emit('click', 'thinking');
  } else if (internalState.value === 'thinking') {
    // 思考中状态 -> 触发思考完成，进入播报回答
    internalState.value = 'speaking';
    emit('update:state', 'speaking');
    emit('click', 'speaking');
  } else if (internalState.value === 'speaking') {
    // 正在播报状态 -> 触发一键打断，回到待机
    internalState.value = 'idle';
    emit('update:state', 'idle');
    emit('interrupt');
    emit('click', 'idle');
  } else {
    internalState.value = 'idle';
    emit('update:state', 'idle');
    emit('click', 'idle');
  }
};
</script>

<style scoped>
.scene-voice-button-container {
  position: relative;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.voice-orb-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transform-origin: center center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.4s ease;
  will-change: transform;
}

/* 待命态：静止标称大小与基础阴影 */
.state-idle .voice-orb-wrapper {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* 倾听态：向外起伏呼吸动效，随音波微颤，柔光散发 */
.state-listening .voice-orb-wrapper {
  box-shadow: 0 0 24px rgba(22, 93, 255, 0.22), 0 4px 14px rgba(0, 0, 0, 0.03);
}

/* 思考中态：采用说话中流动速度（3.5s），稳定聚焦微放大姿态，不执行呼吸缩放动画 */
.state-thinking .voice-orb-wrapper {
  box-shadow: 0 0 28px rgba(22, 93, 255, 0.26), 0 4px 16px rgba(0, 0, 0, 0.04);
}

/* 播报态：向内按压式舒缓呼吸，散发充沛光芒 */
.state-speaking .voice-orb-wrapper {
  box-shadow: 0 0 32px rgba(22, 93, 255, 0.28), 0 6px 18px rgba(0, 0, 0, 0.04);
}

.is-crystal .voice-orb-wrapper { box-shadow:none; }

@media (prefers-reduced-motion: reduce) {
  .state-idle .voice-orb-wrapper { transform: scale(1); }
  .state-listening .voice-orb-wrapper { transform: scale(1.04); }
  .state-thinking .voice-orb-wrapper { transform: scale(1.06); }
  .state-speaking .voice-orb-wrapper { transform: scale(1.10); }
}
</style>
