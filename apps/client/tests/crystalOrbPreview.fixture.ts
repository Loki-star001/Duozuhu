import { createApp, h } from 'vue';
import SceneVoiceButton, { type VoiceState } from '../src/components/SceneVoiceButton.vue';
import '../src/index.css';

const states: { state: VoiceState; label: string }[] = [
  { state: 'idle', label: '待命' },
  { state: 'listening', label: '倾听中 · 细流光' },
  { state: 'speaking', label: '播报中 · 柔流光' },
];

createApp({
  render: () => h('main', { style: { width: '1080px', padding: '28px', background: '#F4F6FA', fontFamily: 'Arial, "Microsoft YaHei", sans-serif', boxSizing: 'border-box' } }, [
    h('h1', { style: { margin: '0 0 20px', color: '#263B52', fontSize: '22px' } }, '水晶质感 · 高光与流光状态'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' } },
      states.map(({ state, label }) => h('section', { style: { background: '#FFF', padding: '24px 0 20px', textAlign: 'center' }, 'aria-label': label }, [
        h('div', { style: { height: '276px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(SceneVoiceButton, { theme: 'crystal', state, size: '224px', animationDuration: 45, interactive: false })),
        h('p', { style: { margin: '12px 0 0', color: '#33465D', fontSize: '16px' } }, label),
      ]))),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' } },
      states.map(({ state, label }) => h('section', { style: { background: '#263144', padding: '24px 0', textAlign: 'center' }, 'aria-label': `${label}深色背景` }, [
        h('div', { style: { height: '276px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(SceneVoiceButton, { theme: 'crystal', state, size: '224px', animationDuration: 45, interactive: false })),
      ]))),
  ]),
}).mount('#root');
