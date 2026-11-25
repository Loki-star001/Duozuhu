import { createApp, h, onBeforeUnmount, onMounted, ref } from 'vue';
import ScenePersonPreview from '../src/components/ScenePersonPreview.vue';

createApp({
  setup() {
    const speaking = ref(false);
    const host = ref<HTMLElement>();
    const report = ref('等待视频首帧');
    let observer = 0, seenVideo = false, blankFrames = 0, posterFrames = 0;
    const probe = document.createElement('canvas');
    probe.width = probe.height = 16;
    const context = probe.getContext('2d', { willReadFrequently: true });
    const inspect = () => {
      const element = host.value;
      if (element) {
        const canvas = element.querySelector('canvas');
        const image = element.querySelector('img');
        let drawn = false;
        if (canvas && context && getComputedStyle(canvas).display !== 'none' && canvas.width > 0) {
          context.globalCompositeOperation = 'copy';
          context.drawImage(canvas, 0, 0, 16, 16);
          const pixels = context.getImageData(0, 0, 16, 16).data;
          let foreground = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 64) foreground++;
          drawn = foreground >= 8;
        }
        const poster = image && getComputedStyle(image).display !== 'none' && image.complete && image.naturalWidth > 0;
        if (seenVideo) {
          if (!drawn && !poster) blankFrames++;
          if (poster) posterFrames++;
        }
        if (drawn) seenVideo = true;
        report.value = seenVideo ? `像素空白帧：${blankFrames} / 回退首图：${posterFrames}` : '等待视频首帧';
      }
      observer = requestAnimationFrame(inspect);
    };
    onMounted(() => { observer = requestAnimationFrame(inspect); });
    onBeforeUnmount(() => cancelAnimationFrame(observer));
    const activeVideo = () => host.value?.querySelectorAll('video')[speaking.value ? 1 : 0];
    return () => h('main', { style: { padding: '24px', fontFamily: 'Arial, sans-serif' } }, [
      h('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } }, [
        h('button', { onClick: () => activeVideo()?.pause() }, '暂停视频'),
        h('button', { onClick: () => { void activeVideo()?.play(); } }, '继续播放'),
        h('button', { onClick: () => {
          const video = activeVideo();
          if (video) { video.src = '/__test-unavailable-person.webm'; video.load(); }
        } }, '模拟播放失败'),
        h('button', { onClick: () => { speaking.value = !speaking.value; } }, '切换待机与说话'),
      ]),
      h('p', { role: 'status' }, report.value),
      h('div', { ref: host, style: { width: '360px', height: '640px', background: '#E3EBF3' } }, h(ScenePersonPreview, { speaking: speaking.value })),
    ]);
  },
}).mount('#root');
