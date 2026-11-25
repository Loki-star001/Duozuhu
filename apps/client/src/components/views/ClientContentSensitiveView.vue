<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Scrollable Table Area -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <!-- 1. INLINE TOOLBAR (左侧搜索栏，右侧统一为：批量删除、导出、新增敏感词) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: 搜索栏 -->
        <div class="flex items-center gap-3">
          <el-input
            v-model="searchQuery"
            style="width: 280px"
            placeholder="搜索违禁敏感词条..."
            clearable
          >
            <template #prefix>
              <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
            </template>
          </el-input>
        </div>

        <!-- Right: 批量删除、导出、新增敏感词 -->
        <div class="flex items-center gap-2.5">
          <el-button
            type="danger"
            plain
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除{{ selectedIds.length > 0 ? ` (${selectedIds.length})` : '' }}
          </el-button>

          <el-button @click="handleExport">
            导出
          </el-button>

          <el-button
            type="primary"
            @click="handleOpenAddModal"
          >
            新增敏感词
          </el-button>
        </div>
      </div>

      <!-- 2. WIREFRAME TABLE (敏感词表格规范：表头与表体均统一为 14px，行高固定 48px) -->
      <div class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style="width: 48px" />
              <col style="width: 50%" />
              <col style="width: 25%" />
              <col style="width: 25%" />
              <col style="width: 130px" />
            </colgroup>
            <thead class="bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] text-sm text-[color:var(--color-text-neutral-2)] font-medium">
              <tr class="h-[48px]">
                <th class="px-3 w-8 font-medium text-sm">
                  <el-checkbox
                    v-model="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @change="handleSelectAll"
                  />
                </th>
                <th class="px-4 font-medium text-sm">敏感词</th>
                <th class="px-4 font-medium text-sm">是否已同步</th>
                <th class="px-4 font-medium text-sm">状态</th>
                <th class="px-6 text-right whitespace-nowrap font-medium text-sm">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-grey-8)] bg-white text-sm text-[color:var(--color-text-neutral-2)]">
              <tr
                v-for="item in paginatedList"
                :key="item.id"
                class="h-[48px] hover:bg-[color:var(--color-fill-neutral-1)] transition-colors"
                :class="{ 'bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)]': selectedIds.includes(item.id) }"
              >
                <td class="px-3 h-[48px]">
                  <el-checkbox
                    :model-value="selectedIds.includes(item.id)"
                    @change="handleToggleSelect(item.id)"
                  />
                </td>
                <!-- 字段 1: 敏感词 -->
                <td class="px-4 h-[48px] font-medium text-[color:var(--color-text-neutral-1)] text-sm">
                  {{ item.word }}
                </td>
                <!-- 字段 2: 是否已同步 -->
                <td class="px-4 h-[48px]">
                  <el-tag
                    :type="item.isSynced ? 'primary' : 'info'"
                    size="small"
                  >
                    {{ item.isSynced ? '已同步' : '未同步' }}
                  </el-tag>
                </td>
                <!-- 字段 3: 状态 -->
                <td class="px-4 h-[48px]">
                  <el-tag
                    :type="item.status === 'ACTIVE' ? 'primary' : 'info'"
                    size="small"
                  >
                    {{ item.status === 'ACTIVE' ? '正常' : '已停用' }}
                  </el-tag>
                </td>
                <!-- 字段 4: 操作 (靠右对齐) -->
                <td class="px-6 h-[48px] text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <el-button
                      size="small"
                      link
                      type="primary"
                      @click="handleOpenEditModal(item)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      size="small"
                      link
                      type="danger"
                      @click="handleDelete(item)"
                    >
                      删除
                    </el-button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredList.length === 0">
                <td colspan="5" class="py-12 text-center text-sm text-[color:var(--color-text-neutral-3)]">
                  未找到匹配的敏感词记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 3. DOCKED FOOTER -->
    <ClientTableFooter
      :total="filteredList.length"
      v-model:current="currentPage"
      v-model:page-size="pageSize"
      :selected-count="selectedIds.length > 0 ? selectedIds.length : undefined"
    />

    <!-- ADD / EDIT SENSITIVE WORD MODAL -->
    <el-dialog
      v-model="isAddModalOpen"
      :title="editingId ? '编辑敏感词' : '添加敏感词'"
      width="520px"
      align-center
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">
            敏感词 <span class="text-[color:var(--color-danger-6)]">*</span>
          </label>
          <el-input
            v-model="newWord"
            placeholder="请输入敏感词内容"
            clearable
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">状态</label>
          <el-select
            v-model="wordStatus"
            class="w-full"
          >
            <el-option label="正常" value="ACTIVE" />
            <el-option label="已停用" value="INACTIVE" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAddModalOpen = false">取消</el-button>
          <el-button type="primary" @click="handleSaveSingle">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from '@lucide/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePlatformStore } from '../../store/client';
import ClientTableFooter from '../ClientTableFooter.vue';

interface SensitiveItem {
  id: string;
  word: string;
  isSynced: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  category?: string;
  createTime?: string;
}

const store = usePlatformStore();

const items = ref<SensitiveItem[]>([
  { id: 'SW-001', word: '政治..', isSynced: true, status: 'ACTIVE', category: '政治合规', createTime: '2026-09-25 15:00' },
  { id: 'SW-002', word: '诈骗', isSynced: true, status: 'ACTIVE', category: '虚假欺诈', createTime: '2026-09-20 10:00' },
  { id: 'SW-003', word: '退钱', isSynced: true, status: 'ACTIVE', category: '虚假欺诈', createTime: '2026-09-21 11:20' },
  { id: 'SW-004', word: '竞品A', isSynced: true, status: 'ACTIVE', category: '竞品商誉', createTime: '2026-09-22 14:15' },
  { id: 'SW-005', word: '假货', isSynced: true, status: 'ACTIVE', category: '虚假欺诈', createTime: '2026-09-23 09:40' },
  { id: 'SW-006', word: '投诉电话', isSynced: false, status: 'ACTIVE', category: '自定义违禁', createTime: '2026-09-24 16:30' },
  { id: 'SW-007', word: '虚假宣传', isSynced: true, status: 'ACTIVE', category: '虚假欺诈', createTime: '2026-09-25 10:15' },
  { id: 'SW-008', word: '强制消费', isSynced: true, status: 'ACTIVE', category: '自定义违禁', createTime: '2026-09-25 11:40' },
  { id: 'SW-009', word: '价格欺诈', isSynced: true, status: 'ACTIVE', category: '虚假欺诈', createTime: '2026-09-26 09:20' },
  { id: 'SW-010', word: '脏乱差', isSynced: true, status: 'ACTIVE', category: '粗俗辱骂', createTime: '2026-09-26 14:35' },
  { id: 'SW-011', word: '霸王条款', isSynced: false, status: 'ACTIVE', category: '自定义违禁', createTime: '2026-09-26 16:10' },
  { id: 'SW-012', word: '泄露隐私', isSynced: true, status: 'ACTIVE', category: '自定义违禁', createTime: '2026-09-27 10:00' },
  { id: 'SW-013', word: '内部回扣', isSynced: true, status: 'INACTIVE', category: '自定义违禁', createTime: '2026-09-27 11:50' },
  { id: 'SW-014', word: '封建迷信', isSynced: true, status: 'ACTIVE', category: '政治合规', createTime: '2026-09-27 15:25' },
  { id: 'SW-015', word: '黄牛倒票', isSynced: true, status: 'ACTIVE', category: '自定义违禁', createTime: '2026-09-28 09:05' },
  { id: 'SW-016', word: '差评威胁', isSynced: true, status: 'INACTIVE', category: '粗俗辱骂', createTime: '2026-09-28 10:30' }
]);

const searchQuery = ref('');
const selectedIds = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const isAddModalOpen = ref(false);
const editingId = ref<string | null>(null);
const newWord = ref('');
const wordStatus = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE');

const filteredList = computed(() => {
  if (!searchQuery.value.trim()) return items.value;
  const q = searchQuery.value.trim().toLowerCase();
  return items.value.filter(item => item.word.toLowerCase().includes(q));
});

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

const isAllSelected = computed(() => {
  return (
    filteredList.value.length > 0 &&
    filteredList.value.every(d => selectedIds.value.includes(d.id))
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedIds.value.length > 0 &&
    selectedIds.value.length < filteredList.value.length
  );
});

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = filteredList.value.map(d => d.id);
  } else {
    selectedIds.value = [];
  }
};

const handleToggleSelect = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(x => x !== id);
  } else {
    selectedIds.value.push(id);
  }
};

const handleOpenAddModal = () => {
  editingId.value = null;
  newWord.value = '';
  wordStatus.value = 'ACTIVE';
  isAddModalOpen.value = true;
};

const handleOpenEditModal = (item: SensitiveItem) => {
  editingId.value = item.id;
  newWord.value = item.word;
  wordStatus.value = item.status;
  isAddModalOpen.value = true;
};

const handleSaveSingle = () => {
  if (!newWord.value.trim()) {
    ElMessage.warning('请输入敏感词文本');
    return;
  }

  if (editingId.value) {
    items.value = items.value.map(item =>
      item.id === editingId.value
        ? { ...item, word: newWord.value.trim(), status: wordStatus.value }
        : item
    );
    ElMessage.success('已修改敏感词记录');
  } else {
    const newItem: SensitiveItem = {
      id: `SW-${Date.now().toString().slice(-4)}`,
      word: newWord.value.trim(),
      isSynced: true,
      status: wordStatus.value,
      createTime: new Date().toLocaleString().slice(0, 16)
    };
    items.value.unshift(newItem);
    ElMessage.success(`敏感词「${newItem.word}」已成功添加`);
  }

  isAddModalOpen.value = false;
};

const handleDelete = (item: SensitiveItem) => {
  ElMessageBox.confirm(
    `确认从防护规则中移除敏感词「${item.word}」？移除后系统将不再对此词进行合规拦截。`,
    '确认删除敏感词',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    items.value = items.value.filter(i => i.id !== item.id);
    selectedIds.value = selectedIds.value.filter(id => id !== item.id);
    ElMessage.success('已成功移除敏感词拦截规则');
  }).catch(() => {});
};

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;
  ElMessageBox.confirm(
    `确认批量移除选中的 ${selectedIds.value.length} 项敏感词拦截规则？`,
    '批量删除敏感词',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    items.value = items.value.filter(i => !selectedIds.value.includes(i.id));
    selectedIds.value = [];
    ElMessage.success('已批量移除选中的敏感词规则');
  }).catch(() => {});
};

const handleExport = () => {
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    '敏感词,是否已同步,状态\n' +
    filteredList.value
      .map(
        item =>
          `"${item.word.replace(/"/g, '""')}",${item.isSynced ? '已同步' : '未同步'},${item.status === 'ACTIVE' ? '启用' : '停用'}`
      )
      .join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `敏感词导出_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success('敏感词数据导出成功');
};
</script>
