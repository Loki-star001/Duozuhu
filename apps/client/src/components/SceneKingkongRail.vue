<template>
  <nav class="scene-kingkong-rail" aria-label="预设提问快捷入口">
    <button
      v-for="item in enabledItems"
      :key="item.id"
      type="button"
      class="kingkong-rail-item"
      :class="[
        `item-type-${getItemIconType(item)}`,
        { 'no-icon': !shouldShowIcon(item) }
      ]"
      :aria-label="item.label"
      :disabled="!editing && (disabled || !item.prompt?.trim())"
      @pointerdown.stop
      @keydown.stop
      @click.stop="handleClick(item.id)"
      @dblclick.stop="editing && emit('edit', item.id)"
    >
      <span v-if="shouldShowIcon(item)" class="kingkong-rail-icon">
        <SceneArcoIcon :name="getItemIconType(item)" />
      </span>
      <span class="kingkong-rail-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SceneArcoIcon from './SceneArcoIcon.vue';

interface RailItem {
  id: number;
  label: string;
  prompt?: string;
  icon?: string;
  showIcon?: boolean;
  enabled: boolean;
}
const props = defineProps<{ items: RailItem[]; disabled?: boolean; editing?: boolean }>();
const emit = defineEmits<{ select: [id: number]; edit: [id: number] }>();

const enabledItems = computed(() => props.items.filter(item => item.enabled));

const handleClick = (id: number) => {
  emit('select', id);
};

const shouldShowIcon = (item: RailItem) => {
  if (item.showIcon === false || item.icon === 'none') return false;
  return true;
};

const getItemIconType = (item: RailItem): string => {
  if (item.icon && item.icon !== 'auto' && item.icon !== 'none') {
    return item.icon;
  }
  const label = item.label || '';
  if (/公司|企业|关于|品牌|团队|介绍/.test(label)) return 'company';
  if (/新闻|动态|资讯|快讯|时事|报/.test(label)) return 'news';
  if (/热点|热门|趋势|热搜|焦点/.test(label)) return 'hot';
  if (/天气|气温|气候|下雨|阴晴/.test(label)) return 'weather';
  if (/导览|导航|景区|路线|位置|展厅/.test(label)) return 'guide';
  if (/产品|中心|功能|分类|服务|方案/.test(label)) return 'product';
  if (/案例|作品|资料|文件|展示/.test(label)) return 'case';
  if (/服务|客服|接待|人工/.test(label)) return 'service';
  if (/帮助|疑问|问答|指南|常见/.test(label)) return 'help';
  if (/检索|搜索|查询|查找|知识/.test(label)) return 'search';
  const order = ['company', 'news', 'hot', 'weather', 'guide', 'product', 'case', 'service', 'help', 'search'];
  return order[(item.id - 1) % order.length] || 'company';
};
</script>

<style scoped>
.scene-kingkong-rail {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--kk-unit, 1px));
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  container-type: size;
  --kk-unit: min(calc(1cqw / 1.242), calc(1cqh / 5.568));
}

.kingkong-rail-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(6 * var(--kk-unit, 1px));
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  padding: calc(12 * var(--kk-unit, 1px)) calc(10 * var(--kk-unit, 1px));
  background: var(--scene-control-glass-background, linear-gradient(160deg, rgba(255,255,255,.86), rgba(246,249,255,.74)));
  backdrop-filter: blur(var(--scene-control-glass-blur, 14px));
  -webkit-backdrop-filter: blur(var(--scene-control-glass-blur, 14px));
  border: var(--scene-control-glass-border, 1.5px solid #fff);
  border-radius: calc(18 * var(--kk-unit, 1px));
  box-shadow: var(--scene-control-glass-shadow, 0 4px 16px rgba(35,55,83,.07), inset 0 1px 0 #fff);
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-sizing: border-box;
}

.kingkong-rail-item:active {
  transform: scale(0.96);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.kingkong-rail-item.no-icon {
  gap: 0;
  justify-content: center;
  padding: calc(12 * var(--kk-unit, 1px));
}

.kingkong-rail-item.no-icon .kingkong-rail-label {
  font-size: calc(20 * var(--kk-unit, 1px));
  font-weight: 600;
  line-height: 1.35;
}

.kingkong-rail-icon {
  display: grid;
  place-items: center;
  width: calc(40 * var(--kk-unit, 1px));
  height: calc(40 * var(--kk-unit, 1px));
  aspect-ratio: 1;
  flex: 0 0 auto;
  min-height: 0;
  background: transparent;
  color: #4E5969;
  transition: color 0.18s ease;
}

/* Touch kiosk: icon color activates on press */
.kingkong-rail-item:active .kingkong-rail-icon {
  color: #165DFF;
}

.kingkong-rail-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.kingkong-rail-label {
  font-size: calc(20 * var(--kk-unit, 1px));
  font-weight: 500;
  color: #1D2129;
  line-height: 1.25;
  text-align: center;
  word-break: break-all;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  transition: color 0.18s ease;
}

.kingkong-rail-item:active .kingkong-rail-label {
  color: #165DFF;
}
</style>
