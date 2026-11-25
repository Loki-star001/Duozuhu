<template>
  <div class="catalog-visual" :class="[preview ? 'product-preview' : 'case-placeholder', { large }]"
    :data-preview="preview" aria-hidden="true">
    <div v-if="preview" class="preview-layout"><span></span><span></span><span></span></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ preview?: 'editor' | 'conversation' | 'studio'; large?: boolean }>();
</script>

<style scoped>
.catalog-visual {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 15px;
  background: linear-gradient(145deg, #f5f8fe, #dce9fa);
}
.product-preview {
  display: grid;
  place-items: center;
  width: 100%;
  height: 122px;
}
.preview-layout {
  display: grid;
  width: 138px;
  height: 82px;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, .95);
  border-radius: 9px;
  background: rgba(255, 255, 255, .68);
  box-shadow: 0 4px 14px #45689615;
}
.preview-layout span { min-width: 0; border-radius: 4px; background: #c8dcf6; }
.preview-layout span:nth-child(2) { background: #e2ebf6; }
.preview-layout span:nth-child(3) { background: #accbf4; }
.product-preview[data-preview="editor"] .preview-layout {
  grid-template: 1fr 16px / 2fr 1fr;
}
.product-preview[data-preview="editor"] span:nth-child(3) {
  grid-column: 1 / -1;
  background: repeating-linear-gradient(90deg, #adc9ee 0 17px, #eaf1fb 17px 20px);
}
.product-preview[data-preview="conversation"] .preview-layout {
  grid-template-columns: 1fr;
}
.product-preview[data-preview="conversation"] span { width: 78%; }
.product-preview[data-preview="conversation"] span:nth-child(2) { width: 62%; justify-self: end; }
.product-preview[data-preview="conversation"] span:nth-child(3) { width: 56%; }
.product-preview[data-preview="studio"] .preview-layout {
  grid-template: 1fr 1fr / 2fr 1fr;
}
.product-preview[data-preview="studio"] span:first-child {
  grid-row: 1 / -1;
  background: radial-gradient(ellipse at 50% 90%, #f3f7ff 12%, #bcd3f2 68%);
}
.case-placeholder {
  height: 132px;
  background: linear-gradient(145deg, #eef1f6, #dbe3ed);
}
.case-placeholder::before {
  position: absolute;
  inset: 12px;
  border: 1px dashed #a3b1c4;
  border-radius: 10px;
  content: '';
}
.case-placeholder::after {
  position: absolute;
  inset: 24px 27px;
  background: linear-gradient(145deg, #d5deeb, #f6f8fb);
  border-radius: 7px;
  clip-path: polygon(0 100%, 32% 36%, 53% 68%, 72% 24%, 100% 100%);
  content: '';
}
.catalog-visual.large { height: 232px; border-radius: var(--exhibit-inner-radius); }
.large .preview-layout { transform: scale(1.9); }
</style>
