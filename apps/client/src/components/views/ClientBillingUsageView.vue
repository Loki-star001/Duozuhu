<template>
  <div class="client-billing-usage flex-1 min-w-0 overflow-y-auto bg-white p-6 animate-fadeIn">
    <div class="w-full min-w-0 min-h-full flex flex-col">
      <!-- 1. 顶部：用量信息 -->
      <div class="flex items-start justify-between gap-4">
        <div>
        <h2 class="text-lg font-semibold text-[color:var(--color-text-neutral-1)] leading-snug">
          用量信息
        </h2>
        <p class="text-xs text-[color:var(--color-text-neutral-3)] mt-1.5">
          所有日期均按 UTC 时间显示，数据可能有 5 分钟延迟。
        </p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <el-button @click="handleExport">导出</el-button>
          <el-button type="primary" @click="store.setIsRechargeModalOpen(true)">去充值</el-button>
        </div>
      </div>

        <!-- 充值余额 & 本月消费 -->
        <div class="client-usage-summary mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-white border border-[color:var(--color-border-2)] rounded-[8px] p-6 min-w-0">
            <div class="flex items-center gap-1.5 text-sm text-[color:var(--color-text-neutral-2)]">
              <span>充值余额</span>
              <el-tooltip content="当前账户可用于抵扣推理与渲染费用的可用充值余额" placement="top">
                <span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[color:var(--color-grey-7)] text-white text-[10px] font-bold cursor-pointer select-none">
                  ?
                </span>
              </el-tooltip>
            </div>
            <div class="mt-2 flex items-baseline gap-1.5">
              <span class="text-2xl font-bold text-[color:var(--color-text-neutral-1)] tracking-tight">
                ¥{{ balanceAmount.toFixed(2) }}
              </span>
              <span class="text-xs text-[color:var(--color-text-neutral-3)] font-normal">CNY</span>
            </div>
          </div>

          <div class="bg-white border border-[color:var(--color-border-2)] rounded-[8px] p-6 min-w-0">
            <div class="text-sm text-[color:var(--color-text-neutral-2)]">本月消费</div>
            <div class="mt-2 flex items-baseline gap-1.5">
              <span class="text-2xl font-bold text-[color:var(--color-text-neutral-1)] tracking-tight">
                ¥{{ currentMonthExpense.toFixed(2) }}
              </span>
              <span class="text-xs text-[color:var(--color-text-neutral-3)] font-normal">CNY</span>
            </div>
          </div>
        </div>

      <!-- 2. 下半部分：每月用量 + 折线图 -->
      <div class="mt-5 min-w-0 flex-1 flex flex-col">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex flex-wrap items-center gap-4">
              <h3 class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">每月用量</h3>
            <el-select
              v-model="selectedMonth"
              style="width: 140px;"
            >
              <el-option
                v-for="opt in monthOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            </div>
          </div>

        <div class="bg-white border border-[color:var(--color-border-2)] rounded-[8px] p-6 min-w-0 flex-1 flex flex-col">
        <!-- 消费金额小计 -->
        <div class="mb-4 flex items-center gap-1.5 text-sm">
          <span class="text-[color:var(--color-text-neutral-2)]">消费金额</span>
          <span class="text-[color:var(--color-text-neutral-3)]">¥{{ monthlyExpense.toFixed(2) }}</span>
        </div>

        <!-- 折线图容器 -->
        <div class="w-full pt-2 select-none flex-1 flex flex-col">
          <div ref="chartArea" class="relative w-full flex-1 min-h-[240px]">
            <svg
              :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
              class="absolute inset-0 w-full h-full overflow-visible"
              @mouseleave="hoverIndex = null"
            >
              <defs>
                <linearGradient id="usageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="var(--color-brand-6)" stop-opacity="0.25" />
                  <stop offset="50%" stop-color="var(--color-brand-6)" stop-opacity="0.08" />
                  <stop offset="100%" stop-color="var(--color-brand-6)" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- 4条水平虚线网格 + 底部基线虚线 + Y轴刻度标签 -->
              <g v-for="(ratio, idx) in [0, 0.25, 0.5, 0.75, 1]" :key="idx">
                <line
                  :x1="padLeft"
                  :y1="padTop + ratio * plotHeight"
                  :x2="svgWidth - padRight"
                  :y2="padTop + ratio * plotHeight"
                  stroke="var(--color-grey-8)"
                  stroke-opacity="0.8"
                  stroke-width="1"
                  stroke-dasharray="4 4"
                />
                <text
                  :x="padLeft - 10"
                  :y="padTop + ratio * plotHeight + 4"
                  text-anchor="end"
                  fill="var(--color-grey-5)"
                  font-size="11"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                >
                  ¥{{ (chartMaxVal * (1 - ratio)).toFixed(0) }}
                </text>
              </g>

              <!-- 渐变阴影区域 -->
              <path
                :d="areaD"
                fill="url(#usageGradient)"
              />

              <!-- 折线 -->
              <polyline
                fill="none"
                stroke="var(--color-brand-6)"
                stroke-width="2"
                :points="polylinePoints"
              />

              <!-- 悬浮指示线与圆点 (保证完美正圆) -->
              <g v-if="hoverIndex !== null && dailyPoints[hoverIndex]">
                <line
                  :x1="getPointX(hoverIndex)"
                  :y1="padTop"
                  :x2="getPointX(hoverIndex)"
                  :y2="padTop + plotHeight"
                  stroke="var(--color-grey-5)"
                  stroke-width="1"
                  stroke-dasharray="3 3"
                />
                <!-- 外层微光圆环 -->
                <circle
                  :cx="getPointX(hoverIndex)"
                  :cy="getPointY(dailyPoints[hoverIndex].amount)"
                  r="8"
                  fill="var(--color-brand-6)"
                  fill-opacity="0.15"
                />
                <!-- 核心正圆点 -->
                <circle
                  :cx="getPointX(hoverIndex)"
                  :cy="getPointY(dailyPoints[hoverIndex].amount)"
                  r="4.5"
                  fill="#FFFFFF"
                  stroke="var(--color-brand-6)"
                  stroke-width="2.5"
                />
              </g>

              <!-- 透明交互热区 -->
              <rect
                v-for="(_, idx) in dailyPoints"
                :key="idx"
                :x="Math.max(0, getPointX(idx) - (plotWidth / dailyPoints.length) / 2)"
                :y="padTop"
                :width="plotWidth / dailyPoints.length"
                :height="plotHeight"
                fill="transparent"
                class="cursor-pointer"
                @mouseenter="hoverIndex = idx"
              />
            </svg>

            <!-- 悬浮气泡提示 -->
            <div
              v-if="hoverIndex !== null && dailyPoints[hoverIndex]"
              class="pointer-events-none absolute -top-2 bg-white border border-[color:var(--color-border-2)] rounded-[4px] px-2.5 py-1.5 text-xs text-[color:var(--color-text-neutral-1)] shadow-md whitespace-nowrap z-10"
              :style="{
                left: `clamp(60px, ${(getPointX(hoverIndex) / svgWidth) * 100}%, calc(100% - 60px))`,
                transform: 'translateX(-50%)'
              }"
            >
              <div class="text-[color:var(--color-text-neutral-3)]">{{ dailyPoints[hoverIndex].label }}</div>
              <div class="font-semibold text-[color:var(--color-text-neutral-1)] mt-0.5">
                消费金额: ¥{{ dailyPoints[hoverIndex].amount.toFixed(2) }}
              </div>
            </div>
          </div>

          <!-- X轴日期刻度 -->
          <div
            class="flex items-center justify-between mt-2 text-xs text-[color:var(--color-text-neutral-3)]"
            :style="{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }"
          >
            <span v-for="dayNum in xTickDays" :key="dayNum">
              {{ currentMonthMeta.monthNum }}/{{ dayNum }}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../../store/client';

interface DailyCostPoint {
  day: number;
  label: string;
  amount: number;
}

const store = usePlatformStore();
const selectedMonth = ref('2026-10');
const hoverIndex = ref<number | null>(null);

const monthOptions = [
  { value: '2026-10', label: '2026年10月', monthNum: 10, days: 31 },
  { value: '2026-09', label: '2026年09月', monthNum: 9, days: 30 },
  { value: '2026-08', label: '2026年08月', monthNum: 8, days: 31 },
  { value: '2026-07', label: '2026年07月', monthNum: 7, days: 31 }
];

const currentMonthMeta = computed(() => {
  return monthOptions.find(m => m.value === selectedMonth.value) || monthOptions[0];
});

// 每月用量每日消费预设数据 (真实反映景区展厅多端数字人算力与渲染消耗)
const MONTHLY_DATA_PRESETS: Record<string, number[]> = {
  '2026-10': [
    18.20, 24.50, 22.80, 19.60, 17.40, 15.30, 12.80,
    6.50, 7.20, 8.60, 9.40, 11.50, 13.20, 8.80,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ],
  '2026-09': [
    7.50, 8.20, 9.10, 6.80, 10.40, 12.50, 11.80,
    8.60, 7.90, 8.40, 9.80, 11.20, 13.50, 12.10,
    8.00, 7.60, 8.90, 9.30, 10.80, 12.40, 11.60,
    7.80, 8.10, 8.70, 9.50, 11.00, 12.80, 11.20,
    8.50, 9.20
  ],
  '2026-08': [
    12.40, 14.80, 16.50, 15.20, 18.60, 21.40, 20.80,
    13.60, 14.20, 15.80, 16.90, 19.50, 22.40, 21.60,
    14.10, 13.80, 15.20, 16.40, 18.90, 21.00, 20.50,
    13.20, 14.00, 14.80, 16.20, 18.50, 20.60, 19.80,
    13.50, 14.60, 16.00
  ],
  '2026-07': [
    9.20, 10.50, 11.80, 10.20, 12.60, 15.40, 14.80,
    10.60, 11.20, 12.40, 13.80, 16.20, 18.60, 17.50,
    11.00, 10.80, 12.10, 13.40, 15.80, 17.20, 16.90,
    10.50, 11.00, 11.80, 13.20, 15.50, 17.00, 16.20,
    11.40, 12.20, 13.50
  ]
};

const dailyPoints = computed<DailyCostPoint[]>(() => {
  const preset = MONTHLY_DATA_PRESETS[selectedMonth.value] || [];
  return Array.from({ length: currentMonthMeta.value.days }, (_, idx) => {
    const day = idx + 1;
    const amount = preset[idx] !== undefined ? preset[idx] : 0.0;
    return {
      day,
      label: `${currentMonthMeta.value.monthNum}/${day}`,
      amount
    };
  });
});

const xTickDays = computed(() => [
  1, 6, 11, 16, 21, 26, currentMonthMeta.value.days
]);

const balanceAmount = ref(4999998.91);

// 当月消费固定展示本月 (10月) 的实际总计
const currentMonthExpense = computed(() => {
  const octPreset = MONTHLY_DATA_PRESETS['2026-10'] || [];
  return octPreset.reduce((sum, v) => sum + v, 0);
});

// 随下拉选择切换的月份消费小计
const monthlyExpense = computed(() => {
  return dailyPoints.value.reduce((sum, p) => sum + p.amount, 0);
});

const chartMaxVal = computed(() => {
  const max = Math.max(...dailyPoints.value.map(p => p.amount), 10);
  return Math.ceil(max * 1.25);
});

const svgWidth = ref(1000);
const svgHeight = ref(240);
const chartArea = ref<HTMLDivElement | null>(null);
let chartObserver: ResizeObserver | undefined;

const updateDimensions = () => {
  if (chartArea.value) {
    const rect = chartArea.value.getBoundingClientRect();
    if (rect.width > 0) svgWidth.value = Math.round(rect.width);
    if (rect.height > 0) svgHeight.value = Math.max(220, Math.round(rect.height));
  }
};

onMounted(() => {
  updateDimensions();
  if (chartArea.value && typeof ResizeObserver !== 'undefined') {
    chartObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          svgWidth.value = Math.round(entry.contentRect.width);
        }
        if (entry.contentRect.height > 0) {
          svgHeight.value = Math.max(220, Math.round(entry.contentRect.height));
        }
      }
    });
    chartObserver.observe(chartArea.value);
  }
});
onBeforeUnmount(() => chartObserver?.disconnect());

const padLeft = 56;
const padRight = 24;
const padTop = 20;
const padBottom = 20;
const plotWidth = computed(() => Math.max(100, svgWidth.value - padLeft - padRight));
const plotHeight = computed(() => Math.max(100, svgHeight.value - padTop - padBottom));

const getPointX = (index: number) => {
  if (dailyPoints.value.length <= 1) return padLeft;
  return padLeft + (index / (dailyPoints.value.length - 1)) * plotWidth.value;
};

const getPointY = (amount: number) => {
  const clamped = Math.min(Math.max(amount, 0), chartMaxVal.value);
  return padTop + plotHeight.value - (clamped / chartMaxVal.value) * plotHeight.value;
};

const polylinePoints = computed(() => {
  return dailyPoints.value
    .map((pt, idx) => `${getPointX(idx)},${getPointY(pt.amount)}`)
    .join(' ');
});

const areaD = computed(() => {
  if (dailyPoints.value.length === 0) return '';
  const firstX = getPointX(0);
  const lastX = getPointX(dailyPoints.value.length - 1);
  const bottomY = padTop + plotHeight.value;
  const linePoints = dailyPoints.value
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getPointX(idx)} ${getPointY(pt.amount)}`)
    .join(' ');
  return `${linePoints} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
});

const handleExport = () => {
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    '日期,消费金额(CNY)\n' +
    dailyPoints.value.map(e => `${selectedMonth.value}-${String(e.day).padStart(2, '0')},${e.amount.toFixed(2)}`).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `每月用量_${currentMonthMeta.value.label}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success(`已导出 ${currentMonthMeta.value.label} 用量数据`);
};
</script>
