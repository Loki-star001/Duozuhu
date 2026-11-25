<template>
  <section class="scene-settings-card scene-extra-settings">
    <div v-if="showVisibility" class="extra-settings-heading">
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-3.5 bg-[color:var(--color-fill-brand-1)] rounded-full inline-block"></span>
        <strong class="text-sm text-[color:var(--color-text-neutral-1)]">{{ label }}</strong>
      </div>
      <el-switch v-model="element.enabled" :aria-label="`显示${label}`" />
    </div>

    <el-form label-position="top">
      <el-form-item v-if="!['shape','texture','icon','divider','effects','text','volume'].includes(element.kind)" label="标题">
        <el-input v-model="element.title" aria-label="元素标题" />
      </el-form-item>

      <el-form-item v-if="hasContent && element.kind !== 'effects'" :label="contentLabel">
        <el-input
          v-model="element.content"
          aria-label="元素内容"
          :type="element.kind === 'qrcode' ? 'text' : 'textarea'"
          :rows="3"
          :placeholder="contentPlaceholder"
        />
        <div v-if="helperText" class="mt-1.5 flex items-center justify-between text-[11px] text-[color:var(--color-text-neutral-3)]">
          <span>{{ helperText }}</span>
          <button
            v-if="!element.content.trim() && sampleContent"
            type="button"
            class="text-[color:var(--color-text-brand-1)] hover:underline cursor-pointer"
            @click="element.content = sampleContent"
          >
            + 填入范例
          </button>
        </div>
      </el-form-item>

      <!-- 动态特效类型选择器 -->
      <el-form-item v-if="element.kind === 'effects'" label="动态特效类型">
        <el-select v-model="element.content" aria-label="动态特效类型" class="w-full">
          <el-option label="科技微粒连线 (Particles Network)" value="particles" />
          <el-option label="流光氛围光斑 (Ambient Orbs)" value="ambient" />
          <el-option label="璀璨星芒微粒 (Sparkling Stars)" value="sparkles" />
          <el-option label="浮游活力气泡 (Rising Bubbles)" value="bubbles" />
          <el-option label="极光呼吸光环 (Aurora Pulse)" value="glow-pulse" />
          <el-option label="全息雷达波纹 (Radar Ripple)" value="radar" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="element.kind === 'effects'" label="动效粒子数量 / 密度">
        <div class="flex items-center gap-3">
          <el-slider v-model="element.value" :min="10" :max="80" aria-label="动效密度" class="flex-1" />
          <span class="font-mono text-xs text-[color:var(--color-text-neutral-1)] w-8 text-right">{{ element.value || 35 }}</span>
        </div>
      </el-form-item>

      <el-form-item v-if="element.kind === 'metric'" label="数值">
        <el-input-number v-model="element.value" aria-label="指标数值" controls-position="right" />
      </el-form-item>

      <el-form-item v-if="element.kind === 'metric'" label="单位">
        <el-input v-model="element.unit" aria-label="指标单位" />
      </el-form-item>

      <el-form-item v-if="element.kind === 'volume'" label="音量">
        <el-slider v-model="element.value" :min="0" :max="100" aria-label="元素音量" />
      </el-form-item>

      <el-form-item v-if="element.kind === 'countdown'" label="截止时间">
        <el-date-picker v-model="element.deadline" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" aria-label="倒计时截止时间" style="width:100%" />
      </el-form-item>

      <!-- 形状类型扩展：8 种经典形状 -->
      <el-form-item v-if="element.kind === 'shape'" label="形状类型">
        <el-select v-model="element.shape" aria-label="形状类型" class="w-full">
          <el-option label="矩形 (直角)" value="rectangle" />
          <el-option label="圆角卡片 (24px)" value="rounded" />
          <el-option label="胶囊形 (Pill)" value="pill" />
          <el-option label="正圆形 (Circle)" value="circle" />
          <el-option label="菱形 (Diamond)" value="diamond" />
          <el-option label="三角形 (Triangle)" value="triangle" />
          <el-option label="六边形 (Hexagon)" value="hexagon" />
          <el-option label="五角星 (Star)" value="star" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="element.kind === 'icon'" label="图标">
        <el-select v-model="element.icon" aria-label="元素图标">
          <el-option v-for="item in iconOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <!-- 文字/主色调色板 -->
      <el-form-item v-if="element.kind !== 'qrcode'" :label="element.kind === 'effects' ? '特效光色' : '文字与主题色'">
        <div class="space-y-2 w-full">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="preset in colorPresets"
              :key="preset.value"
              type="button"
              class="w-6 h-6 rounded-full border transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
              :class="element.color === preset.value ? 'ring-2 ring-[color:var(--color-brand-6)] border-white' : 'border-[color:var(--color-border-2)]'"
              :style="{ background: preset.value }"
              :title="preset.label"
              @click="element.color = preset.value"
            />
            <el-color-picker v-model="element.color" aria-label="自定义主题色" size="small" />
          </div>
        </div>
      </el-form-item>

      <!-- 背景调色板 -->
      <el-form-item v-if="!['text','icon','divider','effects','qrcode','countdown','metric'].includes(element.kind)" label="背景材质与颜色">
        <div class="space-y-2 w-full">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="bg in bgPresets"
              :key="bg.value"
              type="button"
              class="h-6 px-2 text-[11px] rounded-[3px] border transition-all cursor-pointer flex items-center gap-1"
              :class="element.background === bg.value ? 'border-[color:var(--color-border-5)] text-[color:var(--color-text-brand-1)] bg-[#F2F3FF] font-medium' : 'border-[color:var(--color-border-2)] text-[color:var(--color-text-neutral-2)] bg-white'"
              @click="element.background = bg.value"
            >
              <span class="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" :style="{ background: bg.value }" />
              <span>{{ bg.label }}</span>
            </button>
            <el-color-picker v-model="element.background" show-alpha aria-label="自定义背景色" size="small" />
          </div>
        </div>
      </el-form-item>

      <el-form-item v-if="!['shape','texture','icon','divider','effects','text'].includes(element.kind)" label="字号">
        <el-input-number v-model="element.fontSize" :min="20" :max="64" controls-position="right" aria-label="元素字号" />
      </el-form-item>
      <div v-if="element.kind === 'text'" class="text-xs text-[color:var(--color-text-neutral-3)] bg-[color:var(--color-fill-neutral-1)] p-2.5 rounded-[4px] border border-[color:var(--color-grey-9)]">
        💡 文本字号由图层缩放框自适应无极控制，在画布中直接放大缩小即可无极调节大小
      </div>
    </el-form>


  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { extraElementLabel, type SceneExtraElement } from './sceneElements';
const props = withDefaults(defineProps<{ element: SceneExtraElement; showVisibility?: boolean }>(), { showVisibility: true });
const emit = defineEmits<{ remove: [] }>();
const label = computed(() => extraElementLabel(props.element.kind));
const hasContent = computed(() => ['banner','notice','list','comparison','custom','popup','text','qrcode','chart','effects'].includes(props.element.kind));
const contentLabel = computed(() => ({ list:'列表内容', comparison:'对照内容', chart:'图表数据', qrcode:'二维码内容' }[props.element.kind] || '内容'));
const contentPlaceholder = computed(() => ({
  list:'每行一项：标题|说明',
  comparison:'每行一项：名称|内容',
  chart:'每行一项：名称|数值',
  qrcode:'输入链接或文本'
}[props.element.kind] || '请输入展示内容'));

const helperText = computed(() => ({
  list: '格式示例：公司介绍|了解展厅核心看点',
  comparison: '格式示例：服务时间|09:00—18:00',
  chart: '格式示例：展区一|65',
  qrcode: '输入跳转链接或任意文本生成二维码'
}[props.element.kind] || ''));

const sampleContent = computed(() => ({
  list: '展厅导览|了解展厅核心看点\n互动体验|体验数字人实时问答\n常见问题|常见服务问题解答',
  comparison: '服务时间|09:00—18:00\n服务地点|一楼咨询台',
  chart: '展区一|65\n展区二|82\n展区三|48',
  qrcode: 'https://example.com'
}[props.element.kind] || ''));

const iconOptions = [{label:'信息',value:'info'},{label:'星标',value:'star'},{label:'导览',value:'compass'},{label:'位置',value:'location'},{label:'帮助',value:'help'}];

const colorPresets = [
  { label: '科技蓝 (推荐)', value: '#165DFF' },
  { label: '墨黑', value: '#1D2129' },
  { label: '极光绿', value: '#00B42A' },
  { label: '暖阳橙', value: '#FF7D00' },
  { label: '数字紫', value: '#722ED1' },
  { label: '高亮白', value: '#FFFFFF' }
];

const bgPresets = [
  { label: '高透白玻 (推荐)', value: 'rgba(255, 255, 255, 0.92)' },
  { label: '浅灰晶石', value: 'rgba(247, 248, 250, 0.92)' },
  { label: '浅蓝科技', value: 'rgba(22, 93, 255, 0.12)' },
  { label: '深邃暗夜', value: 'rgba(29, 33, 41, 0.88)' },
  { label: '纯透', value: 'transparent' }
];
</script>

<style scoped>
.extra-settings-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:16px; }
.scene-extra-settings :deep(.el-form-item) { margin-bottom:18px; }
.scene-extra-settings :deep(.el-input-number) { width:100%; }
</style>
