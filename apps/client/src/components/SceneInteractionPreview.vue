<template>
  <component :is="standalone ? 'main' : ElDrawer"
    v-bind="standalone ? { class: 'exhibition-page' } : { modelValue: true, title: '交互预览', appendToBody: true, size: '100%', withHeader: false, closeOnClickModal: false, class: 'kiosk-preview-drawer' }"
    @close="emit('close')">
    <div class="kiosk-preview-page">
      <header v-if="!standalone" class="kiosk-preview-header">
        <div><h2>交互预览</h2><p>本地演示 · 回答使用当前预演文案，未连接知识库、录音与语音播报服务</p></div>
        <el-button aria-label="关闭交互预览" @click="emit('close')"><X :size="16" /><span>返回编辑</span></el-button>
      </header>
      <div v-if="!standalone" class="kiosk-preview-toolbar">
        <label for="kiosk-scenario">演示场景</label>
        <select id="kiosk-scenario" v-model="scenario" @change="resetSession">
          <option value="normal">正常回答</option><option value="no-answer">知识未命中</option><option value="timeout">回答超时</option><option value="service">服务不可用</option><option value="microphone">语音不可用</option>
        </select>
        <span>语音演示使用当前「游客提问预演」文案</span>
      </div>
      <div ref="stageRef" class="kiosk-preview-stage">
        <div class="kiosk-screen-frame" :style="{ width: `${logicalWidth * scale}px`, height: `${logicalHeight * scale}px` }">
          <section data-scene-presentation class="kiosk-screen" :aria-label="standalone ? '数字人展厅' : '数字人大屏交互演示'" :style="{ width: `${logicalWidth}px`, height: `${logicalHeight}px`, transform: `scale(${scale})` }" @pointerdown="touchSession" @keydown="touchSession" @wheel.passive="touchSession">
            <div class="kiosk-backdrop" :style="{ backgroundColor: scene.bgColor, backgroundImage: scene.bgType === 'IMAGE' ? `url(${scene.bgImageUrl})` : undefined }" />
            <template v-for="layer in previewLayers" :key="layer.id">
              <SceneExtraElement v-if="scene.extraElements?.[layer.id]" class="kiosk-scene-object" :style="boxStyle(layer.id)" :element="scene.extraElements[layer.id]" :scale="1" @refresh="resetSession" @volume="value => previewVolume = value" />
              <ScenePersonPreview v-else-if="layer.id === 'person'" :key="scene.personMedia?.id || 'original-person'" :media="scene.personMedia" class="kiosk-scene-object kiosk-art" :style="boxStyle(layer.id)" :speaking="!contentMode && state.phase === 'answering'" />
              <div v-else-if="layer.id === 'topbar' && $slots.topbar" class="kiosk-scene-object"
                :style="{ ...boxStyle(layer.id), zIndex: 12 }">
                <slot name="topbar" :volume="previewVolume" :set-volume="setPreviewVolume" />
              </div>
              <SceneFloatingTopBar
                v-else-if="layer.id === 'topbar'"
                class="kiosk-scene-object"
                :style="boxStyle(layer.id)"
                :show-banner="scene.showBanner ?? true"
                :show-logo="scene.showLogo ?? scene.layers.some(item => item.id === 'logo')"
                :show-time="scene.showTime ?? scene.layers.some(item => item.id === 'kk-time')"
                :time-display-mode="scene.timeDisplayMode || 'datetime'"
                :logo-url="scene.logoUrl"
                :clock="scene.clock"
                :time-text="scene.clock"
                :date-text="scene.dateText || scene.timezone"
                :timezone="scene.timezone"
                :show-volume="scene.showVolume ?? true"
                :is-muted="previewVolume === 0"
                :show-refresh="scene.showRefresh ?? true"
                @toggle-volume="previewVolume = previewVolume > 0 ? 0 : 80"
                @refresh="resetSession"
              />
              <slot v-else-if="layer.id === 'kingkong-rail' && $slots.navigation" name="navigation" :close-keyboard="() => qaInputRef?.closeKeyboard()" />
              <SceneKingkongRail
                v-else-if="layer.id === 'kingkong-rail'"
                class="kiosk-scene-object"
                :style="boxStyle(layer.id)"
                :items="scene.buttons"
                @select="id => askShortcut(`kk-${id}`)"
              />
              
              <button
                v-else-if="layer.id === 'voice' && (!inputExpanded || !(scene.showInput ?? true)) && !isMorphing"
                type="button"
                class="kiosk-scene-object kiosk-conversation-orb"
                :style="boxStyle(layer.id)"
                aria-label="点击开启语音对话"
                :aria-expanded="inputExpanded"
                :disabled="busy"
                @click="handleVoiceButtonClick"
              >
                <SceneVoiceButton
                  :theme="scene.voiceTheme || 'crystal'"
                  :size="voiceKioskSize"
                  :animation-duration="scene.voiceAnimationDuration || 45"
                  :state="!inputExpanded ? 'idle' : kioskVoiceState"
                  :interactive="false"
                />
              </button>
              <template v-else-if="layer.id === 'media' && scene.multimediaUrl">
                <img v-if="scene.isImageMedia" class="kiosk-scene-object kiosk-art rounded-[4px] object-cover" :class="{ 'elder2-multimedia': scene.multimediaUrl.includes('/elder-2/') }" :style="boxStyle(layer.id)" :src="scene.multimediaUrl" alt="多媒体" />
                <video v-else class="kiosk-scene-object rounded-[4px] object-cover" :style="boxStyle(layer.id)" :src="scene.multimediaUrl" :volume="previewVolume / 100" autoplay muted loop playsinline controls />
              </template>
              <Transition v-else-if="layer.id === 'dialogue'" name="exhibit-dialog" @after-leave="emit('dialogue-hidden')">
              <div v-show="dialogueVisibility ? dialogueVisibility === 'shown' : !contentMode"
                :inert="contentMode || dialogueVisibility === 'hidden'"
                class="kiosk-scene-object kiosk-qa-composite" :style="boxStyle(layer.id)">
                <SceneQaCard
                  v-if="(scene.showDialogue ?? true) && !voiceFeedbackVisible && (!keyboardOpen || activeKioskTurn)"
                  :state="kioskCardState"
                  :listening-text="state.transcript"
                  :question="activeKioskTurn?.question || scene.question || '请给我一直说人工智能四个字'"
                  :answer="activeKioskTurn ? (activeKioskTurn.answer || (activeKioskTurn.id !== state.current?.id ? '本次回答未完成' : '')) : (scene.answer || '人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能...')"
                  :history="displayedTurns"
                  :clamp="!activeKioskTurn"
                  :visible-answer-lines="standalone ? 3.5 : undefined"
                  :finished="state.phase === 'answered'"
                />
                <div
                  v-if="(scene.showInput ?? true) && inputExpanded"
                  class="kiosk-qa-composite-input pointer-events-auto"
                  :style="{ opacity: isMorphing ? 0 : 1, transition: 'opacity 0.15s ease' }"
                >
                  <SceneQaInput
                    :ref="setQaInputRef"
                    v-model="draft"
                    editable
                    :placeholder="scene.inputPlaceholder || '点击左侧，开启对话交流'"
                    :disabled="busy"
                    :phrases="scene.buttons.map(item => item.label)"
                    @keyboard-change="handleKeyboardChange" @keyboard-height="height => keyboardHeight = height" @activity="touchSession"
                    :stoppable="['thinking', 'answering'].includes(state.phase)"
                    @stop="controller.stop()"
                    @submit="sendKioskDraft"
                  >
                    <template #orb>
                      <button
                        type="button"
                        class="kiosk-input-voice-orb"
                        :style="{ width: inputKioskOrbSize, height: inputKioskOrbSize }"
                        aria-label="点击开启语音对话"
                        :disabled="busy"
                        @click.stop="handleVoiceButtonClick"
                      >
                        <SceneVoiceButton
                          :theme="scene.voiceTheme || 'crystal'"
                          :size="inputKioskOrbSize"
                          :animation-duration="scene.voiceAnimationDuration || 45"
                          :state="kioskVoiceState"
                          :interactive="false"
                        />
                      </button>
                    </template>
                  </SceneQaInput>
                </div>
              </div>
              </Transition>
            </template>
            <SceneVoiceFeedback v-if="voiceFeedbackVisible && !contentMode" :state="kioskVoiceState" :question="state.current?.question || scene.question || '请给我一直说人工智能四个字'" :answer="state.current?.answer || ''"
              :scale="1" :style="voiceFeedbackStyle" />

            <!-- 交互球 -> 中间输入框 丝滑过渡变形容器 (Morph Pill) -->
            <div
              v-if="isMorphing && !contentMode"
              class="scene-conversation-morph-pill"
              :class="{ 'is-active-capsule': morphRect.activeCapsule }"
              :style="morphStyle"
            >
              <div class="scene-morph-orb-slot" :style="{ width: morphOrbSize, height: morphOrbSize }">
                <SceneVoiceButton
                  :theme="scene.voiceTheme || 'crystal'"
                  :size="morphOrbSize"
                  :animation-duration="scene.voiceAnimationDuration || 45"
                  :state="kioskVoiceState"
                  :interactive="false"
                />
              </div>
              <div class="scene-morph-content" :style="{ opacity: morphContentOpacity }">
                <span class="scene-morph-placeholder">{{ scene.inputPlaceholder || '点击左侧，开启对话交流' }}</span>
                <div class="scene-morph-action">
                  <svg class="scene-morph-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <rect x="6" y="10" width="36" height="28" rx="2" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
                    <g fill="currentColor">
                      <rect x="10" y="16" width="4" height="4" /><rect x="18" y="16" width="4" height="4" /><rect x="26" y="16" width="4" height="4" /><rect x="34" y="16" width="4" height="4" />
                      <rect x="10" y="23" width="4" height="4" /><rect x="18" y="23" width="4" height="4" /><rect x="26" y="23" width="4" height="4" /><rect x="34" y="23" width="4" height="4" />
                      <rect x="16" y="30" width="16" height="4" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>


            <div v-if="!hasCanvasControls" ref="dockRef" class="kiosk-input-dock">
              <div class="kiosk-session-row">
                <span class="kiosk-state" role="status" aria-live="polite"><i :class="{ active: busy || state.phase === 'listening' }" />{{ phaseLabel }}</span>
                <button v-if="state.current || state.phase !== 'idle'" type="button" class="kiosk-text-button" @click="resetSession">结束对话</button>
              </div>
              <div v-if="state.error && (state.phase !== 'error' || !hasDialogue)" role="alert" class="kiosk-inline-notice">{{ state.error }}</div>
              <div v-if="state.phase === 'no-answer' && !hasDialogue" role="status" class="kiosk-inline-notice">没有找到相关内容，请换个问法。</div>
              <div v-if="notice" role="status" class="kiosk-inline-notice">{{ notice }}</div>
              <div v-if="['thinking', 'answering'].includes(state.phase)" class="kiosk-context-actions">
                <button type="button" class="kiosk-primary-action" @click="controller.stop()"><Square :size="18" />停止回答</button>
              </div>
              <div v-else-if="['error', 'interrupted', 'no-answer'].includes(state.phase)" class="kiosk-context-actions">
                <button type="button" @click="retry"><RotateCcw :size="18" />重新尝试</button>
                <button v-if="shortcuts.length" type="button" @click="openShortcuts">换个问题</button>
              </div>
              <form v-if="inputMode === 'text' && !['listening', 'recognizing'].includes(state.phase)" class="kiosk-text-entry" @submit.prevent="sendDraft">
                <label for="kiosk-question" class="kiosk-sr-only">输入问题</label>
                <input id="kiosk-question" ref="inputRef" v-model="draft" maxlength="200" autocomplete="off" placeholder="请输入您的问题" :disabled="busy" @keydown.enter="submitOnEnter" />
                <button type="submit" class="kiosk-send" aria-label="发送问题" :disabled="!draft.trim() || busy"><Send :size="22" /></button>
              </form>
              <div v-else class="kiosk-voice-entry">
                <button type="button" class="kiosk-hold-button" :class="{ recording: state.phase === 'listening' }" :disabled="busy" @pointerdown="startVoice" @pointerup="finishVoice" @pointercancel="cancelVoice" @lostpointercapture="cancelVoice" @keydown.space.prevent="startVoice" @keyup.space.prevent="finishVoice" @keydown.enter.prevent="startVoice" @keyup.enter.prevent="finishVoice" @blur="cancelVoice">
                  <Mic :size="24" />{{ state.phase === 'listening' ? '松开发送识别 · 上滑取消' : state.phase === 'recognizing' ? '正在识别…' : '按住说话' }}
                </button>
              </div>
              <div class="kiosk-dock-navigation">
                <button type="button" :disabled="['listening', 'recognizing'].includes(state.phase)" @click="toggleInput"><component :is="inputMode === 'text' ? Mic : Keyboard" :size="20" />{{ inputMode === 'text' ? '语音提问' : '文字输入' }}</button>
                <button v-if="shortcuts.length" type="button" :disabled="busy || ['listening', 'recognizing'].includes(state.phase)" @click="openShortcuts"><Grid2X2 :size="20" />{{ showShortcuts && state.current ? '返回对话' : '快捷问题' }}</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ElDrawer } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { ChevronRight, Clock, Compass, Grid2X2, Headphones, HelpCircle, Keyboard, MapPin, Mic, RotateCcw, Send, Square, ThumbsDown, ThumbsUp, X, Folder, Briefcase, Building, FileText, Flame, Sun } from 'lucide-vue-next';
import { abortableDelay, createDemoAdapter, createInteractionController, type DemoScenario } from './interaction/interactionController';
import { createIdleSession } from './interaction/idleSession';
import SceneVoiceButton, { type VoiceState, type VoiceTheme } from './SceneVoiceButton.vue';
import SceneVoiceFeedback from './SceneVoiceFeedback.vue';
import { voiceFeedbackPosition } from './sceneVoiceFeedback';
import ScenePersonPreview from './ScenePersonPreview.vue';
import SceneFloatingTopBar from './SceneFloatingTopBar.vue';
import SceneKingkongRail from './SceneKingkongRail.vue';
import SceneQaCard, { type QaCardState } from './SceneQaCard.vue';
import SceneQaInput from './SceneQaInput.vue';
import { keyboardSafeBox } from './keyboardEditing';
import { useConversationMorph } from './useConversationMorph';
import { defaultKingkongRailBox, groupKingkongOrder } from './sceneKingkong';
import SceneExtraElement from './SceneExtraElement.vue';
import type { SceneExtraElement as ExtraElementConfig } from './sceneElements';
import { defaultTopBarBox, groupHeaderOrder } from './sceneHeader';
import { conversationIdleSeconds, defaultConversationOrbBox } from './sceneConversation';

interface Box { x: number; y: number; w: number; h: number }
interface SceneConfig {
  personMedia?: import('./scenePersonMedia').ScenePersonMedia;
  width: number; height: number; bgColor: string; bgType: string; bgImageUrl: string; logoUrl: string;
  clock: string; dateText?: string; timezone: string; timeDisplayMode?: 'datetime' | 'time'; layers: { id: string; label: string }[]; boxes: Record<string, Box>;
  showVolume?: boolean; showRefresh?: boolean;
  buttons: { id: number; label: string; prompt: string; answer?: string; enabled: boolean }[]; showKingkong: boolean;
  multimediaUrl: string; isImageMedia: boolean; question: string; answer: string; welcome: string;
  extraElements?: Record<string, ExtraElementConfig>;
  showBanner?: boolean;
  showLogo?: boolean;
  showTime?: boolean;
  voiceTheme?: VoiceTheme;
  voiceAnimationDuration?: number;
  showDialogue?: boolean;
  showInput?: boolean;
  showVoiceButton?: boolean;
  inputPlaceholder?: string;
  showInterrupt?: boolean;
  interruptLabel?: string;
}
const props = defineProps<{
  scene: SceneConfig;
  standalone?: boolean;
  contentMode?: boolean;
  dialogueVisibility?: 'shown' | 'hidden';
}>();
const previewLayers = computed(() =>
  groupKingkongOrder(
    groupHeaderOrder(
      [
        ...props.scene.layers.map(layer => (layer.id === 'input' ? 'dialogue' : layer.id)),
        ...(props.scene.showVoiceButton !== false && (props.scene.showVoiceButton || ((props.scene.showInput ?? true) && props.scene.layers.some(layer => layer.id === 'dialogue' || layer.id === 'input'))) ? ['voice'] : [])
      ]
    )
  )
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .map(id => ({ id }))
); 
const emit = defineEmits<{ close: []; 'dialogue-hidden': [] }>();
const scenario = ref<DemoScenario>('normal');
const previewVolume = ref(60);
function setPreviewVolume(value: number) {
  if (Number.isFinite(value)) previewVolume.value = Math.min(100, Math.max(0, value));
}
const controller = createInteractionController(
  createDemoAdapter(
    () => scenario.value,
    (q?: string) => {
      const match = props.scene.buttons.find(b => b.prompt.trim() === q?.trim() || b.label === q?.trim());
      if (match && match.answer?.trim()) {
        return match.answer.trim();
      }
      return props.scene.answer;
    }
  ),
  value => { state.value = value; }
);
const state = shallowRef(controller.getState());
const inputExpanded = ref(Boolean(props.standalone));
const keyboardOpen = ref(false), keyboardHeight = ref(480);
const qaInputRef = ref<InstanceType<typeof SceneQaInput>>();
const setQaInputRef = (instance: any) => { qaInputRef.value = instance || undefined; };
const draft = ref(''), inputMode = ref<'text' | 'voice'>('voice'), notice = ref(''), shortcutTray = ref(false);
const stageRef = ref<HTMLElement>(), conversationRef = ref<HTMLElement>(), inputRef = ref<HTMLInputElement>(), dockRef = ref<HTMLElement>();
const stageSize = ref({ width: 1, height: 1 }), atBottom = ref(true);
const dockHeight = ref(170);
const logicalWidth = computed(() => Math.max(1, props.scene.width || 1080));
const logicalHeight = computed(() => Math.max(1, props.scene.height || 1920));
const stageInset = computed(() => props.standalone ? 0 : 32);
const scale = computed(() => Math.max(.01, Math.min((stageSize.value.width - stageInset.value) / logicalWidth.value, (stageSize.value.height - stageInset.value) / logicalHeight.value)));
const shortcuts = computed(() => props.scene.showKingkong ? props.scene.buttons.filter(item => item.enabled) : []);
const hasDialogue = computed(() => (props.scene.showDialogue ?? true) && props.scene.layers.some(layer => layer.id === 'dialogue'));
const hasCanvasControls = computed(() =>
  props.scene.layers.some(layer => layer.id === 'dialogue' || layer.id === 'input' || layer.id === 'voice' || layer.id === 'interrupt')
);
const showShortcuts = computed(() => !state.value.current || shortcutTray.value);
const displayedTurns = computed(() => [...state.value.history, ...(state.value.current ? [state.value.current] : [])]);
const activeKioskTurn = computed(() => state.value.current || displayedTurns.value[displayedTurns.value.length - 1] || null);
const busy = computed(() => ['recognizing'].includes(state.value.phase));
const hasSession = computed(() => Boolean(inputExpanded.value || state.value.current || draft.value || state.value.transcript || state.value.phase !== 'idle'));
const idleSeconds = ref(conversationIdleSeconds);
let voiceStart = 0, voiceY = 0, observer: ResizeObserver | undefined, idleTimer: ReturnType<typeof setInterval>;
const idleClock = createIdleSession(() => resetSession(), Date.now, conversationIdleSeconds);
const entryClock = createIdleSession(() => {
  inputExpanded.value = Boolean(props.standalone);
  if (['listening', 'recognizing'].includes(state.value.phase)) {
    clearTimeout(voiceAutoTimer);
    controller.stop();
  }
}, Date.now, conversationIdleSeconds);
const labels = { idle: '可以开始提问', listening: '正在聆听', recognizing: '正在识别', confirming: '请确认识别内容后发送', thinking: '正在查找答案', answering: '正在回答', answered: '回答完毕，可以继续提问', interrupted: '已停止回答', 'no-answer': '换个问题试试', error: '暂时无法回答' };
const phaseLabel = computed(() => labels[state.value.phase]);
const subtitle = computed(() => state.value.phase === 'idle' ? props.scene.welcome : state.value.phase === 'answered' || state.value.phase === 'answering' ? state.value.current?.answer || phaseLabel.value : phaseLabel.value);
const getButton = (id: string) => shortcuts.value.find(item => `kk-${item.id}` === id);
const shortcutIcon = (id: string) => {
  const btn = getButton(id);
  const label = btn?.label || '';
  if (label.includes('公司') || label.includes('企业') || label.includes('介绍') || label.includes('概况')) return Building;
  if (label.includes('新闻') || label.includes('资讯') || label.includes('动态') || label.includes('时事')) return FileText;
  if (label.includes('热点') || label.includes('热门') || label.includes('趋势') || label.includes('热搜')) return Flame;
  if (label.includes('天气') || label.includes('气候') || label.includes('气温') || label.includes('晴')) return Sun;
  if (label.includes('案例') || label.includes('作品') || label.includes('资料') || label.includes('文件')) return Folder;
  if (label.includes('路线') || label.includes('导航') || label.includes('位置')) return MapPin;
  if (label.includes('业务') || label.includes('方案') || label.includes('合作') || label.includes('服务')) return Briefcase;
  if (label.includes('问') || label.includes('帮助')) return HelpCircle;
  if (label.includes('客服') || label.includes('人工')) return Headphones;
  if (id === 'kk-1') return Building;
  if (id === 'kk-2') return FileText;
  if (id === 'kk-3') return Flame;
  if (id === 'kk-4') return Sun;
  return Building;
};
const boxStyle = (id: string) => {
  const original = props.scene.boxes[id] || (id === 'topbar' ? defaultTopBarBox : id === 'kingkong-rail' ? defaultKingkongRailBox : id === 'voice' ? defaultConversationOrbBox(logicalWidth.value, logicalHeight.value) : undefined);
  if (!original) return {};
  const box = original;
  let top = box.y * logicalHeight.value / 100, height = box.h * logicalHeight.value / 100;
  if (!hasCanvasControls.value) {
    const contentBottom = logicalHeight.value - dockHeight.value - 30;
    // Only runtime fixture preview avoids the fixed input dock; saved editor geometry stays intact.
    if (id === 'subtitle') top = Math.min(top, contentBottom - 68);
    if (id === 'voice') top = Math.min(top, contentBottom - 110);
    if (id === 'input' || id === 'interrupt') top = Math.min(top, contentBottom - 72);
    if (id === 'dialogue') {
      const subtitleSpace = props.scene.layers.some(layer => layer.id === 'subtitle') ? 82 : 0;
      const bottom = contentBottom - subtitleSpace;
      top = Math.min(top, bottom - 100); height = Math.max(80, Math.min(height, bottom - top));
    }
  }
  return { left: `${box.x}%`, top: `${top}px`, width: `${box.w}%`, height: `${height}px`, zIndex: previewLayers.value.findIndex(layer => layer.id === id) + 1 };
};
const kioskVoiceState = computed<VoiceState>(() => {
  if (!inputExpanded.value) return 'idle';
  if (['listening', 'recognizing'].includes(state.value.phase)) return 'listening';
  if (state.value.phase === 'answering') return 'speaking';
  if (['confirming', 'thinking'].includes(state.value.phase)) return 'thinking';
  return 'idle';
});
const kioskCardState = computed<QaCardState>(() => {
  if (!inputExpanded.value) return 'idle';
  if (['listening', 'recognizing'].includes(state.value.phase)) return 'question';
  if (['confirming', 'thinking'].includes(state.value.phase)) return 'thinking';
  if (['answering', 'answered'].includes(state.value.phase) || activeKioskTurn.value) return 'answer';
  return 'idle';
});
const voiceFeedbackAnchor = computed(() => {
  if (hasDialogue.value) return undefined;
  const anchor = props.scene.layers.find(layer => layer.id === 'voice') || props.scene.layers.find(layer => layer.id === 'input');
  return anchor ? props.scene.boxes[anchor.id] : undefined;
});
const voiceFeedbackVisible = computed(() => inputExpanded.value && !hasDialogue.value && kioskVoiceState.value !== 'idle' && Boolean(voiceFeedbackAnchor.value));
const voiceFeedbackStyle = computed(() => voiceFeedbackAnchor.value ? voiceFeedbackPosition(voiceFeedbackAnchor.value) : {});

const inputKioskOrbSize = computed(() => {
  const boxH = props.scene.boxes['dialogue']?.h || 23.2;
  return `${Math.max(18, Math.round(logicalHeight.value * (boxH / 100) * 0.245 * 0.7))}px`;
});

const voiceKioskSize = computed(() => {
  const box = props.scene.boxes.voice || defaultConversationOrbBox(logicalWidth.value, logicalHeight.value);
  return `${Math.min(logicalWidth.value * box.w, logicalHeight.value * box.h) / 100}px`;
});

const {
  isMorphing,
  morphPhase,
  currentRect: morphRect,
  morphStyle,
  morphOrbSize,
  morphContentOpacity,
  triggerExpand: morphTriggerExpand,
  triggerCollapse: morphTriggerCollapse
} = useConversationMorph({
  screenWidth: computed(() => logicalWidth.value),
  screenHeight: computed(() => logicalHeight.value),
  getVoiceBox: () => props.scene.boxes.voice || defaultConversationOrbBox(logicalWidth.value, logicalHeight.value),
  getDialogueBox: () => props.scene.boxes.dialogue || { x: 12.2, y: 30.1, w: 75.6, h: 23.2 },
  getVoiceSize: () => parseFloat(voiceKioskSize.value) || 84
});

const sendKioskDraft = () => {
  if (draft.value.trim() && !busy.value) {
    ask(draft.value);
    draft.value = '';
  }
};

let voiceAutoTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => props.contentMode, browsing => {
  if (!browsing) return;
  qaInputRef.value?.closeKeyboard();
  voiceStart = 0;
  clearTimeout(voiceAutoTimer);
  controller.stop();
});

const finishVoiceRecognition = async (fallbackQuestion?: string) => {
  clearTimeout(voiceAutoTimer);
  const q = fallbackQuestion || props.scene.question || '介绍一下企业文化';
  // 说完需求后保留等待时间，给用户充分确认和阅读时间
  await controller.finishListening(q, signal => abortableDelay(2800, signal));
  if (state.value.phase !== 'confirming') return;
  const text = state.value.transcript.trim();
  if (text) {
    void controller.submit(text);
  }
};

const handleKeyboardChange = (open: boolean) => {
  keyboardOpen.value = open;
  if (open) {
    clearTimeout(voiceAutoTimer);
    if (['listening', 'recognizing'].includes(state.value.phase)) controller.stop();
    inputMode.value = 'text';
  }
  touchSession();
};

const handleVoiceButtonClick = () => {
  qaInputRef.value?.closeKeyboard();
  if (!inputExpanded.value) {
    inputExpanded.value = true;
    morphTriggerExpand();
  }
  touchSession();
  if (['thinking', 'answering'].includes(state.value.phase)) {
    clearTimeout(voiceAutoTimer);
    controller.stop();
    return;
  }
  if (['listening', 'recognizing'].includes(state.value.phase)) {
    void finishVoiceRecognition();
    return;
  }
  clearTimeout(voiceAutoTimer);
  const ok = controller.beginListening(scenario.value === 'microphone');
  if (ok) {
    voiceAutoTimer = setTimeout(() => {
      if (state.value.phase === 'listening') {
        void finishVoiceRecognition();
      }
    }, 3800);
  }
};

const touchSession = () => { idleSeconds.value = idleClock.touch(); entryClock.touch(); };
const resetSession = () => {
  qaInputRef.value?.closeKeyboard();
  voiceStart = 0;
  clearTimeout(voiceAutoTimer);
  controller.reset();
  // 对话停止后，直接停止，不播放形变动画，避免与球转输入框混淆
  inputExpanded.value = Boolean(props.standalone);
  draft.value = '';
  inputMode.value = 'voice';
  notice.value = '';
  shortcutTray.value = false;
  atBottom.value = true;
  touchSession();
};
const ask = (question: string) => {
  const text = question.trim();
  if (!text) return;
  if (!inputExpanded.value) {
    inputExpanded.value = true;
    morphTriggerExpand();
  }
  if (state.value.phase === 'thinking' && state.value.current?.question === text) return;
  qaInputRef.value?.closeKeyboard();
  voiceStart = 0;
  clearTimeout(voiceAutoTimer);
  if (['thinking', 'answering', 'listening', 'recognizing'].includes(state.value.phase)) {
    controller.stop();
  }
  touchSession(); notice.value = ''; shortcutTray.value = false; atBottom.value = true;
  void controller.submit(text);
};
const askShortcut = (id: string) => {
  const item = getButton(id);
  const q = item?.prompt?.trim() || item?.label?.trim();
  if (q) ask(q);
};
const sendDraft = () => { if (draft.value.trim() && !busy.value) { ask(draft.value); draft.value = ''; } };
const submitOnEnter = (event: KeyboardEvent) => { if (event.isComposing || event.keyCode === 229) event.preventDefault(); };
const retry = () => { touchSession(); shortcutTray.value = false; atBottom.value = true; void controller.retry(); };
const openShortcuts = () => { shortcutTray.value = state.value.current ? !shortcutTray.value : false; touchSession(); };
const toggleInput = async () => { inputMode.value = inputMode.value === 'text' ? 'voice' : 'text'; touchSession(); await nextTick(); if (inputMode.value === 'text') inputRef.value?.focus(); };
const startVoice = (event: PointerEvent | KeyboardEvent) => {
  if (voiceStart || event instanceof KeyboardEvent && event.repeat || event instanceof PointerEvent && event.button !== 0) return;
  if (!controller.beginListening(scenario.value === 'microphone')) return;
  voiceStart = Date.now(); voiceY = event instanceof PointerEvent ? event.clientY : 0;
  if (event instanceof PointerEvent) (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  notice.value = ''; touchSession();
};
const cancelVoice = () => { if (!voiceStart && state.value.phase !== 'listening') return; voiceStart = 0; clearTimeout(voiceAutoTimer); controller.stop(); notice.value = '已取消本次语音'; };
const cancelHiddenVoice = () => { if (document.hidden) cancelVoice(); };
const finishVoice = async (event: PointerEvent | KeyboardEvent) => {
  if (!voiceStart) return;
  const duration = Date.now() - voiceStart;
  const cancelled = event instanceof PointerEvent && event.clientY < voiceY - 40;
  voiceStart = 0;
  clearTimeout(voiceAutoTimer);
  if (cancelled || duration < 300) { controller.stop(); notice.value = cancelled ? '已取消本次语音' : '说话时间太短，请按住后再松开'; return; }
  await finishVoiceRecognition();
};
const trackScroll = () => { const element = conversationRef.value; if (element) atBottom.value = element.scrollHeight - element.clientHeight - element.scrollTop < 28; };
const scrollToLatest = () => { const element = conversationRef.value; if (element) element.scrollTop = element.scrollHeight; atBottom.value = true; };
watch(
  () => [state.value.phase, state.value.current?.answer],
  async () => {
    if (['thinking', 'answering', 'recognizing', 'listening'].includes(state.value.phase)) idleSeconds.value = idleClock.touch();
    if (atBottom.value) {
      await nextTick();
      scrollToLatest();
    }
  }
);
watch(draft, touchSession);
watch([stageRef, dockRef], ([stage, dock]) => {
  observer?.disconnect();
  observer = new ResizeObserver(entries => { for (const entry of entries) { if (entry.target === dockRef.value) dockHeight.value = (entry.target as HTMLElement).offsetHeight; else stageSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }; } });
  if (stage) observer.observe(stage);
  if (dock) observer.observe(dock);
}, { flush: 'post' });
onMounted(() => {
  window.addEventListener('blur', cancelVoice);
  document.addEventListener('visibilitychange', cancelHiddenVoice);
  idleTimer = setInterval(() => {
    const isProcessing = ['thinking', 'answering', 'listening', 'recognizing'].includes(state.value.phase);
    if (!props.standalone) entryClock.tick(inputExpanded.value, isProcessing);
    idleSeconds.value = idleClock.tick(hasSession.value, isProcessing);
  }, 250);
});
onBeforeUnmount(() => { clearTimeout(voiceAutoTimer); controller.dispose(); observer?.disconnect(); clearInterval(idleTimer); window.removeEventListener('blur', cancelVoice); document.removeEventListener('visibilitychange', cancelHiddenVoice); });
</script>

<style>
.exhibition-page { position: fixed; inset: 0; }
.exhibition-page .kiosk-preview-page { background: #151b25; }
.exhibition-page .kiosk-screen { border-radius: 0; }
.exhibition-page .scene-person-preview { position: absolute; }

.kiosk-preview-drawer .el-drawer__body { padding: 0; overflow: hidden; }
.kiosk-preview-page { height: 100%; display: flex; flex-direction: column; color: #1d2129; font-size: 14px; background: #f7f8fa; }
.kiosk-preview-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; background: white; border-bottom: 1px solid #e5e6eb; }
.kiosk-preview-header h2 { margin: 0; font-size: 18px; font-weight: 600; line-height: 26px; }
.kiosk-preview-header p { margin: 4px 0 0; font-size: 14px; color: #4e5969; }
.kiosk-preview-header .el-button > span { gap: 6px; }
.kiosk-preview-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e5e6eb; }
.kiosk-preview-toolbar select { height: 32px; border: 1px solid #dcdfe6; padding: 0 28px 0 12px; border-radius: 4px; background: #fff; color: #4e5969; font: inherit; }
.kiosk-preview-toolbar > span { color: #86909c; font-size: 12px; }
.kiosk-preview-stage { flex: 1; min-height: 0; display: grid; place-items: center; overflow: hidden; }
.kiosk-screen-frame { position: relative; flex-shrink: 0; }
.kiosk-screen { position: absolute; left: 0; top: 0; transform-origin: top left; overflow: hidden; isolation: isolate; color: #35405b; font-size: 18px; line-height: 1.5; border-radius: 4px; }
.kiosk-screen *, .kiosk-screen *::before, .kiosk-screen *::after { box-sizing: border-box; }
.kiosk-screen button, .kiosk-screen input { font: inherit; }
.kiosk-screen button { cursor: pointer; }
.kiosk-screen button { transition: background-color .16s ease, border-color .16s ease, color .16s ease; -webkit-tap-highlight-color: transparent; }
.kiosk-screen button:not(:disabled):active { filter: brightness(.94); }
.kiosk-screen button:disabled { cursor: not-allowed; opacity: .5; }
.kiosk-screen :is(button, input:not(.scene-qa-input-field), [tabindex]):focus-visible { outline: 3px solid #165dff; outline-offset: -3px; }
.kiosk-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; pointer-events: none; z-index: 0; }
.kiosk-scene-object { position: absolute; margin: 0; object-fit: contain; }
.kiosk-art, .kiosk-time, .kiosk-subtitle { pointer-events: none; }
.kiosk-screen .elder2-multimedia { box-shadow: none; object-fit: contain; }
.kiosk-time { display: flex; align-items: center; justify-content: center; gap: 8px; font-variant-numeric: tabular-nums; }
.kiosk-time small { display: block; font-size: 12px; color: #5b6781; }
.kiosk-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 6px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}
.kiosk-shortcut .kk-card-icon {
  width: 32px;
  height: 32px;
  color: #165DFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.kiosk-shortcut .kk-card-label {
  font-size: 13px;
  font-weight: 600;
  color: #165DFF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  letter-spacing: 0.02em;
}
.kiosk-qa-composite {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0;
  min-height: 0;
  container-type: size;
  overflow: visible;
  pointer-events: none;
}
.kiosk-qa-composite-input {
  width: 100%;
  height: 24.5cqh;
  margin-top: 3.5cqh;
  flex-shrink: 0;
  pointer-events: auto;
}
.kiosk-conversation {
  display: flex;
  flex-direction: column;
  min-height: 0;
  pointer-events: auto;
}
.kiosk-conversation-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}
.kiosk-conversation-scroll::-webkit-scrollbar {
  width: 4px;
}
.kiosk-conversation-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.kiosk-conversation-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 4px;
}
.kiosk-turn {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.kiosk-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  box-sizing: border-box;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.kiosk-unified-card {
  align-self: center;
  width: 100%;
  max-width: 100%;
  min-height: 72px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(246, 249, 255, 0.52));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 32px rgba(35, 55, 83, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kiosk-question-inline {
  color: #0091FF;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}
.kiosk-answer-inline {
  color: #1D2129;
  font-size: 13.5px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.01em;
}
.kiosk-question {
  align-self: flex-end;
  max-width: 88%;
  padding: 8px 14px;
  background: linear-gradient(135deg, #165DFF 0%, #3875FF 100%);
  color: #FFFFFF;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 4px 14px rgba(22, 93, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.kiosk-answer {
  align-self: center;
  width: 100%;
  max-width: 100%;
  min-height: 88px;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(246, 249, 255, 0.48));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 32px rgba(35, 55, 83, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.80);
  border-radius: 18px;
  color: #1D2129;
  font-size: 14px;
  line-height: 1.65;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.01em;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kiosk-answer p {
  margin: 0;
}
.kiosk-answer p + p {
  margin-top: 6px;
}
.kiosk-muted, .kiosk-progress {
  color: #5b6781;
  font-size: 12px;
}
.kiosk-progress {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kiosk-progress i, .kiosk-state i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #165DFF;
  flex-shrink: 0;
}
.kiosk-progress i, .kiosk-state i.active {
  animation: kiosk-pulse 1s infinite alternate;
}
.kiosk-answer-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: #86909C;
}
.kiosk-answer-actions button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4E5969;
  cursor: pointer;
}
.kiosk-answer-actions button:hover {
  background: rgba(0, 0, 0, 0.05);
}
.kiosk-answer-actions button[aria-pressed="true"] {
  background: #E8F3FF;
  color: #165DFF;
}
.kiosk-latest {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  height: 28px;
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid rgba(22, 93, 255, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  color: #165DFF;
  font-size: 12px !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}
.kiosk-floating-idle-notice {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  color: #D4380D;
  pointer-events: auto;
}
.kiosk-floating-idle-notice button {
  border: 0;
  background: #FFECE8;
  color: #D4380D;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  cursor: pointer;
}
.kiosk-subtitle { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; height: auto !important; max-height: 9%; padding: 10px 16px; overflow: hidden; border-radius: 12px; background: rgba(248,250,255,.86); font-size: 28px; }
.kiosk-input-dock { position: absolute; bottom: 14px; left: 7%; right: 7%; z-index: 100; padding: 12px; border: 1px solid rgba(255,255,255,.9); border-radius: 16px; background: rgba(248,250,255,.95); backdrop-filter: blur(16px); }
.kiosk-session-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 36px; }
.kiosk-state { display: flex; align-items: center; gap: 6px; font-size: 14px; }
.kiosk-text-button { min-height: 44px; padding: 4px 8px; border: 0; background: none; color: #53658e; font-size: 14px !important; }
.kiosk-text-entry { display: flex; gap: 8px; align-items: center; border: 1px solid #b7c5e2; background: #fff; border-radius: 9999px; padding: 4px 6px; margin: 4px 0; }
.kiosk-text-entry input { flex: 1; width: 0; min-width: 0; height: 44px; padding: 0 14px; border: 0; border-radius: 9999px; background: transparent; color: #35405b; }
.kiosk-send { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 9999px; background: #165dff; color: white; }
.kiosk-send:not(:disabled):active { background: #0E42D2; }
.kiosk-hold-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 56px; border: 1px solid #b7c5e2; border-radius: 12px; background: white; color: #35405b; touch-action: none; user-select: none; }
.kiosk-hold-button.recording { background: #dce7ff; border-color: #6173a4; }
.kiosk-hold-button:not(:disabled):active { background: #eef2fc; }
.kiosk-dock-navigation { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.kiosk-dock-navigation button { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 4px 8px; border: 0; border-radius: 8px; background: transparent; color: #53658e; font-size: 28px; }
.kiosk-dock-navigation button:not(:disabled):active, .kiosk-answer-actions button:active { background: #e8eef9; }
.kiosk-context-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }
.kiosk-context-actions button { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; flex: 1; padding: 6px 16px; border: 1px solid #b7c5e2; border-radius: 9999px; background: #fff; color: #35405b; }
.kiosk-context-actions .kiosk-primary-action { background: #6173a4; border-color: #6173a4; color: white; }
.kiosk-inline-notice, .kiosk-idle-notice { padding: 6px 0; font-size: 14px; color: #745513; }
.kiosk-idle-notice button { min-height: 44px; border: 0; padding: 4px 8px; color: #35405b; background: #e8eef9; border-radius: 8px; }
.kiosk-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@keyframes kiosk-pulse { to { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { .kiosk-screen * { animation: none !important; } }
@media (max-width: 640px) { .kiosk-preview-header, .kiosk-preview-toolbar { padding: 12px 16px; } .kiosk-preview-header { align-items: flex-start; } .kiosk-preview-header .el-button { flex-shrink: 0; } .kiosk-preview-toolbar > span { flex-basis: 100%; } }

/* 图二胶囊输入框（银蓝毛玻璃） */
.kiosk-input-capsule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 0 6px 0 6px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(245, 248, 255, 0.45));
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 6px 24px rgba(35, 55, 83, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-sizing: border-box;
}

.kiosk-input-voice-orb {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  padding: 0; margin: 0; border: 0; border-radius: 50%;
  background: transparent; cursor: pointer; touch-action: manipulation;
}
.kiosk-input-voice-orb:focus-visible { outline: 3px solid #165DFF; outline-offset: 5px; }
.kiosk-conversation-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
}
.kiosk-conversation-orb:focus-visible {
  outline: 3px solid #165DFF;
  outline-offset: 8px;
}
.kiosk-conversation-orb:active { filter: brightness(0.96); }

.kiosk-screen .kiosk-input-field {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  background: transparent;
  border: 0;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  color: #1D2129;
  letter-spacing: 0.01em;
}
.kiosk-input-field::placeholder {
  color: #86909C;
  font-weight: 400;
}

.kiosk-input-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  border: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kiosk-input-keyboard-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.92);
  color: #4E5969;
  box-shadow: 0 1px 4px rgba(35, 55, 83, 0.06);
}
.kiosk-input-keyboard-btn:hover {
  background: #FFFFFF;
  color: #165DFF;
}

.kiosk-input-send-btn {
  background: #165DFF;
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.28);
}
.kiosk-input-send-btn:hover {
  background: #0E42D2;
}
.kiosk-input-send-btn:active {
  transform: scale(0.94);
}

/* 交互球 -> 中间输入框 丝滑过渡变形容器 (Morph Pill) */
.scene-conversation-morph-pill {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 6px;
  overflow: hidden;
  z-index: 45;
  pointer-events: none;
  border: 1.5px solid transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transform-origin: center center;
  transition:
    left 380ms cubic-bezier(0.16, 1, 0.3, 1),
    top 380ms cubic-bezier(0.16, 1, 0.3, 1),
    width 380ms cubic-bezier(0.16, 1, 0.3, 1),
    height 380ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 380ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 300ms ease,
    background 300ms ease,
    box-shadow 300ms ease;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.scene-conversation-morph-pill.is-active-capsule {
  border-color: #FFFFFF;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.86), rgba(246, 249, 255, 0.74));
  box-shadow: 0 4px 16px rgba(35, 55, 83, 0.07), inset 0 1px 0 #FFFFFF;
}

.scene-morph-orb-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: width 380ms cubic-bezier(0.16, 1, 0.3, 1), height 380ms cubic-bezier(0.16, 1, 0.3, 1);
}

.scene-morph-content {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  height: 100%;
  transition: opacity 260ms ease 100ms;
}

.scene-morph-placeholder {
  color: #4E5969;
  font-size: var(--scene-input-font-size, 24px);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.02em;
}

.scene-morph-action {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 64px; height: 64px;
  color: #263B52;
}

.scene-morph-icon {
  width: var(--scene-icon-small-size, 40px); height: var(--scene-icon-small-size, 40px);
}

</style>

<style scoped>
.kiosk-qa-composite .kiosk-progress,.kiosk-qa-composite .kiosk-muted,
.kiosk-qa-composite .kiosk-answer-actions,.kiosk-qa-composite .kiosk-answer-actions span {
  font-size: var(--scene-dialog-font-size, 28px);
}
</style>
