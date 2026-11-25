<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Scrollable Table Area -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <!-- Top Filter Bar -->
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-[color:var(--color-text-neutral-2)] whitespace-nowrap">充值金额</span>
          <el-input
            v-model="amountInput"
            placeholder="请输入充值金额(元)"
            clearable
            style="width: 180px;"
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-[color:var(--color-text-neutral-2)] whitespace-nowrap">充值日期</span>
          <el-date-picker
            v-model="dateInput"
            type="date"
            placeholder="请选择充值日期"
            value-format="YYYY-MM-DD"
            clearable
            style="width: 180px;"
          />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-[color:var(--color-text-neutral-2)] whitespace-nowrap">订单号</span>
          <el-input
            v-model="orderNoInput"
            placeholder="请输入订单号"
            clearable
            style="width: 220px;"
          />
        </div>

        <div class="flex items-center gap-2.5">
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </div>
      </div>

      <!-- Table - 14px font, 48px row height, flat border -->
      <div class="border border-[color:var(--color-border-2)] rounded-[4px] overflow-hidden bg-white">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] text-sm text-[color:var(--color-text-neutral-2)] font-medium">
              <tr class="h-[48px]">
                <th class="px-4 font-medium text-sm">支付方式</th>
                <th class="px-4 font-medium text-sm">充值金额(元)</th>
                <th class="px-4 font-medium text-sm">充值日期</th>
                <th class="px-4 font-medium text-sm">支付状态</th>
                <th class="px-4 font-medium text-sm">订单号</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-grey-8)] text-sm text-[color:var(--color-text-neutral-2)] bg-white">
              <tr
                v-for="p in paginatedList"
                :key="p.id"
                class="h-[48px] hover:bg-[color:var(--color-fill-neutral-1)] transition-colors"
              >
                <td class="px-4 h-[48px] text-sm text-[color:var(--color-text-neutral-1)]">
                  {{ p.channel === 'ALIPAY' ? '支付宝' : p.channel === 'WECHAT' ? '微信支付' : '对公汇款' }}
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-neutral-1)]">
                  {{ p.amountRmb.toFixed(2) }}
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-neutral-2)]">
                  {{ p.paidAt }}
                </td>
                <td class="px-4 h-[48px] text-sm">
                  <el-tag
                    :type="p.status === 'PAID' ? 'success' : p.status === 'PENDING_REVIEW' ? 'warning' : 'danger'"
                    size="small"
                  >
                    {{ p.status === 'PAID' ? '成功' : p.status === 'PENDING_REVIEW' ? '待审核' : '失败' }}
                  </el-tag>
                </td>
                <td class="px-4 h-[48px] font-mono text-sm text-[color:var(--color-text-neutral-2)]">
                  {{ p.tradeNo || p.id }}
                </td>
              </tr>

              <tr v-if="filteredList.length === 0">
                <td colspan="5" class="py-12 text-center text-sm">
                  <el-empty description="暂无符合条件的账单记录" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 56px Bottom Bar -->
    <ClientTableFooter
      :total="filteredList.length"
      :current="currentPage"
      :page-size="pageSize"
      @change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlatformStore } from '../../store/client';
import ClientTableFooter from '../ClientTableFooter.vue';

const store = usePlatformStore();

const amountInput = ref('');
const dateInput = ref('');
const orderNoInput = ref('');

const appliedFilters = ref({
  amount: '',
  date: '',
  orderNo: ''
});

const currentPage = ref(1);
const pageSize = ref(10);

const tenantPayments = computed(() => {
  return store.payments.filter(
    p => p.customerId === store.currentTenantId || p.customerId === store.currentTenant?.id
  );
});

const filteredList = computed(() => {
  return tenantPayments.value.filter(p => {
    if (appliedFilters.value.amount.trim()) {
      const qAmt = appliedFilters.value.amount.trim();
      const formattedAmt = p.amountRmb.toFixed(2);
      if (!String(p.amountRmb).includes(qAmt) && !formattedAmt.includes(qAmt)) {
        return false;
      }
    }
    if (appliedFilters.value.date.trim()) {
      if (!p.paidAt.startsWith(appliedFilters.value.date.trim())) {
        return false;
      }
    }
    if (appliedFilters.value.orderNo.trim()) {
      const qOrder = appliedFilters.value.orderNo.trim().toLowerCase();
      const orderStr = (p.tradeNo || p.id).toLowerCase();
      if (!orderStr.includes(qOrder)) {
        return false;
      }
    }
    return true;
  });
});

const paginatedList = computed(() => {
  return filteredList.value.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value
  );
});

const handleSearch = () => {
  appliedFilters.value = {
    amount: amountInput.value,
    date: dateInput.value,
    orderNo: orderNoInput.value
  };
  currentPage.value = 1;
};

const handleReset = () => {
  amountInput.value = '';
  dateInput.value = '';
  orderNoInput.value = '';
  appliedFilters.value = {
    amount: '',
    date: '',
    orderNo: ''
  };
  currentPage.value = 1;
};

const handlePageChange = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};
</script>
