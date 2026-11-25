<template>
  <header class="h-[60px] bg-[color:var(--color-fill-neutral-1)] border-b border-[color:var(--color-border-2)] px-5 flex items-center justify-between z-10 flex-shrink-0 w-full select-none">
    <!-- 1. Left: Logo 与标题 (主导航 60px 极浅灰底：Logo + 虚拟人管理平台) -->
    <div class="flex items-center gap-2.5 flex-shrink-0">
      <img
        src="/logo.svg?v=2"
        alt="虚拟人管理平台"
        class="w-8 h-8 object-contain flex-shrink-0"
      />
      <span class="font-semibold text-[color:var(--color-text-neutral-1)] text-base tracking-tight select-none">
        虚拟人管理平台
      </span>
    </div>

    <!-- 2. Right: 通知按钮 + 头像(仅点击呼出下拉菜单) -->
    <div class="flex items-center gap-3">
      <!-- 系统通知气泡 (Element Plus Popover) -->
      <el-popover
        v-model:visible="popoverVisible"
        placement="bottom-end"
        :width="320"
        trigger="click"
      >
        <template #reference>
          <div class="relative inline-flex items-center">
            <el-button
              class="!h-8 !px-2.5 !bg-white hover:!bg-[color:var(--color-fill-neutral-2)] !border-[color:var(--color-border-2)]"
              title="系统通知"
            >
              <Bell class="w-4 h-4 text-[color:var(--color-text-neutral-2)]" />
            </el-button>
            <span
              v-if="unreadCount > 0"
              class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[color:var(--color-danger-6)]"
            />
          </div>
        </template>

        <!-- Popover 内部消息卡片 -->
        <div class="w-[290px] select-none py-1">
          <div class="flex items-center justify-between pb-3 border-b border-[color:var(--color-border-2)]">
            <span class="text-sm font-normal text-[color:var(--color-text-neutral-1)]">通知公告</span>
            <button
              type="button"
              @click="handleReadAll"
              class="text-sm text-[color:var(--color-text-brand-1)] hover:text-[color:var(--color-text-brand-2)] transition-colors cursor-pointer bg-transparent border-0 p-0 leading-none"
            >
              全部已读
            </button>
          </div>

          <div class="py-8 flex flex-col items-center justify-center min-h-[240px]">
            <svg
              width="160"
              height="140"
              viewBox="0 0 160 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="mb-3"
            >
              <ellipse cx="80" cy="122" rx="58" ry="8" fill="#F2F3F7" />
              <polygon points="55,18 96,12 114,44 73,50" fill="var(--color-grey-10)" />
              <polygon points="96,12 128,26 106,56 73,50" fill="#ECEEF2" />
              <polygon points="90,26 116,36 104,54 78,44" fill="#E2E5EC" />
              <polygon points="48,62 92,62 92,108 48,108" fill="var(--color-grey-9)" />
              <polygon points="92,62 116,62 116,108 92,108" fill="var(--color-grey-8)" />
              <polygon points="48,62 32,84 48,84" fill="#ECEEF2" />
              <polygon points="92,62 116,62 128,82 104,82" fill="var(--color-grey-10)" />
              <rect x="48" y="62" width="44" height="52" fill="var(--color-grey-10)" />
              <rect x="92" y="62" width="24" height="52" fill="#EAECEF" />
              <polygon points="92,62 104,82 92,86" fill="var(--color-grey-7)" />
            </svg>
            <span class="text-sm text-[color:var(--color-text-neutral-3)]">消息为空</span>
          </div>
        </div>
      </el-popover>

      <!-- 用户头像：点击呼出下拉菜单 -->
      <el-dropdown trigger="click" placement="bottom-end">
        <div
          class="flex items-center gap-2 cursor-pointer p-1 rounded-[4px] hover:bg-[color:color-mix(in_srgb,var(--color-fill-neutral-3)_60%,transparent)] transition-colors"
          title="点击展开菜单"
        >
          <div
            class="w-8 h-8 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center text-xs font-semibold overflow-hidden"
          >
            <img
              v-if="store.clientCanvas?.logoUrl"
              :src="store.clientCanvas.logoUrl"
              alt="avatar"
              class="w-full h-full object-cover"
            />
            <span v-else>
              {{ store.currentTenant?.name ? store.currentTenant.name.slice(0, 1) : '管' }}
            </span>
          </div>
        </div>

        <template #dropdown>
          <el-dropdown-menu class="min-w-[140px]">
            <el-dropdown-item @click="isProfileOpen = true">
              个人中心
            </el-dropdown-item>
            <div class="border-t border-[color:var(--color-grey-9)] my-1" />
            <el-dropdown-item class="!text-[color:var(--color-danger-6)]" @click="handleLogout">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 个人中心抽屉 (Element Plus Drawer 420px) -->
    <el-drawer
      v-model="isProfileOpen"
      title="个人中心"
      size="420px"
      append-to-body
    >
      <div class="space-y-6">
        <!-- 头像卡片展示与更换 -->
        <div class="flex items-center justify-between pb-4 border-b border-[color:var(--color-grey-9)]">
          <div class="flex items-center gap-3.5">
            <el-upload
              accept="image/png,image/jpeg,image/gif"
              :show-file-list="false"
              :auto-upload="false"
              :on-change="handleDirectAvatarUpload"
            >
              <div
                class="w-[54px] h-[54px] rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center text-xl font-semibold overflow-hidden relative group cursor-pointer"
                title="点击直接上传更换头像"
              >
                <img
                  v-if="store.clientCanvas?.logoUrl"
                  :src="store.clientCanvas.logoUrl"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
                <span v-else>
                  {{ store.currentTenant?.name ? store.currentTenant.name.slice(0, 1) : '管' }}
                </span>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Camera class="w-5 h-5" />
                </div>
              </div>
            </el-upload>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm text-[color:var(--color-text-neutral-1)]">
                  {{ store.currentTenant?.name || '企业系统管理员' }}
                </span>
                <el-tag size="small" type="success">认证企业</el-tag>
              </div>
              <div class="text-xs text-[color:var(--color-text-neutral-3)] font-mono">
                企业账号 ID: {{ store.currentTenant?.id }}
              </div>
            </div>
          </div>
          <el-button size="small" @click="handleOpenAvatarModal">更换头像</el-button>
        </div>

        <!-- 账号详细属性 -->
        <div class="space-y-3">
          <div class="font-medium text-xs text-[color:var(--color-text-neutral-1)]">
            基本档案与安全信息
          </div>
          <div class="space-y-2.5 text-xs">
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">所属企业租户</span>
              <span class="text-[color:var(--color-text-neutral-1)] font-medium">{{ store.currentTenant?.name || '-' }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">管理角色</span>
              <span class="text-[color:var(--color-text-neutral-1)] font-medium">展厅超级管理员 (Owner)</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">绑定手机</span>
              <span class="text-[color:var(--color-text-neutral-1)] font-mono">{{ store.currentTenant?.phone || '138****0000' }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">企业邮箱</span>
              <span class="text-[color:var(--color-text-neutral-1)] font-mono">{{ store.currentTenant?.email || 'admin@enterprise.com' }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">接入行业</span>
              <span class="text-[color:var(--color-text-neutral-1)]">{{ store.currentTenant?.industry || '科技数字化展厅' }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-[color:var(--color-grey-9)]">
              <span class="text-[color:var(--color-text-neutral-3)]">账户状态</span>
              <span class="text-[color:var(--color-success-6)] font-medium">
                {{ store.currentTenant?.status === 'NORMAL' ? '正常服务中' : '欠费处理中' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 业务快捷通道 -->
        <div class="space-y-2 pt-2">
          <div class="font-medium text-xs text-[color:var(--color-text-neutral-1)]">业务快捷通道</div>
          <div class="grid grid-cols-2 gap-2">
            <div
              @click="isProfileOpen = false; store.setClientNav('client-billing-bills')"
              class="p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] hover:bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)] cursor-pointer transition-colors text-xs"
            >
              <div class="font-medium text-[color:var(--color-text-neutral-1)]">用量账单</div>
              <div class="text-[11px] text-[color:var(--color-text-neutral-3)] mt-0.5">查看扣费明细</div>
            </div>

            <div
              @click="isProfileOpen = false; store.setClientNav('client-setting-device')"
              class="p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] hover:bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)] cursor-pointer transition-colors text-xs"
            >
              <div class="font-medium text-[color:var(--color-text-neutral-1)]">设备配置</div>
              <div class="text-[11px] text-[color:var(--color-text-neutral-3)] mt-0.5">纳管端侧参数</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isProfileOpen = false">关闭</el-button>
          <el-button type="primary" @click="handleSaveProfile">保存修改</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 更换头像 / 企业LOGO 弹窗 (Element Plus Dialog 520px) -->
    <el-dialog
      v-model="isAvatarModalOpen"
      title="更换头像 / 企业LOGO"
      width="520px"
      append-to-body
      class="rounded-[4px]"
    >
      <div class="space-y-4 py-1">
        <!-- 头像预览 -->
        <div class="flex items-center gap-4 p-4 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-border-2)]">
          <div class="w-16 h-16 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">
            <img
              v-if="tempLogoUrl"
              :src="tempLogoUrl"
              alt="logo"
              class="w-full h-full object-cover"
            />
            <span v-else>
              {{ store.currentTenant?.name ? store.currentTenant.name.slice(0, 1) : '管' }}
            </span>
          </div>
          <div>
            <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)]">当前头像效果预览</div>
            <div class="text-xs text-[color:var(--color-text-neutral-3)] mt-1">
              此头像将同步显示于控制台右上角及数字人大屏角标。
            </div>
          </div>
        </div>

        <!-- 预设品牌标志 -->
        <div>
          <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] mb-2">预设品牌Logo</div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="preset in avatarPresets"
              :key="preset.name"
              @click="tempLogoUrl = preset.url"
              class="flex items-center gap-2.5 p-2 rounded-[4px] border cursor-pointer transition-colors"
              :class="tempLogoUrl === preset.url ? 'border-[color:var(--color-border-5)] bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_30%,transparent)] text-[color:var(--color-text-brand-1)]' : 'border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-3)] bg-white text-[color:var(--color-text-neutral-1)]'"
            >
              <img
                :src="preset.url"
                :alt="preset.name"
                class="w-8 h-8 rounded-[4px] object-cover flex-shrink-0"
              />
              <span class="text-xs truncate">{{ preset.name }}</span>
            </div>
          </div>
        </div>

        <!-- 自定义图片URL -->
        <div>
          <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] mb-1.5">自定义图片地址 (URL)</div>
          <el-input
            v-model="tempLogoUrl"
            placeholder="请输入图片外链地址 https://..."
            clearable
          />
        </div>

        <!-- 大屏角标展示位置 -->
        <div>
          <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] mb-1.5">大屏角标展示位置</div>
          <el-select v-model="tempLogoPos" class="w-full">
            <el-option label="左上角 (TOP_LEFT)" value="TOP_LEFT" />
            <el-option label="右上角 (TOP_RIGHT)" value="TOP_RIGHT" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="isAvatarModalOpen = false">取消</el-button>
          <el-button type="primary" @click="handleSaveAvatar">确认保存</el-button>
        </div>
      </template>
    </el-dialog>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Bell, Camera } from 'lucide-vue-next';
import { usePlatformStore } from '../store/client';

const store = usePlatformStore();

const unreadCount = ref(0);
const popoverVisible = ref(false);
const isProfileOpen = ref(false);
const isAvatarModalOpen = ref(false);
const tempLogoUrl = ref(store.clientCanvas?.logoUrl || '');
const tempLogoPos = ref<'TOP_LEFT' | 'TOP_RIGHT'>(store.clientCanvas?.logoPosition || 'TOP_LEFT');

const avatarPresets = [
  { name: '西湖文旅金印徽标', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80' },
  { name: '智慧大厦数字中枢标', url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&q=80' },
  { name: '星潮智选MCN品牌标', url: 'https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=200&q=80' },
  { name: '未来极简科技蓝标', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80' }
];

const handleReadAll = () => {
  unreadCount.value = 0;
  ElMessage.success('已全部标记为已读');
};

const handleDirectAvatarUpload = (file: any) => {
  if (file.raw) {
    const rawFile = file.raw as File;
    if (rawFile.size > 5 * 1024 * 1024) {
      ElMessage.error('头像文件大小不能超过 5MB');
      return;
    }
    const url = URL.createObjectURL(rawFile);
    store.updateClientCanvas({
      logoUrl: url
    });
    ElMessage.success('头像更换成功');
  }
};

const handleOpenAvatarModal = () => {
  tempLogoUrl.value = store.clientCanvas?.logoUrl || '';
  tempLogoPos.value = store.clientCanvas?.logoPosition || 'TOP_LEFT';
  isAvatarModalOpen.value = true;
};

const handleSaveAvatar = () => {
  store.updateClientCanvas({
    logoUrl: tempLogoUrl.value,
    logoPosition: tempLogoPos.value
  });
  ElMessage.success('头像 / 企业LOGO更新成功');
  isAvatarModalOpen.value = false;
};

const handleSaveProfile = () => {
  ElMessage.success('个人设置已保存生效');
  isProfileOpen.value = false;
};

const handleLogout = () => {
  ElMessageBox.confirm(
    '退出登录后将清除当前会话状态，确认退出当前账号？',
    '确认退出登录',
    {
      confirmButtonText: '退出登录',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(() => {
    ElMessage.success('已安全退出登录');
  }).catch(() => {});
};
</script>
