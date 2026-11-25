import { computed, nextTick, ref, type CSSProperties, type Ref } from 'vue';

export interface ElementBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MorphRect {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: string;
  activeCapsule: boolean;
}

export interface ConversationMorphOptions {
  screenWidth: Ref<number> | { value: number };
  screenHeight: Ref<number> | { value: number };
  getVoiceBox: () => ElementBox | undefined;
  getDialogueBox: () => ElementBox | undefined;
  getVoiceSize?: () => number;
}

export function computeMorphGeometries(
  sw: number,
  sh: number,
  vBox: ElementBox = { x: 42, y: 73, w: 16, h: 9 },
  dBox: ElementBox = { x: 12.2, y: 30.1, w: 75.6, h: 23.2 },
  voiceDiameter?: number
) {
  // 1. 交互球（起始状态）几何：以 voice 区域中心为圆心
  const vCenterX = (vBox.x + vBox.w / 2) * (sw / 100);
  const vCenterY = (vBox.y + vBox.h / 2) * (sh / 100);
  const orbSize = Math.max(
    48,
    voiceDiameter || Math.min((vBox.w * sw) / 100, (vBox.h * sh) / 100, 84)
  );

  const startRect: MorphRect = {
    left: Math.round(vCenterX - orbSize / 2),
    top: Math.round(vCenterY - orbSize / 2),
    width: Math.round(orbSize),
    height: Math.round(orbSize),
    borderRadius: '50%',
    activeCapsule: false
  };

  // 展开几何与实际输入条一致：占对话容器高度的 24.5%。
  const dLeft = Math.round(dBox.x * (sw / 100));
  const dWidth = Math.round(dBox.w * (sw / 100));
  const dBottom = Math.round((dBox.y + dBox.h) * (sh / 100));
  const inputHeight = Math.round(dBox.h * sh / 100 * 0.245);
  const dTop = dBottom - inputHeight;

  const endRect: MorphRect = {
    left: dLeft,
    top: dTop,
    width: dWidth,
    height: inputHeight,
    borderRadius: `${Math.round(inputHeight * 0.2)}px`,
    activeCapsule: true
  };

  return { startRect, endRect, orbSize };
}

export function useConversationMorph(options: ConversationMorphOptions) {
  const isMorphing = ref(false);
  const morphPhase = ref<'idle' | 'expanding' | 'collapsing'>('idle');
  const morphOrbSize = ref('80px');
  const morphContentOpacity = ref(0);

  const currentRect = ref<MorphRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    borderRadius: '50%',
    activeCapsule: false
  });

  let morphTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelMorph = () => {
    if (morphTimer) {
      clearTimeout(morphTimer);
      morphTimer = undefined;
    }
  };

  const morphStyle = computed<CSSProperties>(() => ({
    left: `${currentRect.value.left}px`,
    top: `${currentRect.value.top}px`,
    width: `${currentRect.value.width}px`,
    height: `${currentRect.value.height}px`,
    borderRadius: currentRect.value.borderRadius
  }));

  const triggerExpand = (onComplete?: () => void) => {
    cancelMorph();
    const sw = options.screenWidth.value || 1080;
    const sh = options.screenHeight.value || 1920;
    const vBox = options.getVoiceBox();
    const dBox = options.getDialogueBox();
    const vSize = options.getVoiceSize ? options.getVoiceSize() : undefined;

    const { startRect, endRect, orbSize } = computeMorphGeometries(sw, sh, vBox, dBox, vSize);

    // 第一帧：定位在交互球圆心，无胶囊背景
    currentRect.value = { ...startRect };
    morphOrbSize.value = `${Math.round(orbSize * 0.72)}px`;
    morphContentOpacity.value = 0;
    isMorphing.value = true;
    morphPhase.value = 'expanding';

    // 第二帧启动过渡：展开尺寸匹配实际输入条
    void nextTick(() => {
      requestAnimationFrame(() => {
        currentRect.value = { ...endRect };
        morphOrbSize.value = `${Math.round(endRect.height * 0.7)}px`;
        morphContentOpacity.value = 1;

        morphTimer = setTimeout(() => {
          isMorphing.value = false;
          morphPhase.value = 'idle';
          if (onComplete) onComplete();
        }, 400);
      });
    });
  };

  const triggerCollapse = (onComplete?: () => void) => {
    cancelMorph();
    const sw = options.screenWidth.value || 1080;
    const sh = options.screenHeight.value || 1920;
    const vBox = options.getVoiceBox();
    const dBox = options.getDialogueBox();
    const vSize = options.getVoiceSize ? options.getVoiceSize() : undefined;

    const { startRect, endRect } = computeMorphGeometries(sw, sh, vBox, dBox, vSize);

    // 第一帧：定位在输入框位置
    currentRect.value = { ...endRect };
    morphOrbSize.value = `${Math.round(endRect.height * 0.7)}px`;
    morphContentOpacity.value = 1;
    isMorphing.value = true;
    morphPhase.value = 'collapsing';

    // 第二帧启动收缩：平滑飞回交互球位置，收拢为圆
    void nextTick(() => {
      requestAnimationFrame(() => {
        morphContentOpacity.value = 0;
        currentRect.value = { ...startRect };
        morphOrbSize.value = `${startRect.width * 0.72}px`;

        morphTimer = setTimeout(() => {
          isMorphing.value = false;
          morphPhase.value = 'idle';
          if (onComplete) onComplete();
        }, 400);
      });
    });
  };

  return {
    isMorphing,
    morphPhase,
    currentRect,
    morphStyle,
    morphOrbSize,
    morphContentOpacity,
    triggerExpand,
    triggerCollapse,
    cancelMorph
  };
}
