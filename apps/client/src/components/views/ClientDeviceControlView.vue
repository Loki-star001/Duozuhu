<template>
  <div class="client-control-panel">
    <div class="client-control-content w-full min-w-0 space-y-2.5">
      <div class="device-interaction-section space-y-3">
        <div class="text-sm font-semibold text-[color:var(--color-text-neutral-1)]">音量控制</div>
        <div class="space-y-2.5 bg-white">
          <slot name="interaction" />
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2"><Volume2 class="w-4 h-4 text-[color:var(--color-success-6)]" /><span class="text-sm text-[color:var(--color-text-neutral-2)]">系统音量</span></div>
              <span class="font-mono text-sm text-[color:var(--color-text-brand-1)]">{{ volume }}%</span>
            </div>
            <el-slider v-model="volume" :disabled="!selectedMachine" :min="0" :max="100" :step="1" :format-tooltip="value => `${value}%`" />
          </div>
          <div class="flex items-center justify-between"><span class="text-sm text-[color:var(--color-text-neutral-2)]">语音控制切换</span><el-switch v-model="voiceEnabled" :disabled="!selectedMachine" @change="value => notify(value ? '开启语音控制切换' : '关闭语音控制切换')" /></div>
        </div>
      </div>
      <div class="device-modes-section space-y-3">
        <div class="text-sm font-semibold text-[color:var(--color-text-neutral-1)]">虚拟人模式切换</div>
        <div class="device-modes-grid grid grid-cols-3 gap-2.5">
          <button v-for="mode in modes" :key="mode.id" type="button" :disabled="!selectedMachine" class="device-mode-option rounded-[4px] border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors" :class="selectedMachine?.activeMode === mode.id ? 'border-[color:var(--color-border-5)] bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)]' : 'border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] bg-white'" @click="handleMode(mode.id, mode.title)">
            <component :is="mode.icon" class="w-4 h-4 text-[color:var(--color-text-brand-1)]" />
            <span class="text-sm font-medium" :class="selectedMachine?.activeMode === mode.id ? 'text-[color:var(--color-text-brand-1)]' : 'text-[color:var(--color-text-neutral-1)]'">{{ mode.title }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Pause, Monitor, BarChart2, Volume2, Power, RotateCw } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePlatformStore } from '../../store/client';

const store = usePlatformStore();
const selectedMachine = computed(() => {
  const list = store.machines.filter(machine => machine.customerId === store.currentTenantId);
  return list.find(machine => machine.id === store.selectedSettingMachineId) || list[0];
});
type ControlConfig = { voiceEnabled: boolean };
const storageKey = 'duozuhu_device_controls_v1';
const loadControls = (): Record<string, ControlConfig> => {
  try { const raw = JSON.parse(localStorage.getItem(storageKey) || '{}'); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}; } catch { return {}; }
};
const controls = ref(loadControls());
const configKey = computed(() => `${store.currentTenantId}:${selectedMachine.value?.id || ''}`);
const saveControl = (patch: Partial<ControlConfig>) => {
  if (!selectedMachine.value) return;
  controls.value = { ...controls.value, [configKey.value]: { voiceEnabled: true, ...controls.value[configKey.value], ...patch } };
  localStorage.setItem(storageKey, JSON.stringify(controls.value));
};
const voiceEnabled = computed({ get: () => controls.value[configKey.value]?.voiceEnabled ?? true, set: value => saveControl({ voiceEnabled: value }) });
const volume = computed({ get: () => selectedMachine.value?.volume ?? 80, set: value => { if (selectedMachine.value) store.updateMachineVolume(selectedMachine.value.id, value); } });
const modes = [
  { id: 'STANDBY' as const, title: '待机模式', icon: Pause },
  { id: 'SHOWCASE' as const, title: '展示模式', icon: Monitor },
  { id: 'MARKETING' as const, title: '营销模式', icon: BarChart2 }
];
const notify = (action: string) => ElMessage.success(`指令已成功下发: ${action}`);
const handleMode = (mode: 'STANDBY' | 'SHOWCASE' | 'MARKETING', title: string) => { if (!selectedMachine.value) return; store.updateMachineMode(selectedMachine.value.id, mode); notify(`切换至【${title}】`); };
const confirmPower = async (reboot: boolean) => {
  const machine = selectedMachine.value; if (!machine) return;
  try {
    await ElMessageBox.confirm(`确认向终端「${machine.name}」发送${reboot ? '重启软件' : '远程关机'}指令？`, reboot ? '确认重启软件' : '确认远程关机', { confirmButtonText: reboot ? '确认重启' : '确认关机', cancelButtonText: '取消', type: reboot ? 'warning' : 'error', confirmButtonClass: reboot ? '' : 'client-danger-confirm' });
    notify(reboot ? '重启软件' : '远程关机');
  } catch { /* Cancel keeps the original machine state. */ }
};
defineExpose({ confirmPower });
</script>
