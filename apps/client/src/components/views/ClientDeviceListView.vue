<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Scrollable Table Area -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <el-input
          v-model="searchTerm"
          placeholder="搜索名称、mac地址、机器码..."
          style="width: 320px"
          clearable
        >
          <template #prefix>
            <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
          </template>
        </el-input>

        <div class="flex items-center gap-4">
          <el-button
            type="primary"
            @click="handleOpenExportModal"
          >
            导出问答记录
          </el-button>
        </div>
      </div>

      <!-- Table - Clean Flat Wireframe Style (表头与表格字号统一为 14px) -->
      <div class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style="width: 22%" />
              <col style="width: 24%" />
              <col style="width: 20%" />
              <col style="width: 20%" />
              <col style="width: 14%" />
            </colgroup>
            <thead class="bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] text-sm text-[color:var(--color-text-neutral-2)] font-medium">
              <tr class="h-[48px]">
                <th class="px-6 font-medium text-sm">名称</th>
                <th class="px-4 font-medium text-sm">mac地址</th>
                <th class="px-4 font-medium text-sm">机器码</th>
                <th class="px-4 font-medium text-sm">密钥</th>
                <th class="px-4 font-medium text-sm">状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-grey-8)] text-sm text-[color:var(--color-text-neutral-2)] bg-white">
              <tr
                v-for="m in paginatedMachines"
                :key="m.id"
                class="h-[48px] hover:bg-[color:var(--color-fill-neutral-1)] transition-colors"
              >
                <td class="px-6 h-[48px] font-medium text-[color:var(--color-text-neutral-1)] text-sm">
                  {{ m.name }}
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-neutral-2)]">
                  {{ m.macAddress }}
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-brand-1)]">
                  {{ m.machineCode || '123AE' }}
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-neutral-2)]">
                  {{ m.secretKey || m.machineCode || '123AE' }}
                </td>
                <td class="px-4 h-[48px] text-sm">
                  <el-tag
                    :type="m.status === 'ONLINE' ? 'success' : 'info'"
                    size="small"
                  >
                    {{ m.status === 'ONLINE' ? '在线' : '离线' }}
                  </el-tag>
                </td>
              </tr>
              <tr v-if="filteredMachines.length === 0">
                <td colspan="5" class="py-12 text-center text-sm text-[color:var(--color-text-neutral-3)]">
                  未找到匹配的机器设备
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 56px Bottom Bar -->
    <ClientTableFooter
      :total="filteredMachines.length"
      v-model:current="currentPage"
      v-model:page-size="pageSize"
    />

    <!-- 问答记录数据导出弹窗 (760px, 对齐参考图样式) -->
    <el-dialog
      v-model="isExportModalOpen"
      title="问答记录数据导出"
      width="520px"
      align-center
      class="rounded-[4px] p-0"
    >
      <div class="space-y-5">
        <!-- 顶部标题区 + 右侧导出 Excel 按钮 -->
        <div class="flex items-center justify-between pb-4 border-b border-[color:var(--color-border-2)]">
          <div>
            <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-1">请设置筛选条件后导出Excel文件</div>
          </div>
          <el-button type="primary" @click="handleExportExcel">
            <span class="inline-flex items-center gap-1.5">
              <Download class="w-3.5 h-3.5" />
              <span>导出 Excel</span>
            </span>
          </el-button>
        </div>

        <!-- 筛选表单区：机器MAC + 提问时间范围 -->
        <div class="grid grid-cols-1 gap-6 py-2">
          <div class="space-y-2.5">
            <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">
              机器MAC
            </label>
            <el-select
              v-model="selectedMac"
              placeholder="请点击选择机器MAC"
              clearable
              filterable
              class="w-full"
            >
              <el-option
                v-for="m in tenantMachines"
                :key="m.id"
                :label="`${m.name} (${m.macAddress})`"
                :value="m.macAddress"
              />
            </el-select>
          </div>

          <div class="space-y-2.5">
            <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">
              提问时间范围
            </label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              clearable
              class="w-full"
            />
          </div>
        </div>

        <!-- 虚线分割线 -->
        <div class="border-t border-dashed border-[color:var(--color-border-2)]" />

        <!-- 底部右侧重置条件按钮 -->
        <div class="flex items-center justify-end">
          <el-button @click="handleResetConditions">
            <span class="inline-flex items-center gap-1.5">
              <RotateCcw class="w-3.5 h-3.5" />
              <span>重置条件</span>
            </span>
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from '@lucide/vue';
import { Download, RotateCcw } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../../store/client';
import ClientTableFooter from '../ClientTableFooter.vue';

const store = usePlatformStore();
const searchTerm = ref('');
const selectedIds = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

// 问答记录数据导出弹窗状态
const isExportModalOpen = ref(false);
const selectedMac = ref('');
const dateRange = ref<[string, string] | []>([]);

const tenantMachines = computed(() => {
  return store.machines.filter(
    m => m.customerId === store.currentTenantId || m.customerId === store.currentTenant?.id
  );
});

const filteredMachines = computed(() => {
  if (!searchTerm.value.trim()) return tenantMachines.value;
  const q = searchTerm.value.toLowerCase().trim();
  return tenantMachines.value.filter(
    m =>
      m.name.toLowerCase().includes(q) ||
      m.macAddress.toLowerCase().includes(q) ||
      (m.machineCode || '').toLowerCase().includes(q)
  );
});

const paginatedMachines = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredMachines.value.slice(start, start + pageSize.value);
});

const isAllSelected = computed(() => {
  return (
    filteredMachines.value.length > 0 &&
    filteredMachines.value.every(m => selectedIds.value.includes(m.id))
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedIds.value.length > 0 &&
    selectedIds.value.length < filteredMachines.value.length
  );
});

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = filteredMachines.value.map(m => m.id);
  } else {
    selectedIds.value = [];
  }
};

const handleToggleSelect = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(i => i !== id);
  } else {
    selectedIds.value.push(id);
  }
};

// 打开导出问答记录弹窗 (若已在表格中勾选某台设备，默认带入该设备 MAC)
const handleOpenExportModal = () => {
  if (selectedIds.value.length > 0) {
    const firstSelected = tenantMachines.value.find(m => m.id === selectedIds.value[0]);
    selectedMac.value = firstSelected?.macAddress || '';
  } else {
    selectedMac.value = '';
  }
  dateRange.value = [];
  isExportModalOpen.value = true;
};

const handleResetConditions = () => {
  selectedMac.value = '';
  dateRange.value = [];
  ElMessage.info('已重置筛选条件');
};

// 导出 Excel (CSV UTF-8 BOM)
const handleExportExcel = () => {
  const tenantMacs = new Set(tenantMachines.value.map(m => m.macAddress));
  const filteredLogs = store.clientQaLogs.filter(log => {
    if (!tenantMacs.has(log.mac)) return false;
    if (selectedMac.value && log.mac !== selectedMac.value) return false;
    if (dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const logDate = log.timestamp.slice(0, 10);
      if (logDate < dateRange.value[0] || logDate > dateRange.value[1]) return false;
    }
    return true;
  });

  const rowsToExport =
    filteredLogs.length > 0
      ? filteredLogs
      : store.clientQaLogs.filter(l => tenantMacs.has(l.mac));

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    '终端设备,机器MAC,访客提问,数字人应答,应答来源,耗时(ms),Token消耗,提问时间\n' +
    rowsToExport
      .map(
        l =>
          `${l.deviceName},${l.mac},"${(l.userQuestion || '').replace(/"/g, '""')}","${(l.replyText || '').replace(/"/g, '""')}",${l.hitType},${l.latencyMs},${l.tokensConsumed},${l.timestamp}`
      )
      .join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const targetTitle = selectedMac.value
    ? tenantMachines.value.find(m => m.macAddress === selectedMac.value)?.name || selectedMac.value
    : '全部设备';
  link.setAttribute(
    'download',
    `问答记录数据导出_${targetTitle}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success('问答记录 Excel 文件导出成功');
  isExportModalOpen.value = false;
};
</script>
