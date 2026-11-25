<template>
  <div class="scene-floating-topbar">
    <div class="scene-topbar-content" :class="{ 'is-background-hidden': !showBanner }">
    <!-- 1. 左侧品牌 Logo -->
    <div v-if="showLogo" class="scene-topbar-brand">
      <div class="scene-topbar-logo">
        <img :src="logoUrl || '/logos/pinxin-smart.png'" alt="平台Logo" draggable="false" />
      </div>
    </div>

    <!-- 2. 右侧时间与日期 (方案一: 时间 + 日期星期横排并列; 方案三: 仅显示时间) -->
    <div class="scene-topbar-right">
      <div v-if="showTime" class="scene-topbar-datetime" :class="timeDisplayMode">
        <span class="topbar-time-val">{{ timeText || clock || '9:41' }}</span>
        <template v-if="timeDisplayMode !== 'time'">
          <span class="topbar-divider" aria-hidden="true"></span>
          <span class="topbar-date-val">{{ dateText || timezone || '2026年10月20日 星期二' }}</span>
        </template>
      </div>

      <!-- 3. 右上角操作区：音量控制 + 刷新（开启时靠右收拢展示） -->
      <div v-if="showVolume || showRefresh" class="scene-topbar-actions">
        <button
          v-if="showVolume !== false"
          type="button"
          class="topbar-icon-action"
          :aria-label="isMuted ? '取消静音' : '音量控制'"
          @click.stop="emit('toggleVolume')"
        >
          <component :is="isMuted ? VolumeX : Volume2" class="topbar-icon-svg" />
        </button>

        <button
          v-if="showRefresh !== false"
          type="button"
          class="topbar-icon-action"
          aria-label="刷新页面"
          @click.stop="emit('refresh')"
        >
          <RotateCcw class="topbar-icon-svg" />
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Volume2, VolumeX, RotateCcw } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    showBanner?: boolean;
    showLogo?: boolean;
    showTime?: boolean;
    timeDisplayMode?: 'datetime' | 'time';
    logoUrl?: string;
    brandTitle?: string;
    brandSubtitle?: string;
    clock?: string;
    timezone?: string;
    timeText?: string;
    dateText?: string;
    showVolume?: boolean;
    isMuted?: boolean;
    showRefresh?: boolean;
  }>(),
  {
    showBanner: false,
    showLogo: true,
    showTime: true,
    timeDisplayMode: 'datetime',
    logoUrl: '/logos/pinxin-smart.png',
    brandTitle: '品信智慧',
    brandSubtitle: '实 时 交 互 数 字 人 平 台',
    clock: '9:41',
    timezone: '2026年10月20日 星期二',
    timeText: '',
    dateText: '',
    showVolume: false,
    isMuted: false,
    showRefresh: false
  }
);

const emit = defineEmits<{
  toggleVolume: [];
  refresh: [];
}>();
</script>

<style scoped>
.scene-floating-topbar {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  container-type: size;
}
.scene-floating-topbar.kiosk-scene-object { position: absolute; }

/* One shared unit scales all content with both dimensions of its own banner. */
.scene-topbar-content {
  --topbar-unit: min(.125cqw, 1.5625cqh);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(24 * var(--topbar-unit));
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: calc(10 * var(--topbar-unit)) calc(24 * var(--topbar-unit));
  border: calc(1 * var(--topbar-unit)) solid rgba(255, 255, 255, 0.55);
  border-radius: calc(10 * var(--topbar-unit));
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.58), rgba(246, 249, 253, 0.40));
  box-shadow: 0 calc(2 * var(--topbar-unit)) calc(12 * var(--topbar-unit)) rgba(35,55,83,.035);
  backdrop-filter: blur(calc(12 * var(--topbar-unit)));
  -webkit-backdrop-filter: blur(calc(12 * var(--topbar-unit)));
  overflow: hidden;
}
.scene-topbar-brand {
  display: flex;
  align-items: center;
  gap: calc(12 * var(--topbar-unit));
  flex: 0 1 auto;
  min-width: 0;
  height: 100%;
}
.scene-topbar-content.is-background-hidden {
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.scene-topbar-logo { display:flex; align-items:center; justify-content:center; flex:0 0 auto; height:100%; }
.scene-topbar-logo img {
  display: block;
  height: 64px;
  width: auto;
  max-width: 240px;
  max-height: 72px;
  object-fit: contain;
  pointer-events: none;
}
.scene-topbar-brand-text { display:flex; flex-direction:column; justify-content:center; min-width:0; }
.brand-title {
  font-size: calc(26 * var(--topbar-unit));
  font-weight: 700;
  color: #1E293B;
  line-height: 1.25;
  letter-spacing: .01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-subtitle {
  font-size: calc(11 * var(--topbar-unit));
  font-weight: 500;
  color: #64748B;
  line-height: 1.2;
  letter-spacing: .08em;
  margin-top: calc(3 * var(--topbar-unit));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.scene-topbar-right { display:flex; align-items:center; gap:calc(20 * var(--topbar-unit)); flex:0 0 auto; min-width:0; margin-left:auto; justify-content:flex-end; }
.scene-topbar-datetime {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--topbar-unit));
  white-space: nowrap;
}
.topbar-time-val {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: calc(26 * var(--topbar-unit));
  font-weight: 600;
  color: #1E293B;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.topbar-divider {
  display: inline-block;
  width: 1px;
  height: calc(16 * var(--topbar-unit));
  background-color: rgba(100, 116, 139, 0.32);
  margin: 0 calc(2 * var(--topbar-unit));
  flex-shrink: 0;
}
.topbar-date-val {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: calc(13 * var(--topbar-unit));
  font-weight: 500;
  color: #475569;
  letter-spacing: .02em;
  line-height: 1;
}
.scene-topbar-actions { display:flex; align-items:center; gap:calc(4 * var(--topbar-unit)); flex:0 0 auto; padding-left:calc(12 * var(--topbar-unit)); border-left:calc(1 * var(--topbar-unit)) solid rgba(63,85,115,.12); }
.topbar-icon-action {
  display:flex; align-items:center; justify-content:center;
  width:64px; height:64px;
  border-radius:calc(4 * var(--topbar-unit)); border:0;
  background:transparent;
  box-shadow:none;
  color:#4E5969; cursor:pointer; transition:transform .2s ease; padding:0;
}
.topbar-icon-action:active { background:rgba(22,93,255,.08); color:#165DFF; transform:scale(.96); }
.topbar-icon-svg { width:40px; height:40px; flex-shrink:0; }
</style>
