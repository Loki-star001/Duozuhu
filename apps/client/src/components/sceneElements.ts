export const extraElementKinds = ['banner', 'notice', 'list', 'comparison', 'custom', 'popup', 'volume', 'refresh', 'text', 'shape', 'texture', 'icon', 'divider', 'effects', 'metric', 'qrcode', 'countdown', 'chart'] as const;
export type ExtraElementKind = typeof extraElementKinds[number];
export interface SceneExtraElement {
  kind: ExtraElementKind; enabled: boolean; title: string; content: string;
  color: string; background: string; fontSize: number; value: number; unit: string;
  shape: 'rectangle' | 'rounded' | 'pill' | 'circle' | 'diamond' | 'triangle' | 'hexagon' | 'star'; icon: string; deadline: string;
}
export const sceneElementCatalog = [
  { id: 'background', label: '背景' }, { id: 'person', label: '虚拟人' }, { id: 'logo', label: 'Logo' },
  { id: 'buttons', label: '金刚区' }, { id: 'banner', label: '横幅' }, { id: 'notice', label: '公告' },
  { id: 'list', label: '列表卡片' }, { id: 'comparison', label: '信息对照栏' }, { id: 'dialogue', label: '问答' },
  { id: 'media', label: '多媒体' }, { id: 'time', label: '日期时间' }, { id: 'custom', label: '自定义控件' },
  { id: 'popup', label: '弹层' }, { id: 'input', label: '输入框' }, { id: 'volume', label: '音量控制' },
  { id: 'refresh', label: '刷新页面' }, { id: 'text', label: '文本' }, { id: 'shape', label: '形状色块' },
  { id: 'texture', label: '纹理底纹' }, { id: 'icon', label: '图标' }, { id: 'divider', label: '分隔线' },
  { id: 'effects', label: '动态特效' }, { id: 'metric', label: '数值指标' }, { id: 'qrcode', label: '二维码' },
  { id: 'countdown', label: '倒计时' }, { id: 'chart', label: '图表' }
];
export const extraElementLabel = (kind: string) => sceneElementCatalog.find(item => item.id === kind)?.label || kind;
export const extraElementId = (kind: string) => `element-${kind}`;

export function createSceneExtraElement(kind: ExtraElementKind): SceneExtraElement {
  const contents: Partial<Record<ExtraElementKind, string>> = {
    banner: '欢迎体验数字人互动服务', notice: '欢迎参观，请有序体验',
    list: '展厅导览|了解展厅核心看点与路线\n互动体验|体验数字人实时问答与服务\n常见问题|常见服务问题获取解答',
    comparison: '服务时间|09:00—18:00\n服务地点|一楼咨询台',
    text: '请输入展示文字', popup: '在这里填写弹层详细介绍内容', custom: '自定义展示内容',
    qrcode: '数字人互动服务', chart: '展区一|65\n展区二|82\n展区三|48'
  };
  return {
    kind,
    enabled: true,
    title: extraElementLabel(kind),
    content: contents[kind] || '',
    color: '#165DFF',
    background: 'rgba(255, 255, 255, 0.94)',
    fontSize: 20,
    value: kind === 'volume' ? 60 : 128,
    unit: '人',
    shape: 'rectangle',
    icon: 'info',
    deadline: new Date(Date.now() + 86400000).toISOString()
  };
}

export function extraElementBox(kind: ExtraElementKind) {
  const sizes: Partial<Record<ExtraElementKind, [number, number]>> = {
    banner: [84, 8], notice: [84, 6], list: [64, 22], comparison: [64, 16],
    custom: [60, 10], popup: [56, 9], volume: [54, 7], refresh: [30, 6],
    text: [70, 9], shape: [35, 18], texture: [70, 25], icon: [12, 6.75],
    divider: [80, 2], effects: [40, 22.5], metric: [40, 12], qrcode: [28, 18],
    countdown: [60, 12], chart: [68, 20]
  };
  const [w, h] = sizes[kind] || [60, 12];
  let y = 35;
  if (['banner', 'notice', 'volume', 'refresh'].includes(kind)) y = 14;
  else if (['metric', 'countdown'].includes(kind)) y = 20;
  else if (['chart', 'list', 'comparison'].includes(kind)) y = 48;
  else if (kind === 'qrcode') y = 52;
  else if (kind === 'popup') y = 38;
  return { x: (100 - w) / 2, y, w, h };
}

export function restoreExtraElements(value: unknown): Record<string, SceneExtraElement> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, SceneExtraElement> = {};
  for (const kind of extraElementKinds) {
    const id = extraElementId(kind), saved = (value as Record<string, any>)[id];
    if (saved && typeof saved === 'object') {
      const item = { ...createSceneExtraElement(kind), ...saved, kind };
      // 自动升级旧版的冷灰配色至通透白玻与科技蓝标准
      if (item.color === '#536A91') item.color = '#165DFF';
      if (item.background === '#F0F4FA' || item.background === '#ffffff') item.background = 'rgba(255, 255, 255, 0.94)';
      if (typeof item.fontSize === 'number' && item.fontSize < 20) item.fontSize = 20;
      result[id] = item;
    }
  }
  return result;
}

export function elementRows(content: string) {
  return content.split('\n').map(line => line.split('|').map(part => part.trim())).filter(row => row[0]);
}
