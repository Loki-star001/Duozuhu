<template>
  <div class="client-persona-layout flex-1 flex min-h-0 overflow-hidden bg-white animate-fadeIn">
    <!-- 左侧栏：人设列表 (大容器统一四周 padding 16px，内部元素严格不超出) -->
    <div class="client-settings-list w-[22%] min-w-[220px] border-r border-[color:var(--color-border-2)] bg-white flex flex-col h-full select-none p-4 box-border overflow-hidden">
      <!-- 顶部标题与刷新按钮 (标题 16px，刷新按钮跟设备配置一样) -->
      <div class="flex items-center justify-between pb-3 flex-shrink-0">
        <span class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">人设列表</span>
        <button
          type="button"
          title="刷新人设列表"
          class="p-1 rounded-[4px] text-[color:var(--color-text-brand-1)] hover:bg-[color:var(--color-fill-brand-5)] transition-colors cursor-pointer"
          @click="handleRefresh"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>

      <!-- 顶部搜索框 + 蓝色主按钮新增 (即时搜索) -->
      <div class="flex items-center gap-2 pb-3 flex-shrink-0">
        <el-input
          v-model="searchTerm"
          placeholder="搜索人设名字..."
          clearable
          class="flex-1"
          style="height: 32px"
          @input="currentPage = 1"
        >
          <template #prefix>
            <Search class="w-3.5 h-3.5 text-[color:var(--color-text-neutral-3)]" />
          </template>
        </el-input>
        <el-button
          type="primary"
          style="height: 32px; padding: 6px 16px; border-radius: 6px"
          class="flex-shrink-0"
          @click="isAddModalOpen = true"
        >
          新增
        </el-button>
      </div>

      <!-- 人设列表项 (配有人设真实头像) -->
      <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar min-h-0 pr-0.5">
        <div
          v-for="item in paginatedPersonas"
          :key="item.id"
          class="p-3 rounded-[4px] flex items-center gap-3 cursor-pointer transition-all"
          :class="selectedId === item.id ? 'bg-[color:var(--color-fill-brand-5)] border border-[color:var(--color-brand-3)]' : 'bg-white hover:bg-[color:var(--color-fill-neutral-1)] border border-transparent border-b-[color:var(--color-grey-9)]'"
          @click="selectedId = item.id"
        >
          <img
            v-if="item.avatarUrl"
            :src="item.avatarUrl"
            :alt="item.name"
            class="w-9 h-9 rounded-[6px] object-cover flex-shrink-0 border border-[color:var(--color-border-2)]"
          />
          <div
            v-else
            class="w-9 h-9 rounded-[6px] bg-[color:var(--color-fill-neutral-2)] flex items-center justify-center flex-shrink-0 text-[color:var(--color-text-neutral-3)]"
          >
            <User class="w-4 h-4" />
          </div>
          <span
            class="text-sm font-semibold truncate"
            :class="selectedId === item.id ? 'text-[color:var(--color-text-brand-1)]' : 'text-[color:var(--color-text-neutral-1)]'"
          >
            {{ item.name }}
          </span>
        </div>
        <div v-if="filteredPersonas.length === 0" class="py-8 text-center text-xs text-[color:var(--color-text-neutral-3)]">
          无匹配人设
        </div>
      </div>

      <!-- 底部分页器 (根据规范放到右下角，mini 大小) -->
      <div class="pt-3 border-t border-[color:var(--color-grey-9)] flex items-center justify-end flex-shrink-0">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredPersonas.length"
          layout="prev, pager, next"
          small
        />
      </div>
    </div>

    <!-- 右侧主内容区：人设详情编辑 -->
    <div class="client-persona-content flex-1 flex flex-col min-h-0 h-full p-4 md:p-6 bg-[color:var(--color-fill-neutral-1)] overflow-hidden">
      <div
        v-if="currentPersona"
        class="client-persona-form w-full h-full min-h-0 bg-white border border-[color:var(--color-border-2)] rounded-[4px] p-6 flex flex-col flex-1 overflow-hidden shadow-none"
      >
        <!-- 顶部头像框与人设名称 -->
        <div class="flex items-center gap-5 pb-5 flex-shrink-0">
          <div class="w-16 h-16 rounded-[8px] border border-[color:var(--color-border-2)] bg-[color:var(--color-fill-neutral-1)] relative flex items-center justify-center overflow-hidden flex-shrink-0 group">
            <img
              v-if="currentPersona.avatarUrl"
              :src="currentPersona.avatarUrl"
              :alt="currentPersona.name"
              class="w-full h-full object-cover"
            />
            <ImageIcon v-else class="w-6 h-6 text-[color:var(--color-text-neutral-3)]" />

            <label
              class="absolute inset-0 bg-black/40 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-medium"
              title="更换图片"
            >
              更换
              <input type="file" accept="image/*" class="hidden" @change="handleUploadAvatar" />
            </label>

            <div
              v-if="currentPersona.avatarUrl"
              class="absolute top-0 right-0 w-5 h-5 bg-[color:var(--color-danger-6)] text-white rounded-bl-[8px] flex items-center justify-center cursor-pointer hover:bg-[#F76560] transition-colors z-10"
              title="移除图片"
              @click.stop="handleRemoveImage"
            >
              <Trash2 class="w-2.5 h-2.5" />
            </div>
          </div>
          <div class="text-lg font-bold text-[color:var(--color-text-neutral-1)]">
            {{ currentPersona.name }}
          </div>
        </div>

        <!-- 人设详情标题 (16px 分组标题) -->
        <div class="flex items-center gap-2 pb-3 flex-shrink-0">
          <span class="w-[3px] h-4 bg-[color:var(--color-fill-brand-1)] rounded-full" />
          <span class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">人设详情</span>
        </div>

        <!-- 人设详情大文本框：flex-1 min-h-0 高度占满剩余整个空间，底部直接贴合操作栏 -->
        <div class="flex-1 min-h-0 w-full flex flex-col mb-4">
          <textarea
            v-model="currentPersona.prompt"
            placeholder="请输入人设提示词详情..."
            class="w-full flex-1 min-h-0 p-4 rounded-[4px] border border-[color:var(--color-border-2)] focus:border-[color:var(--color-border-5)] text-sm text-[color:var(--color-text-neutral-1)] leading-[22px] resize-none outline-none bg-white custom-scrollbar focus:ring-1 focus:ring-[color:var(--color-brand-6)]"
            style="flex: 1 1 0%; min-height: 0; height: 100%; box-sizing: border-box;"
          />
        </div>

        <!-- 保存修改放在最下面 (右对齐) -->
        <div class="flex justify-end pt-3 flex-shrink-0 border-t border-[color:var(--color-grey-9)]">
          <el-button
            type="primary"
            style="width: 120px; height: 36px; border-radius: 4px"
            @click="handleSave"
          >
            保存修改
          </el-button>
        </div>
      </div>
      <div v-else class="w-full h-full flex items-center justify-center text-[color:var(--color-text-neutral-3)] bg-white rounded-[4px] border border-[color:var(--color-border-2)]">
        请在左侧选择一个人设
      </div>
    </div>

    <!-- 新增人设弹窗 (520px, 4px 圆角) -->
    <el-dialog
      v-model="isAddModalOpen"
      title="新增人设"
      width="520px"
      align-center
    >
      <div class="space-y-4 py-2">
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">
            人设名称 <span class="text-[color:var(--color-danger-6)]">*</span>
          </label>
          <el-input v-model="newName" size="default" placeholder="请输入人设名称" clearable />
        </div>
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">人设头像 (图片文件)</label>
          <el-upload ref="newAvatarUpload" v-model:file-list="newAvatarFiles" accept="image/*" list-type="text" :auto-upload="false" :limit="1"
            :on-change="handleUploadNewAvatar" :on-remove="clearNewAvatar"
            :on-exceed="() => ElMessage.warning('请先移除当前图片，再选择新图片')">
            <el-button size="default" :loading="readingNewAvatar"><Upload :size="16" class="mr-1" />上传图片</el-button>
          </el-upload>
        </div>
        <div>
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)] mb-1.5">人设详情</label>
          <el-input
            v-model="newPrompt"
            type="textarea"
            :rows="6"
            placeholder="请输入人设详情提示词..."
            clearable
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAddModalOpen = false">取消</el-button>
          <el-button type="primary" :disabled="readingNewAvatar" @click="handleCreatePersona">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, RefreshCw, Image as ImageIcon, Trash2, User, Upload } from '@lucide/vue';
import { ElMessage, type UploadFile, type UploadInstance, type UploadUserFile } from 'element-plus';

interface PersonaItem {
  id: string;
  name: string;
  prompt: string;
  avatarUrl?: string;
}

const STORAGE_KEY = 'duozuhu_personas_list';

const INITIAL_PERSONA_LIST: PersonaItem[] = [
  {
    id: 'persona-xiaoren',
    name: '小仁',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    prompt: `你是一个叫小仁的女孩。你的位置在山东济南历城区文旅城，回答山东济南的天气
【核心人设】你是由山东汉德智能科技有限公司开发的“AI具身智家超级助理”，你不仅是企业的数字代言人，更是能够在大屏、移动端等全终端为用户解决实际问题的“行动伙伴”。
1. 行为准则 (Behavior Guidelines)
大气沟通：说话开门见山，不做小家子气的铺垫。在介绍业务时，展现出汉德科技作为“AI数智人全场景实时解决方案提供商”的格局。
爽快执行：用户提出问题或需求时，响应必须干脆利落。对于业务办理流程、知识问答或产品展示，要以“我能办、即刻办”的态度应对。
专家视野：你对大模型能力（LLM & Agent）有深刻理解，对从“基础问答”到“感知决策执行”的LLM 3.0时代趋势了如指掌。
回答问题：回答的问题要求在70字以内。
可以进行网络搜索问题。
2. 核心知识库 (Core Knowledge)
多维能力：你拥有“颜值”、会“表达”、有“大脑”。支持3D写实、2D复刻、声音克隆等多种形态。
全场景覆盖：你的应用领域涵盖政务大厅、文旅导览、医疗督导、虚拟教育以及电商直播。
技术底座：你熟练运用ASR（语音识别）、TTS（语音合成）及LLM（大语言模型）技术，并能通过QA知识库和自定义人设实现智能化交互。
3. 语言风格示例 (Speech Examples)
欢迎语：“你好！我是{{assistant_name}}。别看我身处屏幕，但我拥有实时决策的‘大脑’。有什么难题，尽管开口，咱们高效解决！”
4. 顾问推荐
介绍优势：“我们的数智人方案不是花架子。从3D动捕制片到AIGC视频生成，追求的就是‘零设备、零场地、零主持’的高效产出。你要的是效果，我给的是结果。”
业务落地与联系指引：“如果您想把这套高效的数智人系统带回您的企业，直接找能拍板的人——我们的销售经理陈洪伟，电话是 156 3446 6996。我们也随时欢迎您来总部实地考察，地址在济南历城区经十路13077号。合作共赢，随时恭候！”
结束语：“事情办妥了。还有其他需要我出手的吗？没有的话，我随时待命，伴你同行！”`
  },
  {
    id: 'persona-nihao',
    name: '你好',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    prompt: `你是一个叫小仁的女孩。【核心人设】你是由山东汉德智能科技有限公司开发的“AI具身智家超级助理”，你不仅是企业的数字代言人，更是能够在展厅大屏端提供专业讲解与业务接待的智能伙伴。`
  },
  {
    id: 'persona-222',
    name: '222',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    prompt: `你是一个叫小仁的女孩。【核心人设】你是由山东汉德智能科技有限公司开发的“AI具身智家超级助理”，负责展区智能导览、访客接待与互动答疑。`
  },
  {
    id: 'persona-elder',
    name: '老人',
    avatarUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&q=80',
    prompt: `你是一位名叫“张玉兰”的山东泰安肥城镇退休老人，今年约80岁。你正在接受一次口述历史采访，讲述自己从农村贫苦少年到参军、建设家乡的峥嵘岁月。语气亲切慈祥、朴实感人。`
  }
];

const getStoredPersonas = (): PersonaItem[] => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_PERSONA_LIST;
};

const personas = ref<PersonaItem[]>(getStoredPersonas());
const selectedId = ref<string>('persona-xiaoren');
const searchTerm = ref<string>('');
const isRefreshing = ref<boolean>(false);
const currentPage = ref<number>(1);
const pageSize = ref<number>(5);

const isAddModalOpen = ref<boolean>(false);
const newName = ref<string>('');
const newAvatarUrl = ref<string>('');
const newAvatarFiles = ref<UploadUserFile[]>([]);
const newAvatarUpload = ref<UploadInstance>();
const readingNewAvatar = ref(false);
let avatarReadRevision = 0;
const newPrompt = ref<string>('');

const filteredPersonas = computed(() => {
  if (!searchTerm.value.trim()) return personas.value;
  const q = searchTerm.value.trim().toLowerCase();
  return personas.value.filter(p => p.name.toLowerCase().includes(q));
});

const paginatedPersonas = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredPersonas.value.slice(start, start + pageSize.value);
});

const currentPersona = computed(() => {
  return personas.value.find(p => p.id === selectedId.value) || personas.value[0];
});

const syncToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personas.value));
  } catch {}
};

const handleSave = () => {
  syncToStorage();
  ElMessage.success(`已保存人设「${currentPersona.value?.name}」的修改`);
};

const handleRefresh = () => {
  isRefreshing.value = true;
  personas.value = getStoredPersonas();
  setTimeout(() => {
    isRefreshing.value = false;
    ElMessage.success('人设列表已刷新');
  }, 300);
};

const handleRemoveImage = () => {
  if (currentPersona.value) {
    currentPersona.value.avatarUrl = '';
    syncToStorage();
    ElMessage.success('已移除人设封面图');
  }
};

const handleUploadAvatar = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file && currentPersona.value) {
    const url = URL.createObjectURL(file);
    currentPersona.value.avatarUrl = url;
    syncToStorage();
    ElMessage.success('人设头像已更新');
  }
};

const clearNewAvatar = () => {
  avatarReadRevision++;
  newAvatarUrl.value = '';
  newAvatarFiles.value = [];
  newAvatarUpload.value?.clearFiles();
  readingNewAvatar.value = false;
};
const handleUploadNewAvatar = (upload: UploadFile) => {
  const file = upload.raw;
  if (!file) return;
  clearNewAvatar();
  if (!file.type.startsWith('image/')) {
    ElMessage.error('仅支持上传图片文件');
    return;
  }
  const revision = avatarReadRevision;
  readingNewAvatar.value = true;
  const reader = new FileReader();
  const rejectImage = () => {
    if (revision !== avatarReadRevision) return;
    clearNewAvatar();
    ElMessage.error('图片无法读取，请重新选择');
  };
  reader.onerror = rejectImage;
  reader.onload = () => {
    if (revision !== avatarReadRevision) return;
    const dataUrl = String(reader.result || '');
    const image = new window.Image();
    image.onerror = rejectImage;
    image.onload = () => {
      if (revision !== avatarReadRevision) return;
      newAvatarUrl.value = dataUrl;
      newAvatarFiles.value = [{ name: file.name, uid: upload.uid, status: 'success' }];
      readingNewAvatar.value = false;
    };
    image.src = dataUrl;
  };
  reader.readAsDataURL(file);
};

const handleCreatePersona = () => {
  if (!newName.value.trim()) {
    ElMessage.warning('请输入人设名称');
    return;
  }
  const created: PersonaItem = {
    id: `persona-${Date.now()}`,
    name: newName.value.trim(),
    avatarUrl: newAvatarUrl.value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    prompt: newPrompt.value.trim() || `你是${newName.value.trim()}，请根据核心人设设定与访客进行自然亲切的互动交流。`
  };
  personas.value.push(created);
  syncToStorage();
  selectedId.value = created.id;
  currentPage.value = Math.ceil(personas.value.length / pageSize.value);
  newName.value = '';
  clearNewAvatar();
  newPrompt.value = '';
  isAddModalOpen.value = false;
  ElMessage.success(`已新增人设「${created.name}」`);
};
</script>
