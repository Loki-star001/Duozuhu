const pinxinStops = [
  { title: '入口大厅', x: 12, y: 430, w: 96, h: 112, type: 'lounge' },
  { title: '接待服务台', x: 124, y: 430, w: 112, h: 112, type: 'desk' },
  { title: '品牌展示区', x: 288, y: 430, w: 100, h: 112, type: 'display' },
  { title: '企业历程廊', x: 404, y: 430, w: 116, h: 112, type: 'gallery' },
  { title: '数字人体验区', x: 12, y: 226, w: 110, h: 142, type: 'display' },
  { title: '形象定制区', x: 138, y: 226, w: 98, h: 142, type: 'desk' },
  { title: '语音互动区', x: 288, y: 226, w: 104, h: 142, type: 'lounge' },
  { title: '视频创作区', x: 408, y: 226, w: 112, h: 142, type: 'display' },
  { title: '虚拟演播室', x: 12, y: 12, w: 128, h: 152, type: 'display' },
  { title: '行业案例区', x: 156, y: 12, w: 80, h: 152, type: 'gallery' },
  { title: '多媒体展区', x: 288, y: 12, w: 108, h: 152, type: 'gallery' },
  { title: '交流休息区', x: 412, y: 12, w: 108, h: 152, type: 'lounge' },
] as const;

export type ExhibitionStop = {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'lounge' | 'desk' | 'display' | 'gallery';
};

const museumStops = [
  { title: '序厅', type: 'lounge' },
  { title: '游客服务台', type: 'desk' },
  { title: '馆史展区', type: 'gallery' },
  { title: '历史展厅', type: 'gallery' },
  { title: '陶瓷展区', type: 'display' },
  { title: '书画展区', type: 'gallery' },
  { title: '工艺展区', type: 'display' },
  { title: '数字体验区', type: 'desk' },
  { title: '临时展厅', type: 'gallery' },
  { title: '互动教育区', type: 'desk' },
  { title: '文创商店', type: 'display' },
  { title: '休息区', type: 'lounge' },
] as const;

export const halls = [
  {
    id: 'museum',
    title: '博物馆一楼',
    stops: pinxinStops.map((room, index): ExhibitionStop => ({ ...room, ...museumStops[index] })),
  },
  { id: 'pinxin', title: '品信展厅', stops: pinxinStops },
] as const;

export const stopNumber = (index: number) => String(index + 1).padStart(2, '0');

// 产品与行业场景文字取自品信官网 pinxin-web/src/App.tsx。
export const catalog = [
  {
    section: 'products', preview: 'editor', title: '视频生成', summary: '让内容创作更简单',
    text: '输入讲解文案，搭配数字人形象、声音和画面，制作课程讲解、产品介绍或宣传视频。',
    detailItems: ['把课程文稿转成数字人讲解视频。', '按产品特点编排介绍文案和画面。', '让数字人在统一的品牌场景中播报宣传内容。'],
  },
  {
    section: 'products', preview: 'conversation', title: '数字人交互', summary: '让沟通与服务更自然',
    text: '结合实时语音交互和业务知识库，让数字人承担咨询、讲解与问答工作。',
    detailItems: ['向来访者介绍展区和产品。', '结合服务资料回答常见业务问题。', '根据访客的提问讲解相关知识。'],
  },
  {
    section: 'products', preview: 'studio', title: '数字人直播', summary: '让直播内容持续呈现',
    text: '结合数字人形象、讲解内容和虚拟场景，为直播与演播提供定制化方案。',
    detailItems: ['在直播中分段讲解产品。', '将数字人和活动画面编排在一起。', '在虚拟场景中播报定时更新的内容。'],
  },
  {
    section: 'cases', title: '政务大厅数字服务', summary: '智慧政务', text: '提供政策讲解、业务咨询与办事指引。',
    detailItems: ['访客提出要办理的业务。', '数字人根据业务资料说明所需材料和办理步骤。'],
  },
  {
    section: 'cases', title: '景区 AI 伴游助手', summary: '智慧文旅', text: '定制文旅数字人，提供景点讲解与智能导览。',
    detailItems: ['游客询问感兴趣的景点。', '数字人介绍景点，并结合景区资料提供参观指引。'],
  },
  {
    section: 'cases', title: '数字人课程讲解', summary: '教育教学', text: '结合课程内容，让教学与培训更生动。',
    detailItems: ['将课程文稿拆成可独立观看的讲解片段。', '按课程主题搭配数字人、配音和课件画面。'],
  },
  {
    section: 'cases', title: '数字人主持与虚拟演播', summary: '虚拟演播', text: '搭配虚拟场景，呈现播报与讲解内容。',
    detailItems: ['按节目流程组织播报稿和画面素材。', '由数字人在虚拟场景中完成主持或内容讲解。'],
  },
] as const;
