import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { readSettingSelection, writeSettingSelection } from '../components/sceneStorage';
import type { Customer, Machine, PaymentRecord, ClientNavKey, ClientFaqItem, ClientQaLogItem, ClientSceneCanvasConfig } from '../types';
import { INITIAL_CUSTOMERS, INITIAL_MACHINES, INITIAL_PAYMENTS, INITIAL_CLIENT_FAQS, INITIAL_CLIENT_QA_LOGS, INITIAL_CLIENT_CANVAS } from '../mock/initialData';

export const usePlatformStore = defineStore('platform', () => {
  const clientNav = ref<ClientNavKey>('client-home');

  const isRechargeModalOpen = ref(false);

  const initFromStorage = <T>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      // If fallback is an array and saved has fewer items than fallback, upgrade to rich fallback data
      if (Array.isArray(fallback) && Array.isArray(parsed) && parsed.length < fallback.length) {
        return fallback;
      }
      return parsed;
    } catch {
      return fallback;
    }
  };

  const customers = ref<Customer[]>(initFromStorage('duozuhu_customers', INITIAL_CUSTOMERS));

  const currentTenantId = ref<string>('CUST-1001');

  const currentTenant = computed(() => {
    return customers.value.find(c => c.id === currentTenantId.value) || customers.value[0] || null;
  });

  const machines = ref<Machine[]>(initFromStorage('duozuhu_machines_v3', INITIAL_MACHINES));

  const selectedSettingMachineId = ref<string | null>(initFromStorage('duozuhu_settings_machine_v1', 'DEV-01'));

  let selectionRevision = 0;

  watch(selectedSettingMachineId, id => {
    ++selectionRevision;
    try { localStorage.setItem('duozuhu_settings_machine_v1', JSON.stringify(id)); } catch { /* IndexedDB also retains this selection. */ }
    void writeSettingSelection(id).catch(error => console.warn('无法保存当前机器选择', error));
  }, { flush: 'sync' });

  void readSettingSelection().then(id => {
    // Do not replace a selection the user made while storage was opening.
    if (!selectionRevision && id && machines.value.some(machine => machine.id === id)) selectedSettingMachineId.value = id;
  }).catch(error => console.warn('无法恢复上次编辑的机器', error));

  const payments = ref<PaymentRecord[]>(initFromStorage('duozuhu_payments_v2', INITIAL_PAYMENTS));

  const clientFaqs = ref<ClientFaqItem[]>(initFromStorage('duozuhu_client_faqs_v3', INITIAL_CLIENT_FAQS));

  const clientQaLogs = ref<ClientQaLogItem[]>(initFromStorage('duozuhu_client_qalogs_v3', INITIAL_CLIENT_QA_LOGS));

  const clientCanvas = ref<ClientSceneCanvasConfig>(INITIAL_CLIENT_CANVAS);

  watch(customers, val => localStorage.setItem('duozuhu_customers', JSON.stringify(val)), { deep: true });

  watch(machines, val => localStorage.setItem('duozuhu_machines_v3', JSON.stringify(val)), { deep: true });

  watch(payments, val => localStorage.setItem('duozuhu_payments_v2', JSON.stringify(val)), { deep: true });

  watch(clientFaqs, val => localStorage.setItem('duozuhu_client_faqs_v3', JSON.stringify(val)), { deep: true });

  watch(clientQaLogs, val => localStorage.setItem('duozuhu_client_qalogs_v3', JSON.stringify(val)), { deep: true });

  const setClientNav = (nav: ClientNavKey) => { clientNav.value = nav; };

  const setIsRechargeModalOpen = (open: boolean) => { isRechargeModalOpen.value = open; };

  const setSelectedSettingMachineId = (id: string | null) => { selectedSettingMachineId.value = id; };

  const updateClientCanvas = (cfg: Partial<ClientSceneCanvasConfig>) => {
    clientCanvas.value = { ...clientCanvas.value, ...cfg };
  };

  const addClientFaq = (faq: Omit<ClientFaqItem, 'id' | 'hitCount' | 'createTime'>) => {
    const newFaq: ClientFaqItem = {
      ...faq,
      id: `FAQ-${Date.now()}`,
      hitCount: 0,
      createTime: new Date().toISOString().split('T')[0]
    };
    clientFaqs.value = [newFaq, ...clientFaqs.value];
  };

  const updateClientFaq = (id: string, updates: Partial<ClientFaqItem>) => {
    clientFaqs.value = clientFaqs.value.map(f => f.id === id ? { ...f, ...updates } : f);
  };

  const deleteClientFaq = (id: string) => {
    clientFaqs.value = clientFaqs.value.filter(f => f.id !== id);
  };

  const toggleClientFaqStatus = (id: string) => {
    clientFaqs.value = clientFaqs.value.map(f => f.id === id ? {
      ...f,
      status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    } : f);
  };

  const updateMachineMode = (machineId: string, mode: 'STANDBY' | 'SHOWCASE' | 'MARKETING') => {
    machines.value = machines.value.map(m => m.id === machineId ? { ...m, activeMode: mode } : m);
  };

  const updateMachineVolume = (machineId: string, volume: number) => {
    machines.value = machines.value.map(m => m.id === machineId ? { ...m, volume } : m);
  };

  return { addClientFaq, clientCanvas, clientFaqs, clientNav, clientQaLogs, currentTenant, currentTenantId, deleteClientFaq, isRechargeModalOpen, machines, payments, selectedSettingMachineId, setClientNav, setIsRechargeModalOpen, setSelectedSettingMachineId, toggleClientFaqStatus, updateClientCanvas, updateClientFaq, updateMachineMode, updateMachineVolume };
});
