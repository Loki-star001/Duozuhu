<template>
  <header class="exhibit-topbar" aria-label="大屏状态栏">
    <img class="exhibit-logo" :src="logoUrl" alt="品信智慧" draggable="false" />

    <div class="exhibit-status-controls">
      <div v-show="!statusCollapsed" class="exhibit-clock">
        <div class="clock-line">
          <time :datetime="now.toISOString()">{{ clock }}</time>
          <span class="weather-condition" :title="weather.label" :aria-label="weather.label" role="img">
            <component :is="weather.icon" :size="23" aria-hidden="true" />
          </span>
        </div>
        <span class="calendar-date">{{ date }}</span>
      </div>
      <span v-show="!statusCollapsed" class="screen-status" :class="{ offline: !online }" role="status" title="当前设备网络状态">
        <span class="status-dot" aria-hidden="true"></span>{{ online ? '在线' : '离线' }}
      </span>

      <div v-show="!statusCollapsed" class="volume-control" ref="volumeControl">
        <button ref="volumeButton" class="utility-button" type="button" aria-label="音量调节" title="音量调节"
          :aria-expanded="volumeOpen" :aria-controls="volumeOpen ? 'exhibit-volume' : undefined" @click="toggleVolume">
          <component :is="volume === 0 ? VolumeX : Volume2" :size="27" aria-hidden="true" />
        </button>
        <div v-if="volumeOpen" id="exhibit-volume" class="volume-popover" @keydown.esc.stop.prevent="closeVolume">
          <div class="volume-readout"><label for="exhibit-volume-range">大屏音量</label><output for="exhibit-volume-range">{{ volume }}%</output></div>
          <input id="exhibit-volume-range" ref="volumeSlider" type="range" min="0" max="100" step="1"
            :value="volume" :aria-valuetext="volume + '%'" @input="changeVolume" />
        </div>
      </div>

      <button class="utility-button" type="button" :aria-label="displayActionLabel" :title="displayActionLabel"
        :aria-expanded="!statusCollapsed" @click="toggleDisplay">
        <component :is="statusCollapsed ? ChevronsLeft : X" :size="26" aria-hidden="true" />
      </button>


    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  ChevronsLeft, X, Cloud, CloudFog, CloudLightning, CloudMoon, CloudOff, CloudRain, CloudSnow,
  CloudSun, Moon, Sun, Volume2, VolumeX,
} from 'lucide-vue-next';

defineProps<{ logoUrl: string; volume: number }>();
const emit = defineEmits<{ 'update:volume': [value: number] }>();
const now = ref(new Date());
const online = ref(navigator.onLine);
const calendar = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const wallClock = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const clock = computed(() => wallClock.format(now.value));
const date = computed(() => calendar.formatToParts(now.value)
  .map(part => part.type === 'weekday' ? ' ' + part.value : part.value).join(''));

const weatherUrl = import.meta.env.VITE_EXHIBITION_WEATHER_URL;
const weatherLocation = import.meta.env.VITE_EXHIBITION_WEATHER_LOCATION;
const weatherData = ref<{ code: number; daylight: boolean }>();
let weatherRequest: AbortController | undefined;
const weather = computed(() => {
  if (weatherData.value && online.value) {
    const { code, daylight } = weatherData.value;
    let icon = Cloud;
    let label = '阴';
    if (code === 0) { icon = daylight ? Sun : Moon; label = '晴'; }
    else if (code === 1 || code === 2) { icon = daylight ? CloudSun : CloudMoon; label = '多云'; }
    else if (code === 45 || code === 48) { icon = CloudFog; label = '雾'; }
    else if (code >= 95) { icon = CloudLightning; label = '雷雨'; }
    else if ((code >= 71 && code <= 77) || code === 85 || code === 86) { icon = CloudSnow; label = '雪'; }
    else if (code > 48) { icon = CloudRain; label = '雨'; }
    return { icon, label: weatherLocation ? weatherLocation + ' · ' + label : label };
  }
  if (!weatherUrl && import.meta.env.DEV && online.value) {
    return { icon: Sun, label: '天气预览：晴' };
  }
  return { icon: CloudOff, label: '天气暂不可用' };
});

async function refreshWeather() {
  if (!weatherUrl || !online.value) return;
  weatherRequest?.abort();
  const request = new AbortController();
  weatherRequest = request;
  try {
    // Accept WMO weather codes in an Open-Meteo-compatible current object.
    const response = await fetch(weatherUrl, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(6000)]) });
    if (!response.ok) throw new Error('Weather request failed');
    const { current } = await response.json();
    if (!Number.isInteger(current?.weather_code) || current.weather_code < 0 || current.weather_code > 99) {
      throw new Error('Invalid weather code');
    }
    if (!request.signal.aborted) {
      weatherData.value = { code: current.weather_code, daylight: current.is_day !== 0 };
    }
  } catch {
    if (!request.signal.aborted) weatherData.value = undefined;
  }
}
function refreshOnline() {
  online.value = navigator.onLine;
  if (online.value) void refreshWeather();
  else {
    weatherRequest?.abort();
    weatherData.value = undefined;
  }
}

const volumeStorageKey = 'pinxin-exhibition-volume';
const volumeOpen = ref(false);
const volumeControl = ref<HTMLElement>();
const volumeButton = ref<HTMLButtonElement>();
const volumeSlider = ref<HTMLInputElement>();
function changeVolume(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber;
  emit('update:volume', value);
  try { localStorage.setItem(volumeStorageKey, String(value)); }
  catch { /* Volume still works for this visit. */ }
}
async function toggleVolume() {
  volumeOpen.value = !volumeOpen.value;
  if (!volumeOpen.value) return;
  await nextTick();
  volumeSlider.value?.focus({ preventScroll: true });
}
function closeVolume() {
  volumeOpen.value = false;
  volumeButton.value?.focus({ preventScroll: true });
}
function dismissVolume(event: PointerEvent) {
  const control = volumeControl.value;
  if (volumeOpen.value && control && !event.composedPath().includes(control)) volumeOpen.value = false;
}

const statusCollapsed = ref(false);
const fullscreen = ref(Boolean(document.fullscreenElement));
const displayActionLabel = computed(() => {
  if (fullscreen.value) return '退出全屏';
  return statusCollapsed.value ? '展开状态栏' : '关闭状态栏';
});
function syncFullscreen() {
  fullscreen.value = Boolean(document.fullscreenElement);
}
async function toggleDisplay() {
  volumeOpen.value = false;
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
      syncFullscreen();
      return;
    } catch { /* Embedded browsers can restrict fullscreen operations. */ }
  }
  statusCollapsed.value = !statusCollapsed.value;
}

let clockTimer: number;
let weatherTimer: number | undefined;
onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = new Date(); }, 1000);
  try {
    const saved = localStorage.getItem(volumeStorageKey);
    if (saved !== null && Number.isFinite(Number(saved))) emit('update:volume', Number(saved));
  } catch { /* Storage is optional for kiosk browsers. */ }
  window.addEventListener('online', refreshOnline);
  window.addEventListener('offline', refreshOnline);
  window.addEventListener('pointerdown', dismissVolume);
  document.addEventListener('fullscreenchange', syncFullscreen);
  if (weatherUrl) {
    void refreshWeather();
    weatherTimer = window.setInterval(refreshWeather, 15 * 60 * 1000);
  }
});
onBeforeUnmount(() => {
  window.clearInterval(clockTimer);
  window.clearInterval(weatherTimer);
  weatherRequest?.abort();
  window.removeEventListener('online', refreshOnline);
  window.removeEventListener('offline', refreshOnline);
  window.removeEventListener('pointerdown', dismissVolume);
  document.removeEventListener('fullscreenchange', syncFullscreen);
});
</script>

<style scoped>
.exhibit-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  gap: 24px;
  color: var(--exhibit-ink);
}
.exhibit-logo { width: auto; height: 64px; max-width: 230px; object-fit: contain; }
.exhibit-status-controls {
  position: relative;
  display: flex;
  gap: 20px;
  align-items: center;
}
.screen-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 0 1px;
  white-space: nowrap;
  color: #236044;
  font-size: 19px;
  font-weight: 600;
}
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: #24a06b; }
.screen-status.offline { color: #8b3f33; }
.offline .status-dot { background: #c66252; }
.utility-button {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 13px;
  color: var(--exhibit-muted);
}
.utility-button:active, .volume-control .utility-button[aria-expanded=true] {
  color: var(--exhibit-accent);
  background: var(--exhibit-accent-tint);
}
.exhibit-clock {
  display: grid;
  gap: 2px;

  white-space: nowrap;
}
.clock-line { display: flex; align-items: center; gap: 10px; }
.clock-line time { font-size: 28px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.1; }
.weather-condition { display: flex; align-items: center; gap: 4px; color: var(--exhibit-muted); }
.calendar-date { color: var(--exhibit-muted); font-size: 16px; line-height: 1.3; }
.volume-control { position: relative; }
.volume-popover {
  position: absolute;
  border: 1px solid var(--exhibit-divider);
  border-radius: 18px;
  background: #f8fbff;
  color: var(--exhibit-ink);
  box-shadow: 0 8px 22px #314a7026;
  z-index: 2;
  top: calc(100% + 13px);
  left: 50%;
  transform: translateX(-50%);
  width: 252px;
  padding: 14px 18px;
}
.volume-readout { display: flex; justify-content: space-between; gap: 12px; font-size: 19px; }
.volume-readout output { color: var(--exhibit-accent); font-variant-numeric: tabular-nums; }
#exhibit-volume-range {
  width: 100%;
  height: 42px;
  margin-top: 6px;
  accent-color: var(--exhibit-accent);
  touch-action: none;
  cursor: pointer;
}
</style>
