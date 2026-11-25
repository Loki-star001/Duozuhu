<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Scrollable Table Area -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <!-- 1. INLINE TOOLBAR (左侧搜索栏，右侧统一为：批量删除、导出、新增资料) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: 搜索栏 -->
        <div class="flex items-center gap-3">
          <el-input
            v-model="searchQuery"
            style="width: 280px"
            placeholder="搜索资料名称..."
            clearable
          >
            <template #prefix>
              <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
            </template>
          </el-input>
        </div>

        <!-- Right: 批量删除、导出、新增资料 -->
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
            新增资料
          </el-button>
        </div>
      </div>

      <!-- 2. WIREFRAME TABLE (知识库管理表格规范：表头与表体均统一为 14px，行高固定 48px) -->
      <div class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white">
        <div class="overflow-x-auto">
          <table class="client-knowledge-table w-full text-left table-fixed border-collapse">
            <colgroup>
              <col style="width: 48px" />
              <col style="width: 25%" />
              <col style="width: 20%" />
              <col style="width: 30%" />
              <col style="width: 25%" />
              <col style="width: 100px" />
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
                <th class="px-4 font-medium text-sm">资料名称</th>
                <th class="px-4 font-medium text-sm">所属知识库</th>
                <th class="px-4 font-medium text-sm">文档资料url</th>
                <th class="px-4 font-medium text-sm">文档描述</th>
                <th class="px-6 text-right font-medium text-sm whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-grey-8)] bg-white text-sm text-[color:var(--color-text-neutral-2)]">
              <tr
                v-for="doc in paginatedList"
                :key="doc.id"
                class="h-[48px] hover:bg-[color:var(--color-fill-neutral-1)] transition-colors"
                :class="{ 'bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)]': selectedIds.includes(doc.id) }"
              >
                <td class="px-3 h-[48px]">
                  <el-checkbox
                    :model-value="selectedIds.includes(doc.id)"
                    @change="handleToggleSelect(doc.id)"
                  />
                </td>
                <!-- 字段 1: 资料名称 -->
                <td class="px-4 h-[48px]">
                  <div class="font-medium text-[color:var(--color-text-neutral-1)] text-sm truncate" :title="doc.name">
                    {{ doc.name }}
                  </div>
                </td>
                <!-- 字段 2: 所所属知识库 -->
                <td class="px-4 h-[48px] text-sm text-[color:var(--color-text-neutral-2)]">
                  <div class="truncate" :title="doc.kbName">{{ doc.kbName }}</div>
                </td>
                <!-- 字段 3: 文档资料url -->
                <td class="px-4 h-[48px] font-mono text-xs text-[color:var(--color-text-neutral-3)]">
                  <div class="truncate text-[color:var(--color-text-brand-1)] hover:underline cursor-pointer" :title="doc.docUrl">
                    {{ doc.docUrl }}
                  </div>
                </td>
                <!-- 字段 4: 文档描述 -->
                <td class="px-4 h-[48px] text-sm text-[color:var(--color-text-neutral-3)]">
                  <div class="truncate" :title="doc.description">{{ doc.description || '-' }}</div>
                </td>
                <!-- 字段 5: 操作 (靠右对齐) -->
                <td class="px-6 h-[48px] text-right whitespace-nowrap">
                  <div class="flex items-center justify-end">
                    <el-button
                      size="small"
                      link
                      type="danger"
                      @click="handleDelete(doc)"
                    >
                      删除
                    </el-button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredList.length === 0">
                <td colspan="6" class="py-12 text-center text-sm text-[color:var(--color-text-neutral-3)]">
                  未找到匹配的知识库文档
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

    <!-- 新增资料弹窗 (520px, 4px 圆角) -->
    <el-dialog
      v-model="isUploadModalOpen"
      title="新增资料"
      width="520px"
      align-center
    >
      <div class="space-y-4 py-2">
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">
            资料名称 <span class="text-[color:var(--color-danger-6)]">*</span>
          </label>
          <el-input v-model="newDocName" placeholder="例如：程序功能点设计表.xlsx" clearable />
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">所属知识库</label>
          <el-select v-model="newKbName" class="w-full">
            <el-option label="默认知识库" value="默认知识库" />
            <el-option label="默认知识库2" value="默认知识库2" />
          </el-select>
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">文档资料url</label>
          <el-input v-model="newDocUrl" placeholder="http://192.168.1.212:9000/ruoyi/admin/..." clearable />
        </div>

        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">文档描述</label>
          <el-input v-model="newDescription" type="textarea" :rows="3" placeholder="请输入文档描述内容..." clearable />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isUploadModalOpen = false">取消</el-button>
          <el-button type="primary" @click="handleUpload">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from '@lucide/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ClientTableFooter from '../ClientTableFooter.vue';

interface KbDocItem {
  id: string;
  name: string;
  kbName: string;
  docUrl: string;
  description: string;
  type?: 'PDF' | 'DOCX' | 'XLSX' | 'TXT';
  size?: string;
  uploadTime?: string;
}

const docs = ref<KbDocItem[]>([
  {
    id: 'DOC-001',
    name: '程序功能点设计表.xlsx',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/10/6d8cff91737c453c94e06363c2.xlsx',
    description: '核心模块功能矩阵清单',
    type: 'XLSX',
    size: '860 KB',
    uploadTime: '2026-08-10 14:20'
  },
  {
    id: 'DOC-002',
    name: 'openclaw_配置.txt',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/10/f65b63aa18eb346d08da078e7d.txt',
    description: '网络通信与中间件配置参数',
    type: 'TXT',
    size: '24 KB',
    uploadTime: '2026-08-10 15:30'
  },
  {
    id: 'DOC-003',
    name: '云政 APP——AI 数字人情绪体终端平台项目可行性研究报告.docx',
    kbName: '默认知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/07/08/d0ffe4991c7e41d68d188fc2ecb.docx',
    description: '云政数字人可行性评估',
    type: 'DOCX',
    size: '2.4 MB',
    uploadTime: '2026-07-08 11:15'
  },
  {
    id: 'DOC-004',
    name: '西湖十景深度导览解说词全编.pdf',
    kbName: '西湖全景知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/15/8e12a43cf9124018bc6719ef01a.pdf',
    description: '包含断桥、苏堤、三潭印月官方解说词',
    type: 'PDF',
    size: '1.8 MB',
    uploadTime: '2026-08-15 09:30'
  },
  {
    id: 'DOC-005',
    name: '2026杭州西湖文旅数字展厅服务运营规范手册.docx',
    kbName: '默认知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/18/7c90b11ef234479981248abce33.docx',
    description: '展厅现场服务规范与安全巡检标准',
    type: 'DOCX',
    size: '920 KB',
    uploadTime: '2026-08-18 10:45'
  },
  {
    id: 'DOC-006',
    name: '西湖博物馆常设展厅展品清册及多媒体解说标引.xlsx',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/20/54ad9938fa114421bba80199cf8.xlsx',
    description: '馆藏历史文物与声光电展项对应表',
    type: 'XLSX',
    size: '640 KB',
    uploadTime: '2026-08-20 16:10'
  },
  {
    id: 'DOC-007',
    name: '智能语音交互高频问答知识图谱(FAQ扩充版).json',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/22/33bb84719ac446d3a95821034fe.json',
    description: '意图对齐与相似语义扩展语料',
    type: 'TXT',
    size: '380 KB',
    uploadTime: '2026-08-22 11:20'
  },
  {
    id: 'DOC-008',
    name: '杭州特色文创产品及非遗特产导购指南.pdf',
    kbName: '西湖全景知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/25/11fa92338bc44988bb19488a092.pdf',
    description: '西湖龙井、王星记扇、文创雪糕推荐',
    type: 'PDF',
    size: '3.2 MB',
    uploadTime: '2026-08-25 14:00'
  },
  {
    id: 'DOC-009',
    name: '展厅数字人一体机硬件维护与网络巡检标准规程.docx',
    kbName: '默认知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/28/99aa12739fa44d1891004a88bc1.docx',
    description: '硬件设备离线排查与日常保养指南',
    type: 'DOCX',
    size: '750 KB',
    uploadTime: '2026-08-28 17:15'
  },
  {
    id: 'DOC-010',
    name: '西湖水域游船航线时刻表与票务细则.pdf',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/02/88ff61208aa14b30819922a012e.pdf',
    description: '环湖各码头班次、航行时间及优惠政策',
    type: 'PDF',
    size: '1.1 MB',
    uploadTime: '2026-09-02 09:10'
  },
  {
    id: 'DOC-011',
    name: '数字化情绪交互数字人动作指令集映射表.xlsx',
    kbName: '默认知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/05/77dd90218bf14930819933bb092.xlsx',
    description: '肢体动作、面部表情与语音标签映射',
    type: 'XLSX',
    size: '512 KB',
    uploadTime: '2026-09-05 13:40'
  },
  {
    id: 'DOC-012',
    name: '重点历史人物事迹考略（苏东坡与白居易在杭生平）.pdf',
    kbName: '西湖全景知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/08/66cc51928cf14938819944cc081.pdf',
    description: '历代文人治湖生平与千古名句文献汇总',
    type: 'PDF',
    size: '4.5 MB',
    uploadTime: '2026-09-08 15:20'
  },
  {
    id: 'DOC-013',
    name: '展厅参观安全须知与火灾紧急疏散预案.pdf',
    kbName: '默认知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/12/55bb41838df14939819955dd072.pdf',
    description: '安全出口指引与突发事件应对流程',
    type: 'PDF',
    size: '890 KB',
    uploadTime: '2026-09-12 11:00'
  },
  {
    id: 'DOC-014',
    name: '游客常见意见反馈与标准应答话术指引.docx',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/15/44aa31748ef14930819966ee063.docx',
    description: '现场导览、咨询求助等服务标准问答',
    type: 'DOCX',
    size: '430 KB',
    uploadTime: '2026-09-15 16:50'
  },
  {
    id: 'DOC-015',
    name: '环西湖绿色骑行与步行精华推荐路线图.pdf',
    kbName: '西湖全景知识库',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/18/339921658ff14931819977ff054.pdf',
    description: '3条半日游及全日游精华打卡线路',
    type: 'PDF',
    size: '2.7 MB',
    uploadTime: '2026-09-18 10:30'
  },
  {
    id: 'DOC-016',
    name: '西湖龙井茶艺非遗制作工序及冲泡品鉴手册.docx',
    kbName: '默认知识库2',
    docUrl: 'http://192.168.1.212:9000/ruoyi/admin/2222/2026/09/22/2288115680f14932819988aa045.docx',
    description: '十大炒茶手法与水温茶具讲究',
    type: 'DOCX',
    size: '1.4 MB',
    uploadTime: '2026-09-22 14:10'
  }
]);

const searchQuery = ref('');
const selectedIds = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const isUploadModalOpen = ref(false);
const newDocName = ref('');
const newKbName = ref('默认知识库2');
const newDocUrl = ref('');
const newDescription = ref('');

const filteredList = computed(() => {
  if (!searchQuery.value.trim()) return docs.value;
  const q = searchQuery.value.trim().toLowerCase();
  return docs.value.filter(item => item.name.toLowerCase().includes(q));
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

const handleOpenCreateModal = () => {
  newDocName.value = '';
  newKbName.value = '默认知识库2';
  newDocUrl.value = '';
  newDescription.value = '';
  isUploadModalOpen.value = true;
};

const handleUpload = () => {
  if (!newDocName.value.trim()) {
    ElMessage.warning('请输入资料名称');
    return;
  }

  const newDoc: KbDocItem = {
    id: `DOC-${Date.now().toString().slice(-4)}`,
    name: newDocName.value.trim(),
    kbName: newKbName.value.trim() || '默认知识库',
    docUrl: newDocUrl.value.trim() || `http://192.168.1.212:9000/ruoyi/admin/2222/2026/08/10/${Date.now().toString(16)}_${newDocName.value.trim()}`,
    description: newDescription.value.trim(),
    uploadTime: new Date().toLocaleString().slice(0, 16)
  };

  docs.value.unshift(newDoc);
  isUploadModalOpen.value = false;
  ElMessage.success(`资料「${newDoc.name}」已添加并同步入库`);
};

const handleDelete = (doc: KbDocItem) => {
  ElMessageBox.confirm(
    '确认删除该资料切片及其在向量数据库中的所有嵌入向量吗？删除后终端设备将无法检索该内容。',
    '确认删除资料切片',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    docs.value = docs.value.filter(d => d.id !== doc.id);
    selectedIds.value = selectedIds.value.filter(id => id !== doc.id);
    ElMessage.success('已成功删除资料切片及其嵌入向量');
  }).catch(() => {});
};

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;
  ElMessageBox.confirm(
    `确认批量删除选中的 ${selectedIds.value.length} 项资料切片？`,
    '批量删除资料',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    docs.value = docs.value.filter(d => !selectedIds.value.includes(d.id));
    selectedIds.value = [];
    ElMessage.success('已批量删除选中的资料切片');
  }).catch(() => {});
};

const handleExport = () => {
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    '资料名称,所属知识库,文档资料url,文档描述\n' +
    filteredList.value
      .map(
        doc =>
          `"${doc.name.replace(/"/g, '""')}","${doc.kbName.replace(/"/g, '""')}","${doc.docUrl.replace(/"/g, '""')}","${(doc.description || '').replace(/"/g, '""')}"`
      )
      .join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `知识库资料导出_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success('知识库资料导出成功');
};
</script>
