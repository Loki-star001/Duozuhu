<template>
  <div class="client-settings-layout flex-1 flex min-h-0 overflow-hidden bg-white">
    <!-- 左侧栏：机器列表 (大容器统一四周 padding 16px，内部元素严格不超出) -->
    <div class="client-settings-list w-[22%] min-w-[220px] border-r border-[color:var(--color-border-2)] bg-white flex flex-col h-full select-none p-4 box-border overflow-hidden">
      <!-- 顶部标题与刷新按钮 (标题 16px) -->
      <div class="flex items-center justify-between pb-3 flex-shrink-0">
        <span class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">机器列表</span>
        <button
          type="button"
          title="刷新机器列表"
          class="p-1 rounded-[4px] text-[color:var(--color-text-brand-1)] hover:bg-[color:var(--color-fill-brand-5)] transition-colors cursor-pointer"
          @click="handleRefresh"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="pb-3 flex-shrink-0">
        <el-input
          v-model="searchTerm"
          placeholder="搜索机器"
          clearable
          style="height: 32px"
        >
          <template #prefix>
            <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
          </template>
        </el-input>
      </div>

      <!-- 机器列表项 -->
      <div class="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar min-h-0 pr-0.5">
        <div
          v-for="m in filteredMachines"
          :key="m.id"
          class="px-3.5 py-3 rounded-[4px] flex items-center justify-between cursor-pointer transition-colors"
          :class="selectedMachine?.id === m.id ? 'bg-[color:var(--color-fill-brand-5)]' : 'bg-white hover:bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-grey-9)]'"
          @click="store.setSelectedSettingMachineId(m.id)"
        >
          <div class="min-w-0 flex-1 pr-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[color:var(--color-text-neutral-1)] truncate">
                {{ m.name }}
              </span>
              <el-tag
                :type="m.status === 'ONLINE' ? 'success' : 'info'"
                size="small"
                class="flex-shrink-0"
              >
                {{ m.status === 'ONLINE' ? '正常' : '离线' }}
              </el-tag>
            </div>
            <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-1 font-mono truncate">
              机器码: {{ m.machineCode || '123AE' }}
            </div>
          </div>
          <ChevronRight
            v-if="selectedMachine?.id === m.id"
            class="w-4 h-4 text-[color:var(--color-text-brand-1)] flex-shrink-0"
          />
        </div>
      </div>
    </div>

    <!-- 右侧主内容区 -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
      <!-- 右侧顶部标题栏 (标题统一 16px) -->
      <div
        v-if="!hideHeader"
        class="h-12 px-6 border-b border-[color:var(--color-grey-9)] flex items-center justify-between flex-shrink-0"
      >
        <span class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">{{ title }}</span>
      </div>

      <!-- 右侧配置视图主体 -->
      <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RefreshCw, Search, ChevronRight } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../store/client';

withDefaults(defineProps<{
  title?: string;
  hideHeader?: boolean;
}>(), {
  title: '',
  hideHeader: false
});

const store = usePlatformStore();
const searchTerm = ref('');
const isRefreshing = ref(false);

const tenantMachines = computed(() => {
  const list = store.machines.filter(
    m => m.customerId === store.currentTenantId || m.customerId === store.currentTenant?.id
  );
  return list.length > 0 ? list : store.machines.slice(0, 4);
});

const filteredMachines = computed(() => {
  if (!searchTerm.value.trim()) return tenantMachines.value;
  const q = searchTerm.value.trim().toLowerCase();
  return tenantMachines.value.filter(
    m =>
      m.name.toLowerCase().includes(q) ||
      (m.machineCode || '').toLowerCase().includes(q) ||
      m.macAddress.toLowerCase().includes(q)
  );
});

const selectedMachine = computed(() => {
  return tenantMachines.value.find(m => m.id === store.selectedSettingMachineId) || tenantMachines.value[0];
});

const handleRefresh = () => {
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
    ElMessage.success('机器列表已刷新');
  }, 300);
};
</script>
