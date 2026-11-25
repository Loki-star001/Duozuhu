<template>
  <el-dialog
    v-model="store.isRechargeModalOpen"
    title="充值"
    width="520px"
    class="client-recharge-dialog"
    align-center
    :show-close="true"
    @open="paymentStep = 'ONLINE'"
  >
    <div class="recharge-content">
      <el-breadcrumb separator="/" class="recharge-breadcrumb">
        <el-breadcrumb-item><button type="button" @click="paymentStep = 'ONLINE'">在线充值</button></el-breadcrumb-item>
        <el-breadcrumb-item v-if="paymentStep === 'SCAN'">扫码支付</el-breadcrumb-item>
      </el-breadcrumb>

      <!-- 在线充值内容 -->
      <template v-if="paymentStep === 'ONLINE'">
        <!-- 支付金额 -->
        <div class="space-y-3">
          <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">支付金额</div>

          <!-- 预设金额档位 -->
          <div class="client-recharge-amounts flex items-center flex-wrap gap-2.5">
            <button
              v-for="amt in PRESET_AMOUNTS"
              :key="amt"
              type="button"
              class="h-9 px-4 rounded-[6px] text-xs font-medium transition-all cursor-pointer"
              :class="selectedPreset === amt ? 'bg-[color:var(--color-grey-1)] text-white font-semibold' : 'bg-[color:var(--color-fill-neutral-2)] text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-3)]'"
              @click="handleSelectPreset(amt)"
            >
              ¥{{ amt }}
            </button>
            <button
              type="button"
              class="h-9 px-4 rounded-[6px] text-xs font-medium transition-all cursor-pointer"
              :class="selectedPreset === 'custom' ? 'bg-[color:var(--color-grey-1)] text-white font-semibold' : 'bg-[color:var(--color-fill-neutral-2)] text-[color:var(--color-text-neutral-1)] hover:bg-[color:var(--color-fill-neutral-3)]'"
              @click="handleSelectPreset('custom')"
            >
              自定义
            </button>
          </div>

          <!-- 金额输入框 -->
          <div class="pt-0.5">
            <el-input-number
              v-model="amountInput"
              placeholder="请输入金额"
              style="width: 240px; height: 32px"
              :min="1"
              :max="100000"
              :precision="2"
              :step="1"
              :disabled="isSubmitting"
              controls-position="right"
              aria-label="支付金额"
              @change="handleAmountChange"
            >
              <template #prefix>
                <span class="text-[color:var(--color-text-neutral-3)] text-xs">¥</span>
              </template>
            </el-input-number>
            <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-1.5">
              请输入 1 元至 100000 元之间的金额
            </div>
          </div>
        </div>

        <!-- 支付方式 -->
        <div class="space-y-2.5">
          <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">支付方式</div>
          <div class="client-recharge-method w-full h-[40px] px-3.5 rounded-[4px] border bg-white flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-2.5">
              <span class="w-5 h-5 rounded-[4px] bg-[#1677FF] text-white flex items-center justify-center text-xs font-bold leading-none">
                支
              </span>
              <span class="text-xs font-medium text-[color:var(--color-text-neutral-1)]">支付宝</span>
            </div>
            <span class="w-4 h-4 rounded-full bg-[color:var(--color-grey-1)] text-white flex items-center justify-center">
              <Check class="w-2.5 h-2.5 stroke-[3]" />
            </span>
          </div>
        </div>

        <!-- 去支付按钮 -->
        <div class="pt-2 flex flex-col items-center">
          <button
            type="button"
            :disabled="isSubmitting"
            class="client-payment-submit w-full max-w-full h-8 rounded-[4px] text-white flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer"
            @click="handleConfirmPay"
          >
            <span>{{ isSubmitting ? '正在安全调起支付...' : '去支付' }}</span>
          </button>
          <div class="text-xs text-[color:var(--color-text-neutral-2)] mt-2.5">
            金额将充入当前企业帐户 ({{ maskedPhone }})
          </div>
        </div>
      </template>

      <div v-else class="recharge-scan">
        <div class="text-sm text-[color:var(--color-text-neutral-2)]">支付宝扫码支付</div>
        <div class="text-2xl font-semibold text-[color:var(--color-text-neutral-1)]">¥{{ numericAmount.toFixed(2) }}</div>
        <div class="recharge-qr" aria-label="扫码支付演示二维码">
          <svg viewBox="0 0 29 29" role="img" aria-label="演示二维码">
            <rect width="29" height="29" fill="white" />
            <rect v-for="cell in qrCells" :key="cell.key" :x="cell.x + 2" :y="cell.y + 2" width="1" height="1" fill="var(--color-grey-1)" />
          </svg>
        </div>
        <div class="text-sm text-[color:var(--color-text-neutral-2)]">使用支付宝扫一扫</div>
        <div class="text-xs text-[color:var(--color-text-neutral-3)]">演示二维码</div>
      </div>

      <!-- 用户指定的充值提示 -->
      <div v-if="paymentStep === 'ONLINE'" class="recharge-tips space-y-1.5 text-xs text-[color:var(--color-text-neutral-2)]">
        <div class="font-semibold text-[color:var(--color-text-neutral-1)]">提示</div>
        <ol class="list-decimal list-inside space-y-1 pl-1 text-[color:var(--color-text-neutral-2)]">
          <li>充值金额仅用于调用 API 服务，网页版及 App 对话免费使用，无需充值。</li>
          <li>充值后可以前往账单页面开具发票。</li>
        </ol>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check } from '@lucide/vue';
import { ElMessage } from 'element-plus';
import { usePlatformStore } from '../store/client';
const store = usePlatformStore();
const PRESET_AMOUNTS = [10, 20, 50, 100, 300, 500];
const paymentStep = ref<'ONLINE' | 'SCAN'>('ONLINE');
const selectedPreset = ref<number | 'custom'>(10);
const amountInput = ref<number | null>(10);
const isSubmitting = ref(false);
const numericAmount = computed(() => amountInput.value ?? 0);
const maskedPhone = computed(() => store.currentTenant?.phone?.replace(/(\d{3})\d{4}(\d{2,4})/, '$1******$2') || '158******23');
const handleSelectPreset = (preset: number | 'custom') => {
  selectedPreset.value = preset;
  amountInput.value = preset === 'custom' ? null : preset;
};
const handleAmountChange = (value: number | null | undefined) => {
  selectedPreset.value = value != null && PRESET_AMOUNTS.includes(value) ? value : 'custom';
};
const handleConfirmPay = () => {
  if (numericAmount.value < 1 || numericAmount.value > 100000) {
    ElMessage.warning('请输入 1 元至 100000 元之间的金额');
    return;
  }
  paymentStep.value = 'SCAN';
};
// Local visual placeholder for the prototype; contains no payment destination.
const qrCells = Array.from({ length: 625 }, (_, key) => {
  const x = key % 25, y = Math.floor(key / 25);
  const finder = [[0, 0], [18, 0], [0, 18]].find(([a,b]) => x >= a && x < a + 7 && y >= b && y < b + 7);
  const separator = [[0, 0], [18, 0], [0, 18]].some(([a,b]) => x >= a - 1 && x <= a + 7 && y >= b - 1 && y <= b + 7);
  let dark = false;
  if (finder) {
    const dx = x - finder[0], dy = y - finder[1];
    dark = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  } else if (!separator) dark = (x * 7 + y * 11 + x * y) % 5 < 2;
  return { x, y, key, dark };
}).filter(cell => cell.dark);
</script>
