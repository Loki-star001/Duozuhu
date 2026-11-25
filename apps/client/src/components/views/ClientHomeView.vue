<template>
  <div class="h-full flex flex-col min-h-0 p-6 gap-4 bg-[color:var(--color-fill-neutral-1)] select-none animate-fadeIn overflow-y-auto">
    <!-- 1. TOP METRIC CARDS (4 CENTRED CARDS) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4 flex-shrink-0">
      <!-- Card 1: 设备总数 -->
      <div 
        @click="store.setClientNav('client-device-list')"
        class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] py-3.5 px-4 flex flex-col items-center justify-center cursor-pointer hover:border-[color:color-mix(in_srgb,var(--color-border-5)_40%,transparent)] transition-colors group company-card"
      >
        <div class="w-9 h-9 rounded-[8px] bg-[color:var(--color-fill-brand-5)] text-[color:var(--color-text-brand-1)] flex items-center justify-center mb-1.5">
          <Monitor class="w-4.5 h-4.5" />
        </div>
        <div class="text-2xl font-bold font-mono text-[color:var(--color-text-neutral-1)] tracking-tight group-hover:text-[color:var(--color-text-brand-1)] transition-colors leading-tight">
          {{ tenantMachines.length || 4 }}
        </div>
        <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-0.5">
          设备总数
        </div>
      </div>

      <!-- 今日对话仅展示统计，当前用户端没有对应详情页面。 -->
      <div 
        class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] py-3.5 px-4 flex flex-col items-center justify-center company-card"
      >
        <div class="w-9 h-9 rounded-[8px] bg-[color:var(--color-success-1)] text-[color:var(--color-success-6)] flex items-center justify-center mb-1.5">
          <MessageSquare class="w-4.5 h-4.5" />
        </div>
        <div class="text-2xl font-bold font-mono text-[color:var(--color-text-neutral-1)] tracking-tight leading-tight">
          {{ store.clientQaLogs.length || 0 }}
        </div>
        <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-0.5">
          今日对话
        </div>
      </div>

      <!-- Card 3: 本月消费 -->
      <div 
        @click="store.setClientNav('client-billing-bills')"
        class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] py-3.5 px-4 flex flex-col items-center justify-center cursor-pointer hover:border-[color:color-mix(in_srgb,var(--color-warning-6)_40%,transparent)] transition-colors group company-card"
      >
        <div class="w-9 h-9 rounded-[8px] bg-[color:var(--color-warning-1)] text-[color:var(--color-warning-6)] flex items-center justify-center mb-1.5">
          <Folder class="w-4.5 h-4.5" />
        </div>
        <div class="text-2xl font-bold font-mono text-[color:var(--color-text-neutral-1)] tracking-tight group-hover:text-[color:var(--color-warning-6)] transition-colors leading-tight">
          1.98
        </div>
        <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-0.5">
          本月消费
        </div>
      </div>

      <!-- Card 4: Token用量 -->
      <div 
        @click="store.setClientNav('client-billing-usage')"
        class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] py-3.5 px-4 flex flex-col items-center justify-center cursor-pointer hover:border-[color:color-mix(in_srgb,var(--color-danger-6)_40%,transparent)] transition-colors group company-card"
      >
        <div class="w-9 h-9 rounded-[8px] bg-[color:var(--color-danger-1)] text-[color:var(--color-danger-6)] flex items-center justify-center mb-1.5">
          <User class="w-4.5 h-4.5" />
        </div>
        <div class="text-2xl font-bold font-mono text-[color:var(--color-text-neutral-1)] tracking-tight group-hover:text-[color:var(--color-danger-6)] transition-colors leading-tight">
          {{ store.currentTenant?.tokenBalance || 43568 }}
        </div>
        <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-0.5">
          Token用量
        </div>
      </div>
    </div>

    <!-- 2. MIDDLE AREA: 机器使用频率 (LEFT) + 最近问题 (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 flex-1 min-h-[260px]">
      <!-- Left: 机器使用频率 -->
      <div class="lg:col-span-7 xl:col-span-8 bg-white border border-[color:var(--color-border-2)] rounded-[6px] p-4 lg:p-5 flex flex-col h-full min-h-0 company-card">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[color:var(--color-ai-6)] inline-block flex-shrink-0" />
            <span class="text-xl leading-7 font-medium text-[color:var(--color-text-neutral-1)]">机器使用频率</span>
          </div>
          <!-- Segmented Controller: 日 / 周 / 月 -->
          <div class="flex items-center rounded-[3px] bg-[color:var(--color-fill-neutral-2)] p-0.5 text-xs">
            <button
              v-for="range in (['DAY', 'WEEK', 'MONTH'] as const)"
              :key="range"
              type="button"
              @click="timeRange = range"
              class="px-3 py-1 rounded-[2px] text-xs font-medium transition-colors cursor-pointer"
              :class="timeRange === range ? 'bg-[color:var(--color-fill-brand-1)] text-white' : 'text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)]'"
            >
              {{ range === 'DAY' ? '日' : range === 'WEEK' ? '周' : '月' }}
            </button>
          </div>
        </div>

        <!-- Line Chart Body -->
        <div ref="chartContainer" class="flex-1 w-full relative min-h-0 flex items-center justify-center overflow-hidden">
          <svg 
            :viewBox="`0 0 ${svgWidth} ${svgHeight}`" 
            preserveAspectRatio="none"
            class="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-brand-6)" stop-opacity="0.1" />
                <stop offset="100%" stop-color="var(--color-brand-6)" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- Horizontal Dashed Grid Lines & Y-axis labels -->
            <g v-for="(grid, idx) in horizontalGrids" :key="`h-${idx}`">
              <line
                :x1="paddingLeft"
                :y1="grid.y"
                :x2="svgWidth - paddingRight"
                :y2="grid.y"
                stroke="var(--color-grey-8)"
                stroke-width="1"
                stroke-dasharray="4 4"
              />
              <text
                :x="paddingLeft - 8"
                :y="grid.y + 4"
                text-anchor="end"
                fill="var(--color-grey-5)"
                font-size="12"
                font-family="sans-serif"
              >
                {{ grid.val }}
              </text>
            </g>

            <!-- Vertical Dashed Grid Lines -->
            <line
              v-for="(pt, idx) in points"
              :key="`v-${idx}`"
              :x1="pt.x"
              :y1="paddingTop"
              :x2="pt.x"
              :y2="paddingTop + chartHeight"
              stroke="var(--color-grey-8)"
              stroke-width="1"
              stroke-dasharray="4 4"
            />

            <!-- Gradient Area under line -->
            <path :d="areaD" fill="url(#chartGradient)" />

            <!-- Blue Chart Line -->
            <path
              :d="pathD"
              fill="none"
              stroke="var(--color-brand-6)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Data points & Interactive hover -->
            <g v-for="(pt, idx) in points" :key="`pt-${idx}`">
              <circle
                :cx="pt.x"
                :cy="pt.y"
                :r="hoveredIdx === idx ? 5 : 3.5"
                fill="var(--color-brand-6)"
                stroke="#ffffff"
                stroke-width="2"
                class="cursor-pointer transition-all"
                @mouseenter="hoveredIdx = idx"
                @mouseleave="hoveredIdx = null"
              />
              <!-- Tooltip on hover -->
              <g v-if="hoveredIdx === idx">
                <rect
                  :x="pt.x - 30"
                  :y="pt.y - 32"
                  width="60"
                  height="22"
                  rx="3"
                  fill="var(--color-grey-1)"
                />
                <text
                  :x="pt.x"
                  :y="pt.y - 17"
                  fill="#ffffff"
                  font-size="11"
                  text-anchor="middle"
                  font-family="monospace"
                >
                  {{ pt.val }} 次
                </text>
              </g>
              <!-- X-axis Labels -->
              <text
                :x="pt.x"
                :y="svgHeight - 12"
                text-anchor="middle"
                fill="var(--color-grey-5)"
                font-size="12"
                font-family="sans-serif"
              >
                {{ pt.label }}
              </text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Right: 最近问题 (问题5修复：显示状态并支持撤销) -->
      <div class="lg:col-span-5 xl:col-span-4 bg-white border border-[color:var(--color-border-2)] rounded-[6px] p-4 lg:p-5 flex flex-col h-full min-h-0 company-card">
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[color:var(--color-danger-6)] inline-block flex-shrink-0" />
            <span class="text-xl leading-7 font-medium text-[color:var(--color-text-neutral-1)]">最近问题</span>
          </div>
          <span class="text-xs text-[color:var(--color-text-neutral-3)]">共 {{ recentQuestions.length }} 条记录</span>
        </div>

        <!-- List of Questions (可滚动适配剩余空间) -->
        <div class="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
          <div
            v-for="item in recentQuestions"
            :key="item.id"
            class="border border-[color:var(--color-grey-9)] hover:border-[color:var(--color-border-3)] rounded-[4px] p-2.5 sm:p-3 bg-white transition-colors flex items-start gap-2.5 sm:gap-3"
          >
            <!-- Left checkmark badge -->
            <div class="w-6 h-6 rounded-full bg-[color:var(--color-fill-neutral-2)] text-[color:var(--color-text-neutral-3)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check class="w-3.5 h-3.5" />
            </div>

            <!-- Right question content & actions -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] leading-snug truncate" :title="item.question">
                  {{ item.question }}
                </div>
                <!-- 状态标签 (有效/废弃) -->
                <el-tag
                  v-if="qaStatusMap[item.id] === 'VALID'"
                  type="success"
                  size="small"
                  class="flex-shrink-0"
                >
                  有效
                </el-tag>
                <el-tag
                  v-else-if="qaStatusMap[item.id] === 'DISCARDED'"
                  type="info"
                  size="small"
                  class="flex-shrink-0"
                >
                  废弃
                </el-tag>
              </div>

              <!-- 操作按钮 -->
              <div class="flex items-center gap-3 mt-1 text-[11px]">
                <template v-if="!qaStatusMap[item.id] || qaStatusMap[item.id] === 'DEFAULT'">
                  <button
                    type="button"
                    @click="handleMarkStatus(item.id, item.question, 'VALID')"
                    class="text-[color:var(--color-text-neutral-3)] hover:text-[color:var(--color-text-brand-1)] transition-colors cursor-pointer"
                  >
                    有效
                  </button>
                  <button
                    type="button"
                    @click="handleMarkStatus(item.id, item.question, 'DISCARDED')"
                    class="text-[color:var(--color-text-neutral-3)] hover:text-[color:var(--color-danger-6)] transition-colors cursor-pointer"
                  >
                    废弃
                  </button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    @click="handleResetStatus(item.id, item.question)"
                    class="text-[color:var(--color-text-brand-1)] hover:underline transition-colors cursor-pointer"
                  >
                    撤销标记
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. BOTTOM AREA: 系统更新 (LEFT) + 联系我们 (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-4 flex-shrink-0">
      <!-- Bottom Left: 系统更新 -->
      <div class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] p-3.5 lg:p-4 company-card">
        <div class="flex items-center gap-2 mb-2 flex-shrink-0">
          <FileText class="w-4 h-4 text-[color:var(--color-warning-6)]" />
          <span class="text-xl leading-7 font-medium text-[color:var(--color-text-neutral-1)]">系统更新</span>
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs py-0.5">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4 text-[color:var(--color-success-6)] flex-shrink-0" />
              <span class="text-[color:var(--color-text-neutral-1)] font-medium">新增用户自定义大模型功能</span>
            </div>
            <span class="text-[color:var(--color-text-neutral-3)] text-xs font-mono">22分钟前</span>
          </div>
          <div class="flex items-center justify-between text-xs py-0.5">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                i
              </div>
              <span class="text-[color:var(--color-text-neutral-1)] font-medium">修复token计费bug</span>
            </div>
            <span class="text-[color:var(--color-text-neutral-3)] text-xs font-mono">15分钟前</span>
          </div>
        </div>
      </div>

      <!-- Bottom Right: 联系我们 -->
      <div class="bg-white border border-[color:var(--color-border-2)] rounded-[6px] p-3.5 lg:p-4 company-card">
        <div class="flex items-center gap-2 mb-2 flex-shrink-0">
          <Pin class="w-4 h-4 text-[color:var(--color-danger-6)]" />
          <span class="text-xl leading-7 font-medium text-[color:var(--color-text-neutral-1)]">联系我们</span>
        </div>
        <div class="space-y-1.5 text-xs text-[color:var(--color-text-neutral-1)]">
          <div class="flex items-center justify-between py-0.5">
            <span>刘经理 联系方式 15601658876 微信同号</span>
            <button
              type="button"
              @click="handleCopyPhone('15601658876')"
              class="text-xs text-[color:var(--color-text-brand-1)] hover:underline cursor-pointer ml-2"
            >
              复制
            </button>
          </div>
          <div class="flex items-center justify-between py-0.5">
            <span>刘经理 联系方式 19503857555 微信同号</span>
            <button
              type="button"
              @click="handleCopyPhone('19503857555')"
              class="text-xs text-[color:var(--color-text-brand-1)] hover:underline cursor-pointer ml-2"
            >
              复制
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { 
  Monitor, 
  MessageSquare, 
  Folder, 
  User, 
  Check, 
  CheckCircle2, 
  FileText, 
  Pin 
} from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../../store/client';

const store = usePlatformStore();

const tenantMachines = computed(() => {
  return store.machines.filter(m => m.customerId === store.currentTenantId);
});

const timeRange = ref<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
const hoveredIdx = ref<number | null>(null);

const recentQuestions = [
  { id: '1', question: '存不确系统但是做出来的可以加个名片不行吗' },
  { id: '2', question: '哎呀' },
  { id: '3', question: 'wsd' },
  { id: '4', question: '海批一下就行了' },
  { id: '5', question: '儿子 pass 了儿子' }
];

// 问题5修复：有效/废弃状态持久化
const QA_STATUS_STORAGE_KEY = 'duozuhu_qa_status_map';
const getStoredQaStatusMap = (): Record<string, 'VALID' | 'DISCARDED' | 'DEFAULT'> => {
  try {
    const s = localStorage.getItem(QA_STATUS_STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

const qaStatusMap = ref<Record<string, 'VALID' | 'DISCARDED' | 'DEFAULT'>>(getStoredQaStatusMap());

const handleMarkStatus = (id: string, text: string, status: 'VALID' | 'DISCARDED') => {
  qaStatusMap.value = {
    ...qaStatusMap.value,
    [id]: status
  };
  localStorage.setItem(QA_STATUS_STORAGE_KEY, JSON.stringify(qaStatusMap.value));
  if (status === 'VALID') {
    ElMessage.success(`已标记为有效: ${text}`);
  } else {
    ElMessage.info(`已标记为废弃: ${text}`);
  }
};

const handleResetStatus = (id: string, text: string) => {
  qaStatusMap.value = {
    ...qaStatusMap.value,
    [id]: 'DEFAULT'
  };
  localStorage.setItem(QA_STATUS_STORAGE_KEY, JSON.stringify(qaStatusMap.value));
  ElMessage.info(`已撤销标记: ${text}`);
};

const handleCopyPhone = (phone: string) => {
  navigator.clipboard?.writeText(phone);
  ElMessage.success(`已复制联系方式 ${phone}`);
};

// Chart Data (展示真实生动的机器使用频率)
const chartConfigs = {
  DAY: {
    labels: ['00:00', '04:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '21:00', '23:59'],
    values: [2, 0, 18, 56, 42, 68, 61, 35, 14, 3]
  },
  WEEK: {
    labels: ['10/08', '10/09', '10/10', '10/11', '10/12', '10/13', '10/14'],
    values: [132, 148, 175, 226, 298, 316, 210]
  },
  MONTH: {
    labels: ['第1周', '第2周', '第3周', '第4周', '第5周'],
    values: [890, 1120, 1450, 1820, 1360]
  }
};

const currentChart = computed(() => chartConfigs[timeRange.value]);

const svgWidth = ref(650);
const svgHeight = ref(260);
const chartContainer = ref<HTMLDivElement | null>(null);
let chartObserver: ResizeObserver | undefined;

onMounted(() => {
  if (chartContainer.value && typeof ResizeObserver !== 'undefined') {
    const updateSize = () => {
      if (chartContainer.value) {
        const rect = chartContainer.value.getBoundingClientRect();
        if (rect.width > 0) svgWidth.value = Math.round(rect.width);
        if (rect.height > 0) svgHeight.value = Math.round(rect.height);
      }
    };
    updateSize();
    chartObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) svgWidth.value = Math.round(entry.contentRect.width);
        if (entry.contentRect.height > 0) svgHeight.value = Math.round(entry.contentRect.height);
      }
    });
    chartObserver.observe(chartContainer.value);
  }
});
onBeforeUnmount(() => chartObserver?.disconnect());

const paddingLeft = 45;
const paddingRight = 35;
const paddingTop = 25;
const paddingBottom = 40;
const chartWidth = computed(() => Math.max(100, svgWidth.value - paddingLeft - paddingRight));
const chartHeight = computed(() => Math.max(100, svgHeight.value - paddingTop - paddingBottom));

const maxVal = computed(() => {
  const max = Math.max(...currentChart.value.values, 10);
  return Math.ceil(max * 1.15);
});

const horizontalGridCount = 5;
const horizontalGrids = computed(() => {
  return Array.from({ length: horizontalGridCount }, (_, i) => {
    const y = paddingTop + (chartHeight.value / (horizontalGridCount - 1)) * i;
    const val = Math.round(maxVal.value * (1 - i / (horizontalGridCount - 1)));
    return { y, val };
  });
});

const points = computed(() => {
  const chart = currentChart.value;
  const pointCount = chart.labels.length;
  return chart.labels.map((label, idx) => {
    const x = paddingLeft + (chartWidth.value / (pointCount - 1)) * idx;
    const val = chart.values[idx] || 0;
    const y = paddingTop + chartHeight.value - (val / maxVal.value) * chartHeight.value;
    return { x, y, label, val };
  });
});

const pathD = computed(() => {
  return points.value.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');
});

const areaD = computed(() => {
  const pts = points.value;
  if (pts.length === 0) return '';
  return `${pathD.value} L ${pts[pts.length - 1].x},${paddingTop + chartHeight.value} L ${pts[0].x},${paddingTop + chartHeight.value} Z`;
});
</script>
