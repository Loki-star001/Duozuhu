<template>
  <div class="client-device-config flex-1 overflow-y-auto px-5 py-3 animate-fadeIn">
    <div class="client-device-config-content w-full min-w-0 space-y-2.5">
      <section class="device-top-actions">
        <div class="device-top-notice"><Info :size="16" /><span>配置需要重启机器之后生效</span></div>
        <div class="device-top-buttons">
          <el-button @click="powerActions?.confirmPower(true)">重启</el-button>
          <el-button type="danger" @click="powerActions?.confirmPower(false)">关机</el-button>
        </div>
      </section>
      <div class="device-identity-grid">
      <section class="device-current-section">
        <div class="device-section-heading"><h3>人设选择</h3><el-button @click="openSelection('persona')">选择</el-button></div>
        <div class="device-current-persona">
          <div class="device-current-avatar"><img v-if="currentPersona?.avatarUrl" :src="currentPersona.avatarUrl" :alt="currentPersona.name" /><User v-else :size="32" /></div>
          <div class="min-w-0"><strong>{{ currentPersona?.name }}</strong><p>{{ currentPersona?.prompt }}</p></div>
        </div>
      </section>
      <section class="device-current-section">
        <div class="device-section-heading">
          <h3>音色选择</h3>
          <div class="flex items-center gap-2">
            <el-button
              :type="playingVoiceId === currentVoice?.id ? 'primary' : 'default'"
              :aria-label="playingVoiceId === currentVoice?.id ? '停止试听' : '试听'"
              @click="currentVoice && handleToggleAudio(currentVoice)"
            >
              {{ playingVoiceId === currentVoice?.id ? '停止试听' : '试听' }}
            </el-button>
            <el-button @click="openSelection('voice')">选择</el-button>
          </div>
        </div>
        <div class="device-current-voice">
          <div class="device-current-avatar relative">
            <img v-if="currentVoice?.avatarUrl" :src="currentVoice.avatarUrl" :alt="currentVoice.name" />
            <User v-else :size="32" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <strong>{{ currentVoice?.name }}</strong>
              <span class="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-fill-neutral-2)] text-[color:var(--color-text-neutral-2)]">{{ currentVoice?.tag }}</span>
            </div>
            <p>{{ currentVoice?.desc }}</p>
          </div>
        </div>
      </section>
      </div>
      <ClientDeviceControlView ref="powerActions">
        <template #interaction>
        <div class="client-return-content-row flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-[color:var(--color-border-2)]">
          <span class="text-sm text-[color:var(--color-text-neutral-2)]">返回内容选择</span>
          <el-radio-group :model-value="currentContentType" size="small" @change="handleSelectContentType"><el-radio-button value="TEXT">文本</el-radio-button><el-radio-button value="TEXT_AUDIO">文本+音频</el-radio-button></el-radio-group>
        </div>
        </template>
      </ClientDeviceControlView>
    </div>
    <el-dialog v-model="selectionOpen" :title="selectionMode === 'persona' ? '人设选择' : '音色选择'" class="client-device-selection-dialog" append-to-body align-center @closed="stopPreview">
      <div class="device-selection-layout">
        <aside class="device-selection-preview">
          <el-radio-group v-model="selectionMode" class="device-selection-switch" aria-label="选择类型">
            <el-radio-button value="persona">人设</el-radio-button>
            <el-radio-button value="voice">音色</el-radio-button>
          </el-radio-group>

          <!-- 人设模式左侧预览 -->
          <template v-if="selectionMode === 'persona'">
            <div class="device-preview-image"><img v-if="previewPersona?.avatarUrl" :src="previewPersona.avatarUrl" :alt="previewPersona.name" /><User v-else :size="56" /></div>
            <h3>{{ previewPersona?.name }}</h3>
            <div class="device-preview-description"><h4>人设描述</h4><p>{{ previewPersona?.prompt }}</p></div>
            <div class="device-preview-voice"><h4>音色选择</h4><el-select v-model="draftVoiceId" aria-label="音色选择"><el-option v-for="voice in voiceOptions" :key="voice.id" :label="voice.name" :value="voice.id" /></el-select></div>
          </template>

          <!-- 音色模式左侧预览 (和人物形式一样！) -->
          <template v-else>
            <div class="device-preview-image relative">
              <img v-if="previewVoice?.avatarUrl" :src="previewVoice.avatarUrl" :alt="previewVoice.name" />
              <User v-else :size="56" />
              <!-- 波形背景水印 -->
              <div class="absolute bottom-2 left-2 right-2 h-6 flex items-center justify-center opacity-30 pointer-events-none">
                <img src="/assets/audio-waveform.png" class="h-full object-contain filter invert" alt="waveform" />
              </div>
            </div>
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2">
                {{ previewVoice?.name }}
                <span class="text-xs px-2 py-0.5 rounded font-normal bg-[color:var(--color-fill-brand-5)] text-[color:var(--color-text-brand-1)]">{{ previewVoice?.tag }}</span>
              </h3>
            </div>
            <div class="device-preview-description"><h4>音色特点</h4><p>{{ previewVoice?.desc }}</p></div>
            <div class="device-preview-voice pt-2 border-t border-[color:var(--color-border-2)]">
              <el-button
                :type="playingVoiceId === previewVoice?.id ? 'primary' : 'default'"
                class="w-full flex items-center justify-center gap-2 !h-9"
                @click="previewVoice && handleToggleAudio(previewVoice)"
              >
                <span v-if="playingVoiceId === previewVoice?.id" class="inline-flex items-center gap-[2px] h-3.5">
                  <span class="w-[2px] bg-current rounded-full animate-wave-1"></span>
                  <span class="w-[2px] bg-current rounded-full animate-wave-2"></span>
                  <span class="w-[2px] bg-current rounded-full animate-wave-3"></span>
                  <span class="w-[2px] bg-current rounded-full animate-wave-4"></span>
                </span>
                <svg v-else viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                  <rect x="1" y="6" width="2" height="4" rx="1" />
                  <rect x="4" y="3" width="2" height="10" rx="1" />
                  <rect x="7" y="1" width="2" height="14" rx="1" />
                  <rect x="10" y="4" width="2" height="8" rx="1" />
                  <rect x="13" y="6" width="2" height="4" rx="1" />
                </svg>
                <span>{{ playingVoiceId === previewVoice?.id ? '停止试听' : '试听当前音色' }}</span>
              </el-button>
            </div>
          </template>
        </aside>

        <section class="device-selection-options">
          <!-- 人设网格 -->
          <div v-if="selectionMode === 'persona'" class="device-persona-grid">
            <button v-for="item in allPersonas" :key="item.id" type="button" class="device-persona-option" :class="{selected:draftPersonaId === item.id}" @click="draftPersonaId = item.id">
              <div class="device-persona-image"><img v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.name" /><User v-else :size="40" /></div>
              <div class="device-option-name"><span>{{ item.name }}</span><Check v-if="draftPersonaId === item.id" :size="16" /></div>
            </button>
          </div>

          <!-- 音色网格 (和人物形式一样！) -->
          <div v-else class="device-persona-grid">
            <button
              v-for="voice in voiceOptions"
              :key="voice.id"
              type="button"
              class="device-persona-option relative group"
              :class="{ selected: draftVoiceId === voice.id }"
              @click="draftVoiceId = voice.id"
            >
              <div class="device-persona-image relative">
                <img v-if="voice.avatarUrl" :src="voice.avatarUrl" :alt="voice.name" />
                <User v-else :size="40" />
                <!-- 卡片内部右下角试听按钮 (全新声波Logo) -->
                <div
                  class="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 hover:bg-black/85 text-white text-xs backdrop-blur-xs transition-colors cursor-pointer select-none"
                  :class="{ '!bg-[color:var(--color-fill-brand-1)] text-white': playingVoiceId === voice.id }"
                  @click.stop="handleToggleAudio(voice)"
                >
                  <span v-if="playingVoiceId === voice.id" class="inline-flex items-center gap-[2px] h-3">
                    <span class="w-[2px] bg-white rounded-full animate-wave-1"></span>
                    <span class="w-[2px] bg-white rounded-full animate-wave-2"></span>
                    <span class="w-[2px] bg-white rounded-full animate-wave-3"></span>
                  </span>
                  <svg v-else viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-white">
                    <rect x="1" y="6" width="2" height="4" rx="1" />
                    <rect x="4" y="3" width="2" height="10" rx="1" />
                    <rect x="7" y="1" width="2" height="14" rx="1" />
                    <rect x="10" y="4" width="2" height="8" rx="1" />
                    <rect x="13" y="6" width="2" height="4" rx="1" />
                  </svg>
                  <span>{{ playingVoiceId === voice.id ? '停止' : '试听' }}</span>
                </div>
              </div>
              <div class="device-option-name">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-[color:var(--color-text-neutral-1)]">{{ voice.name }}</span>
                  <span class="text-xs text-[color:var(--color-text-neutral-3)]">({{ voice.tag }})</span>
                </div>
                <Check v-if="draftVoiceId === voice.id" :size="16" class="text-[color:var(--color-text-brand-1)]" />
              </div>
            </button>
          </div>
        </section>
      </div>
      <template #footer><el-button @click="selectionOpen = false">取消</el-button><el-button type="primary" @click="confirmSelection">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import ClientDeviceControlView from './ClientDeviceControlView.vue';
import { ref, computed, onBeforeUnmount } from 'vue';
import { Info, User, Check, Play, Square, Power, RotateCw } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../../store/client';

const store = usePlatformStore();
const powerActions = ref<InstanceType<typeof ClientDeviceControlView> | null>(null);

const tenantMachines = computed(() => {
  const list = store.machines.filter(
    m => m.customerId === store.currentTenantId || m.customerId === store.currentTenant?.id
  );
  return list.length > 0 ? list : store.machines.slice(0, 4);
});

const selectedMachine = computed(() => {
  return tenantMachines.value.find(m => m.id === store.selectedSettingMachineId) || tenantMachines.value[0];
});

export interface VoiceOptionItem {
  id: string;
  name: string;
  gender: '女声' | '男声';
  tag: string;
  desc: string;
  avatarUrl: string;
}

// 音色选项 (包含丰富预览头像、性别、标签与音色描述)
const voiceOptions: VoiceOptionItem[] = [
  {
    id: 'voice-1',
    name: '晓晓',
    gender: '女声',
    tag: '温暖亲和',
    desc: '温暖亲和女声，自然流利，适合展厅大屏高频接待',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80'
  },
  {
    id: 'voice-2',
    name: '云希',
    gender: '男声',
    tag: '沉稳磁性',
    desc: '沉稳自信男声，富有磁性，适合政务与商务展区导览',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'
  },
  {
    id: 'voice-3',
    name: '晓涵',
    gender: '女声',
    tag: '活力甜美',
    desc: '活力甜美女声，热情灵动，适合文旅文创与活动互动',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80'
  },
  {
    id: 'voice-4',
    name: '云扬',
    gender: '男声',
    tag: '沉静严谨',
    desc: '沉静知性男声，清晰严谨，适合科技展品深度讲解',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80'
  }
];

// 本地机器配置字典（解决切换机器状态覆盖问题）
const STORAGE_KEY = 'duozuhu_device_configs_map';
const getStoredConfigs = (): Record<string, { contentType: 'TEXT' | 'TEXT_AUDIO'; personaId: string; voiceId: string }> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

const deviceConfigs = ref(getStoredConfigs());

const currentMachineId = computed(() => selectedMachine.value?.id || 'DEV-01');

const currentContentType = computed(() => {
  return deviceConfigs.value[currentMachineId.value]?.contentType || 'TEXT';
});

const currentPersonaId = computed(() => {
  return deviceConfigs.value[currentMachineId.value]?.personaId || 'persona-elder';
});

const currentVoiceId = computed(() => {
  return deviceConfigs.value[currentMachineId.value]?.voiceId || 'voice-1';
});

const saveConfigForMachine = (updates: Partial<{ contentType: 'TEXT' | 'TEXT_AUDIO'; personaId: string; voiceId: string }>) => {
  const mId = currentMachineId.value;
  const current = deviceConfigs.value[mId] || {
    contentType: 'TEXT',
    personaId: 'persona-elder',
    voiceId: 'voice-1'
  };
  deviceConfigs.value = {
    ...deviceConfigs.value,
    [mId]: { ...current, ...updates }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deviceConfigs.value));
};

const handleSelectContentType = (type: 'TEXT' | 'TEXT_AUDIO') => {
  saveConfigForMachine({ contentType: type });
  ElMessage.success(`已切换返回内容类型为：${type === 'TEXT' ? '文本' : '文本+音频'}（重启机器后生效）`);
};

const handleSelectPersona = (item: { id: string; name: string }) => {
  saveConfigForMachine({ personaId: item.id });
  ElMessage.success(`已为终端「${selectedMachine.value?.name || '当前机器'}」选择人设：${item.name}（重启机器后生效）`);
};

const handleSelectVoice = (voiceId: string) => {
  saveConfigForMachine({ voiceId });
  const voice = voiceOptions.find(v => v.id === voiceId);
  ElMessage.success(`已为终端「${selectedMachine.value?.name || '当前机器'}」选择音色：${voice?.name || voiceId}（重启机器后生效）`);
};

// 试听反馈
const playingVoiceId = ref<string | null>(null);
let audioTimer: any = null;

const handleToggleAudio = (voice: typeof voiceOptions[0]) => {
  if (playingVoiceId.value === voice.id) {
    playingVoiceId.value = null;
    clearTimeout(audioTimer);
    ElMessage.info(`已停止「${voice.name}」音色试听`);
  } else {
    playingVoiceId.value = voice.id;
    ElMessage.success(`正在试听「${voice.name}」音色...`);
    clearTimeout(audioTimer);
    audioTimer = setTimeout(() => {
      playingVoiceId.value = null;
    }, 3500);
  }
};

// 共享人设数据池 (解决新增人设同步问题)
const defaultPersonas = [
  {
    id: 'persona-xiaoren',
    name: '小仁',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    prompt: '你是一个叫小仁的女孩。你的位置在山东济南历城区文旅城，回答山东济南的天气【核心人设】你是由山东汉德智能科技有限公司开...'
  },
  {
    id: 'persona-nihao',
    name: '你好',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    prompt: '你是一个叫小仁的女孩。【核心人设】你是由山东汉德智能科技有限公司开发的“AI具身智家超级助理”，你不仅是企业的数字代...'
  },
  {
    id: 'persona-222',
    name: '222',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    prompt: '你是一个叫小仁的女孩。【核心人设】你是由山东汉德智能科技有限公司开发的“AI具身智家超级助理”，你不仅是企业的数字代...'
  },
  {
    id: 'persona-elder',
    name: '老人',
    avatarUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&q=80',
    prompt: '你是一位名叫“张玉兰”的山东泰安肥城镇退休老人，今年约80岁。你正在接受一次口述历史采访，讲述自己从农村贫苦少年到参军、建...'
  }
];

const allPersonas = computed(() => {
  try {
    const s = localStorage.getItem('duozuhu_personas_list');
    if (s) {
      const list = JSON.parse(s);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return defaultPersonas;
});

const currentPersona = computed(() => allPersonas.value.find((p: typeof defaultPersonas[0]) => p.id === currentPersonaId.value) || allPersonas.value[0]);
const currentVoice = computed(() => voiceOptions.find(v => v.id === currentVoiceId.value) || voiceOptions[0]);
const selectionOpen = ref(false);
const selectionMode = ref<'persona' | 'voice'>('persona');
const draftPersonaId = ref('');
const draftVoiceId = ref('');
const previewPersona = computed(() => allPersonas.value.find((p: typeof defaultPersonas[0]) => p.id === draftPersonaId.value) || currentPersona.value);
const previewVoice = computed(() => voiceOptions.find(v => v.id === draftVoiceId.value) || currentVoice.value);
const openSelection = (mode: 'persona' | 'voice') => {
  selectionMode.value = mode;
  draftPersonaId.value = currentPersona.value?.id || '';
  draftVoiceId.value = currentVoice.value.id;
  selectionOpen.value = true;
};
const confirmSelection = () => {
  if (draftPersonaId.value !== currentPersonaId.value && previewPersona.value) handleSelectPersona(previewPersona.value);
  if (draftVoiceId.value !== currentVoiceId.value) handleSelectVoice(draftVoiceId.value);
  selectionOpen.value = false;
};
const stopPreview = () => { clearTimeout(audioTimer); playingVoiceId.value = null; };
onBeforeUnmount(stopPreview);
</script>

