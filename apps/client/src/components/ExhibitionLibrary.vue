<template>
  <nav class="hall-rail glass" aria-label="展厅功能" @keydown.esc.stop="backOrClose">
    <span class="rail-selection" aria-hidden="true"
      :style="{ opacity: active ? 1 : 0, transform: 'translateY(' + selectedIndex * 124 + 'px)' }"></span>
    <button v-for="item in sections" :key="item.key" :ref="el => rememberButton(item.key, el)" type="button"
      :class="{ active: active === item.key }" :aria-expanded="active === item.key"
      :aria-controls="active === item.key ? 'exhibition-panel' : undefined" @click="openSection(item.key)">
      <SceneArcoIcon :name="item.icon" :size="36" /><span>{{ item.title }}</span>
    </button>
  </nav>

  <Transition :css="false" @enter="enterPanel" @leave="leavePanel"
    @enter-cancelled="cancelMotion" @leave-cancelled="cancelMotion">
  <section v-if="current" :data-section="current.key" id="exhibition-panel" class="hall-sheet glass" aria-labelledby="exhibition-panel-title"
    @keydown.esc.stop="backOrClose">
    <header>
      <button v-if="detail" class="back-button" type="button" aria-label="返回列表" @click="backToList">
        <ChevronLeft :size="24" aria-hidden="true" />返回
      </button>
      <h2 id="exhibition-panel-title">{{ current.title }}</h2>
      <ExhibitionHallPicker v-if="active === 'guide' && !detail" v-model="hallId" :halls="halls" />
      <button class="close-button" type="button" aria-label="关闭功能面板" @click="close"><X :size="24" aria-hidden="true" /></button>
    </header>

    <div class="sheet-content">
    <Transition name="channel-swap" @before-enter="enableSection" @before-leave="disableSection">
    <div ref="body" class="sheet-body" :key="active">
      <template v-if="active === 'guide'">
        <div v-if="placeDetail" class="detail-intro">
          <small>{{ currentHall.title }} · {{ stopNumber(placeDetail.index) }} 号点位</small>
          <h3 ref="detailHeading" tabindex="-1">{{ placeDetail.title }}</h3>
        </div>
        <ExhibitionMap :key="hallId" :selected="detail" :detail-only="Boolean(placeDetail)"
          :places="currentHall.stops" @select="openDetail" />
      </template>

      <template v-else-if="active === 'resources'">
        <article v-if="resourceDetail" class="item-detail">
          <div class="detail-intro">
            <h3 ref="detailHeading" tabindex="-1">{{ resourceDetail.title }}</h3>
            <p>{{ resourceDetail.description }}</p>
          </div>
          <div class="detail-block">
            <h4>资料目录</h4>
            <ul><li v-for="entry in resourceDetail.entries" :key="entry.title">{{ entry.title }}</li></ul>
          </div>
          <div class="resource-scan">
            <img v-if="resourceCodes[resourceDetail.section]" :src="resourceCodes[resourceDetail.section]"
              :alt="resourceDetail.title + '二维码'" width="296" height="296" />
            <p>{{ resourceCodes[resourceDetail.section] ? '扫码查看文字资料' : resourceCodeStatus }}</p>
          </div>
        </article>
        <div v-show="!resourceDetail" class="resource-list">
          <article v-for="resource in resources" :key="resource.title" class="resource-card">
            <div>
              <h3>{{ resource.title }}</h3>
              <p>{{ resource.description }}</p>
            </div>
            <div class="resource-scan">
              <img v-if="resourceCodes[resource.section]" :src="resourceCodes[resource.section]"
                :alt="resource.title + '二维码'" width="296" height="296" />
              <p>{{ resourceCodes[resource.section] ? '扫码查看文字资料' : resourceCodeStatus }}</p>
            </div>
            <button type="button" class="open-resource" :aria-label="'查看' + resource.title"
              @click="openDetail(resource.title, $event)"></button>
          </article>
        </div>
      </template>

      <template v-else>
        <article v-if="catalogDetail" class="item-detail">
          <div class="detail-intro">
            <small v-if="catalogDetail.section === 'cases'">{{ catalogDetail.summary }} · 应用示例</small>
            <h3 ref="detailHeading" tabindex="-1">{{ catalogDetail.title }}</h3>
            <p>{{ catalogDetail.text }}</p>
          </div>
          <ExhibitionVisual :preview="catalogDetail.section === 'products' ? catalogDetail.preview : undefined" large />
          <div class="detail-block">
            <h4>{{ catalogDetail.section === 'products' ? '适用场景' : '应用方式' }}</h4>
            <ul class="detail-lines" role="list"><li v-for="item in catalogDetail.detailItems" :key="item">{{ item }}</li></ul>
          </div>
        </article>
        <div v-show="!catalogDetail" class="catalog" :class="{ 'case-grid': active === 'cases' }">
          <article v-for="entry in catalogEntries" :key="entry.title" class="catalog-entry">
            <ExhibitionVisual :preview="entry.section === 'products' ? entry.preview : undefined" />
            <div class="catalog-copy">
              <small v-if="entry.section === 'cases'">{{ entry.summary }}</small>
              <h3>{{ entry.title }}</h3>
              <p>{{ entry.text }}</p>
            </div>
            <button type="button" class="open-entry" :aria-label="'查看' + entry.title + '详情'" @click="openDetail(entry.title, $event)">
              <ChevronRight :size="24" aria-hidden="true" />
            </button>
          </article>
        </div>
      </template>
    </div>
    </Transition>
    </div>
  </section>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, type ComponentPublicInstance } from 'vue';
import QRCode from 'qrcode';
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next';
import SceneArcoIcon from './SceneArcoIcon.vue';
import ExhibitionHallPicker from './ExhibitionHallPicker.vue';
import ExhibitionMap from './ExhibitionMap.vue';
import ExhibitionVisual from './ExhibitionVisual.vue';
import { halls, catalog, stopNumber } from './exhibitionContent';

const sections = [
  { key: 'guide', title: '展厅导览', icon: 'guide' },
  { key: 'products', title: '产品中心', icon: 'product' },
  { key: 'cases', title: '案例展示', icon: 'case' },
  { key: 'resources', title: '获取资料', icon: 'news' },
] as const;
type Section = typeof sections[number]['key'];
type HallId = typeof halls[number]['id'];

const resources = [
  { title: '产品介绍', section: 'products', description: '视频生成、数字人交互、数字人直播' },
  { title: '行业应用案例', section: 'cases', description: '智慧政务、智慧文旅、教育教学、虚拟演播' },
].map(resource => {
  const entries = catalog.filter(entry => entry.section === resource.section);
  // Encode the material itself so a visitor can scan even on the localhost preview.
  const text = ['品信智慧｜' + resource.title, ...entries.map(entry =>
    entry.title + '\n' + entry.text
  )].join('\n\n');
  return { ...resource, entries, text };
});

const resourceCodes = ref<Record<string, string>>({});
const resourceCodeStatus = ref('正在生成二维码…');
onMounted(async () => {
  await Promise.all(resources.map(async resource => {
    try {
      resourceCodes.value[resource.section] = await QRCode.toDataURL(resource.text, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 592,
      });
    } catch {
      resourceCodeStatus.value = '二维码暂不可用';
    }
  }));
});

const active = ref<Section | null>(null);
const hallId = ref<HallId>(halls[0].id);
const detail = ref('');
const body = ref<HTMLElement>();
const detailHeading = ref<HTMLElement>();
let returnFocus: HTMLElement | SVGElement | undefined;
let listScrollTop = 0;
const selectedIndex = computed(() => Math.max(0, sections.findIndex(item => item.key === active.value)));
const buttons = new Map<Section, HTMLButtonElement>();
const emit = defineEmits<{ change: [open: boolean] }>();
const current = computed(() => sections.find(item => item.key === active.value));
const currentHall = computed(() => halls.find(hall => hall.id === hallId.value) ?? halls[0]);
const catalogEntries = computed(() => catalog.filter(entry => entry.section === active.value));
const catalogDetail = computed(() => catalogEntries.value.find(entry => entry.title === detail.value));
const resourceDetail = computed(() => resources.find(resource => resource.title === detail.value));
const placeDetail = computed(() => {
  const index = currentHall.value.stops.findIndex(place => place.title === detail.value);
  return index < 0 ? undefined : { title: currentHall.value.stops[index].title, index };
});

async function openDetail(title: string, event: Event) {
  returnFocus = event.currentTarget as HTMLElement | SVGElement;
  listScrollTop = body.value?.scrollTop ?? 0;
  detail.value = title;
  await nextTick();
  if (body.value) body.value.scrollTop = 0;
  detailHeading.value?.focus({ preventScroll: true });
}

async function backToList() {
  detail.value = '';
  await nextTick();
  if (body.value) body.value.scrollTop = listScrollTop;
  returnFocus?.focus({ preventScroll: true });
  returnFocus = undefined;
}

function backOrClose() {
  if (detail.value) void backToList();
  else close();
}

function rememberButton(key: Section, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLButtonElement) buttons.set(key, el);
}
function close() {
  if (!active.value) return;
  buttons.get(active.value)?.focus();
  active.value = null;
  detail.value = '';
  returnFocus = undefined;
  emit('change', false);
}
function openSection(key: Section) {
  if (key === active.value) return backOrClose();
  active.value = key;
  detail.value = '';
  returnFocus = undefined;
  emit('change', true);
}

function cancelMotion(element: Element) {
  element.getAnimations().forEach(animation => animation.cancel());
}
function enableSection(element: Element) { element.removeAttribute('inert'); }
function disableSection(element: Element) { element.setAttribute('inert', ''); }
function panelMotion(element: Element, done: () => void, entering: boolean) {
  const panel = element as HTMLElement;
  const trigger = buttons.get(panel.dataset.section as Section);
  if (!trigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
  cancelMotion(panel);
  const from = trigger.getBoundingClientRect();
  const to = panel.getBoundingClientRect();
  const scale = to.width / panel.offsetWidth;
  const dx = (from.left - to.left) / scale;
  const dy = (from.top - to.top) / scale;
  const atButton = 'translate(' + dx + 'px,' + dy + 'px) scale(' + from.width / to.width + ',' + from.height / to.height + ')';
  // Only opening and closing animate the panel itself.
  const frames = [{ transform: atButton, opacity: 0 }, { transform: 'none', opacity: 1 }];
  const motion = panel.animate(entering ? frames : frames.reverse(), {
    duration: entering ? 260 : 165,
    easing: entering ? 'cubic-bezier(.22,.8,.25,1)' : 'ease-in',
  });
  motion.onfinish = () => done();
}
function enterPanel(element: Element, done: () => void) { panelMotion(element, done, true); }
function leavePanel(element: Element, done: () => void) {
  element.setAttribute('inert', '');
  panelMotion(element, done, false);
}
</script>

<style scoped>
.glass { color: var(--exhibit-ink); }
.hall-rail, .hall-sheet { position: absolute; border-radius: var(--exhibit-frame-radius); }
.hall-rail {
  z-index: 8;
  left: 4.63%;
  top: 20.52%;
  width: 132px;
  display: grid;
  gap: 16px;
  padding: 12px;
  background: var(--exhibit-rail-glass);
  backdrop-filter: blur(10px);
  box-shadow: var(--exhibit-outline), 0 1px 8px #00000014;
}
.rail-selection {
  position: absolute;
  inset: 12px 12px auto;
  height: 108px;
  pointer-events: none;
  border-radius: var(--exhibit-inner-radius);
  background: color-mix(in srgb, var(--exhibit-accent-tint) 80%, transparent);
  box-shadow: var(--exhibit-outline);
  transition: transform 230ms cubic-bezier(.2,.8,.2,1), opacity 150ms ease;
}
.hall-rail button {
  position: relative;
  transition: color 180ms ease, transform 120ms ease;
  min-height: 108px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  border-radius: var(--exhibit-inner-radius);
  color: var(--exhibit-muted);
}
.hall-rail button span {
  font-size: var(--exhibit-body);
  line-height: 28px;
  font-weight: 500;
}
.hall-rail button.active {
  color: var(--exhibit-accent);
}
.hall-rail button:active { transform: scale(.96); }
@media (prefers-reduced-motion: reduce) {
  .rail-selection, .hall-rail button { transition: none; }
}
.hall-sheet {
  left: 18.7%;
  top: 20.9%;
  width: 71.7%;
  z-index: 7;
  display: flex;
  flex-direction: column;
  max-height: 70%;
  transform-origin: top left;
  overflow: hidden;
  background: var(--exhibit-panel-glass);
  backdrop-filter: blur(40px);
  box-shadow: var(--exhibit-outline);
}
.hall-sheet header {
  display: flex;
  align-items: center;
  gap: var(--exhibit-block-gap);
  flex-shrink: 0;
  padding: 18px var(--exhibit-panel-inset) 22px;
}
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 4px 12px 4px 7px;
  border: 1px solid var(--exhibit-divider);
  border-radius: var(--exhibit-pill-radius);
  color: var(--exhibit-muted);
  font-size: var(--exhibit-body);
}
.back-button:active { background: var(--exhibit-accent-tint); }
.hall-sheet h2 {
  margin: 0;
  font-size: var(--exhibit-title);
  line-height: 36px;
  font-weight: 600;
}
.close-button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: auto;
  color: var(--exhibit-ink);
  border-radius: 50%;
}
.close-button:active { background: var(--exhibit-accent-tint); }
.sheet-content {
  display: grid;
  grid-template: minmax(0, auto) / minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}
.sheet-body {
  grid-area: 1 / 1;
  min-height: 0;
  padding: 0 var(--exhibit-panel-inset) var(--exhibit-panel-inset);
  overflow: auto;
  overscroll-behavior: contain;
}
.channel-swap-enter-active {
  z-index: 1;
  transition: opacity 250ms ease-out, transform 250ms cubic-bezier(.2,.75,.3,1);
}
.channel-swap-leave-active {
  pointer-events: none;
  transition: opacity 210ms ease-in, transform 210ms ease-out;
}
.channel-swap-enter-from { opacity: 0; transform: translateY(12px); }
.channel-swap-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .channel-swap-enter-active, .channel-swap-leave-active { transition: none; }
}
.catalog { display: grid; gap: 18px; }
.catalog-entry {
  position: relative;
  display: grid;
  grid-template-columns: 192px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 16px;
  border: 1px solid rgba(82, 94, 113, .16);
  border-radius: var(--exhibit-inner-radius);
  background: rgba(255, 255, 255, .62);
}
.catalog-copy { min-width: 0; padding-right: 27px; }
.open-entry {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 12px;
  border-radius: inherit;
  color: var(--exhibit-muted);
}
.case-grid .open-entry { align-items: flex-start; padding-top: 167px; }
.open-entry:active, .open-resource:active { background: rgba(4, 104, 254, .08); }
.open-resource {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.detail-intro { margin-bottom: 24px; }
.detail-intro h3 {
  margin: 0;
  color: var(--exhibit-ink);
  font-size: 36px;
  line-height: 1.3;
  font-weight: 600;
}
.detail-intro small, .detail-intro p, .detail-block li {
  color: var(--exhibit-muted);
  font-size: var(--exhibit-body);
  line-height: 1.65;
}
.detail-intro small { display: block; margin-bottom: 8px; }
.detail-intro p { margin: 12px 0 0; }
.detail-block {
  margin: 24px 0;
  padding: 20px 24px;
  border: 1px solid var(--exhibit-divider);
  border-radius: var(--exhibit-inner-radius);
  background: rgba(255, 255, 255, .55);
}
.detail-block h4 { margin: 0 0 10px; font-size: var(--exhibit-heading); font-weight: 600; }
.detail-block ul { margin: 0; padding: 0 0 0 24px; list-style: disc; }
.detail-block .detail-lines { padding: 0; list-style: none; }
.detail-block li + li { margin-top: 8px; }
.case-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.case-grid .catalog-entry {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  align-items: start;
  gap: 15px;
}
.catalog-entry h3, .resource-card h3 {
  margin: 0;
  color: var(--exhibit-ink);
  font-size: var(--exhibit-heading);
  line-height: 1.3;
  font-weight: 600;
}
.catalog-copy small {
  display: inline-block;
  margin-bottom: 8px;
  padding: 2px 10px;
  border-radius: var(--exhibit-pill-radius);
  background: var(--exhibit-accent-tint);
  color: var(--exhibit-muted);
  font-size: 17px;
  font-weight: 500;
}
.catalog-entry p, .resource-card p {
  max-width: 31em;
  margin: var(--exhibit-row-gap) 0 0;
  color: var(--exhibit-muted);
  font-size: var(--exhibit-body);
  line-height: 1.65;
}
.catalog-entry p { margin-top: 8px; }
.resource-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.resource-card {
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: start;
  gap: 16px;
  padding: 16px;
  border-radius: var(--exhibit-inner-radius);
  border: 1px solid var(--exhibit-divider);
  background: rgba(255, 255, 255, .62);
}
.resource-card .resource-scan { width: 100%; }
.resource-scan {
  display: grid;
  justify-items: center;
  align-items: center;
  gap: 10px;
  color: var(--exhibit-muted);
}
.resource-scan img {
  display: block;
  width: min(100%, 296px);
  height: auto;
  aspect-ratio: 1;
  border-radius: 12px;
  background: #fff;
  image-rendering: pixelated;
}
.resource-scan p { margin: 0; font-size: 19px; }
</style>

