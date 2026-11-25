export type OverdueStatus = 'NORMAL' | 'WARNING' | 'BLOCK_GEN' | 'SUSPENDED';

export interface Customer {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  status: OverdueStatus;
  tokenBalance: number;
  frozenTokens: number;
  totalRechargedRmb: number;
  totalTokensConsumed: number;
  createdAt: string;
  boundMachinesCount: number;
  boundKbCount: number;
  industry: string;
  notes: string;
}

export type MachineStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';

export interface Machine {
  id: string;
  machineCode: string;
  secretKey?: string;
  macAddress: string;
  name: string;
  customerId: string;
  customerName: string;
  status: MachineStatus;
  ip: string;
  ipAddress?: string;
  lastHeartbeat: string;
  activeMode: 'STANDBY' | 'SHOWCASE' | 'MARKETING';
  volume: number; // 0 - 100
  gpuUsage: number;
  cpuUsage: number;
  memoryUsage: number;
  location: string;
  appVersion: string;
}

export type PaymentChannel = 'WECHAT' | 'ALIPAY' | 'WIRE' | 'STRIPE';

export interface PaymentRecord {
  id: string;
  tradeNo: string;
  customerId: string;
  customerName: string;
  channel: PaymentChannel;
  amountRmb: number;
  tokensGranted: number;
  bonusTokens: number;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  paidAt: string;
  invoiceStatus: 'ISSUED' | 'NOT_APPLIED' | 'PENDING';
}

export type ClientNavKey =
  | 'client-home'
  | 'client-device-list'
  | 'client-device-greetings'
  | 'client-content-faq'
  | 'client-content-kb'
  | 'client-content-sensitive'
  | 'client-setting-persona'
  | 'client-setting-assets'
  | 'client-setting-device'
  | 'client-billing-usage'
  | 'client-billing-bills';

export interface ClientFaqItem {
  id: string;
  machineName?: string;
  question: string;
  similarQuestions: string[];
  answer: string;
  category: string;
  hitCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createTime: string;
}

export interface ClientQaLogItem {
  id: string;
  mac: string;
  deviceName: string;
  userQuestion: string;
  replyText: string;
  hitType: 'FAQ_EXACT' | 'RAG_DOC' | 'LLM_GEN' | 'FALLBACK';
  latencyMs: number;
  tokensConsumed: number;
  timestamp: string;
}

export interface ClientSceneCanvasConfig {
  // 1. 背景
  bgType: 'COLOR' | 'IMAGE';
  bgColor: string;
  bgImageUrl: string;
  // 2. 品牌标识
  showLogo: boolean;
  logoUrl: string;
  logoPosition: 'TOP_LEFT' | 'TOP_RIGHT';
  showQrCode: boolean;
  qrCodeUrl: string;
  qrCodeText: string;
  // 3. 互动入口 (快捷按键)
  kingkongButtons: Array<{ id: string; label: string; prompt: string; answer?: string; icon?: string }>;
  // 4. 展示内容 (画中画/展播素材)
  showMediaOverlay: boolean;
  mediaOverlayTitle: string;
  mediaOverlayUrl: string;
  mediaOverlayType?: 'IMAGE' | 'VIDEO';
  mediaOverlayPosition?: 'TOP_RIGHT' | 'RIGHT' | 'TOP_LEFT';
  // 数字人立绘站位
  avatarPosition: 'LEFT' | 'CENTER' | 'RIGHT';
}
