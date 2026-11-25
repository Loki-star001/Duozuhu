<template>
  <div class="duozuhu-client flex flex-col h-screen bg-white overflow-hidden select-none">
    <!-- Customer Portal Top Header (Spans Full Width 100%, 60px) -->
    <ClientTopHeader />

    <!-- Customer Portal Main Body (Sidebar under Top Header on the left) -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <ClientSidebar />

      <!-- Right Content Column: Sub Nav on Top, Main View Below -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <ClientSubNavBar />

        <main class="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
          <!-- 首页 -->
          <ClientHomeView v-if="store.clientNav === 'client-home'" />

          <!-- 机器管理 -->
          <ClientDeviceListView v-else-if="store.clientNav === 'client-device-list'" />

          <!-- 内容管理 -->
          <ClientContentFaqView v-else-if="store.clientNav === 'client-content-faq'" />
          <ClientContentKbView v-else-if="store.clientNav === 'client-content-kb'" />
          <ClientContentSensitiveView v-else-if="store.clientNav === 'client-content-sensitive'" />

          <!-- 通用设置 (左侧机器列表 + 右侧配置内容双栏布局) -->
          <ClientDeviceSettingsView
            v-else-if="store.clientNav === 'client-setting-device'"
          />

          <ClientSettingsSplitLayout
            v-else-if="store.clientNav === 'client-device-greetings'"
            :hide-header="true"
          >
            <ClientDeviceGreetingsView />
          </ClientSettingsSplitLayout>

          <ClientSettingPersonaView v-else-if="store.clientNav === 'client-setting-persona'" />


          <ClientSettingsSplitLayout
            v-else-if="store.clientNav === 'client-setting-assets'"
            :hide-header="true"
          >
            <ClientSettingAssetsView />
          </ClientSettingsSplitLayout>

          <!-- 费用 -->
          <ClientBillingUsageView v-else-if="store.clientNav === 'client-billing-usage'" />
          <ClientBillingBillsView v-else-if="store.clientNav === 'client-billing-bills'" />

          <!-- 默认回退 -->
          <ClientHomeView v-else />
        </main>
      </div>
    </div>

    <!-- Global Client Recharge Modal (Element Plus Dialog 520px) -->
    <ClientRechargeModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { usePlatformStore } from './store/client';

// Layout components
import ClientTopHeader from './components/ClientTopHeader.vue';
import ClientSidebar from './components/ClientSidebar.vue';
import ClientSubNavBar from './components/ClientSubNavBar.vue';
import ClientSettingsSplitLayout from './components/ClientSettingsSplitLayout.vue';
import ClientRechargeModal from './components/ClientRechargeModal.vue';

// Views
import ClientHomeView from './components/views/ClientHomeView.vue';
import ClientDeviceListView from './components/views/ClientDeviceListView.vue';
import ClientContentFaqView from './components/views/ClientContentFaqView.vue';
import ClientContentKbView from './components/views/ClientContentKbView.vue';
import ClientContentSensitiveView from './components/views/ClientContentSensitiveView.vue';
import ClientDeviceSettingsView from './components/views/ClientDeviceSettingsView.vue';
import ClientDeviceGreetingsView from './components/views/ClientDeviceGreetingsView.vue';
import ClientSettingPersonaView from './components/views/ClientSettingPersonaView.vue';
import ClientSettingAssetsView from './components/views/ClientSettingAssetsView.vue';
import ClientBillingUsageView from './components/views/ClientBillingUsageView.vue';
import ClientBillingBillsView from './components/views/ClientBillingBillsView.vue';

const store = usePlatformStore();

onMounted(() => {
  document.body.dataset.portal = 'client';
});
</script>
