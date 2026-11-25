// Dev-only fixture: does not read or write the user's scene storage.
import { createApp, h } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '../src/client-dialog-standard.css';
import SceneInteractionPreview from '../src/components/SceneInteractionPreview.vue';

const options = new URLSearchParams(location.search);
const landscape = options.has('landscape');
const boxes = {
  person: { x: -10, y: 9, w: 96, h: 84 }, logo: { x: 7, y: 5, w: 10, h: 6 },
  'kk-time': { x: 58, y: 5, w: 35, h: 7 },
  'kk-1': { x: 62, y: 40, w: 31, h: 6.6 }, 'kk-2': { x: 62, y: 48.6, w: 31, h: 6.6 },
  'kk-3': { x: 62, y: 57.2, w: 31, h: 6.6 }, 'kk-4': { x: 62, y: 65.8, w: 31, h: 6.6 },
  dialogue: { x: 42, y: 48, w: 51, h: 31 }, subtitle: { x: 7, y: 85, w: 86, h: 7 }
};
if (options.has('voice-feedback')) Object.assign(boxes, {
  voice: { x: 42, y: 72, w: 16, h: 9 },
  input: { x: 22, y: 85, w: 56, h: 5.2 },
});
const buttons = ['公司介绍', '新闻', '最近热点', '天气情况'].map((label, index) => ({ id: index + 1, label, prompt: `请介绍${label}`, enabled: index !== 3 }));
const scene = {
  width: landscape ? 1920 : 1080, height: landscape ? 1080 : 1920,
  bgColor: '#eff2f9', bgType: 'IMAGE', bgImageUrl: '/scene-presets/soft-studio.svg', logoUrl: '/logo.svg',
  clock: '12:00:00', timezone: '北京时间 (UTC+8)', boxes,
  layers: Object.keys(boxes).filter(id => !(id === 'dialogue' && options.has('no-dialogue')) && !(id === 'subtitle' && options.has('no-subtitle')) && !(id.startsWith('kk-') && id !== 'kk-time' && (id === 'kk-4' || options.has('no-shortcuts')))).map(id => ({ id, label: id })),
  buttons, showKingkong: !options.has('no-shortcuts'), multimediaUrl: '', isImageMedia: true,
  question: '请介绍展厅的主要展区', welcome: '您好，您可以直接提问，也可以点击下方快捷入口。',
  answer: options.has('long') ? '欢迎来到展厅。这里以图文、实物与互动体验展示各展区内容，您可以根据兴趣选择参观顺序。'.repeat(24) : '欢迎来到展厅。您可以先了解主题展区，再选择感兴趣的内容继续提问。'
};
createApp({ render: () => h(SceneInteractionPreview, { scene }) }).use(ElementPlus).mount('#root');
