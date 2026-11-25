<template>
  <div class="client-greetings flex-1 flex flex-col min-h-0 overflow-hidden bg-white animate-fadeIn">
    <!-- 顶部栏：左侧切换分段按钮 (开机自我介绍 | 打招呼 | 语言切换提示词) + 右侧当前机器及搜索刷新 -->
    <div class="client-greetings-tabs h-14 px-6 border-b border-[color:var(--color-grey-9)] flex items-center justify-between flex-shrink-0">
      <div class="inline-flex items-center rounded-[4px] border border-[color:var(--color-border-2)] overflow-hidden bg-white">
        <button
          v-for="(tab, idx) in tabOptions"
          :key="tab.key"
          type="button"
          @click="activeTab = tab.key"
          class="h-8 px-4 text-xs font-medium transition-colors cursor-pointer"
          :class="[
            idx > 0 ? 'border-l border-[color:var(--color-border-2)]' : '',
            activeTab === tab.key
              ? 'bg-[color:var(--color-fill-brand-1)] text-white'
              : 'bg-white text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-1)]'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 顶部展开搜索栏 (对齐原版即时筛选) -->
    <div
      v-if="showGreetingSearch"
      class="px-6 py-2.5 bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] flex items-center gap-3 animate-fadeIn flex-shrink-0"
    >
      <el-input
        v-model="greetingSearchQuery"
        placeholder="搜索应答文本内容..."
        clearable
        style="height: 32px"
        class="max-w-md"
      >
        <template #prefix>
          <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
        </template>
      </el-input>
      <button
        type="button"
        class="text-xs text-[color:var(--color-text-neutral-3)] hover:text-[color:var(--color-text-neutral-1)] cursor-pointer"
        @click="showGreetingSearch = false; greetingSearchQuery = ''"
      >
        收起
      </button>
    </div>

    <!-- 主体多语言编辑卡片流 -->
    <div class="client-greetings-body flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <div
        v-for="group in displayedGroups"
        :key="group.langKey"
        class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white"
      >
        <!-- 语言卡片表头 -->
        <div class="h-10 px-4 bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] flex items-center gap-2">
          <span class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">
            {{ group.label }}
          </span>
          <span class="px-1.5 py-0.5 rounded-[4px] bg-[color:color-mix(in_srgb,var(--color-fill-neutral-3)_80%,transparent)] text-[color:var(--color-text-neutral-2)] text-[11px] font-mono leading-none">
            {{ group.rows.length }}
          </span>
        </div>

        <!-- 语言行列表 -->
        <div class="divide-y divide-[color:var(--color-grey-8)]">
          <div
            v-for="row in group.rows"
            :key="row.id"
            class="h-[46px] flex items-center bg-white hover:bg-[color:var(--color-fill-neutral-1)] transition-colors"
          >
            <!-- 中间行内编辑输入框 -->
            <div class="flex-1 h-full flex items-center px-4">
              <input
                type="text"
                v-model="row.text"
                @blur="handleSaveMachineGreetings"
                :placeholder="group.placeholder"
                class="w-full h-full bg-transparent text-xs text-[color:var(--color-text-neutral-1)] placeholder-[#86909C] outline-none"
              />
            </div>

            <!-- 右侧删除按钮 -->
            <div class="w-12 h-full flex items-center justify-center border-l border-[color:var(--color-grey-9)] flex-shrink-0">
              <button
                type="button"
                @click="handleDeleteRow(group.langKey, row.id)"
                class="p-1.5 rounded-[4px] text-[color:color-mix(in_srgb,var(--color-danger-6)_60%,transparent)] hover:text-[color:var(--color-danger-6)] hover:bg-[color:var(--color-danger-1)] transition-colors cursor-pointer"
                title="删除"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="activeTab === 'GREETINGS'" class="client-greeting-duration-footer">
      <label for="greeting-display-seconds">显示时间</label>
      <el-input-number id="greeting-display-seconds" v-model="greetingDisplaySeconds" size="default"
        :min="1" :step="1" :precision="0" aria-label="打招呼显示时间（秒）" />
      <span>秒</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Trash2, Search, RefreshCw } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../../store/client';

type TabKey = 'INTRO' | 'GREETINGS' | 'SWITCH_PROMPT';

interface LangRowItem {
  id: string;
  checked: boolean;
  text: string;
}

interface LangGroup {
  langKey: 'zh' | 'en' | 'zh-hant';
  label: string;
  placeholder: string;
  rows: LangRowItem[];
}

const tabOptions = [
  { key: 'INTRO' as TabKey, label: '开机自我介绍' },
  { key: 'GREETINGS' as TabKey, label: '打招呼' },
  { key: 'SWITCH_PROMPT' as TabKey, label: '语言切换提示词' }
];

const store = usePlatformStore();

const tenantMachines = computed(() => {
  const list = store.machines.filter(
    m => m.customerId === store.currentTenantId || m.customerId === store.currentTenant?.id
  );
  return list.length > 0 ? list : store.machines.slice(0, 4);
});

const selectedMachine = computed(() => {
  return tenantMachines.value.find(m => m.id === store.selectedSettingMachineId) || tenantMachines.value[0];
});

const currentMachineId = computed(() => selectedMachine.value?.id || 'DEV-01');

const DURATION_STORAGE_KEY = 'duozuhu_device_greeting_duration_map';
const readDurationMap = (): Record<string, number> => {
  try {
    const value = JSON.parse(localStorage.getItem(DURATION_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
};
const greetingDurationMap = ref(readDurationMap());
const saveGreetingDisplaySeconds = (value: number | string | undefined | null) => {
  const numeric = Number(value);
  const seconds = Number.isFinite(numeric) && numeric >= 1 ? Math.round(numeric) : 5;
  greetingDurationMap.value = { ...greetingDurationMap.value, [currentMachineId.value]: seconds };
  localStorage.setItem(DURATION_STORAGE_KEY, JSON.stringify(greetingDurationMap.value));
};
const greetingDisplaySeconds = computed({
  get: () => {
    const value = Number(greetingDurationMap.value[currentMachineId.value]);
    return Number.isFinite(value) && value >= 1 ? Math.round(value) : 5;
  },
  set: saveGreetingDisplaySeconds
});

const createDefaultTabData = (): Record<TabKey, LangGroup[]> => ({
  INTRO: [
    { langKey: 'zh', label: '中文', placeholder: '点击编辑', rows: [{ id: 'intro-zh-1', checked: false, text: '' }] },
    { langKey: 'en', label: 'English', placeholder: 'Click to edit', rows: [{ id: 'intro-en-1', checked: false, text: '' }] },
    { langKey: 'zh-hant', label: '繁體中文', placeholder: '點擊編輯', rows: [{ id: 'intro-hant-1', checked: false, text: '' }] }
  ],
  GREETINGS: [
    { langKey: 'zh', label: '中文', placeholder: '点击编辑', rows: [{ id: 'greet-zh-1', checked: false, text: '' }] },
    { langKey: 'en', label: 'English', placeholder: 'Click to edit', rows: [{ id: 'greet-en-1', checked: false, text: '' }] },
    { langKey: 'zh-hant', label: '繁體中文', placeholder: '點擊編輯', rows: [{ id: 'greet-hant-1', checked: false, text: '' }] }
  ],
  SWITCH_PROMPT: [
    { langKey: 'zh', label: '中文', placeholder: '点击编辑', rows: [{ id: 'switch-zh-1', checked: false, text: '' }] },
    { langKey: 'en', label: 'English', placeholder: 'Click to edit', rows: [{ id: 'switch-en-1', checked: false, text: '' }] },
    { langKey: 'zh-hant', label: '繁體中文', placeholder: '點擊編輯', rows: [{ id: 'switch-hant-1', checked: false, text: '' }] }
  ]
});

// 本地多机器应答字典（按机器 ID 隔离存储，解决切换机器沿用上一台状态问题）
const STORAGE_KEY = 'duozuhu_device_greetings_map';
const getStoredGreetingsMap = (): Record<string, Record<TabKey, LangGroup[]>> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

const machineGreetingsMap = ref(getStoredGreetingsMap());

const activeTab = ref<TabKey>('INTRO');
const tabData = ref<Record<TabKey, LangGroup[]>>(
  machineGreetingsMap.value[currentMachineId.value] || createDefaultTabData()
);

const showGreetingSearch = ref(false);
const greetingSearchQuery = ref('');
const isRefreshingGreetings = ref(false);

// 监听当前机器切换，自动载入该机器的数据
watch(currentMachineId, (newId) => {
  if (machineGreetingsMap.value[newId]) {
    tabData.value = JSON.parse(JSON.stringify(machineGreetingsMap.value[newId]));
  } else {
    tabData.value = createDefaultTabData();
  }
});

const currentGroups = computed(() => tabData.value[activeTab.value]);

const displayedGroups = computed(() => {
  const groups = currentGroups.value;
  if (!greetingSearchQuery.value.trim()) {
    return groups;
  }
  const query = greetingSearchQuery.value.trim().toLowerCase();
  return groups.map(g => ({
    ...g,
    rows: g.rows.filter(r => r.text.toLowerCase().includes(query))
  }));
});

const handleRefreshGreetings = () => {
  isRefreshingGreetings.value = true;
  setTimeout(() => {
    const mId = currentMachineId.value;
    const freshMap = getStoredGreetingsMap();
    if (freshMap[mId]) {
      tabData.value = JSON.parse(JSON.stringify(freshMap[mId]));
    }
    isRefreshingGreetings.value = false;
    ElMessage.success('设备应答已刷新');
  }, 300);
};

const handleSaveMachineGreetings = () => {
  const mId = currentMachineId.value;
  machineGreetingsMap.value = {
    ...machineGreetingsMap.value,
    [mId]: JSON.parse(JSON.stringify(tabData.value))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(machineGreetingsMap.value));
};

const handleDeleteRow = (langKey: LangGroup['langKey'], rowId: string) => {
  const groups = tabData.value[activeTab.value];
  const group = groups.find(g => g.langKey === langKey);
  if (!group) return;

  if (group.rows.length <= 1) {
    group.rows[0].checked = false;
    group.rows[0].text = '';
  } else {
    group.rows = group.rows.filter(r => r.id !== rowId);
  }
  handleSaveMachineGreetings();
  ElMessage.success('已清除该条应答内容');
};
</script>

<style scoped>
.client-greeting-duration-footer { display: flex; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px 24px; border-top: 1px solid var(--color-grey-8); background: #fff; font-size: 14px; color: var(--color-grey-3); }
.client-greeting-duration-footer .el-input-number { width: 144px; }
</style>
