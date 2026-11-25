<template>
  <aside class="w-56 bg-[color:var(--color-fill-neutral-1)] text-[color:var(--color-text-neutral-2)] flex flex-col justify-between select-none flex-shrink-0 h-full border-r border-[color:var(--color-border-2)]">
    <div class="flex flex-col h-full overflow-hidden">
      <!-- Navigation Menu -->
      <div class="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
        <template v-for="cat in categories" :key="cat.key">
          <!-- 通用设置渲染为侧边栏树形结构 -->
          <div v-if="cat.key === 'settings'" class="space-y-1">
            <!-- 通用设置父级项 -->
            <div
              @click="handleSettingsClick(cat.defaultNav)"
              class="w-full h-10 flex items-center justify-between px-3 rounded-[4px] text-sm transition-all cursor-pointer"
              :class="isSettingsActive
                ? 'bg-[color:var(--color-fill-neutral-2)] text-[color:var(--color-text-neutral-1)] font-medium'
                : 'text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-2)]'"
            >
              <div class="flex items-center gap-3">
                <component :is="cat.icon" class="w-4 h-4" />
                <span>{{ cat.label }}</span>
              </div>
              <span
                class="p-1 text-[color:var(--color-text-neutral-3)] hover:text-[color:var(--color-text-neutral-1)] transition-transform"
                @click.stop="isSettingsExpanded = !isSettingsExpanded"
              >
                <ChevronDown v-if="isSettingsExpanded" class="w-3.5 h-3.5" />
                <ChevronRight v-else class="w-3.5 h-3.5" />
              </span>
            </div>

            <!-- 树形子菜单：严格不使用任何 icon -->
            <div v-if="isSettingsExpanded" class="mt-1 pb-1">
              <div class="relative pl-3.5 ml-3.5 border-l border-[color:var(--color-border-2)] space-y-1">
                <button
                  v-for="item in SETTING_TREE_ITEMS"
                  :key="item.id"
                  type="button"
                  @click="store.setClientNav(item.id)"
                  class="w-full h-10 flex items-center px-3 rounded-[4px] text-sm transition-colors cursor-pointer text-left"
                  :class="(store.clientNav === item.id)
                    ? 'bg-[color:var(--color-fill-brand-5)] text-[color:var(--color-text-brand-1)] font-semibold'
                    : 'text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-2)]'"
                >
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 其余一级模块（首页、机器管理、内容管理、费用） -->
          <button
            v-else
            type="button"
            @click="store.setClientNav(cat.defaultNav)"
            class="w-full h-10 flex items-center gap-3 px-3.5 rounded-[4px] text-sm transition-all cursor-pointer text-left"
            :class="cat.matches(store.clientNav)
              ? 'bg-[color:var(--color-fill-brand-5)] text-[color:var(--color-text-brand-1)] font-semibold'
              : 'text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-2)]'"
          >
            <component :is="cat.icon" class="w-4 h-4" />
            <span>{{ cat.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Home, 
  Monitor, 
  BookOpen, 
  Sliders, 
  CreditCard,
  ChevronDown,
  ChevronRight
} from 'lucide-vue-next';
import { usePlatformStore } from '../store/client';
import type { ClientNavKey } from '../types';

const store = usePlatformStore();
const isSettingsExpanded = ref(true);

interface TreeItem {
  id: ClientNavKey;
  label: string;
}

const SETTING_TREE_ITEMS: TreeItem[] = [
  { id: 'client-setting-device', label: '设备配置' },
  { id: 'client-setting-persona', label: '人设配置' },
  { id: 'client-device-greetings', label: '设备应答' },
  { id: 'client-setting-assets', label: '场景配置' },
];

const isSettingsActive = computed(() => {
  return store.clientNav.startsWith('client-setting-') ||
    store.clientNav === 'client-device-greetings';
});

const handleSettingsClick = (defaultNav: ClientNavKey) => {
  if (!isSettingsActive.value) {
    isSettingsExpanded.value = true;
    store.setClientNav(defaultNav);
  } else {
    isSettingsExpanded.value = !isSettingsExpanded.value;
  }
};

const categories = [
  {
    key: 'home',
    label: '首页',
    icon: Home,
    defaultNav: 'client-home' as ClientNavKey,
    matches: (nav: ClientNavKey) => nav === 'client-home'
  },
  {
    key: 'machines',
    label: '机器管理',
    icon: Monitor,
    defaultNav: 'client-device-list' as ClientNavKey,
    matches: (nav: ClientNavKey) => nav === 'client-device-list'
  },
  {
    key: 'content',
    label: '内容管理',
    icon: BookOpen,
    defaultNav: 'client-content-faq' as ClientNavKey,
    matches: (nav: ClientNavKey) => nav.startsWith('client-content-')
  },
  {
    key: 'settings',
    label: '通用设置',
    icon: Sliders,
    defaultNav: 'client-setting-device' as ClientNavKey,
    matches: (nav: ClientNavKey) => nav.startsWith('client-setting-') || nav === 'client-device-greetings'
  },
  {
    key: 'billing',
    label: '费用',
    icon: CreditCard,
    defaultNav: 'client-billing-usage' as ClientNavKey,
    matches: (nav: ClientNavKey) => nav.startsWith('client-billing-')
  }
];
</script>
