<template>
  <nav
    v-if="shouldShowSubNav && currentSubItems.length > 0"
    class="h-14 bg-white border-b border-[color:var(--color-border-2)] px-6 flex items-center justify-between flex-shrink-0 select-none"
  >
    <div class="flex items-center gap-8 h-full">
      <button
        v-for="item in currentSubItems"
        :key="item.id"
        type="button"
        class="relative h-14 flex items-center text-sm transition-colors cursor-pointer font-medium"
        :class="store.clientNav === item.id ? 'text-[color:var(--color-text-brand-1)]' : 'text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)]'"
        @click="store.setClientNav(item.id)"
      >
        <span>{{ item.label }}</span>
        <!-- 2px 底部活动指示线 -->
        <span
          v-if="store.clientNav === item.id"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-[color:var(--color-fill-brand-1)] rounded-full"
        />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '../store/client';
import type { ClientNavKey } from '../types';

const store = usePlatformStore();

interface SubNavItem {
  id: ClientNavKey;
  label: string;
}

const NAV_GROUPS: Record<string, { label: string; items: SubNavItem[] }> = {
  content: {
    label: '内容管理',
    items: [
      { id: 'client-content-faq', label: 'Q＆A问答' },
      { id: 'client-content-kb', label: '知识库管理' },
      { id: 'client-content-sensitive', label: '敏感词' },
    ]
  },
  machines: {
    label: '机器管理',
    items: [
      { id: 'client-device-list', label: '设备管理' },
    ]
  },
  billing: {
    label: '费用',
    items: [
      { id: 'client-billing-usage', label: '用量信息' },
      { id: 'client-billing-bills', label: '账单' },
    ]
  }
};

const getActiveGroupKey = (nav: ClientNavKey): string | null => {
  if (nav === 'client-home') return null;
  if (
    nav.startsWith('client-setting-') ||
    
    nav === 'client-device-greetings'
  ) {
    return 'settings';
  }
  for (const [key, group] of Object.entries(NAV_GROUPS)) {
    if (group.items.some(item => item.id === nav)) {
      return key;
    }
  }
  return null;
};

const shouldShowSubNav = computed(() => {
  if (store.clientNav === 'client-home') return false;
  const group = getActiveGroupKey(store.clientNav);
  return group !== null && group !== 'settings';
});

const currentSubItems = computed(() => {
  const group = getActiveGroupKey(store.clientNav);
  if (!group || group === 'settings') return [];
  return NAV_GROUPS[group]?.items || [];
});
</script>
