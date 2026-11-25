<template>
  <ClientSettingsSplitLayout title="设备配置">
    <div class="client-device-settings-panel flex-1 min-h-0 overflow-y-auto">
      <div class="client-device-settings-grid">
        <ClientSettingDeviceView />
      </div>
    </div>
  </ClientSettingsSplitLayout>
</template>

<script setup lang="ts">
import ClientSettingsSplitLayout from '../ClientSettingsSplitLayout.vue';
import ClientSettingDeviceView from './ClientSettingDeviceView.vue';
</script>

<style scoped>
/* Device configuration owns its height budget; other settings pages keep their layout. */
.client-device-settings-panel { display: flex; flex-direction: column; }
.client-device-settings-panel > .client-device-settings-grid { display: flex; flex-direction: column; flex: 1 0 auto; min-height: 0; }
.client-device-settings-panel :deep(.client-device-config) { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: visible; }
.client-device-settings-panel :deep(.client-device-config-content) { display: flex; flex-direction: column; flex: 1; gap: 16px; }
.client-device-settings-panel :deep(.client-device-config-content > *) { margin-top: 0; margin-bottom: 0; }
.client-device-settings-panel :deep(.device-top-actions),
.client-device-settings-panel :deep(.device-identity-grid) { flex: 0 0 auto; }
.client-device-settings-panel :deep(.device-top-actions) { padding: 0; border: 0; background: transparent; gap: 12px; }
.client-device-settings-panel :deep(.device-top-notice) { flex: 1 1 auto; min-width: 0; min-height: 40px; padding: 10px 14px; border: 1px solid var(--color-grey-8); border-radius: 4px; background: var(--color-grey-10); box-sizing: border-box; }
.client-device-settings-panel :deep(.device-top-buttons) { flex: 0 0 auto; margin-left: 0; gap: 24px; }
.client-device-settings-panel :deep(.device-top-buttons .el-button + .el-button) { margin-left: 0; }
.client-device-settings-panel :deep(.client-device-config-content > .device-identity-grid) { padding: 0; border: 0; background: transparent; }
.client-device-settings-panel :deep(.device-current-persona .device-current-avatar),
.client-device-settings-panel :deep(.device-current-voice .device-current-avatar) { --device-persona-preview-width: clamp(54px, calc(10dvh - 26px), 80px); flex-basis: var(--device-persona-preview-width); width: var(--device-persona-preview-width); height: auto; aspect-ratio: 4 / 5; max-width: 80px; max-height: 100px; }
.client-device-settings-panel :deep(.client-device-config-content > .client-control-panel) { flex: 1 0 auto; display: flex; min-height: 0; padding: 0; border: 0; background: transparent; }
.client-device-settings-panel :deep(.client-control-content) { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(240px, 1.3fr) minmax(160px, 1fr); gap: 16px; min-height: 0; }
.client-device-settings-panel :deep(.client-control-content > *) { display: flex; flex-direction: column; gap: 16px; margin: 0; min-width: 0; padding: 20px; }
.client-device-settings-panel :deep(.device-interaction-section > :last-child) { display: flex; flex: 1; flex-direction: column; justify-content: space-between; gap: 20px; }
.client-device-settings-panel :deep(.device-interaction-section > :last-child > *) { margin: 0; }
.client-device-settings-panel :deep(.device-modes-grid) { flex: 1; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; }
.client-device-settings-panel :deep(.device-mode-option) { flex-direction: column; gap: 12px; min-height: 88px; padding: 16px; }
.client-device-settings-panel :deep(.device-mode-option > svg) { width: 20px; height: 20px; }

@media (max-width: 1199px) {
  .client-device-settings-panel :deep(.client-control-content) { grid-template-columns: minmax(0, 1fr); }
  .client-device-settings-panel :deep(.device-modes-grid) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .client-device-settings-panel :deep(.device-mode-option) { flex-direction: column; }
}
@media (max-width: 640px) {
  .client-device-settings-panel :deep(.device-top-actions) { align-items: flex-start; }
  .client-device-settings-panel :deep(.device-modes-grid) { grid-template-columns: minmax(0, 1fr); }
}
</style>

