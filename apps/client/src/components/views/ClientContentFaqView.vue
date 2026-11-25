<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Main content area with scroll -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <!-- 1. TOOLBAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: Search input -->
        <div class="flex items-center gap-3">
          <el-input
            v-model="searchQuery"
            style="width: 280px"
            placeholder="搜索标准问题或解答..."
            clearable
          >
            <template #prefix>
              <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
            </template>
          </el-input>
        </div>

        <!-- Right: Actions -->
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
          <el-button type="primary" @click="handleOpenCreateModal">
            新增问答
          </el-button>
        </div>
      </div>

      <!-- 2. FLAT WIREFRAME TABLE (表头与表体均统一为 14px，行高固定 48px，操作左对齐) -->
      <div class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style="width: 48px" />
              <col style="width: 14%" />
              <col style="width: 38%" />
              <col style="width: 38%" />
              <col style="width: 90px" />
              <col style="width: 130px" />
            </colgroup>
            <thead class="bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)]">
              <tr class="text-[color:var(--color-text-neutral-2)] font-medium text-sm h-[48px]">
                <th class="px-3 w-8 font-medium text-sm">
                  <el-checkbox
                    v-model="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @change="handleSelectAll"
                  />
                </th>
                <th class="px-4 font-medium text-sm">机器</th>
                <th class="px-4 font-medium text-sm">问题</th>
                <th class="px-4 font-medium text-sm">答案</th>
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
                <td class="px-4 h-[48px] text-sm text-[color:var(--color-text-neutral-1)]">
                  {{ item.machineName || '老人1' }}
                </td>
                <td class="px-4 h-[48px]">
                  <div class="font-medium text-[color:var(--color-text-neutral-1)] text-sm truncate" :title="item.question">
                    {{ item.question }}
                  </div>
                </td>
                <td class="px-4 h-[48px]">
                  <div class="text-sm text-[color:var(--color-text-neutral-2)] truncate" :title="item.answer">
                    {{ item.answer }}
                  </div>
                </td>
                <td class="px-4 h-[48px]">
                  <el-switch
                    :model-value="item.status === 'ACTIVE'"
                    @change="toggleStatus(item.id, item.status)"
                  />
                </td>
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
                <td colspan="6" class="py-12 text-center text-sm text-[color:var(--color-text-neutral-3)]">
                  未找到匹配的问答内容
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

    <!-- 新增 / 编辑 问答弹窗 (520px, 4px 圆角) -->
    <el-dialog
      v-model="isModalOpen"
      :title="editingFaqId ? '编辑 Q＆A 问答' : '新增标准问答'"
      width="520px"
      align-center
    >
      <div class="space-y-4 py-2">
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">绑定生效机器</label>
          <el-select v-model="formMachineName" class="w-full">
            <el-option label="老人1" value="老人1" />
            <el-option label="老人2" value="老人2" />
            <el-option label="老人3" value="老人3" />
            <el-option label="老人4" value="老人4" />
          </el-select>
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">
            标准问题 <span class="text-[color:var(--color-danger-6)]">*</span>
          </label>
          <el-input v-model="formQuestion" placeholder="例如：你们公司的营业时间是几点？" clearable />
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">
            标准解答内容 <span class="text-[color:var(--color-danger-6)]">*</span>
          </label>
          <el-input
            v-model="formAnswer"
            type="textarea"
            :rows="4"
            placeholder="请输入数字人回答的标准文案..."
            clearable
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">相似问法 (每行一个)</label>
          <el-input
            v-model="formSimilarText"
            type="textarea"
            :rows="3"
            placeholder="换一种提问方式，每行一条"
            clearable
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isModalOpen = false">取消</el-button>
          <el-button type="primary" @click="handleSaveFaq">确认保存</el-button>
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
import type { ClientFaqItem } from '../../types';

const store = usePlatformStore();
const searchQuery = ref('');
const selectedIds = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const isModalOpen = ref(false);
const editingFaqId = ref<string | null>(null);
const formMachineName = ref('老人1');
const formQuestion = ref('');
const formAnswer = ref('');
const formSimilarText = ref('');
const formStatus = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE');

const filteredList = computed(() => {
  if (!searchQuery.value.trim()) return store.clientFaqs;
  const q = searchQuery.value.toLowerCase().trim();
  return store.clientFaqs.filter(
    item =>
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q)
  );
});

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

const isAllSelected = computed(() => {
  return (
    paginatedList.value.length > 0 &&
    paginatedList.value.every(item => selectedIds.value.includes(item.id))
  );
});

const isIndeterminate = computed(() => {
  const selectedInPage = paginatedList.value.filter(item =>
    selectedIds.value.includes(item.id)
  );
  return (
    selectedInPage.length > 0 &&
    selectedInPage.length < paginatedList.value.length
  );
});

const handleSelectAll = (val: boolean) => {
  if (val) {
    const pageIds = paginatedList.value.map(i => i.id);
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...pageIds]));
  } else {
    const pageIds = paginatedList.value.map(i => i.id);
    selectedIds.value = selectedIds.value.filter(id => !pageIds.includes(id));
  }
};

const handleToggleSelect = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(i => i !== id);
  } else {
    selectedIds.value.push(id);
  }
};

const toggleStatus = (id: string, currentStatus: string) => {
  store.toggleClientFaqStatus(id);
  ElMessage.success(currentStatus === 'ACTIVE' ? '已停用该问答' : '已启用该问答');
};

const handleOpenCreateModal = () => {
  editingFaqId.value = null;
  formMachineName.value = '老人1';
  formQuestion.value = '';
  formAnswer.value = '';
  formSimilarText.value = '';
  formStatus.value = 'ACTIVE';
  isModalOpen.value = true;
};

const handleOpenEditModal = (item: ClientFaqItem) => {
  editingFaqId.value = item.id;
  formMachineName.value = item.machineName || '老人1';
  formQuestion.value = item.question;
  formAnswer.value = item.answer;
  formSimilarText.value = (item.similarQuestions || []).join('\n');
  formStatus.value = item.status;
  isModalOpen.value = true;
};

const handleSaveFaq = () => {
  if (!formQuestion.value.trim()) {
    ElMessage.warning('问题为必填项');
    return;
  }
  if (!formAnswer.value.trim()) {
    ElMessage.warning('答案为必填项');
    return;
  }
  const similar = formSimilarText.value
    .split(/[\n,，]+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (editingFaqId.value) {
    store.updateClientFaq(editingFaqId.value, {
      machineName: formMachineName.value,
      question: formQuestion.value.trim(),
      answer: formAnswer.value.trim(),
      similarQuestions: similar,
      status: formStatus.value
    });
    ElMessage.success('问答修改保存成功');
  } else {
    store.addClientFaq({
      machineName: formMachineName.value,
      question: formQuestion.value.trim(),
      answer: formAnswer.value.trim(),
      similarQuestions: similar,
      status: formStatus.value,
      category: '通用'
    });
    ElMessage.success('新增问答成功');
  }
  isModalOpen.value = false;
};

const handleDelete = (item: ClientFaqItem) => {
  ElMessageBox.confirm(`确定要删除标准问答「${item.question}」吗？`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    store.deleteClientFaq(item.id);
    selectedIds.value = selectedIds.value.filter(id => id !== item.id);
    ElMessage.success('问答删除成功');
  }).catch(() => {});
};

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;
  ElMessageBox.confirm(`确定批量删除选中的 ${selectedIds.value.length} 条问答吗？`, '批量删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    selectedIds.value.forEach(id => store.deleteClientFaq(id));
    selectedIds.value = [];
    ElMessage.success('批量删除成功');
  }).catch(() => {});
};

const handleExport = () => {
  const csv = '机器,问题,答案,状态\n' + store.clientFaqs.map(f => `${f.machineName || '老人1'},"${f.question}","${f.answer}",${f.status}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `问答库导出_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('问答库数据导出成功');
};
</script>
