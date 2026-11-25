<template>
  <div data-scene-presentation class="scene-extra-element" :class="`scene-extra-kind-${element.kind}`" :style="elementStyle">
    <!-- 横幅 -->
    <div v-if="element.kind === 'banner'" class="extra-panel extra-banner">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-[#165DFF] shadow-xs" />
        <strong
          class="extra-banner-title font-bold text-[#1D2129]"
          :style="{ fontSize: `${Math.max(24, (element.fontSize || 20) * 1.2 * scale)}px` }"
        >
          {{ element.title }}
        </strong>
      </div>
      <span
        class="extra-banner-content text-[#4E5969]"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.content }}
      </span>
    </div>

    <!-- 公告 (毛玻璃材质，字号最小20px) -->
    <div v-else-if="element.kind === 'notice'" class="extra-notice-glass flex items-center gap-3 px-4 py-2.5 w-full h-full">
      <div class="w-9 h-9 rounded-full bg-[#165DFF]/10 text-[#165DFF] flex items-center justify-center shrink-0 shadow-xs">
        <Megaphone class="w-5 h-5" />
      </div>
      <span
        class="extra-notice-text font-medium text-[#1D2129] min-w-0 flex-1 truncate"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.content }}
      </span>
    </div>

    <!-- 标准列表卡片：标题固定，列表内容独立滚动。 -->
    <section v-else-if="element.kind === 'list'" class="extra-panel extra-standard-panel extra-list" :aria-label="element.title">
      <header class="extra-card-header">
        <h3 class="extra-card-title">{{ element.title }}</h3>
        <span class="extra-card-meta extra-list-badge">展厅推荐</span>
      </header>
      <div class="extra-list-body" role="list">
        <div v-for="(row,index) in rows" :key="index" class="extra-list-row" role="listitem">
          <div class="extra-list-copy">
            <strong class="extra-list-title">{{ row[0] }}</strong>
            <p v-if="row[1]" class="extra-list-description">{{ row[1] }}</p>
          </div>
          <ChevronRight class="extra-list-chevron" aria-hidden="true" />
        </div>
      </div>
    </section>

    <!-- 标准描述列表：标签列与内容列保持对齐。 -->
    <section v-else-if="element.kind === 'comparison'" class="extra-panel extra-standard-panel extra-comparison-panel" :aria-label="element.title">
      <header class="extra-card-header">
        <h3 class="extra-card-title">{{ element.title }}</h3>
        <span class="extra-card-meta">服务导览</span>
      </header>
      <dl class="extra-comparison">
        <div v-for="(row,index) in rows" :key="index" class="extra-comparison-row">
          <dt>{{ row[0] }}</dt>
          <dd>{{ row[1] }}</dd>
        </div>
      </dl>
    </section>

    <!-- 自定义控件 (字号最小20px) -->
    <div v-else-if="element.kind === 'custom'" class="extra-panel extra-custom flex items-center justify-center text-center gap-2">
      <SlidersHorizontal class="w-5 h-5 text-[#165DFF]" />
      <strong
        class="font-bold text-[#1D2129]"
        :style="{ fontSize: `${Math.max(22, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.title }}
      </strong>
      <span
        class="text-[#4E5969]"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.content }}
      </span>
    </div>

    <!-- 弹层：入口与展开内容使用一致的间距和标题层级。 -->
    <div v-else-if="element.kind === 'popup'" class="extra-popup">
      <section v-if="popupOpen" class="extra-panel extra-standard-panel extra-popup-content" :aria-label="element.title">
        <header class="extra-card-header extra-popup-header">
          <h3 class="extra-card-title">{{ element.title }}</h3>
          <button type="button" aria-label="关闭弹层" class="extra-popup-close" @click="popupOpen=false">
            <X aria-hidden="true" />
          </button>
        </header>
        <div class="extra-popup-body"><p>{{ element.content }}</p></div>
      </section>
      <div v-else class="extra-panel extra-standard-panel extra-popup-preview" @click="popupOpen=true">
        <div class="extra-popup-icon" aria-hidden="true"><SlidersHorizontal /></div>
        <div class="extra-popup-copy">
          <h3 class="extra-card-title">{{ element.title }}</h3>
          <p class="extra-popup-description">轻触展开详细说明</p>
        </div>
        <button type="button" class="extra-popup-open" @click.stop="popupOpen=true">查看</button>
      </div>
    </div>

    <!-- 音量控制 -->
    <label v-else-if="element.kind === 'volume'" class="extra-panel extra-volume flex items-center justify-between gap-3 px-4 py-2">
      <Volume2 class="extra-volume-icon w-5 h-5 text-[#165DFF] shrink-0" />
      <input v-model.number="volume" type="range" min="0" max="100" aria-label="音量控制" class="flex-1" @input="emit('volume', volume)" />
      <span
        class="extra-volume-text font-bold font-mono text-[#165DFF]"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ volume }}%
      </span>
    </label>

    <!-- 刷新按钮 -->
    <button v-else-if="element.kind === 'refresh'" type="button" class="extra-action flex items-center justify-center gap-2" @click="emit('refresh')">
      <RefreshCw class="w-5 h-5" />
      <span
        class="font-medium"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.title }}
      </span>
    </button>

    <!-- 文本 (字号最小20px) -->
    <div
      v-else-if="element.kind === 'text'" class="extra-text w-full h-full flex items-center justify-center text-center font-medium select-none overflow-hidden">
      <span class="extra-text-inner leading-tight whitespace-pre-wrap break-words" :style="textInnerStyle">
        {{ element.content }}
      </span>
    </div>

    <!-- 形状 (多形状支持：矩形、圆角卡片、胶囊、正圆、菱形、三角形、六边形、五角星) -->
    <div
      v-else-if="element.kind === 'shape'"
      class="extra-shape-container w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div
        class="extra-shape-element w-full h-full shadow-xs transition-all"
        :style="shapeElementStyle"
      />
    </div>

    <!-- 纹理 -->
    <div v-else-if="element.kind === 'texture'" class="extra-texture" />

    <!-- 单图标 -->
    <component :is="icons[element.icon] || Info" v-else-if="element.kind === 'icon'" class="extra-single-icon text-[#165DFF]" />

    <!-- 分隔线 -->
    <div v-else-if="element.kind === 'divider'" class="extra-divider" />

    <!-- 动态特效 (集成动态粒子与氛围动效库：科技微粒连线、流光氛围、璀璨星芒、浮游气泡、极光呼吸、全息雷达) -->
    <div v-else-if="element.kind === 'effects'" class="extra-effect-wrapper w-full h-full relative overflow-hidden pointer-events-none">
      <canvas ref="effectCanvasRef" class="extra-effect-canvas w-full h-full block" />
    </div>

    <!-- 关键指标 (纯净模式：去除底板，仅数值与文字，字号最小20px) -->
    <div v-else-if="element.kind === 'metric'" class="extra-metric-pure flex flex-col items-center justify-center text-center w-full h-full p-2 select-none">
      <span
        v-if="element.title"
        class="extra-metric-label font-medium text-[#4E5969] leading-tight block mb-1 truncate max-w-full"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.title }}
      </span>
      <strong
        class="extra-metric-num font-bold font-mono leading-none flex items-baseline justify-center tracking-tight"
        :style="{ color: element.color || '#165DFF', fontSize: `${Math.max(36, (element.fontSize || 20) * 2.2 * scale)}px` }"
      >
        {{ element.value }}
        <small
          v-if="element.unit"
          class="extra-metric-unit font-medium text-[#4E5969] ml-2 leading-none"
          :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
        >
          {{ element.unit }}
        </small>
      </strong>
    </div>

    <!-- 展厅二维码 (纯净模式：不额外加底板，仅二维码+一个文字，字号最小20px) -->
    <div v-else-if="element.kind === 'qrcode'" class="extra-qrcode-pure flex flex-col items-center justify-center text-center w-full h-full select-none">
      <img
        v-if="qrImage"
        :src="qrImage"
        :alt="`${element.title || '二维码'}`"
        class="flex-1 min-h-0 w-auto max-h-[82%] object-contain rounded-[4px]"
        draggable="false"
      />
      <span v-else class="text-base text-[#86909C]">{{ qrError || '正在生成二维码' }}</span>
      <span
        v-if="element.title"
        class="shrink-0 mt-2 font-semibold leading-tight truncate block max-w-full"
        :style="{ color: element.color || '#1D2129', fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.title }}
      </span>
    </div>

    <!-- 倒计时 (去除卡片底板，只保留倒计时数字与极简标题，字号最小20px) -->
    <div v-else-if="element.kind === 'countdown'" class="extra-countdown-pure flex flex-col items-center justify-center text-center w-full h-full select-none">
      <span
        v-if="element.title"
        class="font-medium text-[#4E5969] mb-1.5 drop-shadow-xs"
        :style="{ fontSize: `${Math.max(20, (element.fontSize || 20) * scale)}px` }"
      >
        {{ element.title }}
      </span>
      <strong
        class="extra-countdown-digits-pure font-bold font-mono tracking-widest text-[#165DFF] leading-none"
        :style="{ fontSize: `${Math.max(36, (element.fontSize || 20) * 2.2 * scale)}px` }"
      >
        {{ countdown }}
      </strong>
    </div>

    <!-- 标准图表卡片：独立标题、数值区、绘图区与分类标签。 -->
    <figure v-else-if="element.kind === 'chart'" class="extra-panel extra-standard-panel extra-chart" :aria-label="element.title">
      <figcaption class="extra-card-header">
        <span class="extra-card-title">{{ element.title }}</span>
        <span class="extra-card-meta">实时看板</span>
      </figcaption>
      <div class="extra-chart-bars">
        <div v-for="(bar,index) in chartBars" :key="index" class="extra-chart-column">
          <div class="extra-chart-bar-wrap">
            <div class="extra-chart-series" :style="{ height: `${bar.height}%` }">
              <span class="extra-chart-val">{{ bar.value }}</span>
              <i class="extra-chart-fill" />
            </div>
          </div>
          <span class="extra-chart-lbl" :title="bar.label">{{ bar.label }}</span>
        </div>
      </div>
    </figure>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { ChevronRight, Compass, HelpCircle, Info, MapPin, Megaphone, RefreshCw, SlidersHorizontal, Star, Volume2, X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { elementRows, type SceneExtraElement } from './sceneElements';

const props = withDefaults(defineProps<{ element: SceneExtraElement; scale?: number }>(), { scale: 1 });
const emit = defineEmits<{ refresh: []; volume: [value: number] }>();
const icons = { info: Info, star: Star, compass: Compass, location: MapPin, help: HelpCircle };
const popupOpen = ref(false), volume = ref(props.element.value), qrImage = ref(''), qrError = ref('');

const effectCanvasRef = ref<HTMLCanvasElement | null>(null);
let effectAnimId: number | null = null;
let effectParticles: any[] = [];
let radarAngle = 0;
let pulsePhase = 0;

watch(() => props.element.value, value => { volume.value = value; });

const textInnerStyle = computed(() => {
  if (props.element.kind !== 'text') return {};
  const content = (props.element.content || '请输入展示文字').trim();
  const lines = content.split('\n');
  const lineCount = Math.max(1, lines.length);
  return {
    fontSize: `clamp(14px, min(calc(72cqh / ${lineCount}), 90cqw), 400px)`,
    lineHeight: 1.25,
    wordBreak: 'break-word',
    color: props.element.color || '#1D2129'
  };
});

const elementStyle = computed(() => {
  let color = props.element.color;
  let bg = props.element.background;
  // 自动迁移旧版灰冷色调至现代通透白玻与科技蓝标准
  if (!color || color === '#536A91') color = '#165DFF';
  if (!bg || bg === '#F0F4FA' || bg === '#ffffff') bg = 'rgba(255, 255, 255, 0.94)';
  const baseFontSize = Math.max(20, props.element.fontSize || 20);
  return {
    '--element-color': color,
    '--element-background': bg,
    '--element-scale': props.scale,
    '--extra-title-size': `${Math.max(24, baseFontSize + 4) * props.scale}px`,
    fontSize: `${baseFontSize * props.scale}px`
  };
});

// 多形状样式映射
const shapeElementStyle = computed(() => {
  const shape = props.element.shape || 'rectangle';
  const baseBg = props.element.background || 'rgba(22, 93, 255, 0.15)';
  const styleObj: Record<string, string> = {
    background: baseBg
  };

  switch (shape) {
    case 'rounded':
      styleObj.borderRadius = '24px';
      break;
    case 'pill':
      styleObj.borderRadius = '999px';
      break;
    case 'circle':
      styleObj.borderRadius = '50%';
      break;
    case 'diamond':
      styleObj.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      break;
    case 'triangle':
      styleObj.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      break;
    case 'hexagon':
      styleObj.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
      break;
    case 'star':
      styleObj.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      break;
    case 'rectangle':
    default:
      styleObj.borderRadius = '4px';
      break;
  }
  return styleObj;
});

const rows = computed(() => elementRows(props.element.content));
const chartBars = computed(() => {
  const items = rows.value.map(row => ({ label: row[0], value: Math.max(0, Number(row[1]) || 0) }));
  const max = Math.max(1, ...items.map(item => item.value));
  return items.map(item => ({ ...item, height: (item.value / max) * 72 }));
});

let qrRevision = 0;
watch(() => props.element.content, async content => {
  if (props.element.kind !== 'qrcode') return;
  const revision = ++qrRevision;
  qrImage.value = '';
  qrError.value = '';
  if (!content.trim()) { qrError.value = '请输入二维码内容'; return; }
  try {
    const image = await QRCode.toDataURL(content, { width: 384, margin: 2, errorCorrectionLevel: 'M' });
    if (revision === qrRevision) qrImage.value = image;
  } catch {
    if (revision === qrRevision) qrError.value = '内容过长，无法生成二维码';
  }
}, { immediate: true });

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

function hexToRgb(hex: string): [number, number, number] {
  if (!hex) return [22, 93, 255];
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return [22, 93, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function initEffectParticles(w: number, h: number, type: string, count: number) {
  effectParticles = [];
  const n = Math.max(8, Math.min(count, 80));
  for (let i = 0; i < n; i++) {
    if (type === 'particles') {
      effectParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        r: Math.random() * 2 + 1.5
      });
    } else if (type === 'ambient') {
      effectParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * (w * 0.25) + (w * 0.15),
        phase: Math.random() * Math.PI * 2
      });
    } else if (type === 'sparkles') {
      effectParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 1.2,
        maxAlpha: Math.random() * 0.75 + 0.25,
        speed: Math.random() * 0.03 + 0.015,
        phase: Math.random() * Math.PI * 2
      });
    } else if (type === 'bubbles') {
      effectParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -(Math.random() * 0.7 + 0.35),
        vx: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 8 + 4,
        alpha: Math.random() * 0.45 + 0.25
      });
    }
  }
}

function startEffectAnimation() {
  if (effectAnimId) {
    cancelAnimationFrame(effectAnimId);
    effectAnimId = null;
  }
  const canvas = effectCanvasRef.value;
  if (!canvas || props.element.kind !== 'effects') return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || 300;
  const h = rect.height || 200;
  if (w <= 0 || h <= 0) return;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const type = props.element.content || 'particles';
  const density = Math.round(props.element.value || 35);
  initEffectParticles(w, h, type, density);

  const rgb = hexToRgb(props.element.color || '#165DFF');

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    if (type === 'particles') {
      const maxDist = Math.min(w, h) * 0.38;
      for (let i = 0; i < effectParticles.length; i++) {
        const p = effectParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`;
        ctx.fill();

        for (let j = i + 1; j < effectParticles.length; j++) {
          const p2 = effectParticles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(1 - dist / maxDist) * 0.4})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    } else if (type === 'ambient') {
      for (const p of effectParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.r) p.x = w + p.r;
        if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;
        p.phase += 0.02;

        const currentR = p.r * (1 + 0.15 * Math.sin(p.phase));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentR);
        grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.45)`);
        grad.addColorStop(0.5, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    } else if (type === 'sparkles') {
      for (const p of effectParticles) {
        p.phase += p.speed;
        const alpha = Math.max(0, p.maxAlpha * Math.sin(p.phase));
        if (alpha > 0.05) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
          ctx.fill();

          const flareLen = p.r * 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x - flareLen, p.y);
          ctx.lineTo(p.x + flareLen, p.y);
          ctx.moveTo(p.x, p.y - flareLen);
          ctx.lineTo(p.x, p.y + flareLen);
          ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.75})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    } else if (type === 'bubbles') {
      for (const p of effectParticles) {
        p.y += p.vy;
        p.x += Math.sin(p.y * 0.05) * 0.25;
        if (p.y + p.r < 0) {
          p.y = h + p.r;
          p.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${p.alpha * 0.35})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${p.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        ctx.fill();
      }
    } else if (type === 'glow-pulse') {
      pulsePhase += 0.025;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.48;

      for (let ring = 0; ring < 3; ring++) {
        const ringProgress = (pulsePhase + ring * 0.33) % 1;
        const currentR = maxR * ringProgress;
        const alpha = (1 - ringProgress) * 0.55;

        ctx.beginPath();
        ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`;
      ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 'radar') {
      radarAngle += 0.035;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.45;

      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, radarAngle - 0.4, radarAngle);
      ctx.closePath();
      const beamGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      beamGrad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`);
      beamGrad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`);
      ctx.fillStyle = beamGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(radarAngle), cy + r * Math.sin(radarAngle));
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    effectAnimId = requestAnimationFrame(render);
  }

  effectAnimId = requestAnimationFrame(render);
}

onMounted(() => {
  if (props.element.kind === 'countdown') {
    timer = setInterval(() => { now.value = Date.now(); }, 1000);
  } else if (props.element.kind === 'effects') {
    nextTick(() => startEffectAnimation());
  }
});

watch(
  () => [props.element.kind, props.element.content, props.element.color, props.element.value],
  () => {
    if (props.element.kind === 'effects') {
      nextTick(() => startEffectAnimation());
    } else if (effectAnimId) {
      cancelAnimationFrame(effectAnimId);
      effectAnimId = null;
    }
  }
);

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  if (effectAnimId) cancelAnimationFrame(effectAnimId);
  ++qrRevision;
});

const countdown = computed(() => {
  const timestamp = new Date(props.element.deadline).getTime();
  if (!Number.isFinite(timestamp)) return '--:--:--';
  const seconds = Math.max(0, Math.floor((timestamp - now.value) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
});
</script>

<style scoped>
.scene-extra-kind-text { container-type: size; width: 100%; height: 100%; }
.extra-text { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.extra-text-inner { display: inline-block; max-width: 100%; max-height: 100%; }

.scene-extra-element { width: 100%; height: 100%; min-width: 0; min-height: 0; color: var(--element-color); line-height: 1.5; }
.scene-extra-element.kiosk-scene-object { position: absolute; }
.scene-extra-element * { box-sizing: border-box; }
.scene-extra-element svg { width: 1.25em; height: 1.25em; flex-shrink: 0; }

/* 核心通透毛玻璃面板容器 (Glassmorphism 对齐终端大屏标准) */
.extra-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: calc(14px * var(--element-scale));
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: clamp(14px, 3cqw, 20px);
  background: var(--element-background, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: auto;
  margin: 0;
}

/* 终端卡片借鉴标准 Card / List / Descriptions / Dialog 的结构，尺寸使用画布原始像素。 */
.extra-standard-panel {
  --extra-card-padding: calc(24px * var(--element-scale));
  padding: var(--extra-card-padding);
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  box-shadow: none;
  overflow: hidden;
}
.extra-card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex: 0 0 auto; min-width: 0; padding-bottom: 20px; border-bottom: 1px solid #e5e6eb; }
.extra-card-title { min-width: 0; margin: 0; color: #1d2129; font-size: var(--extra-title-size); font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.extra-card-meta { flex: 0 0 auto; color: #86909c; font-size: inherit; font-weight: 400; line-height: 1.5; white-space: nowrap; }
.extra-list-badge { padding: 4px 12px; border: 1px solid #e5e6eb; border-radius: 4px; background: #f7f8fa; color: #4e5969; }
.extra-list-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding-top: 4px; }
.extra-list-row { display: flex; align-items: center; gap: 24px; min-width: 0; padding: 16px 0; }
.extra-list-row + .extra-list-row { border-top: 1px solid #e5e6eb; }
.extra-list-copy { flex: 1 1 auto; min-width: 0; }
.extra-list-title { display: block; color: #1d2129; font-size: inherit; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.extra-list-description { margin: 6px 0 0; color: #86909c; line-height: 1.5; overflow-wrap: anywhere; }
.scene-extra-element .extra-list-chevron { width: 32px; height: 32px; color: #86909c; }
.extra-comparison { display: grid; grid-auto-rows: minmax(68px, 1fr); flex: 1 1 auto; min-height: 0; margin: 20px 0 0; overflow: auto; border: 1px solid #e5e6eb; border-radius: 4px; }
.extra-comparison-row { display: grid; grid-template-columns: minmax(0, 34%) minmax(0, 1fr); min-height: 68px; }
.extra-comparison-row + .extra-comparison-row { border-top: 1px solid #e5e6eb; }
.extra-comparison dt, .extra-comparison dd { display: flex; align-items: center; min-width: 0; margin: 0; padding: 16px 20px; line-height: 1.5; overflow-wrap: anywhere; }
.extra-comparison dt { background: #f7f8fa; color: #4e5969; border-right: 1px solid #e5e6eb; }
.extra-comparison dd { color: #1d2129; }
.extra-chart-bars { position: relative; display: flex; flex: 1 1 auto; gap: 24px; min-height: 0; margin-top: 24px; padding: 0 16px; overflow: auto; }
.extra-chart-column { display: flex; flex-direction: column; align-items: center; flex: 1 0 64px; min-width: 0; min-height: 160px; }
.extra-chart-val { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); color: var(--element-color); font-weight: 500; font-variant-numeric: tabular-nums; line-height: 1.5; white-space: nowrap; }
.extra-chart-bar-wrap { display: flex; align-items: flex-end; justify-content: center; flex: 1 1 auto; width: 100%; min-height: 80px; margin-top: 12px; border-bottom: 1px solid #c9cdd4; background: repeating-linear-gradient(to top, transparent 0, transparent calc(25% - 1px), #f2f3f5 calc(25% - 1px), #f2f3f5 25%); }
.extra-chart-series { position: relative; width: 40px; max-width: 70%; flex: 0 0 auto; }
.extra-chart-fill { display: block; width: 100%; height: 100%; border-radius: 4px 4px 0 0; background: var(--element-color); opacity: .88; }
.extra-chart-lbl { display: block; flex: 0 0 auto; max-width: 100%; margin-top: 16px; color: #4e5969; text-align: center; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.extra-popup { width: 100%; height: 100%; }
.extra-popup-preview { flex-direction: row; align-items: center; gap: 20px; cursor: pointer; }
.extra-popup-icon { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 auto; background: #e8f3ff; border-radius: 4px; color: var(--element-color); }
.scene-extra-element .extra-popup-icon svg { width: 28px; height: 28px; }
.extra-popup-copy { flex: 1 1 auto; min-width: 0; }
.extra-popup-description { margin: 8px 0 0; color: #86909c; line-height: 1.5; }
.extra-popup-open { flex: 0 0 auto; min-height: 48px; padding: 10px 24px; border: 1px solid transparent; border-radius: 4px; background: var(--element-color); color: #fff; font: inherit; font-weight: 500; cursor: pointer; }
.extra-popup-header { align-items: flex-start; gap: 24px; }
.extra-popup-close { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto; margin: -4px -4px 0 0; padding: 8px; border: 0; border-radius: 4px; background: transparent; color: #86909c; cursor: pointer; }
.scene-extra-element .extra-popup-close svg { width: 24px; height: 24px; }
.extra-popup-body { flex: 1 1 auto; min-height: 0; padding-top: 20px; overflow: auto; color: #4e5969; }
.extra-popup-body p { margin: 0; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.extra-popup-open:active, .extra-popup-close:active { opacity: .8; }
.extra-popup-open:focus-visible, .extra-popup-close:focus-visible { outline: 2px solid #165dff; outline-offset: 3px; }

/* 横幅 */
.extra-banner {
  justify-content: center;
  gap: 0.25em;
  background: linear-gradient(135deg, var(--element-background, rgba(255, 255, 255, 0.94)), rgba(22, 93, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: calc(12px * var(--element-scale)) calc(20px * var(--element-scale));
}
.extra-banner-title { font-weight: 700; color: #1D2129; }
.extra-banner-content { color: #4E5969; }

/* 公告：全面毛玻璃化 */
.extra-notice-glass {
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: clamp(14px, 3cqw, 20px);
  background: var(--element-background, rgba(255, 255, 255, 0.88));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

/* 弹层与操作按钮 */
.extra-popup { position: relative; }
.extra-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5em;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: .6em 1.2em;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: var(--element-background, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  color: #165DFF;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.15s ease;
}
.extra-action:active { transform: scale(0.97); }

/* 音量触控滑块 */
.extra-volume input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  min-width: 0;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  outline: none;
}
.extra-volume input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #165DFF;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* 纹理 */
.extra-texture { width: 100%; height: 100%; border-radius: 16px; background-color: var(--element-background); background-image: repeating-linear-gradient(45deg,transparent,transparent 10px,color-mix(in srgb,var(--element-color) 16%,transparent) 10px,color-mix(in srgb,var(--element-color) 16%,transparent) 11px); }
.scene-extra-element .extra-single-icon { width: 100%; height: 100%; padding: .2em; }
.extra-divider { position: relative; top: 50%; width: 100%; border-top: 1px solid var(--element-color); }

/* 倒计时纯数字样式（去除底板） */
.extra-countdown-pure {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.extra-countdown-digits-pure {
  color: var(--element-color, #165DFF);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  font-variant-numeric: tabular-nums;
}

/* 二维码纯净样式（不添加额外底板卡片，仅二维码+文本） */
.extra-qrcode-pure {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 数值指标纯净样式（去除底板） */
.extra-metric-pure {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 动态特效画布 */
.extra-effect-wrapper {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.extra-effect-canvas {
  width: 100%;
  height: 100%;
}
</style>
