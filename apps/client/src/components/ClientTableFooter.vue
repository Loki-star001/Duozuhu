<template>
  <footer
    class="h-14 bg-white border-t border-[color:var(--color-border-2)] px-6 flex items-center justify-between flex-shrink-0 select-none"
  >
    <!-- 左侧：表格内容总数与已选项计数 -->
    <div class="text-xs text-[color:var(--color-text-neutral-2)] flex items-center gap-2">
      <template v-if="selectedCount !== undefined">
        <span>已选 <strong class="font-medium text-[color:var(--color-text-brand-1)]">{{ selectedCount }}</strong> 项</span>
        <span class="text-[color:var(--color-grey-8)]">|</span>
        <span>共 <strong class="font-medium text-[color:var(--color-text-neutral-1)]">{{ total }}</strong> 条数据</span>
      </template>
      <template v-else>
        <span>共 <strong class="font-medium text-[color:var(--color-text-neutral-1)]">{{ total }}</strong> 条数据</span>
      </template>
      <slot name="left-extra" />
    </div>

    <!-- 右侧：表格分页 -->
    <div class="flex items-center">
      <el-pagination
        :current-page="current"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="prev, pager, next, sizes, jumper"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </footer>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    total: number;
    current?: number;
    pageSize?: number;
    selectedCount?: number;
  }>(),
  {
    current: 1,
    pageSize: 10
  }
);

const emit = defineEmits<{
  (e: 'update:current', page: number): void;
  (e: 'update:pageSize', size: number): void;
  (e: 'change', page: number, size: number): void;
}>();

const onPageChange = (page: number) => {
  emit('update:current', page);
  emit('change', page, props.pageSize);
};

const onSizeChange = (size: number) => {
  emit('update:pageSize', size);
  emit('change', props.current, size);
};
</script>
