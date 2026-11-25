<template>
  <div @pointerdown.capture="beginSceneGesture" v-loading="loading" :inert="loadFailed" class="client-scene-layout scene-editor-layout flex-1 flex min-h-0 overflow-hidden bg-white">
    <div class="client-scene-preview-pane flex flex-col min-w-0 h-full">
      <!-- 顶部工具条：左上角 自适应与放大镜/缩小镜，右上角 交互预览 与 应用 -->
      <div class="scene-editor-stage-header flex items-center justify-between pb-2.5 flex-shrink-0 select-none">
        <!-- 左上角：自适应与放大缩小 (放大镜/缩小镜，无文字) -->
        <div class="inline-flex items-center gap-1.5">
          <el-button
            size="small"
            :type="zoomLevel === 'fit' ? 'primary' : 'default'"
            @click="zoomFit"
          >
            自适应
          </el-button>
          <el-button size="small" @click="zoomIn" title="放大" aria-label="放大">
            <ZoomIn :size="15" />
          </el-button>
          <el-button size="small" @click="zoomOut" title="缩小" aria-label="缩小">
            <ZoomOut :size="15" />
          </el-button>
        </div>

        <!-- 右上角：已保存指示器 + 交互预览(次按钮) 与 应用(主按钮) 规范严格等高按钮 -->
        <div class="inline-flex items-center gap-2.5">
          <!-- 已保存标签 (绿色+圆圈对号，半透明绿底，自动显隐) -->
          <Transition name="el-fade-in-linear">
            <div
              v-if="showSavedBadge"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#00B42A]/10 border border-[#00B42A]/25 text-[#00B42A] text-xs font-medium select-none"
            >
              <CheckCircle2 :size="13" class="text-[#00B42A]" />
              <span>已保存</span>
            </div>
          </Transition>

          <el-button
            class="stage-action-btn"
            style="height: 32px !important; min-height: 32px !important; max-height: 32px !important; line-height: 30px !important; box-sizing: border-box !important;"
            @click="selectedId = ''; interactionOpen = true"
          >
            交互预览
          </el-button>
          <el-button
            class="stage-action-btn"
            type="primary"
            style="height: 32px !important; min-height: 32px !important; max-height: 32px !important; line-height: 30px !important; box-sizing: border-box !important;"
            :loading="isApplying"
            @click="handleApplyScreenComposition"
          >
            应用
          </el-button>
        </div>
      </div>
      <div
        ref="stageRef"
        class="scene-editor-stage"
        :class="{ 'is-zoomed': zoomLevel !== 'fit' }"
        :style="zoomLevel !== 'fit' ? { overflow: 'auto', display: 'block', padding: '24px' } : {}"
        @pointerdown="handleStagePointerDown"
      >
        <div
          class="scene-editor-canvas-frame"
          :style="[canvasFrameStyle, zoomLevel !== 'fit' ? { margin: '0 auto' } : {}]"
        >
        <div ref="canvasRef" data-scene-presentation class="scene-edit-canvas scene-screen-composed" :style="[canvasStyle, { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)' }]" >
          <div v-show="showBackground" class="scene-fixed-background scene-background-content" aria-hidden="true" :style="{ backgroundColor: bgColor, backgroundImage: bgType === 'IMAGE' && bgImageUrl ? `url(${bgImageUrl})` : undefined }" />
          <SceneTransformElement
            v-for="layer in renderedLayers"
            :key="layer.id"
            :box="displayedBox(layer.id)"
            :z="visibleLayers.findIndex(item => item.id === layer.id) + 1"
            :label="layer.label"
            :selected="selectedId === layer.id"
            :lock-aspect="layer.id === 'person' || layer.id === 'logo' || layer.id === 'voice' || layer.id === 'kingkong-rail' || layer.id === 'dialogue' || layer.id.startsWith('kk-')"
            :can-delete="layer.id !== 'background' && layer.id !== 'person'"
            @select="selectLayer(layer.id)"
            @change="box => updateBox(layer.id, box)"
            @remove="deleteLayerById(layer.id)"
          >
            <div class="scene-editor-element-appearance" inert>
            <SceneExtraElement v-if="extraElements[layer.id]" class="pointer-events-none" :element="extraElements[layer.id]" :scale="1" />
            <ScenePersonPreview v-else-if="layer.id === 'person'" :key="machineId" :media="personMedia" :speaking="false" class="scene-person-content" />
            <SceneFloatingTopBar
              v-else-if="layer.id === 'topbar'"
              :show-banner="showBanner"
              :show-logo="showLogo"
              :show-time="timeKkEnabled"
              :time-display-mode="timeDisplayMode"
              :logo-url="logoUrl"
              :clock="currentKkTime"
              :time-text="currentKkTime"
              :date-text="currentKkDate"
              :timezone="timeKkTimezoneLabel"
              :show-volume="showVolume"
              :is-muted="isVolumeMuted"
              :show-refresh="showRefresh"
            />
            <SceneKingkongRail
              v-else-if="layer.id === 'kingkong-rail'"
              :items="kingkongList"
              editing
            />

            <!-- 3. 语音交互光球按钮 -->
            <div
              v-else-if="layer.id === 'voice'"
              class="w-full h-full flex flex-col items-center justify-center cursor-pointer select-none overflow-visible"
            >
              <SceneVoiceButton
                :state="voiceInteractiveState === 'idle' ? 'idle' : demoVoiceState"
                :theme="voiceTheme"
                :size="voiceCanvasSize"
                :animation-duration="voiceAnimationDuration"
                :interactive="false"
              />
            </div>
            

            <template v-else-if="layer.id === 'media'">
              <img v-if="multimediaUrl && isImageMedia" :src="multimediaUrl" alt="多媒体" class="scene-media-content" :class="{ 'elder2-multimedia': machineId === 'DEV-02' }" draggable="false" />
              <video v-else-if="multimediaUrl" :src="multimediaUrl" class="scene-media-content" :class="{ 'elder2-multimedia': machineId === 'DEV-02' }" autoplay muted loop playsinline />
              <div v-else class="scene-media-placeholder"><Film :size="24" /><span>视频播放</span></div>
            </template>
            <SceneConversationAppearance
              v-else-if="layer.id === 'dialogue'"
              :state="voiceInteractiveState === 'idle' ? 'idle' : demoVoiceState"
              :card-state="voiceInteractiveState === 'idle' ? 'idle' : demoCardState"
              :question="voiceInteractiveState === 'idle' ? '' : demoQuestionText"
              :answer="voiceInteractiveState === 'idle' ? '' : demoAnswerText"
              :placeholder="inputPlaceholder" :show-dialogue="showDialogue" :show-input="showInput"
              :voice-theme="voiceTheme" :animation-duration="voiceAnimationDuration"
              :width="dialogueAppearanceWidth" :height="dialogueAppearanceHeight"
            />
            </div>
          </SceneTransformElement>
        </div>
        </div>
      </div>

    </div>
    <!-- 右侧栏：场景配置项卡片流 (按比例自适应宽度 44%) -->
    <div class="client-scene-properties scene-settings-shell">

      <div class="scene-settings-main">
        <section v-if="currentVisibilityControls.length" class="scene-visibility-header" aria-label="控件显示设置">
          <div v-for="control in currentVisibilityControls" :key="control.label" class="scene-visibility-row">
            <span>{{ control.label }}</span>
            <el-switch :model-value="control.enabled" :aria-label="control.ariaLabel" :disabled="loading || loadFailed"
              @change="enabled => setControlVisibility(control, Boolean(enabled))" />
          </div>
        </section>
      <div class="scene-settings-content">
      <section class="scene-selection-inspector" :class="{ 'is-collapsed': !selectedBox }">
        <div class="flex items-center gap-2">
          <el-select v-model="selectedId" placeholder="选择或切换图层..." aria-label="选中图层" clearable class="flex-1" @change="revealLayer">
            <el-option v-for="layer in [...visibleLayers].reverse()" :key="layer.id" :label="layer.label" :value="layer.id" />
          </el-select>
        </div>
        <div v-if="selectedBox" class="mt-2.5 p-3 rounded-[4px] border border-[color:var(--color-border-2)] bg-white space-y-2.5">
          <div class="scene-layer-order-heading !mt-0"><span>图层顺序</span><span>层级：{{ selectedLayerIndex + 1 }} / {{ visibleLayers.length }}</span></div>
          <div class="scene-layer-actions">
            <el-button :disabled="selectedLayerIndex === visibleLayers.length - 1" @click="moveLayerEdge('top')"><BringToFront :size="14" /><span>置顶</span></el-button>
            <el-button :disabled="selectedLayerIndex === visibleLayers.length - 1" @click="moveLayer(selectedId, 1)"><ArrowUp :size="14" /><span>上移</span></el-button>
            <el-button :disabled="selectedLayerIndex === 0" @click="moveLayer(selectedId, -1)"><ArrowDown :size="14" /><span>下移</span></el-button>
            <el-button :disabled="selectedLayerIndex === 0" @click="moveLayerEdge('bottom')"><SendToBack :size="14" /><span>置底</span></el-button>
          </div>
          <div v-if="selectedId !== 'background'" class="scene-align-section pt-2 mt-2 border-t border-[color:var(--color-grey-9)]">
            <div class="scene-layer-order-heading !mt-0 !mb-1.5"><span>画面居中</span></div>
            <div class="scene-layer-actions">
              <el-button @click="centerLayerHorizontal"><AlignHorizontalJustifyCenter :size="14" /><span>水平居中</span></el-button>
              <el-button @click="centerLayerVertical"><AlignVerticalJustifyCenter :size="14" /><span>垂直居中</span></el-button>
            </div>
          </div>
          <div v-if="selectedId !== 'background'" class="scene-position-fields">
            <label v-for="field in inspectorBoxFields" :key="field.key">{{ field.label }}<el-input-number :model-value="Math.round(selectedBox[field.key] * 10) / 10" :min="field.key === 'w' || field.key === 'h' ? 2 : -300" :max="300" :step="1" :precision="1" controls-position="right" :aria-label="field.label" @change="value => setBoxField(field.key, value)" /></label>
          </div>
        </div>
      </section>
      <SceneExtraElementSettings
        v-if="activeExtraElement"
        :key="settingsTab"
        :element="activeExtraElement"
        :show-visibility="false"
        @remove="deleteLayerById(extraElementId(settingsTab))"
      />
      <!-- Card 2: 设备背景 -->
      <div v-show="settingsTab === 'background'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
        <div class="text-xs font-bold text-[color:var(--color-text-neutral-1)] pb-2.5 border-b border-[color:var(--color-grey-9)]">
          设备背景
        </div>

        <!-- 纯色背景 | 图片背景 -->
        <div class="inline-flex items-center rounded-[4px] border border-[color:var(--color-border-2)] overflow-hidden bg-white">
          <button
            type="button"
            @click="bgType = 'COLOR'"
            class="h-7 px-3 text-xs font-medium transition-colors cursor-pointer"
            :class="bgType === 'COLOR' ? 'bg-[color:var(--color-fill-brand-1)] text-white' : 'bg-white text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)]'"
          >
            纯色背景
          </button>
          <button
            type="button"
            @click="bgType = 'IMAGE'"
            class="h-7 px-3 text-xs font-medium border-l border-[color:var(--color-border-2)] transition-colors cursor-pointer"
            :class="bgType === 'IMAGE' ? 'bg-[color:var(--color-fill-brand-1)] text-white' : 'bg-white text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-neutral-1)]'"
          >
            图片背景
          </button>
        </div>

        <template v-if="bgType === 'COLOR'">
          <!-- 当前颜色行 -->
          <div class="px-3 py-2 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-[color:var(--color-text-neutral-2)]">
              <span>当前颜色:</span>
              <span
                class="w-4 h-4 rounded-[2px] border border-[color:var(--color-border-2)] inline-block"
                :style="{ backgroundColor: bgColor }"
              />
              <span class="font-mono">{{ bgColor }}</span>
            </div>
            <button
              type="button"
              @click="bgColor = '#D09595'"
              class="px-2.5 py-0.5 rounded-[4px] border border-[color:var(--color-border-2)] bg-white text-xs text-[color:var(--color-text-neutral-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] transition-colors cursor-pointer"
            >
              默认
            </button>
          </div>

          <!-- 预设颜色 -->
          <div class="space-y-2">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">预设颜色</div>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="(color, idx) in presetColors"
                :key="idx"
                type="button"
                @click="bgColor = color"
                class="h-11 rounded-[4px] cursor-pointer transition-transform hover:scale-[1.03] border"
                :class="bgColor.toUpperCase() === color.toUpperCase() ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_30%,transparent)]' : 'border-transparent'"
                :style="{ backgroundColor: color }"
              />
            </div>
          </div>

          <!-- 自定义颜色 -->
          <div class="p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] space-y-2">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">自定义颜色</div>
            <div class="flex items-center gap-2">
              <label class="w-7 h-7 rounded-[4px] border border-[color:var(--color-border-2)] bg-white flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0">
                <input
                  type="color"
                  v-model="bgColor"
                  class="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer"
                />
              </label>
              <div class="flex-1 flex items-center h-7 rounded-[4px] border border-[color:var(--color-border-2)] bg-white overflow-hidden">
                <span class="px-2.5 h-full bg-[color:var(--color-fill-neutral-2)] border-r border-[color:var(--color-border-2)] text-[11px] text-[color:var(--color-text-neutral-3)] flex items-center">
                  HEX
                </span>
                <input
                  type="text"
                  v-model="bgColor"
                  class="flex-1 px-2.5 text-xs font-mono text-[color:var(--color-text-neutral-1)] outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- 预设背景与自定义背景统一大小的正方形容器布局 -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">背景选择 (9:16 规格)</span>
              <span class="text-[11px] text-[color:var(--color-text-neutral-3)]">非 9:16 图片自动唤起裁切</span>
            </div>

            <!-- 隐藏的背景图片上传 input，供正方形容器直接触发 -->
            <input
              ref="bgFileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              @change="onBgFileInputChange"
            />

            <!-- 两个背景选项严格等比、统一大小的正方形容器 (aspect-square) -->
            <div class="scene-background-options grid grid-cols-2 gap-3">
              <!-- 选项 1: 预设背景 (室内暖光) -->
              <div
                v-for="preset in backgroundPresets" :key="preset.url" @click="bgImageUrl = preset.url"
                class="group cursor-pointer flex flex-col"
              >
                <!-- 正方形容器 -->
                <div
                  class="scene-background-thumbnail w-full aspect-square rounded-[4px] border relative overflow-hidden bg-[color:var(--color-fill-neutral-1)] transition-all"
                  :class="bgImageUrl === preset.url
                    ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_20%,transparent)] shadow-xs'
                    : 'border-[color:var(--color-border-2)] hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)]'"
                >
                  <img
                    :src="preset.url"
                    :alt="preset.label"
                    class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    :class="{ 'elder2-media-thumbnail': preset.id === 'elder-2-combined-overlay' }"
                  />
                  <!-- 标签 -->
                  <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] bg-black/60 text-white text-[10px] font-mono leading-none">
                    预设
                  </span>
                  <!-- 选中高亮角标 -->
                  <div
                    v-if="bgImageUrl === preset.url"
                    class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center shadow-xs"
                  >
                    <Check class="w-2.5 h-2.5" />
                  </div>
                </div>

                <!-- 底部说明栏 -->
                <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                  <div class="min-w-0">
                    <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate">{{ preset.label }}</div>
                    <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">官方推荐</div>
                  </div>
                  <span
                    v-if="bgImageUrl === preset.url"
                    class="text-[11px] text-[color:var(--color-text-brand-1)] font-medium flex-shrink-0"
                  >
                    使用中
                  </span>
                </div>
              </div>

              <!-- 选项 2: 自定义背景 (与选项 1 尺寸严格一致的正方形容器) -->
              <div class="group flex flex-col">
                <!-- 若已上传自定义背景 -->
                <template v-if="bgImageUrl && !isPresetBackground">
                  <!-- 正方形容器 -->
                  <div
                    class="scene-background-thumbnail w-full aspect-square rounded-[4px] border relative overflow-hidden bg-[color:var(--color-fill-neutral-1)] transition-all cursor-pointer"
                    :class="bgImageUrl && !isPresetBackground
                      ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_20%,transparent)] shadow-xs'
                      : 'border-[color:var(--color-border-2)] hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)]'"
                    @click="openExistingCropper"
                  >
                    <img
                      :src="bgImageUrl"
                      alt="自定义背景"
                      class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                    <!-- 标签 -->
                    <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] bg-black/60 text-white text-[10px] font-mono leading-none">
                      自定义
                    </span>
                    <!-- 选中高亮角标 -->
                    <div
                      class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center shadow-xs"
                    >
                      <Check class="w-2.5 h-2.5" />
                    </div>

                    <!-- Hover 遮罩快捷更换/重新裁切 -->
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                      <button
                        type="button"
                        @click.stop="triggerBgFileInput"
                        class="px-2 py-1 rounded-[3px] bg-[color:var(--color-fill-brand-1)] hover:bg-[color:color-mix(in_srgb,var(--color-fill-brand-1)_90%,transparent)] text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil class="w-3 h-3" />
                        <span>更换</span>
                      </button>
                      <button
                        type="button"
                        @click.stop="openExistingCropper"
                        class="px-2 py-1 rounded-[3px] bg-white/20 hover:bg-white/30 text-white text-xs flex items-center gap-1 transition-colors cursor-pointer backdrop-blur-xs"
                      >
                        <Crop class="w-3 h-3" />
                        <span>裁切</span>
                      </button>
                    </div>
                  </div>

                  <!-- 底部说明栏 -->
                  <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                    <div class="min-w-0">
                      <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate">自定义背景</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">9:16 画幅</div>
                    </div>
                    <span class="text-[11px] text-[color:var(--color-text-brand-1)] font-medium flex-shrink-0">
                      使用中
                    </span>
                  </div>
                </template>

                <!-- 若未上传自定义背景（正方形上传容器，与选项 1 尺寸严格一致） -->
                <template v-else>
                  <!-- 正方形上传容器 -->
                  <div
                    @click="triggerBgFileInput"
                    class="scene-background-thumbnail w-full aspect-square rounded-[4px] border border-dashed border-[color:var(--color-border-3)] hover:border-[color:var(--color-border-5)] bg-[color:var(--color-fill-neutral-1)] hover:bg-[#F0F5FF] flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer transition-all shadow-none"
                  >
                    <div class="w-9 h-9 rounded-full bg-white border border-[color:var(--color-border-2)] group-hover:border-[color:var(--color-border-5)] group-hover:text-[color:var(--color-text-brand-1)] text-[color:var(--color-text-neutral-3)] flex items-center justify-center transition-colors shadow-xs">
                      <Plus class="w-5 h-5" />
                    </div>
                    <div class="space-y-0.5">
                      <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] group-hover:text-[color:var(--color-text-brand-1)] transition-colors">上传背景</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-3)]">9:16 规格</div>
                    </div>
                  </div>

                  <!-- 底部说明栏 -->
                  <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                    <div class="min-w-0">
                      <div class="font-medium text-[color:var(--color-text-neutral-2)] truncate">自定义上传</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">支持智能裁切</div>
                    </div>
                    <button
                      type="button"
                      @click="triggerBgFileInput"
                      class="text-[11px] text-[color:var(--color-text-brand-1)] hover:underline font-medium flex-shrink-0 cursor-pointer"
                    >
                      上传
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Card: Logo配置 (与背景选择完全一致的正方形容器布局) -->

      <div v-show="settingsTab === 'logo'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
        <div class="flex items-center justify-between pb-2.5 border-b border-[color:var(--color-grey-9)]">
          <span class="text-xs font-bold text-[color:var(--color-text-neutral-1)]">Logo配置</span>
        </div>

        <template v-if="showLogo">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">Logo选择 (透明底图佳)</span>
              <span class="text-[11px] text-[color:var(--color-text-neutral-3)]">与顶部悬浮栏联动</span>
            </div>

            <!-- 隐藏的Logo上传 input -->
            <input
              ref="logoFileInput"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              class="hidden"
              @change="onLogoFileInputChange"
            />

            <!-- 两个Logo选项严格等比、统一大小的正方形容器 (aspect-square，与背景选择尺寸严格一致) -->
            <div class="scene-background-options grid grid-cols-2 gap-3">
              <!-- 预设 Logo 列表 -->
              <div
                v-for="preset in logoPresets"
                :key="preset.url"
                @click="logoUrl = preset.url"
                class="group cursor-pointer flex flex-col"
              >
                <!-- 正方形容器 -->
                <div
                  class="scene-background-thumbnail scene-logo-thumbnail w-full aspect-square rounded-[4px] border relative overflow-hidden bg-[color:var(--color-fill-neutral-1)] transition-all p-3 flex items-center justify-center"
                  :class="logoUrl === preset.url
                    ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_20%,transparent)] shadow-xs'
                    : 'border-[color:var(--color-border-2)] hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)]'"
                >
                  <img
                    :src="preset.url"
                    :alt="preset.label"
                    class="w-full h-full object-contain transition-transform group-hover:scale-105 duration-300"
                  />
                  <!-- 标签 -->
                  <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] bg-black/60 text-white text-[10px] font-mono leading-none">
                    预设
                  </span>
                  <!-- 选中高亮角标 -->
                  <div
                    v-if="logoUrl === preset.url"
                    class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center shadow-xs"
                  >
                    <Check class="w-2.5 h-2.5" />
                  </div>
                </div>

                <!-- 底部说明栏 -->
                <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                  <div class="min-w-0">
                    <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate">{{ preset.label }}</div>
                    <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">官方推荐</div>
                  </div>
                  <span
                    v-if="logoUrl === preset.url"
                    class="text-[11px] text-[color:var(--color-text-brand-1)] font-medium flex-shrink-0"
                  >
                    使用中
                  </span>
                </div>
              </div>

              <!-- 自定义 Logo 选项 (与预设尺寸严格一致的正方形容器) -->
              <div class="group flex flex-col">
                <template v-if="logoUrl && !isPresetLogo">
                  <!-- 正方形容器 -->
                  <div
                    class="scene-background-thumbnail scene-logo-thumbnail w-full aspect-square rounded-[4px] border relative overflow-hidden bg-[color:var(--color-fill-neutral-1)] transition-all cursor-pointer p-3 flex items-center justify-center"
                    :class="logoUrl && !isPresetLogo
                      ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_20%,transparent)] shadow-xs'
                      : 'border-[color:var(--color-border-2)] hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)]'"
                    @click="triggerLogoFileInput"
                  >
                    <img
                      :src="logoUrl"
                      alt="自定义Logo"
                      class="w-full h-full object-contain transition-transform group-hover:scale-105 duration-300"
                    />
                    <!-- 标签 -->
                    <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] bg-black/60 text-white text-[10px] font-mono leading-none">
                      自定义
                    </span>
                    <!-- 选中高亮角标 -->
                    <div
                      class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center shadow-xs"
                    >
                      <Check class="w-2.5 h-2.5" />
                    </div>

                    <!-- Hover 遮罩快捷更换 -->
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                      <button
                        type="button"
                        @click.stop="triggerLogoFileInput"
                        class="px-2 py-1 rounded-[3px] bg-[color:var(--color-fill-brand-1)] hover:bg-[color:color-mix(in_srgb,var(--color-fill-brand-1)_90%,transparent)] text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil class="w-3 h-3" />
                        <span>更换</span>
                      </button>
                    </div>
                  </div>

                  <!-- 底部说明栏 -->
                  <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                    <div class="min-w-0">
                      <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate">自定义Logo</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">已上传</div>
                    </div>
                    <span class="text-[11px] text-[color:var(--color-text-brand-1)] font-medium flex-shrink-0">
                      使用中
                    </span>
                  </div>
                </template>

                <template v-else>
                  <!-- 正方形上传容器 (与预设选项严格一致) -->
                  <div
                    @click="triggerLogoFileInput"
                    class="scene-background-thumbnail scene-logo-thumbnail w-full aspect-square rounded-[4px] border border-dashed border-[color:var(--color-border-3)] hover:border-[color:var(--color-border-5)] bg-[color:var(--color-fill-neutral-1)] hover:bg-[#F0F5FF] flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer transition-all shadow-none"
                  >
                    <div class="w-9 h-9 rounded-full bg-white border border-[color:var(--color-border-2)] group-hover:border-[color:var(--color-border-5)] group-hover:text-[color:var(--color-text-brand-1)] text-[color:var(--color-text-neutral-3)] flex items-center justify-center transition-colors shadow-xs">
                      <Plus class="w-5 h-5" />
                    </div>
                    <div class="space-y-0.5">
                      <div class="text-xs font-medium text-[color:var(--color-text-neutral-1)] group-hover:text-[color:var(--color-text-brand-1)] transition-colors">上传Logo</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-2)]">PNG/JPG/SVG/WebP</div>
                    </div>
                  </div>

                  <!-- 底部说明栏 -->
                  <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                    <div class="min-w-0">
                      <div class="font-medium text-[color:var(--color-text-neutral-2)] truncate">自定义上传</div>
                      <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">支持透明背景</div>
                    </div>
                    <button
                      type="button"
                      @click="triggerLogoFileInput"
                      class="text-[11px] text-[color:var(--color-text-brand-1)] hover:underline font-medium flex-shrink-0 cursor-pointer"
                    >
                      上传
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <div class="text-[11px] text-[color:var(--color-text-neutral-3)]">
              请上传 大小不超过 <span class="text-[color:var(--color-danger-6)] font-semibold">5MB</span> 格式为
              <span class="text-[color:var(--color-danger-6)] font-semibold">png/jpg/jpeg/svg</span> 的文件
            </div>
          </div>
        </template>
      </div>

      <!-- 时间按钮与操作按钮为独立设置入口 -->
      <div v-show="settingsTab === 'time'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">

          <!-- 1. 时间金刚区专项卡片 (展示时区、时间) -->
          <div
            class="p-3 rounded-[4px] border transition-all"
            :class="timeKkEnabled ? 'border-[#BEDDFF] bg-[#F7F9FC]' : 'border-[color:var(--color-border-2)] bg-[#FAFAFA] opacity-75'"
          >
            <!-- 顶部：时间图标 + 标题 + 实时状态 + 独立开关 -->
            <div class="flex items-center justify-between pb-2 border-b border-[color:var(--color-grey-9)]">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  :class="timeKkEnabled ? 'bg-[color:var(--color-fill-brand-1)] text-white' : 'bg-[color:var(--color-fill-neutral-3)] text-[color:var(--color-text-neutral-3)]'"
                >
                  <Clock class="w-3 h-3" />
                </span>
                <span
                  class="text-xs font-bold truncate"
                  :class="timeKkEnabled ? 'text-[color:var(--color-text-neutral-1)]' : 'text-[color:var(--color-text-neutral-3)]'"
                >
                  时间按钮
                </span>
                <el-tag
                  :type="timeKkEnabled ? 'success' : 'info'"
                  size="small"
                  class="scale-90 origin-left flex-shrink-0"
                >
                  {{ timeKkEnabled ? '已启用' : '已停用' }}
                </el-tag>
              </div>

              <div class="flex items-center gap-2">
              </div>
            </div>

            <!-- 内联时区与时间配置 -->
            <div class="mt-2.5 space-y-2.5">
              <!-- 时区选择 -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[color:var(--color-text-neutral-2)] w-14 flex-shrink-0">所属时区:</span>
                <el-select
                  v-model="timeKkTimezone"
                  size="small"
                  class="flex-1"
                  @change="handleTimezoneChange"
                >
                  <el-option
                    v-for="opt in timezoneOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>

              <!-- 时区显示标签 -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[color:var(--color-text-neutral-2)] w-14 flex-shrink-0">显示标签:</span>
                <el-input
                  v-model="timeKkTimezoneLabel"
                  size="small"
                  placeholder="如：北京时间 (UTC+8)"
                  clearable
                />
              </div>

              <!-- 日期时间展示模式 (方案一 与 方案三 可选) -->
              <div class="space-y-1.5 pt-1.5 pb-1.5 border-t border-b border-[color:var(--color-grey-9)]">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-[color:var(--color-text-neutral-1)]">展示样式 (方案选择):</span>
                  <span class="text-[11px] text-[color:var(--color-text-neutral-3)]">顶栏呈现形态</span>
                </div>
                <el-radio-group v-model="timeDisplayMode" size="small" class="flex flex-col gap-2 w-full">
                  <el-radio value="datetime" class="!mr-0 !h-auto w-full p-2.5 rounded-[4px] border border-[color:var(--color-border-2)] hover:border-[#BEDDFF] bg-white transition-all">
                    <div class="py-0.5">
                      <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">时间与日期并列 (推荐)</div>
                      <div class="text-[11px] text-[color:var(--color-text-neutral-2)] mt-0.5 font-mono">
                        效果：{{ currentKkTime || '09:20' }} <span class="text-[color:var(--color-text-neutral-3)]">|</span> {{ currentKkDate || '2026年10月24日 星期六' }}
                      </div>
                    </div>
                  </el-radio>
                  <el-radio value="time" class="!mr-0 !h-auto w-full p-2.5 rounded-[4px] border border-[color:var(--color-border-2)] hover:border-[#BEDDFF] bg-white transition-all">
                    <div class="py-0.5">
                      <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">仅显示时间 (极简模式)</div>
                      <div class="text-[11px] text-[color:var(--color-text-neutral-2)] mt-0.5 font-mono">
                        效果：{{ currentKkTime || '09:20' }}
                      </div>
                    </div>
                  </el-radio>
                </el-radio-group>
              </div>

              <!-- 时间格式 -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[color:var(--color-text-neutral-2)] w-14 flex-shrink-0">时间格式:</span>
                <el-radio-group v-model="timeKkFormat" size="small" class="flex-wrap gap-2" @change="updateClock">
                  <el-radio value="HH:mm:ss">HH:mm:ss (带秒)</el-radio>
                  <el-radio value="HH:mm">HH:mm</el-radio>
                  <el-radio value="MM-DD HH:mm">带月日</el-radio>
                </el-radio-group>
              </div>

              <!-- 触发语音播报指令 -->
              <div class="flex items-start gap-2">
                <span class="text-[11px] text-[color:var(--color-text-neutral-2)] w-14 flex-shrink-0 pt-1">播报指令:</span>
                <el-input
                  v-model="timeKkPrompt"
                  type="textarea"
                  :rows="2"
                  size="small"
                  placeholder="点击该金刚区后数字人触发的时间播报指令..."
                  clearable
                />
              </div>

              <!-- 实时动态预览条 -->
              <div class="p-2.5 rounded-[4px] bg-white border border-[#BEDDFF] flex items-center justify-between text-xs shadow-xs">
                <span class="text-[11px] text-[color:var(--color-text-neutral-3)]">顶栏实时效果:</span>
                <div class="flex items-center gap-2 font-mono">
                  <span class="font-bold text-[color:var(--color-text-brand-1)] text-sm">{{ currentKkTime || '09:20' }}</span>
                  <template v-if="timeDisplayMode === 'datetime'">
                    <span class="text-[color:var(--color-text-neutral-4)]">|</span>
                    <span class="text-[11px] text-[color:var(--color-text-neutral-2)]">{{ currentKkDate || '2026年10月24日 星期六' }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

                </div>
      <!-- Card: 金刚区配置 (业务按钮单独独立出来，包含输入问题与机器人预设回答) -->
      <div v-show="settingsTab === 'kingkong'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
        <div class="flex items-center justify-between pb-2.5 border-b border-[color:var(--color-grey-9)]">
          <div>
            <div class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">金刚区配置</div>
            <div class="text-xs text-[color:var(--color-text-neutral-2)] mt-0.5">游客点击输入预设问题，数字人自动回答对应设置好的内容</div>
          </div>
        </div>

        <template v-if="showKingkong">
          <!-- 快捷一键预设场景 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-semibold text-[color:var(--color-text-neutral-2)]">
              <span>推荐场景模板</span>
              <span class="text-[11px] text-[color:var(--color-text-neutral-3)] font-normal">一键套用预设问题与机器人回答</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in kkPresets"
                :key="preset.name"
                type="button"
                @click="applyKkPreset(preset)"
                class="h-6 px-2.5 text-[11px] font-medium rounded-[4px] border border-[color:var(--color-border-2)] bg-[color:var(--color-fill-neutral-1)] hover:border-[color:var(--color-border-5)] hover:bg-[color:var(--color-fill-brand-5)] hover:text-[color:var(--color-text-brand-1)] text-[color:var(--color-text-neutral-2)] transition-colors cursor-pointer"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- 4个独立金刚区卡片概览 (R09: 侧栏概览卡片，点击快速呼出 520px 标准弹窗进行全量编辑) -->
          <div class="space-y-2.5 pt-1">
            <div
              v-for="item in kingkongList"
              :key="item.id"
              class="p-3 rounded-[4px] border transition-all hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)] cursor-pointer"
              :class="item.enabled ? 'border-[#BEDDFF] bg-[#F7F9FC]' : 'border-[color:var(--color-border-2)] bg-[#FAFAFA] opacity-75'"
              @click="handleOpenKkModal(item)"
            >
              <!-- 顶部：序号 + 标题 + 独立开关 -->
              <div class="flex items-center justify-between pb-2 border-b border-[color:var(--color-grey-9)]">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    :class="item.enabled ? 'bg-[color:var(--color-fill-brand-1)] text-white' : 'bg-[color:var(--color-fill-neutral-3)] text-[color:var(--color-text-neutral-3)]'"
                  >
                    {{ item.id }}
                  </span>
                  <span
                    class="text-xs font-bold truncate"
                    :class="item.enabled ? 'text-[color:var(--color-text-neutral-1)]' : 'text-[color:var(--color-text-neutral-3)]'"
                  >
                    {{ item.label || `金刚区${item.id}` }}
                  </span>
                  <el-tag
                    :type="item.enabled ? 'success' : 'info'"
                    size="small"
                    class="scale-90 origin-left flex-shrink-0"
                  >
                    {{ item.enabled ? '已启用' : '已停用' }}
                  </el-tag>
                </div>

                <!-- 独立开关与配置入口 (R09) -->
                <div class="flex items-center gap-2" @click.stop>
                  <el-switch
                    v-model="item.enabled"
                    size="small"
                    :aria-label="`开关金刚区${item.id}`"
                  />
                  <el-button
                    size="small"
                    type="primary"
                    link
                    @click="handleOpenKkModal(item)"
                  >
                    配置
                  </el-button>
                </div>
              </div>

              <!-- 概览摘要：预设问答及图标状态 (R09) -->
              <div class="mt-2 space-y-1.5 text-xs">
                <div class="flex items-center gap-2 text-[color:var(--color-text-neutral-2)]">
                  <span class="w-12 text-[color:var(--color-text-neutral-3)] shrink-0 text-[11px]">图标：</span>
                  <span class="truncate text-[11px]">{{ item.showIcon !== false ? (kingkongIconOptions.find(o => o.value === item.icon)?.label || '已开启') : '隐藏图标' }}</span>
                </div>
                <div class="flex items-start gap-2 text-[color:var(--color-text-neutral-2)]">
                  <span class="w-12 text-[color:var(--color-text-neutral-3)] shrink-0 text-[11px]">提问：</span>
                  <span class="truncate text-[11px] flex-1">{{ item.prompt || '（未设置问答提问）' }}</span>
                </div>
                <div class="flex items-start gap-2 text-[color:var(--color-text-neutral-2)]">
                  <span class="w-12 text-[color:var(--color-text-neutral-3)] shrink-0 text-[11px]">回答：</span>
                  <span class="truncate text-[11px] flex-1 text-[color:var(--color-text-neutral-3)]">{{ item.answer || '（未设置预设回答）' }}</span>
                </div>
              </div>

              <!-- 底部操作栏 (R09) -->
              <div class="flex items-center justify-between pt-2 mt-2 border-t border-[color:var(--color-grey-9)] text-xs" @click.stop>
                <button
                  type="button"
                  @click="handleOpenKkModal(item)"
                  class="text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-brand-1)] flex items-center gap-1 cursor-pointer text-[11px]"
                >
                  <Pencil class="w-3 h-3" />
                  <span>编辑详情</span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Card: 交互控件配置 (全圆角输入组件与打断按钮) -->
      <div v-show="settingsTab === 'actions'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
        <div class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">输入框</div>

        <div class="space-y-4">
          <!-- Card: 输入框配置 (全圆角输入组件) -->
          <div class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
            <div class="flex items-center justify-between pb-2.5 border-b border-[color:var(--color-grey-9)]">
              <div>
                <div class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">输入条</div>
                <div class="text-xs text-[color:var(--color-text-neutral-2)] mt-0.5">全圆角胶囊式文字提问输入组件</div>
              </div>
            </div>

            <template v-if="showInput">
              <!-- 实时全圆角预览 -->
              <div class="p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-border-2)] space-y-2">
                <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">组件效果预览 (全圆角胶囊组件)</div>
                <div class="py-2 px-1">
                  <div data-scene-presentation class="w-full h-11 rounded-full border border-white/95 shadow-xs px-2 flex items-center justify-between gap-2" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(245, 248, 255, 0.78));">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <SceneVoiceButton
                          :theme="voiceTheme"
                          size="28px"
                          :animation-duration="voiceAnimationDuration"
                          state="idle"
                          :interactive="false"
                        />
                      </div>
                      <span class="text-xs text-[#1D2129] font-medium truncate">{{ inputPlaceholder || '点击左侧，开启对话' }}</span>
                    </div>
                    <div class="w-6 h-6 rounded-full bg-white/80 border border-white/90 text-[#4E5969] flex items-center justify-center shrink-0 shadow-xs">
                      <Keyboard :size="14" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 提示占位文案 -->
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-[color:var(--color-text-neutral-2)]">输入提示文案</label>
                <el-input
                  v-model="inputPlaceholder"
                  placeholder="例如：请输入您想咨询的问题..."
                  clearable
                />
              </div>

              <!-- 快捷推荐文案 -->
              <div class="space-y-1.5">
                <div class="text-[11px] text-[color:var(--color-text-neutral-3)]">常用提示词推荐：</div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="ph in ['点击左侧，开启对话', '请输入您想咨询的问题...', '您可以问我任何展厅相关问题...', '输入问题后按回车发送...']"
                    :key="ph"
                    type="button"
                    @click="inputPlaceholder = ph"
                    class="px-2 py-0.5 rounded-[3px] bg-[color:var(--color-fill-neutral-2)] hover:bg-[color:var(--color-fill-brand-5)] hover:text-[color:var(--color-text-brand-1)] text-[11px] text-[color:var(--color-text-neutral-2)] transition-colors cursor-pointer"
                  >
                    {{ ph }}
                  </button>
                </div>
              </div>

              <!-- 内嵌交互球说明与跳转入口 (R05: 消除重复配置，统一于语音交互面板管理) -->
              <div class="pt-3 border-t border-[color:var(--color-grey-9)] flex items-center justify-between p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-border-2)]">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-xs bg-white">
                    <SceneVoiceButton
                      :theme="voiceTheme"
                      size="32px"
                      :animation-duration="voiceAnimationDuration"
                      state="idle"
                      :interactive="false"
                    />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">交互球样式</div>
                    <div class="text-[11px] text-[color:var(--color-text-neutral-2)]">与问答中的语音光球共享色彩主题与流动动效</div>
                  </div>
                </div>
                <el-button size="small" type="primary" link @click="settingsTab = 'qa'">前往配置 ›</el-button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Card 5: 多媒体配置 -->
      <div v-show="settingsTab === 'media'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-3.5">
        <div class="flex items-center justify-between pb-2.5 border-b border-[color:var(--color-grey-9)]">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-3.5 bg-[color:var(--color-fill-brand-1)] rounded-full inline-block"></span>
            <span class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">多媒体配置</span>
          </div>
        </div>

        <template v-if="showMultimedia">
          <!-- 预设多媒体分区 -->
          <div class="space-y-2">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">预设多媒体</div>
            <div class="grid grid-cols-2 gap-2.5">
              <div
                v-for="preset in mediaPresets"
                :key="preset.id"
                @click="handleSelectPresetMedia(preset)"
                class="group cursor-pointer flex flex-col"
              >
                <div
                  class="scene-multimedia-thumbnail w-full aspect-video rounded-[4px] border relative overflow-hidden bg-[color:var(--color-fill-neutral-1)] transition-all"
                  :class="multimediaUrl === preset.url
                    ? 'border-[color:var(--color-border-5)] ring-2 ring-[color:color-mix(in_srgb,var(--color-brand-6)_20%,transparent)] shadow-xs'
                    : 'border-[color:var(--color-border-2)] hover:border-[color:color-mix(in_srgb,var(--color-border-5)_60%,transparent)]'"
                >
                  <img
                    :src="preset.url"
                    :alt="preset.label"
                    class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  <!-- 选中打勾标 -->
                  <div
                    v-if="multimediaUrl === preset.url"
                    class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[color:var(--color-fill-brand-1)] text-white flex items-center justify-center shadow-xs"
                  >
                    <Check :size="10" />
                  </div>
                </div>
                <div class="mt-2 px-0.5 flex items-center justify-between text-xs">
                  <div class="min-w-0">
                    <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate">{{ preset.label }}</div>
                    <div class="text-[10px] text-[color:var(--color-text-neutral-3)] truncate">{{ preset.tag }}</div>
                  </div>
                  <span
                    v-if="multimediaUrl === preset.url"
                    class="text-[11px] text-[color:var(--color-text-brand-1)] font-medium flex-shrink-0"
                  >
                    使用中
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 历史媒体分区 -->
          <div class="space-y-2 pt-1 border-t border-[color:var(--color-grey-9)]">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">历史媒体</div>
            
            <!-- 历史列表 -->
            <div v-if="historyFiles.length > 0" class="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              <div
                v-for="file in historyFiles"
                :key="file.id"
                class="flex items-center justify-between px-3 py-2 rounded-[4px] border border-[color:var(--color-border-2)] hover:bg-[color:var(--color-fill-neutral-1)] transition-colors cursor-pointer text-xs"
                :class="multimediaUrl === file.url ? 'border-[color:var(--color-border-5)] bg-[color:color-mix(in_srgb,var(--color-fill-brand-5)_40%,transparent)] text-[color:var(--color-text-brand-1)]' : 'text-[color:var(--color-text-neutral-2)]'"
                @click="handleSelectHistoryFile(file)"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <Film v-if="file.type === 'video'" class="w-4 h-4 flex-shrink-0 text-[color:var(--color-text-neutral-3)]" />
                  <Image v-else class="w-4 h-4 flex-shrink-0 text-[color:var(--color-text-neutral-3)]" />
                  <span class="truncate">{{ file.name }}</span>
                  <span class="text-[11px] text-[color:var(--color-text-neutral-3)] flex-shrink-0">({{ file.size }})</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span v-if="multimediaUrl === file.url" class="text-[11px] font-medium text-[color:var(--color-text-brand-1)]">使用中</span>
                  <button
                    type="button"
                    class="text-[color:var(--color-text-neutral-3)] hover:text-[color:var(--color-danger-6)] transition-colors p-0.5"
                    @click.stop="handleDeleteHistoryFile(file.id)"
                    title="删除"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 暂无历史 空状态 -->
            <div
              v-else
              class="h-24 rounded-[4px] border border-dashed border-[color:var(--color-border-2)] bg-[#FAFAFA] flex flex-col items-center justify-center text-center p-3"
            >
              <Film class="w-6 h-6 text-[color:var(--color-text-neutral-4)] mb-1 stroke-[1.5]" />
              <div class="text-xs text-[color:var(--color-text-neutral-3)]">暂无上传历史</div>
              <div class="text-[11px] text-[color:var(--color-text-neutral-4)] mt-0.5">上传新媒体后将自动保存到此处</div>
            </div>
          </div>

          <!-- 上传多媒体分区 -->
          <div class="space-y-2 pt-1 border-t border-[color:var(--color-grey-9)]">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-2)]">上传多媒体</div>

            <div class="flex items-start gap-3">
              <el-upload
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,image/png,image/jpeg,image/webp,image/gif"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleMultimediaUpload"
              >
                <div class="w-24 h-24 rounded-[4px] border border-dashed border-[color:var(--color-border-3)] bg-[color:var(--color-fill-neutral-1)] hover:border-[color:var(--color-border-5)] flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group">
                  <div
                    v-if="multimediaUrl"
                    class="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden"
                  >
                    <img v-if="isImageMedia" :src="multimediaUrl" class="w-full h-full object-cover rounded-[2px]" />
                    <template v-else>
                      <Film class="w-6 h-6 text-[color:var(--color-text-brand-1)]" />
                      <span class="text-[10px] text-[color:var(--color-text-neutral-2)] mt-1 truncate max-w-[80px]">{{ multimediaFileName || '已选视频' }}</span>
                    </template>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center p-2 text-center">
                    <Plus class="w-5 h-5 text-[color:var(--color-text-neutral-3)]" />
                    <span class="text-[10px] text-[color:var(--color-text-neutral-3)] mt-1">选择媒体</span>
                  </div>
                </div>
              </el-upload>

              <div v-if="multimediaUrl" class="flex flex-col justify-between self-stretch py-1">
                <div class="text-xs text-[color:var(--color-text-neutral-2)]">
                  <div class="font-medium text-[color:var(--color-text-neutral-1)] truncate max-w-[180px]">{{ multimediaFileName || '当前播放内容' }}</div>
                  <div class="text-[11px] text-[color:var(--color-text-neutral-3)] mt-1">{{ isImageMedia ? '多媒体图片展示' : '自动循环静音播放' }}</div>
                </div>
                <el-button size="small" type="danger" plain @click="multimediaUrl = ''; multimediaFileName = ''">
                  清除多媒体
                </el-button>
              </div>
            </div>

            <div class="text-[11px] text-[color:var(--color-text-neutral-3)] leading-[18px]">
              支持格式：<span class="text-[color:var(--color-text-brand-1)] font-medium">mp4/mov/webm</span>（视频最大 50MB）、<span class="text-[color:var(--color-text-brand-1)] font-medium">png/jpg/webp</span>（图片最大 10MB）
            </div>

            <!-- 规则提示底框 -->
            <div class="p-2.5 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-grey-9)] text-[11px] text-[color:var(--color-text-neutral-3)] space-y-1">
              <div>多媒体展示：全圆角边框、自动自适应填充画布位置</div>
              <div>视频自动静音自循环播放，图片支持高清展示</div>
            </div>
          </div>
        </template>
      </div>

      <!-- 问答：对话框与光球样式预览。 -->
      <div v-show="settingsTab === 'qa'" class="bg-white rounded-[4px] border border-[color:var(--color-border-2)] p-4 space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-base font-semibold text-[color:var(--color-text-neutral-1)]">问答与语音</div>
          <div v-if="showDialogue || showVoiceButton" class="flex items-center gap-1.5">
            <!-- 重放演示：放在待命左侧，仅放一个icon，不要文字 -->
            <button
              type="button"
              class="w-7 h-7 flex items-center justify-center rounded-[4px] text-[color:var(--color-text-neutral-2)] hover:text-[color:var(--color-text-brand-1)] hover:bg-[color:var(--color-fill-neutral-2)] active:bg-[color:var(--color-fill-neutral-3)] transition-colors cursor-pointer bg-transparent border-0 p-0"
              title="重放演示"
              aria-label="重放演示"
              @click="replaySpeakingDemo"
            >
              <RotateCcw :size="14" />
            </button>
            <el-radio-group v-model="voiceInteractiveState" size="small" aria-label="问答样式状态" @change="handleInteractiveStateChange">
              <el-radio-button value="idle">待命</el-radio-button>
              <el-radio-button value="speaking">播报中</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <template v-if="showDialogue || showVoiceButton">
          <!-- 1. 交互球单独样式预览 (待命状态解释已彻底移除) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">交互球预览</span>
            </div>
            <div data-scene-presentation class="rounded-[4px] border border-[#E5E6EB] bg-white p-5 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
              <SceneVoiceButton
                :state="voiceInteractiveState === 'idle' ? 'idle' : demoVoiceState"
                :theme="voiceTheme"
                :size="'96px'"
                :animation-duration="voiceAnimationDuration"
                :interactive="false"
              />
            </div>
          </div>

          <!-- 2. 问答组件预览 (右侧独立专用预览组件，零污染画布) -->
          <div class="space-y-2 pt-2 border-t border-[color:var(--color-grey-9)]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">问答组件预览</span>
            </div>
            <div data-scene-presentation class="rounded-[4px] border border-[#E5E6EB] bg-[#F7F8FA] p-3 flex flex-col items-center justify-center relative overflow-hidden w-full min-h-[64px]">
              <SceneQaSidebarPreview
                :state="voiceInteractiveState === 'idle' ? 'idle' : demoVoiceState"
                :card-state="voiceInteractiveState === 'idle' ? 'idle' : demoCardState"
                :question="voiceInteractiveState === 'idle' ? '' : demoQuestionText"
                :answer="voiceInteractiveState === 'idle' ? '' : demoAnswerText"
                :placeholder="inputPlaceholder"
                :show-dialogue="showDialogue"
                :show-input="showInput"
                :show-voice="showVoiceButton"
                :voice-theme="voiceTheme"
                :animation-duration="voiceAnimationDuration"
                :canvas-width="dialogueAppearanceWidth"
                :canvas-height="dialogueAppearanceHeight"
              />
            </div>
          </div>

          <template v-if="showVoiceButton">
          <!-- 色彩主题风格 -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-[color:var(--color-text-neutral-2)]">色彩主题风格</label>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="item in voiceThemeOptions"
                :key="item.value"
                class="p-2.5 rounded-[4px] border cursor-pointer transition-all flex items-center justify-between"
                :class="voiceTheme === item.value ? 'border-[color:var(--color-border-5)] bg-[#F2F3FF]' : 'border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-3)] bg-white'"
                @click="voiceTheme = item.value"
              >
                <div class="flex items-center gap-2">
                  <span class="w-3.5 h-3.5 rounded-full shadow-xs shrink-0" :style="{ background: item.previewColor }" />
                  <span class="text-xs font-medium text-[color:var(--color-text-neutral-1)] truncate">{{ item.label }}</span>
                </div>
                <Check v-if="voiceTheme === item.value" :size="14" class="text-[color:var(--color-text-brand-1)] shrink-0" />
              </div>
            </div>
          </div>

          </template>
          <!-- 快捷一键居中位置重置 -->
          <div class="pt-2 border-t border-[color:var(--color-grey-9)] flex items-center justify-between">
            <span class="text-xs text-[color:var(--color-text-neutral-3)]">画布中也可自由拖动与缩放尺寸</span>
            <el-button size="small" @click="resetDialogueBox">
              <RotateCcw :size="12" class="mr-1" />恢复默认位置
            </el-button>
          </div>


        </template>
      </div>
      </div>
      </div>
      <nav class="scene-category-nav" aria-label="场景设置分类">
        <button v-for="tab in settingTabs" :key="tab.id" type="button"
          :disabled="loading || loadFailed" :class="{ active: settingsTab === tab.id }" :aria-current="settingsTab === tab.id ? 'page' : undefined"
          @click="openSettingsTab(tab.id)">
          <SceneArcoIcon :name="tab.icon" :size="20" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
      </div>
    <!-- 金刚区按钮配置弹窗 (Element Plus Dialog 480px) -->
    <el-dialog
      v-model="isKkModalOpen"
      :title="`配置金刚区按钮 ${editingKk?.id ? '#' + editingKk.id : ''}`"
      width="520px"
      append-to-body
      class="rounded-[4px]"
    >
      <div v-if="editingKk" class="space-y-4 py-1">
        <!-- 弹窗内独立开关 -->
        <div class="flex items-center justify-between p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-border-2)]">
          <div class="space-y-0.5">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">在大屏终端启用此按钮</div>
            <div class="text-[11px] text-[color:var(--color-text-neutral-3)]">关闭后大屏隐藏该按钮，已配内容依然完整保留</div>
          </div>
          <el-switch v-model="kkEnabledInput" aria-label="在大屏终端启用此按钮" />
        </div>

        <!-- 是否显示图标开关 -->
        <div class="flex items-center justify-between p-3 rounded-[4px] bg-[color:var(--color-fill-neutral-1)] border border-[color:var(--color-border-2)]">
          <div class="space-y-0.5">
            <div class="text-xs font-semibold text-[color:var(--color-text-neutral-1)]">显示按钮图标</div>
            <div class="text-[11px] text-[color:var(--color-text-neutral-3)]">关闭后按钮为纯文字卡片，文字自动优雅居中</div>
          </div>
          <el-switch v-model="kkShowIconInput" aria-label="显示按钮图标" />
        </div>

        <!-- 按钮图标选择器 -->
        <div v-if="kkShowIconInput" class="space-y-1.5">
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">按钮图标</label>
          <el-select v-model="kkIconInput" class="w-full" placeholder="请选择图标" aria-label="按钮图标">
            <template v-if="!['auto','none'].includes(kkIconInput)" #prefix>
              <SceneArcoIcon :name="kkIconInput" :size="20" />
            </template>
            <el-option
              v-for="opt in kingkongIconOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            >
              <span class="inline-flex items-center gap-2">
                <SceneArcoIcon v-if="!['auto','none'].includes(opt.value)" :name="opt.value" :size="20" />
                <span v-else class="inline-block w-5" aria-hidden="true" />
                <span>{{ opt.label }}</span>
              </span>
            </el-option>
          </el-select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">按钮名称</label>
          <el-input
            v-model="kkLabelInput"
            aria-label="按钮名称"
            placeholder="例如：公司介绍 / 新闻"
            clearable
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">输入问题 (游客点击触发的问题)</label>
          <el-input
            v-model="kkPromptInput"
            aria-label="输入问题"
            type="textarea"
            :rows="2"
            placeholder="例如：请为我全面介绍展厅的重点展区与特色看点..."
            clearable
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-[color:var(--color-text-neutral-2)]">预设回答 (机器人针对此问题的标准回答)</label>
          <el-input
            v-model="kkAnswerInput"
            aria-label="预设回答"
            type="textarea"
            :rows="3"
            placeholder="请输入数字人针对此问题的预设标准播报回答..."
            clearable
          />
        </div>

        <!-- 快捷问答指令推荐 -->
        <div class="space-y-1.5">
          <div class="text-[11px] text-[color:var(--color-text-neutral-3)]">快捷参考填入：</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in quickChips"
              :key="chip.label"
              type="button"
              @click="applyQuickChip(chip)"
              class="px-2 py-0.5 rounded-[3px] bg-[color:var(--color-fill-neutral-2)] hover:bg-[color:var(--color-fill-brand-5)] hover:text-[color:var(--color-text-brand-1)] text-[11px] text-[color:var(--color-text-neutral-2)] transition-colors cursor-pointer"
            >
              + {{ chip.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <el-button
            type="danger"
            plain
            size="small"
            @click="handleClearCurrentKk"
          >
            清空内容
          </el-button>
          <div class="flex items-center gap-2">
            <el-button @click="isKkModalOpen = false">取消</el-button>
            <el-button type="primary" @click="handleSaveKk">保存配置</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 9:16 背景图片智能裁切弹窗 (Element Plus Dialog 640px) -->
    <el-dialog
      v-model="isCropperOpen"
      title="裁切背景图片 (9:16 规格)"
      width="640px"
      append-to-body
      class="rounded-[4px]"
      :close-on-click-modal="false"
      @opened="initCropperCanvas"
    >
      <div class="space-y-3.5 py-1">
        <!-- 顶部提示 -->
        <div class="flex items-center justify-between text-xs text-[color:var(--color-text-neutral-3)] px-1">
          <span>原图尺寸：<span class="font-mono text-[color:var(--color-text-neutral-1)]">{{ rawImgNaturalWidth }} × {{ rawImgNaturalHeight }}</span> (非 9:16)</span>
          <span>拖拽蓝框选取最佳画面</span>
        </div>

        <!-- 裁切主工作区 -->
        <div
          ref="cropperStageRef"
          class="relative w-full h-[380px] bg-[#141416] rounded-[4px] overflow-hidden flex items-center justify-center select-none"
        >
          <!-- 底层完整图像容器 -->
          <div
            ref="cropImgContainerRef"
            class="relative overflow-hidden"
            :style="{
              width: `${cropDisplayW}px`,
              height: `${cropDisplayH}px`
            }"
          >
            <!-- 原始图片展示 -->
            <img
              ref="cropImageEl"
              :src="rawCropImage"
              alt="待裁切图片"
              class="w-full h-full object-contain pointer-events-none select-none"
              draggable="false"
            />

            <!-- 9:16 交互裁切框 -->
            <div
              class="absolute cursor-move select-none"
              :style="{
                left: `${cropBox.x}px`,
                top: `${cropBox.y}px`,
                width: `${cropBox.w}px`,
                height: `${cropBox.h}px`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)'
              }"
              @pointerdown="startCropDrag"
            >
              <!-- 9:16 蓝色边框 -->
              <div class="absolute inset-0 border-2 border-[color:var(--color-border-5)]">
                <!-- 九宫格辅助线 -->
                <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div class="border-r border-b border-white" />
                  <div class="border-r border-b border-white" />
                  <div class="border-b border-white" />
                  <div class="border-r border-b border-white" />
                  <div class="border-r border-b border-white" />
                  <div class="border-b border-white" />
                  <div class="border-r border-white" />
                  <div class="border-r border-white" />
                  <div />
                </div>

                <!-- 四个角标 -->
                <span class="absolute -top-[2px] -left-[2px] w-3 h-3 border-t-2 border-l-2 border-white pointer-events-none" />
                <span class="absolute -top-[2px] -right-[2px] w-3 h-3 border-t-2 border-r-2 border-white pointer-events-none" />
                <span class="absolute -bottom-[2px] -left-[2px] w-3 h-3 border-b-2 border-l-2 border-white pointer-events-none" />
                <span class="absolute -bottom-[2px] -right-[2px] w-3 h-3 border-b-2 border-r-2 border-white pointer-events-none" />

                <!-- 中心 9:16 提示标识 -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span class="px-2 py-0.5 rounded-[3px] bg-black/60 text-white text-[10px] font-mono tracking-wider">
                    9:16 视窗
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷调整工具条 -->
        <div class="flex items-center justify-between px-1 py-1 text-xs">
          <div class="flex items-center gap-1.5 text-[color:var(--color-text-neutral-2)]">
            <span>快捷对齐：</span>
            <button
              v-if="cropDisplayW > cropDisplayH * (9 / 16) + 2"
              type="button"
              @click="alignCrop('left')"
              class="px-2 py-0.5 rounded-[3px] border border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] bg-white cursor-pointer transition-colors"
            >
              居左
            </button>
            <button
              type="button"
              @click="alignCrop('center')"
              class="px-2 py-0.5 rounded-[3px] border border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] bg-white cursor-pointer transition-colors"
            >
              居中
            </button>
            <button
              v-if="cropDisplayW > cropDisplayH * (9 / 16) + 2"
              type="button"
              @click="alignCrop('right')"
              class="px-2 py-0.5 rounded-[3px] border border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] bg-white cursor-pointer transition-colors"
            >
              居右
            </button>
            <button
              v-if="cropDisplayH > cropDisplayW * (16 / 9) + 2"
              type="button"
              @click="alignCrop('top')"
              class="px-2 py-0.5 rounded-[3px] border border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] bg-white cursor-pointer transition-colors"
            >
              居顶
            </button>
            <button
              v-if="cropDisplayH > cropDisplayW * (16 / 9) + 2"
              type="button"
              @click="alignCrop('bottom')"
              class="px-2 py-0.5 rounded-[3px] border border-[color:var(--color-border-2)] hover:border-[color:var(--color-border-5)] hover:text-[color:var(--color-text-brand-1)] bg-white cursor-pointer transition-colors"
            >
              居底
            </button>
          </div>

          <!-- 缩放裁切框 -->
          <div class="flex items-center gap-2">
            <span class="text-[color:var(--color-text-neutral-3)]">视窗缩放：</span>
            <div class="w-28">
              <el-slider
                v-model="cropScalePercent"
                :min="50"
                :max="100"
                :step="1"
                :show-tooltip="false"
                @input="handleCropScaleChange"
              />
            </div>
            <span class="w-8 font-mono text-[11px] text-[color:var(--color-text-neutral-2)] text-right">{{ cropScalePercent }}%</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[color:var(--color-grey-9)]">
          <el-button @click="isCropperOpen = false">取消</el-button>
          <el-button type="primary" :loading="isCropping" @click="handleConfirmCrop">
            确定裁切并应用 (9:16)
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
    <SceneInteractionPreview v-if="interactionOpen" :key="machineId" :scene="interactionScene" @close="interactionOpen = false" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Undo2, Redo2, Plus, Minus, ZoomIn, ZoomOut, CheckCircle2, Loader2, AlertCircle, Image, Film, Trash2, ArrowUp, ArrowDown, BringToFront, SendToBack,
  ImageIcon, Shield, Grid2X2, MessageSquare,
  Compass, MapPin, HelpCircle, Headphones, ChevronRight, Pencil, Crop, Check, Clock, Mic, RotateCcw,
  Keyboard, Send, Square, Folder, Briefcase, Building, FileText, Flame, Sun, Search, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter
} from 'lucide-vue-next';
import SceneVoiceButton, { type VoiceState, type VoiceTheme } from '../SceneVoiceButton.vue';
import SceneTransformElement, { type ElementBox } from '../SceneTransformElement.vue';
import SceneInteractionPreview from '../SceneInteractionPreview.vue';
import ScenePersonPreview from '../ScenePersonPreview.vue';
import { personMediaForMachine } from '../scenePersonMedia';
import SceneFloatingTopBar from '../SceneFloatingTopBar.vue';
import SceneKingkongRail from '../SceneKingkongRail.vue';
import SceneArcoIcon from '../SceneArcoIcon.vue';
import SceneConversationAppearance from '../SceneConversationAppearance.vue';
import SceneQaSidebarPreview from '../SceneQaSidebarPreview.vue';
import { defaultKingkongRailBox, groupKingkongOrder } from '../sceneKingkong';
import SceneExtraElement from '../SceneExtraElement.vue';
import SceneExtraElementSettings from '../SceneExtraElementSettings.vue';
import { sceneElementCatalog, extraElementKinds, extraElementId, extraElementLabel, createSceneExtraElement, extraElementBox, restoreExtraElements, type ExtraElementKind, type SceneExtraElement as ExtraElementConfig } from '../sceneElements';
import { defaultTopBarBox, groupHeaderOrder } from '../sceneHeader';
import { readScene, writeScene } from '../sceneStorage';
import { createSceneHistory, isNativeTextTarget } from '../sceneHistory';
import { sceneViewport } from '../sceneViewport';
import { defaultConversationOrbBox } from '../sceneConversation';
import { usePlatformStore } from '../../store/client';

const SYSTEM_QA_DEMO_PRESET = {
  question: '请介绍一下西湖景区的核心游览路线？',
  answer: `您好！为您精心推荐西湖经典一日游线路：\n1. 经典环湖路线：由断桥残雪出发，途经白堤、平湖秋月、曲院风荷，探访苏堤春晓与三潭印月，傍晚前往雷峰夕照与南屏晚钟。\n2. 特色文化体验：漫步柳浪闻莺与花港观鱼，感受西湖十景沉淀千年的诗意韵味。\n3. 便民服务体系：沿线全覆盖设置环湖电瓶观光车、无障碍服务驿站、行李寄存处、母婴室及全天候多语言智能导览服务。\n如需预订导览讲解或查询实时客流，请随时对我呼唤！`
};

const previewAppearanceWidth = computed(() => 360);
const previewAppearanceHeight = computed(() => voiceInteractiveState.value === 'idle' ? 68 : 185);

interface KingkongItem { id: number; label: string; prompt: string; answer?: string; icon?: string; showIcon?: boolean; configured: boolean; enabled: boolean }
interface HistoryMediaItem { id: string; name: string; url: string; size: string; type: 'image' | 'video'; createdAt: string }

const store = usePlatformStore();
const settingsTab = ref('background');
const extraElements = ref<Record<string, ExtraElementConfig>>({});
const extraSettingItems = sceneElementCatalog.filter(item =>
  extraElementKinds.includes(item.id as ExtraElementKind) && item.id !== 'banner'
);
const activeExtraElement = computed(() =>
  extraSettingItems.some(item => item.id === settingsTab.value) && !['volume', 'refresh'].includes(settingsTab.value)
    ? extraElements.value[extraElementId(settingsTab.value)]
    : undefined
);
watch(() => activeExtraElement.value?.enabled, enabled => {
  const id = extraElementId(settingsTab.value);
  if (enabled) selectedId.value = id;
  else if (selectedId.value === id) selectedId.value = '';
});
const settingTabs = [
  { id: 'background', label: '背景', icon: 'background', layer: '' },
  { id: 'person', label: '虚拟人', icon: 'person', layer: 'person' },
  { id: 'logo', label: 'Logo', icon: 'logo', layer: 'topbar' },
  { id: 'banner', label: '横幅', icon: 'banner', layer: 'topbar' },
  { id: 'time', label: '日期时间', icon: 'time', layer: 'topbar' },
  { id: 'kingkong', label: '金刚区', icon: 'product', layer: 'kingkong-rail' },
  { id: 'qa', label: '问答', icon: 'dialogue', layer: 'dialogue' },
  { id: 'actions', label: '输入框', icon: 'input', layer: 'dialogue' },
  { id: 'media', label: '多媒体', icon: 'media', layer: 'media' },
  ...extraSettingItems.map(item => ({
    id: item.id, label: item.label, icon: item.id,
    layer: ['volume', 'refresh'].includes(item.id) ? 'topbar' : extraElementId(item.id)
  }))
];
const openSettingsTab = (id: string) => {
  const tab = settingTabs.find(item => item.id === id);
  if (!tab || loading.value || loadFailed.value) return;
  if (extraSettingItems.some(item => item.id === id) && !['volume', 'refresh'].includes(id)) {
    const layerId = extraElementId(id);
    boxes.value[layerId] ??= extraElementBox(id as ExtraElementKind);
    extraElements.value[layerId] ??= { ...createSceneExtraElement(id as ExtraElementKind), enabled: false };
    if (!layerOrder.value.includes(layerId)) layerOrder.value = [...layerOrder.value, layerId];
  }
  const layerId = tab.layer;
  selectedId.value = layerId && visibleLayers.value.some(item => item.id === layerId) ? layerId : '';
  settingsTab.value = id;
};

const machineId = computed(() => {
  const own = store.machines.filter(m => m.customerId === store.currentTenantId || m.customerId === store.currentTenant?.id);
  const list = own.length ? own : store.machines.slice(0, 4);
  return (list.find(m => m.id === store.selectedSettingMachineId) || list[0])?.id || 'DEV-01';
});
const presetColors = ['#F5222D', '#FA541C', '#FF4D4F', '#CF1322', '#A8071A', '#820014', '#EB5757', '#F06565', '#F27474', '#D9363E', '#E06666', '#E67E7E'];
const avatarPos = ref<'LEFT' | 'CENTER' | ''>('CENTER');
const bgType = ref<'COLOR' | 'IMAGE'>('IMAGE');
const bgColor = ref('#D09595');
const backgroundPresets = [{ label: '柔光蓝灰', url: '/scene-presets/soft-studio.svg' }, { label: '室内暖光', url: '/scene-presets/warm-interior.png' }, { label: '浅蓝科技展厅', url: '/scene-presets/blue-tech-hall.png' }];
const bgImageUrl = ref('/scene-presets/soft-studio.svg');
const isPresetBackground = computed(() => backgroundPresets.some(preset => preset.url === bgImageUrl.value));
const displayedBox = (id: string) => boxes.value[id];
const interactionOpen = ref(false);

const showPerson = ref(true);
const showBackground = ref(true);
const showBanner = ref(false);
const showLogo = ref(true);
const logoPresets = [{ label: '品信智慧', url: '/logos/pinxin-smart.png' }, { label: '平台Logo', url: '/logo.svg' }];
const logoUrl = ref('/logos/pinxin-smart.png');
const isPresetLogo = computed(() => logoPresets.some(preset => preset.url === logoUrl.value));
const logoFileInput = ref<HTMLInputElement | null>(null);
const triggerLogoFileInput = () => {
  if (logoFileInput.value) {
    logoFileInput.value.value = '';
    logoFileInput.value.click();
  }
};
const onLogoFileInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    handleLogoUpload({ raw: target.files[0] });
  }
};
const showKingkong = ref(true);
const showMultimedia = ref(false);
const showDialogue = ref(true);
const showSubtitle = ref(false);

const previewQuestion = ref(SYSTEM_QA_DEMO_PRESET.question);
const previewAnswer = ref(SYSTEM_QA_DEMO_PRESET.answer);
const subtitleText = ref('欢迎来到西湖数字导览体验馆，我是您的AI专属导览员，有什么可以帮您？');
const showAudioWave = ref(true);

interface PresetMediaItem {
  id: string;
  label: string;
  url: string;
  size: string;
  type: 'image' | 'video';
  tag: string;
}

const mediaPresets = computed<PresetMediaItem[]>(() => [
  {
    id: 'theater-stage',
    label: '金色剧场展台',
    url: '/scene-presets/theater-stage.png',
    size: '976KB',
    type: 'image',
    tag: '官方推荐'
  },
  ...(machineId.value === 'DEV-02' ? [{
    id: 'elder-2-combined-overlay', label: '对话与功能卡片（组合静态图片）',
    url: '/scene-presets/elder-2/combined-overlay.png',
    size: 'PNG', type: 'image' as const, tag: '老人2专属'
  }] : [])
]);

const multimediaUrl = ref('/scene-presets/theater-stage.png');
const multimediaFileName = ref('金色剧场展台');
const isImageMedia = ref(true);
const historyFiles = ref<HistoryMediaItem[]>([]);

const handleSelectPresetMedia = (preset: PresetMediaItem) => {
  multimediaUrl.value = preset.url;
  multimediaFileName.value = preset.label;
  isImageMedia.value = preset.type === 'image';
  ElMessage.success(`已应用「${preset.label}」预设多媒体`);
};

const defaultKingkong = (): KingkongItem[] => [
  {
    id: 1,
    label: '公司介绍',
    prompt: '请为我介绍一下公司的发展历程、核心业务与未来愿景',
    answer: '您好！我们是一家专注于人工智能交互与数字化创新的前沿科技企业。致力于将AI智能交互、多模态数字人与企业级知识服务深度融合，为政企、文旅、商业展厅及智能终端提供下一代数字员工与智慧交互解决方案。',
    icon: 'company',
    showIcon: true,
    configured: true,
    enabled: true
  },
  {
    id: 2,
    label: '新闻',
    prompt: '请为我播报最近的重要新闻动态与行业资讯',
    answer: '今日最新资讯播报：人工智能多模态大模型在政企终端与人机协同领域迎来爆发式增长；我国新一代算力网络建设稳步推进；近期高新技术博览会聚焦智能交互体验，本司自主研发的AI交互数字人系统受到广泛关注与好评。',
    icon: 'news',
    showIcon: true,
    configured: true,
    enabled: true
  },
  {
    id: 3,
    label: '最近热点',
    prompt: '当前都有哪些社会与科技热点话题？',
    answer: '当前全网聚焦三大热点：一是AI数字人在实体经济中的落地应用加速普及；二是绿色算力与智能计算产业生态持续升级；三是智慧城市与数字展馆全面开启沉浸式人机交互新范式。',
    icon: 'hot',
    showIcon: true,
    configured: true,
    enabled: true
  },
  {
    id: 4,
    label: '天气情况',
    prompt: '今天的天气情况怎么样？适合出行吗？',
    answer: '今天白天晴间多云，微风习习，当前室外气温约为22℃，湿度55%，空气质量优。体感舒适，非常适宜外出与参观交流，夜间气温会有所回落，出行请适度添衣。',
    icon: 'weather',
    showIcon: true,
    configured: true,
    enabled: true
  }
];

const kingkongList = ref(defaultKingkong());
const isKkModalOpen = ref(false);
const editingKk = ref<KingkongItem | null>(null);
const kkLabelInput = ref('');
const kkPromptInput = ref('');
const kkAnswerInput = ref('');
const kkEnabledInput = ref(true);
const kkIconInput = ref<string>('auto');
const kkShowIconInput = ref<boolean>(true);

const kingkongIconOptions = [
  { value: 'auto', label: '智能匹配 (依名称自动识别)' },
  { value: 'company', label: '公司 / 企业 (大厦建筑)' },
  { value: 'news', label: '新闻 / 资讯 (报纸文档)' },
  { value: 'hot', label: '热点 / 趋势 (火焰热门)' },
  { value: 'weather', label: '天气 / 气候 (太阳云朵)' },
  { value: 'guide', label: '导览 / 路线 (指南罗盘)' },
  { value: 'product', label: '产品 / 服务 (四宫格矩阵)' },
  { value: 'case', label: '案例 / 展品 (公文文件夹)' },
  { value: 'service', label: '客服 / 人工 (耳麦耳机)' },
  { value: 'help', label: '问答 / 帮助 (疑问问号)' },
  { value: 'search', label: '检索 / 知识 (搜索放大镜)' },
  { value: 'none', label: '无图标 (纯文字居中展示)' }
];

// 时间与时区金刚区专用响应式状态
const timeKkEnabled = ref(true);
const timeDisplayMode = ref<'datetime' | 'time'>('datetime');
const timeKkTimezone = ref('Asia/Shanghai');
const timeKkTimezoneLabel = ref('北京时间 (UTC+8)');
const timeKkFormat = ref<'HH:mm:ss' | 'HH:mm' | 'MM-DD HH:mm'>('HH:mm:ss');
const timeKkPrompt = ref('请播报当前准确时间与展厅问候语');
const currentKkTime = ref('');
const currentKkDate = ref('');
const showVolume = ref(false);
const isVolumeMuted = ref(false);
const showRefresh = ref(false);
let clockInterval: ReturnType<typeof setInterval> | undefined;

const timezoneOptions = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (北京 UTC+8)', defaultText: '北京时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (东京 UTC+9)', defaultText: '东京时间 (UTC+9)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', defaultText: '香港时间 (UTC+8)' },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', defaultText: '新加坡时间 (UTC+8)' },
  { value: 'Europe/London', label: '格林威治标准时间 (伦敦 UTC+0)', defaultText: '伦敦时间 (UTC+0)' },
  { value: 'Europe/Paris', label: '中欧时间 (巴黎 UTC+1)', defaultText: '巴黎时间 (UTC+1)' },
  { value: 'America/New_York', label: '美国东部时间 (纽约 UTC-5)', defaultText: '纽约时间 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间 (洛杉矶 UTC-8)', defaultText: '洛杉矶时间 (UTC-8)' },
  { value: 'UTC', label: '世界协调时 (UTC)', defaultText: '世界协调时 (UTC)' }
];

const handleTimezoneChange = (val: string) => {
  const opt = timezoneOptions.find(o => o.value === val);
  if (opt) {
    timeKkTimezoneLabel.value = opt.defaultText;
  }
  updateClock();
};

const getDateTimeInTimezone = (tz: string, format = timeKkFormat.value) => {
  const now = new Date();
  try {
    const hasSeconds = format === 'HH:mm:ss';
    const isMonthDayTime = format === 'MM-DD HH:mm';
    const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz || 'Asia/Shanghai',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      ...(hasSeconds ? { second: '2-digit' } : {})
    });
    const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz || 'Asia/Shanghai',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    let timeStr = timeFormatter.format(now);
    if (isMonthDayTime) {
      const monthDayFormatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: tz || 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit'
      });
      timeStr = `${monthDayFormatter.format(now)} ${timeStr}`;
    }
    return {
      time: timeStr,
      date: dateFormatter.format(now)
    };
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const timeStr = format === 'HH:mm:ss'
      ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      : format === 'MM-DD HH:mm'
      ? `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
      : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return {
      time: timeStr,
      date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
    };
  }
};

const getTimeInTimezone = (tz: string, fmt: string) => {
  return getDateTimeInTimezone(tz, fmt).time;
};

const updateClock = () => {
  const dt = getDateTimeInTimezone(timeKkTimezone.value, timeKkFormat.value);
  currentKkTime.value = dt.time;
  currentKkDate.value = dt.date;
};

const kkPresets = [
  {
    name: '企业与资讯 (推荐)',
    items: [
      {
        id: 1,
        label: '公司介绍',
        prompt: '请为我介绍一下公司的发展历程、核心业务与未来愿景',
        answer: '您好！我们是一家专注于人工智能交互与数字化创新的前沿科技企业。致力于将AI智能交互、多模态数字人与企业级知识服务深度融合，为政企、文旅、商业展厅及智能终端提供下一代数字员工与智慧交互解决方案。',
        enabled: true
      },
      {
        id: 2,
        label: '新闻',
        prompt: '请为我播报最近的重要新闻动态与行业资讯',
        answer: '今日最新资讯播报：人工智能多模态大模型在政企终端与人机协同领域迎来爆发式增长；我国新一代算力网络建设稳步推进；近期高新技术博览会聚焦智能交互体验，本司自主研发的AI交互数字人系统受到广泛关注与好评。',
        enabled: true
      },
      {
        id: 3,
        label: '最近热点',
        prompt: '当前都有哪些社会与科技热点话题？',
        answer: '当前全网聚焦三大热点：一是AI数字人在实体经济中的落地应用加速普及；二是绿色算力与智能计算产业生态持续升级；三是智慧城市与数字展馆全面开启沉浸式人机交互新范式。',
        enabled: true
      },
      {
        id: 4,
        label: '天气情况',
        prompt: '今天的天气情况怎么样？适合出行吗？',
        answer: '今天白天晴间多云，微风习习，当前室外气温约为22℃，湿度55%，空气质量优。体感舒适，非常适宜外出与参观交流，夜间气温会有所回落，出行请适度添衣。',
        enabled: true
      }
    ]
  },
  {
    name: '文旅导览',
    items: [
      {
        id: 1,
        label: '展厅全景导览',
        prompt: '请为我全面介绍展厅的重点展区与特色看点',
        answer: '欢迎来到本展厅！我们共设有科技创新、历史文化与未来展望三大主题展区，您可以在中央互动区体验沉浸式数字导览。',
        enabled: true
      },
      {
        id: 2,
        label: '特色游览路线',
        prompt: '请推荐一条最适合第一次来的精华游览路线',
        answer: '建议您从序厅出发，首先参观历史文化展厅，随后穿过时光长廊进入现代数字创新展区，全程约需45分钟。',
        enabled: true
      },
      {
        id: 3,
        label: '镇馆之宝故事',
        prompt: '请详细讲解我们馆内的代表性展品故事',
        answer: '馆内最具代表性的镇馆展品位于中央圆厅，采用高精度全息投影还原了千年文化珍宝的工艺细节与历史演变。',
        enabled: true
      },
      {
        id: 4,
        label: '便民服务指引',
        prompt: '请问洗手间、休息区和文创商店在哪里？',
        answer: '洗手间位于一层东侧走廊尽头，茶歇休息区与官方文创中心设在一层中庭出口旁，欢迎前往选购纪念品。',
        enabled: true
      },
    ]
  },
  {
    name: '政务大厅',
    items: [
      {
        id: 1,
        label: '办事指南速查',
        prompt: '请问办理居民业务需要携带哪些材料？',
        answer: '办理居民常见事项需携带本人有效身份证原件及相关申报表格，您可在一号综合窗口或自助终端直接扫码打印材料清单。',
        enabled: true
      },
      {
        id: 2,
        label: '业务排队叫号',
        prompt: '请问如何在大厅进行现场预约和取号？',
        answer: '大厅入口处设有智能排队取号机，请刷身份证或出示政务办事码，系统将自动分配对应业务窗口并发送叫号提醒。',
        enabled: true
      },
      {
        id: 3,
        label: '自助机办理',
        prompt: '哪些业务可以在大厅的24小时自助机上办理？',
        answer: '24小时自助服务区支持社保查询打印、公积金凭证、税务完税证明以及居住证明等多项高频民生事项办理。',
        enabled: true
      },
      {
        id: 4,
        label: '人工导服求助',
        prompt: '请问人工咨询综合窗口在哪里？',
        answer: '人工综合导服台位于大厅正中1号服务区，由值班工作人员为您提供现场帮办与流程咨询。',
        enabled: true
      },
    ]
  },
  {
    name: '企业前台',
    items: [
      {
        id: 1,
        label: '企业概况介绍',
        prompt: '请为我介绍公司的核心业务与发展历程',
        answer: '我们专注于企业级智能数字人与多模态AI解决方案，已服务超过500家行业标杆客户，赋能政企智慧数字化转型。',
        enabled: true
      },
      {
        id: 2,
        label: '来访访客登记',
        prompt: '我是前来拜访的访客，请问如何登记？',
        answer: '请出示您的访客预约二维码或身份证件在前台访客机前核验，系统将自动打印访客通行凭条并通知被访部门。',
        enabled: true
      },
      {
        id: 3,
        label: '会议室指引',
        prompt: '请问主楼各楼层会议室与洽谈间在哪里？',
        answer: '1至2层为开放式洽谈区与大型多功能报告厅，3至5层为专属项目会议室，各房间门牌均标有实时电子预约排期。',
        enabled: true
      },
      {
        id: 4,
        label: '联系前台接待',
        prompt: '请帮我呼叫前台行政值班人员',
        answer: '已为您转接前台值班行政人员，请在左侧休息洽谈区稍候，工作人员将立即为您提供协助。',
        enabled: true
      },
    ]
  }
];

const showInput = ref(true);
const inputPlaceholder = ref('点击左侧，开启对话交流');
const showInterrupt = ref(false);
const interruptLabel = ref('打断播报');

const showVoiceButton = ref(true);
const voiceTheme = ref<VoiceTheme>('crystal');
const voiceAnimationDuration = ref(45);
const voiceInteractiveState = ref<VoiceState>('idle');
const demoVoiceState = ref<VoiceState>('idle');
const demoCardState = ref<QaCardState>('idle');
const demoQuestionText = ref('');
const demoAnswerText = ref('');
let demoTimers: any[] = [];

const clearDemoTimers = () => {
  demoTimers.forEach(t => clearTimeout(t));
  demoTimers = [];
};

const replaySpeakingDemo = () => {
  if (voiceInteractiveState.value !== 'speaking') {
    voiceInteractiveState.value = 'speaking';
  }
  playSpeakingDemo();
};

const playSpeakingDemo = () => {
  clearDemoTimers();
  // Phase 1: 聆听中（停留 1.8 秒，感知倾听光晕）
  demoVoiceState.value = 'listening';
  demoCardState.value = 'question';
  demoQuestionText.value = '';
  demoAnswerText.value = '';

  // Phase 2: 语音输入（问题逐字呈现：约 65ms/字）
  const qText = SYSTEM_QA_DEMO_PRESET.question;
  demoTimers.push(setTimeout(() => {
    let qIdx = 0;
    const qTimer = setInterval(() => {
      qIdx++;
      demoQuestionText.value = qText.slice(0, qIdx);
      if (qIdx >= qText.length) {
        clearInterval(qTimer);
      }
    }, 65);
    demoTimers.push(qTimer);
  }, 1800));

  // Phase 3: 思考中（停留 1.2 秒）
  // 1800ms + 17字 * 65ms = 2905ms，约于 3100ms 进入思考态
  demoTimers.push(setTimeout(() => {
    demoVoiceState.value = 'thinking';
    demoCardState.value = 'thinking';
    demoQuestionText.value = qText;
  }, 3100));

  // Phase 4: 数字人长回答播报（约 45ms/字，随文本增长平滑滚动并展示滚动条）
  // 3100ms + 1200ms = 4300ms 进入播报回答
  const aText = SYSTEM_QA_DEMO_PRESET.answer;
  demoTimers.push(setTimeout(() => {
    demoVoiceState.value = 'speaking';
    demoCardState.value = 'answer';
    demoQuestionText.value = qText;
    demoAnswerText.value = '';

    let aIdx = 0;
    const aTimer = setInterval(() => {
      aIdx++;
      demoAnswerText.value = aText.slice(0, aIdx);
      if (aIdx >= aText.length) {
        clearInterval(aTimer);
      }
    }, 45);
    demoTimers.push(aTimer);
  }, 4300));
};

const handleInteractiveStateChange = (val: string) => {
  clearDemoTimers();
  if (val === 'speaking') {
    playSpeakingDemo();
  } else {
    demoVoiceState.value = 'idle';
    demoCardState.value = 'idle';
    demoQuestionText.value = '';
    demoAnswerText.value = '';
  }
};

const handleStagePointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement;
  if (target.closest('.scene-edit-element') || target.closest('.scene-transform-controls') || target.closest('button')) {
    return;
  }
  selectedId.value = '';
};
interface VisibilityControl {
  label: string;
  ariaLabel: string;
  enabled: boolean;
  layer: string;
  update: (enabled: boolean) => void;
}
const currentVisibilityControls = computed<VisibilityControl[]>(() => {
  const control = (label: string, ariaLabel: string, model: { value: boolean }, layer: string): VisibilityControl => ({
    label, ariaLabel, enabled: model.value, layer, update: enabled => { model.value = enabled; }
  });
  if (activeExtraElement.value) return [control(extraElementLabel(activeExtraElement.value.kind), `显示${extraElementLabel(activeExtraElement.value.kind)}`,
    { get value() { return activeExtraElement.value?.enabled ?? false; }, set value(enabled: boolean) { if (activeExtraElement.value) activeExtraElement.value.enabled = enabled; } },
    extraElementId(activeExtraElement.value.kind))];
  switch (settingsTab.value) {
    case 'background': return [control('背景', '显示背景', showBackground, '')];
    case 'person': return [control('虚拟人', '显示虚拟人', showPerson, 'person')];
    case 'banner': return [control('横幅', '显示横幅', showBanner, 'topbar')];
    case 'logo': return [control('Logo', '显示Logo', showLogo, 'topbar')];
    case 'time': return [control('日期时间', '开关时间按钮', timeKkEnabled, 'topbar')];
    case 'kingkong': return [control('金刚区', '显示金刚区', showKingkong, 'kingkong-rail')];
    case 'actions': return [control('输入条', '显示输入框', showInput, 'dialogue')];
    case 'media': return [control('多媒体', '显示多媒体', showMultimedia, 'media')];
    case 'qa': return [
      control('问答', '显示问答', {
        get value() { return showDialogue.value || showVoiceButton.value; },
        set value(enabled: boolean) {
          showDialogue.value = enabled;
          showVoiceButton.value = enabled;
        }
      }, 'dialogue')
    ];
    case 'volume': return [control('音量控制', '显示音量控制', showVolume, 'topbar')];
    case 'refresh': return [control('刷新页面', '显示刷新页面', showRefresh, 'topbar')];
    default: return [];
  }
});
const setControlVisibility = async (control: VisibilityControl, enabled: boolean) => {
  control.update(enabled);
  await nextTick();
  if (enabled && control.layer && visibleLayers.value.some(layer => layer.id === control.layer)) selectedId.value = control.layer;
};

const voiceThemeOptions: { value: VoiceTheme; label: string; previewColor: string }[] = [
  { value: 'siri', label: 'Siri 幻彩', previewColor: 'linear-gradient(135deg, oklch(82% 0.075 350), oklch(85% 0.065 200), oklch(83% 0.075 280))' },
  { value: 'deepblue', label: '科技深蓝', previewColor: 'linear-gradient(135deg, #165DFF, #14C9C9, #722ED1)' },
  { value: 'aurora', label: '极光翡翠', previewColor: 'linear-gradient(135deg, #00B42A, #23C343, #722ED1)' },
  { value: 'sunset', label: '晚霞金橙', previewColor: 'linear-gradient(135deg, #FF7D00, #F7BA1E, #F53F3F)' },
  { value: 'cyberpunk', label: '赛博霓虹', previewColor: 'linear-gradient(135deg, #F5319D, #00F0FF, #FAFF00)' },
  { value: 'mist', label: '雾感银蓝', previewColor: 'linear-gradient(135deg, #6CA0D8, oklch(83% 0.025 230), oklch(76% 0.032 280))' },
  { value: 'crystal', label: '水晶质感', previewColor: 'radial-gradient(circle at 23% 23%, #E5FDFF, transparent 42%), radial-gradient(circle at 77% 79%, #E6F6FF, transparent 42%), linear-gradient(135deg, #6587B5, #839BCB, #B7AFE5)' }
];

const voiceCanvasSize = computed(() => {
  const box = boxes.value.voice;
  return `${Math.min(screenWidth.value * box.w, screenHeight.value * box.h) / 100}px`;
});

const resetDialogueBox = () => {
  boxes.value.dialogue = { x: 12.2, y: 30.1, w: 75.6, h: 23.2 };
  boxes.value.voice = defaultConversationOrbBox(screenWidth.value, screenHeight.value);
  ElMessage.success('已重置问答位置');
};
const resetVoiceBox = resetDialogueBox;

const dialoguePresets = [
  {
    name: '特色导览',
    question: '请问西湖附近有什么好玩的推荐？',
    answer: '为您推荐西湖十景中的断桥残雪、平湖秋月和曲院风荷，沿白堤漫步即可领略绝美湖景，十分惬意。'
  },
  {
    name: '门票交通',
    question: '景区开放时间和门票政策是怎样的？',
    answer: '西湖环湖核心景区全天免费向公众开放，内部部分专类公园（如岳王庙、雷峰塔）开放时间为8:00至17:30。'
  },
  {
    name: '便民设施',
    question: '附近哪里有洗手间和游客休息驿站？',
    answer: '距离您当前位置前方约80米处设有第三卫生间和微笑便民服务驿站，提供免费饮水和雨伞借用。'
  }
];

const quickChips = [
  { label: '公司介绍', prompt: '请为我介绍一下公司的发展历程、核心业务与未来愿景', answer: '您好！我们是一家专注于人工智能交互与数字化创新的前沿科技企业。致力于将AI智能交互、多模态数字人与企业级知识服务深度融合，为政企、文旅、商业展厅及智能终端提供下一代数字员工与智慧交互解决方案。' },
  { label: '新闻', prompt: '请为我播报最近的重要新闻动态与行业资讯', answer: '今日最新资讯播报：人工智能多模态大模型在政企终端与人机协同领域迎来爆发式增长；我国新一代算力网络建设稳步推进；近期高新技术博览会聚焦智能交互体验，本司自主研发的AI交互数字人系统受到广泛关注与好评。' },
  { label: '最近热点', prompt: '当前都有哪些社会与科技热点话题？', answer: '当前全网聚焦三大热点：一是AI数字人在实体经济中的落地应用加速普及；二是绿色算力与智能计算产业生态持续升级；三是智慧城市与数字展馆全面开启沉浸式人机交互新范式。' },
  { label: '天气情况', prompt: '今天的天气情况怎么样？适合出行吗？', answer: '今天白天晴间多云，微风习习，当前室外气温约为22℃，湿度55%，空气质量优。体感舒适，非常适宜外出与参观交流，夜间气温会有所回落，出行请适度添衣。' },
  { label: '展厅全景导览', prompt: '请为我全面介绍展厅的重点展区与特色看点', answer: '欢迎来到本展厅！我们共设有科技创新、历史文化与未来展望三大主题展区，您可以在中央互动区体验沉浸式数字导览。' },
  { label: '特色游览路线', prompt: '请推荐一条最适合第一次来的精华游览路线', answer: '建议您从序厅出发，首先参观历史文化展厅，随后穿过时光长廊进入现代数字创新展区，全程约需45分钟。' },
  { label: '便民服务指引', prompt: '请问洗手间、休息区和文创商店在哪里？', answer: '洗手间位于一层东侧走廊尽头，茶歇休息区与官方文创中心设在一层中庭出口旁，欢迎前往选购纪念品。' }
];

const getKkIcon = (layerId: string) => {
  if (layerId === 'kk-time') return Clock;
  const id = Number(layerId.replace('kk-', ''));
  const item = kingkongList.value.find(k => k.id === id);
  if (item?.icon && item.icon !== 'auto' && item.icon !== 'none') {
    switch (item.icon) {
      case 'company': return Building;
      case 'news': return FileText;
      case 'hot': return Flame;
      case 'weather': return Sun;
      case 'guide': return Compass;
      case 'product': return Grid2X2;
      case 'case': return Folder;
      case 'service': return Headphones;
      case 'help': return HelpCircle;
      case 'search': return Search;
    }
  }
  const label = item?.label || '';
  if (label.includes('公司') || label.includes('企业') || label.includes('介绍') || label.includes('概况')) return Building;
  if (label.includes('新闻') || label.includes('资讯') || label.includes('动态') || label.includes('时事')) return FileText;
  if (label.includes('热点') || label.includes('热门') || label.includes('趋势') || label.includes('热搜')) return Flame;
  if (label.includes('天气') || label.includes('气候') || label.includes('气温') || label.includes('晴')) return Sun;
  if (label.includes('案例') || label.includes('作品') || label.includes('资料') || label.includes('文件')) return Folder;
  if (label.includes('路线') || label.includes('导航') || label.includes('位置')) return MapPin;
  if (label.includes('业务') || label.includes('方案') || label.includes('合作') || label.includes('服务')) return Briefcase;
  if (label.includes('问') || label.includes('帮助')) return HelpCircle;
  if (label.includes('客服') || label.includes('人工')) return Headphones;
  if (id === 1) return Building;
  if (id === 2) return FileText;
  if (id === 3) return Flame;
  if (id === 4) return Sun;
  return Building;
};

const applyKkPreset = (preset: typeof kkPresets[0]) => {
  kingkongList.value = preset.items.map(p => ({
    id: p.id,
    label: p.label,
    prompt: p.prompt,
    answer: p.answer || '',
    icon: (p as any).icon || 'auto',
    showIcon: (p as any).showIcon ?? true,
    enabled: p.enabled,
    configured: true
  }));
  ElMessage.success(`已套用【${preset.name}】预设模板`);
};

const applyDialoguePreset = (preset: typeof dialoguePresets[0]) => {
  previewQuestion.value = preset.question;
  previewAnswer.value = preset.answer;
  ElMessage.success(`已套用【${preset.name}】对话样例`);
};

const applyQuickChip = (chip: typeof quickChips[0]) => {
  kkLabelInput.value = chip.label;
  kkPromptInput.value = chip.prompt;
  kkAnswerInput.value = chip.answer;
};

const screenWidth = ref(1080);
const screenHeight = ref(1920);

const defaultBoxes = (): Record<string, ElementBox> => ({
  background: { x: 0, y: 0, w: 100, h: 100 },
  topbar: { ...defaultTopBarBox },
  'kingkong-rail': { ...defaultKingkongRailBox },
  person: { x: 0, y: 7, w: 100, h: 86 },
  logo: { x: 7, y: 5, w: 10, h: 6 },
  'kk-time': { x: 58, y: 5, w: 35, h: 7 },
  'kk-1': { x: 53, y: 46, w: 20, h: 11.2 },
  'kk-2': { x: 75, y: 46, w: 20, h: 11.2 },
  'kk-3': { x: 53, y: 58.5, w: 20, h: 11.2 },
  'kk-4': { x: 75, y: 58.5, w: 20, h: 11.2 },
  voice: defaultConversationOrbBox(screenWidth.value, screenHeight.value),
  media: { x: 62, y: 42, w: 31, h: 18 },
  dialogue: { x: 12.2, y: 30.1, w: 75.6, h: 23.2 },
  input: { x: 12.2, y: 47.6, w: 75.6, h: 5.7 },
  interrupt: { x: 68, y: 79.5, w: 25, h: 5.2 }
});

const boxes = ref(defaultBoxes());

const defaultOrder = ['person', 'kingkong-rail', 'dialogue', 'topbar', 'voice', 'media'];
const groupDialogueOrder = (order: string[]): string[] => {
  const ids = order.map(id => (id === 'input' ? 'dialogue' : id));
  return [...new Set([...ids].reverse())].reverse();
};
const normalizeOrder = (order: unknown): string[] => {
  const valid = [...defaultOrder, ...Object.keys(extraElements.value)];
  const grouped = groupDialogueOrder(
    groupKingkongOrder(groupHeaderOrder(Array.isArray(order) ? order.filter(id => typeof id === 'string') : []))
  ).filter(id => valid.includes(id));
  const merged = [...grouped, ...valid.filter(id => !grouped.includes(id))];
  return ['person', ...merged.filter(id => id !== 'person')];
};
const layerOrder = ref([...defaultOrder]);
const selectedId = ref('');

const visibleLayers = computed(() =>
  layerOrder.value
    .filter(id => {
      if (extraElements.value[id]) return extraElements.value[id].enabled;
      if (id === 'kingkong-rail') return showKingkong.value && kingkongList.value.some(item => item.enabled);
      if (id === 'person') return showPerson.value;
      if (id === 'topbar') return showBanner.value || showLogo.value || timeKkEnabled.value || showVolume.value || showRefresh.value;
      if (id === 'voice') return showVoiceButton.value;
      if (id === 'input' || id === 'interrupt' || id === 'subtitle') return false;
      if (id === 'media') return showMultimedia.value;
      if (id === 'dialogue') return showDialogue.value || showInput.value;
      if (id === 'kk-time') return timeKkEnabled.value;
      if (id.startsWith('kk-')) {
        const item = kingkongList.value.find(k => `kk-${k.id}` === id);
        return showKingkong.value && Boolean(item?.enabled);
      }
      return true;
    })
    .map(id => ({
      id,
      label:
        extraElements.value[id]
          ? extraElementLabel(extraElements.value[id].kind)
          : id === 'kingkong-rail'
          ? '金刚区'
          : id === 'person'
          ? '人物'
          : id === 'topbar'
          ? '顶部横幅'
          : id === 'media'
          ? '多媒体'
          : id === 'dialogue'
          ? '问答'
          : id === 'subtitle'
          ? '字幕区'
          : id === 'voice'
          ? '语音光球'
          : id === 'input'
          ? '输入框'
          : id === 'interrupt'
          ? '打断按钮'
          : id === 'kk-time'
          ? '时间时区'
          : kingkongList.value.find(k => `kk-${k.id}` === id)?.label || id
    }))
);

const canDeleteSelectedLayer = computed(() => {
  return Boolean(selectedId.value && selectedId.value !== 'background' && selectedId.value !== 'person');
});

const centerLayerHorizontal = () => {
  if (!selectedId.value || selectedId.value === 'background' || !selectedBox.value) return;
  const w = selectedBox.value.w;
  const newX = Math.round(((100 - w) / 2) * 10) / 10;
  updateBox(selectedId.value, { ...selectedBox.value, x: newX });
  ElMessage.success('已水平居中');
};

const centerLayerVertical = () => {
  if (!selectedId.value || selectedId.value === 'background' || !selectedBox.value) return;
  const h = selectedBox.value.h;
  const newY = Math.round(((100 - h) / 2) * 10) / 10;
  updateBox(selectedId.value, { ...selectedBox.value, y: newY });
  ElMessage.success('已垂直居中');
};

const deleteLayerById = (id: string) => {
  if (!id || id === 'background' || id === 'person') return;
  if (extraElements.value[id]) {
    extraElements.value[id].enabled = false;
    const label = extraElementLabel(extraElements.value[id].kind);
    if (selectedId.value === id) selectedId.value = '';
    ElMessage.success(`已删除【${label}】`);
    return;
  }
  if (id === 'media') {
    showMultimedia.value = false;
    if (selectedId.value === 'media') selectedId.value = '';
    ElMessage.success('已隐藏/删除视频播放组件');
    return;
  }
  if (id === 'logo') {
    showLogo.value = false;
    if (selectedId.value === 'topbar' || selectedId.value === 'logo') selectedId.value = '';
    ElMessage.success('已隐藏 Logo');
    return;
  }
  if (id === 'time' || id === 'kk-time') {
    timeKkEnabled.value = false;
    if (selectedId.value === 'topbar' || selectedId.value === 'time' || selectedId.value === 'kk-time') selectedId.value = '';
    ElMessage.success('已隐藏时间组件');
    return;
  }
  if (id === 'topbar') {
    showBanner.value = false;
    if (selectedId.value === 'topbar') selectedId.value = '';
    ElMessage.success('已隐藏横幅底板');
    return;
  }
  if (id === 'dialogue' || id === 'voice') {
    showDialogue.value = false;
    showVoiceButton.value = false;
    showInput.value = false;
    if (selectedId.value === 'dialogue' || selectedId.value === 'voice') selectedId.value = '';
    ElMessage.success('已隐藏问答');
    return;
  }
  if (id === 'input') {
    showInput.value = false;
    if (selectedId.value === 'input' || (!showDialogue.value && selectedId.value === 'dialogue')) selectedId.value = '';
    ElMessage.success('已隐藏输入框');
    return;
  }
  if (id === 'interrupt') {
    showInterrupt.value = false;
    if (selectedId.value === 'interrupt') selectedId.value = '';
    ElMessage.success('已隐藏打断按钮');
    return;
  }
  if (id === 'kingkong-rail') {
    showKingkong.value = false; selectedId.value = '';
    ElMessage.success('已隐藏金刚区'); return;
  }
  if (id.startsWith('kk-')) {
    const item = kingkongList.value.find(k => `kk-${k.id}` === id);
    if (item) {
      item.enabled = false;
      if (selectedId.value === id) selectedId.value = '';
      ElMessage.success(`已删除业务按钮【${item.label}】`);
    }
    return;
  }
};

const deleteSelectedLayer = () => {
  if (selectedId.value) {
    deleteLayerById(selectedId.value);
  }
};

const selectLayer = (id: string) => {
  if (id.startsWith('kk-') && id !== 'kk-time') id = 'kingkong-rail';
  const targetTab = id === 'input' ? 'actions' : undefined;
  if (id === 'input') id = 'dialogue';
  revealLayer(id);
  selectedId.value = id;
  if (targetTab) {
    settingsTab.value = targetTab;
    return;
  }
  if (!id || id === 'background') {
    settingsTab.value = 'background';
    return;
  }
  if (extraElements.value[id]) {
    settingsTab.value = extraElements.value[id].kind;
    return;
  }
  if (id === 'kingkong-rail') { settingsTab.value = 'kingkong'; return; }
  if (id === 'topbar' || id === 'logo') {
    settingsTab.value = id === 'logo' ? 'logo' : 'banner';
    return;
  }
  if (id === 'time' || id === 'kk-time') {
    settingsTab.value = 'time';
    return;
  }
  if (id.startsWith('kk-')) {
    settingsTab.value = 'kingkong';
    return;
  }
  if (id === 'voice' || id === 'dialogue') {
    settingsTab.value = 'qa';
    return;
  }
  if (id === 'media') {
    settingsTab.value = 'media';
    return;
  }
  if (id === 'person') {
    settingsTab.value = 'person';
    return;
  }
};

const renderedLayers = computed(() => visibleLayers.value);
const personMedia = computed(() => personMediaForMachine(machineId.value));
const interactionScene = computed(() => ({
  personMedia: personMedia.value,
  width: screenWidth.value, height: screenHeight.value,
  bgColor: bgColor.value, bgType: bgType.value, bgImageUrl: bgImageUrl.value, logoUrl: logoUrl.value,
  clock: currentKkTime.value, dateText: currentKkDate.value, timezone: timeKkTimezoneLabel.value,
  timeDisplayMode: timeDisplayMode.value,
  showVolume: showVolume.value, isMuted: isVolumeMuted.value, showRefresh: showRefresh.value,
  showBanner: showBanner.value, showLogo: showLogo.value, showTime: timeKkEnabled.value,
  extraElements: extraElements.value,
  layers: visibleLayers.value, boxes: boxes.value, buttons: kingkongList.value, showKingkong: showKingkong.value,
  multimediaUrl: multimediaUrl.value, isImageMedia: isImageMedia.value,
  question: previewQuestion.value, answer: previewAnswer.value, welcome: subtitleText.value,
  voiceTheme: voiceTheme.value, voiceAnimationDuration: voiceAnimationDuration.value,
  showDialogue: showDialogue.value,
  showInput: showInput.value, inputPlaceholder: inputPlaceholder.value,
  showVoiceButton: showVoiceButton.value,
  showInterrupt: showInterrupt.value, interruptLabel: interruptLabel.value
}));
const revealLayer = (id: string) => {
  if (!id || id === 'background') settingsTab.value = 'background';
  else if (id === 'person') settingsTab.value = 'person';
  else if (extraElements.value[id]) settingsTab.value = extraElements.value[id].kind;
  else if (id === 'topbar' || id === 'logo') settingsTab.value = id === 'logo' ? 'logo' : 'banner';
  else if (id === 'time' || id === 'kk-time') settingsTab.value = 'time';
  else if (id === 'voice' || id === 'dialogue') settingsTab.value = 'qa';
  else if (id === 'input' || id === 'interrupt') settingsTab.value = 'actions';
  else if (id === 'media') settingsTab.value = 'media';
  else if (id === 'dialogue') {
    settingsTab.value = 'qa';
  }
  else if (id === 'kingkong-rail' || id.startsWith('kk-')) {
    settingsTab.value = 'kingkong';

  }
};

const applyScreenComposition = async () => {
  commitHistory();
  boxes.value = { ...defaultBoxes(), ...Object.fromEntries(Object.entries(extraElements.value).map(([id, item]) => [id, extraElementBox(item.kind)])) };
  bgType.value = 'IMAGE';
  bgImageUrl.value = '/scene-presets/soft-studio.svg';
  layerOrder.value = normalizeOrder(defaultOrder);
  selectedId.value = '';

  try {
    await persist(loadedMachineId, snapshot());
    ElMessage.success('已应用整屏排版并自动保存');
  } catch (err) {
    ElMessage.error('应用成功，但自动保存失败，请检查浏览器存储');
  }
};

const handleApplyScreenComposition = async () => {
  try {
    await ElMessageBox.confirm(
      '应用整屏样式将重置各图层的标准排版位置与背景底图。您配置的问题、预设回答、按钮名称及多媒体素材将完整保留不受影响。是否继续？',
      '应用整屏标准排版',
      {
        confirmButtonText: '确定应用',
        cancelButtonText: '取消',
        type: 'info'
      }
    );
  } catch {
    return;
  }
  await applyScreenComposition();
};

const selectedLayerIndex = computed(() => visibleLayers.value.findIndex(layer => layer.id === selectedId.value));
const selectedBox = computed(() => visibleLayers.value.some(l => l.id === selectedId.value) ? boxes.value[selectedId.value] : null);
const boxFields = [{ key: 'x', label: '横向位置（%）' }, { key: 'y', label: '纵向位置（%）' }, { key: 'w', label: '宽度（%）' }, { key: 'h', label: '高度（%）' }] as const;
const inspectorBoxFields = computed(() =>
  selectedId.value === 'dialogue'
    ? ([
        { key: 'x', label: '横向位置（%）' },
        { key: 'y', label: '纵向位置（%）' },
        { key: 'w', label: '整体大小（%）' }
      ] as const)
    : boxFields
);

const updateBox = (id: string, value: ElementBox) => {
  if (id === 'background') return;
  boxes.value[id] = value;
  if (id === 'person') avatarPos.value = '';
  if (id === 'dialogue') {
    const vW = Math.min(value.w * 0.25, 12);
    const vH = vW * (screenWidth.value / screenHeight.value);
    boxes.value.voice = {
      x: Math.round((value.x + (value.w - vW) / 2) * 10) / 10,
      y: Math.round((value.y + value.h - vH) * 10) / 10,
      w: Math.round(vW * 10) / 10,
      h: Math.round(vH * 10) / 10
    };
  }
};

const setBoxField = (key: keyof ElementBox, value: number | undefined | null) => {
  if (!selectedBox.value || value == null || selectedId.value === 'background') return;
  const box = { ...selectedBox.value, [key]: value };
  if ((selectedId.value === 'person' || selectedId.value === 'logo' || selectedId.value === 'voice' || selectedId.value === 'kingkong-rail' || selectedId.value === 'dialogue' || selectedId.value.startsWith('kk-')) && (key === 'w' || key === 'h')) {
    const old = selectedBox.value;
    const factor = Math.min(value / old[key], 300 / old.w, 300 / old.h);
    box.w = old.w * factor;
    box.h = old.h * factor;
  }
  box.w = Math.min(300, Math.max(2, box.w));
  box.h = Math.min(300, Math.max(2, box.h));
  box.x = Math.min(300, Math.max(-300, box.x));
  box.y = Math.min(300, Math.max(-300, box.y));
  updateBox(selectedId.value, box);
};

const moveLayer = (id: string, direction: number) => {
  const visible = visibleLayers.value.map(l => l.id);
  const at = visible.indexOf(id);
  const other = visible[at + direction];
  if (!other) return;
  const order = [...layerOrder.value];
  const a = order.indexOf(id);
  const b = order.indexOf(other);
  [order[a], order[b]] = [order[b], order[a]];
  layerOrder.value = order;
  selectedId.value = id;
};

const moveLayerEdge = (edge: 'top' | 'bottom') => {
  if (!selectedBox.value) return;
  const order = layerOrder.value.filter(id => id !== selectedId.value);
  if (edge === 'top') order.push(selectedId.value);
  else order.unshift(selectedId.value);
  layerOrder.value = order;
};

const stageRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const stageSize = ref({ w: 0, h: 0 });

const dialogueAppearanceWidth = computed(() => screenWidth.value * boxes.value.dialogue.w / 100);
const dialogueAppearanceHeight = computed(() => screenHeight.value * boxes.value.dialogue.h / 100);

// 画布临时缩放比例：'fit' 自适应，或数值比例
const zoomLevel = ref<'fit' | number>('fit');

const updateStageDimensions = () => {
  if (stageRef.value) {
    const rect = stageRef.value.getBoundingClientRect();
    const w = rect.width || stageRef.value.clientWidth;
    const h = rect.height || stageRef.value.clientHeight;
    if (w > 0 && h > 0) {
      stageSize.value = { w, h };
    }
  }
};

const handleWindowResize = () => {
  updateStageDimensions();
};

const zoomFit = () => {
  zoomLevel.value = 'fit';
  if (stageRef.value) {
    stageRef.value.scrollTop = 0;
    stageRef.value.scrollLeft = 0;
  }
  updateStageDimensions();
};

const zoomIn = () => {
  const current = zoomLevel.value === 'fit' ? viewport.value.scale : Number(zoomLevel.value);
  const next = Math.min(2.5, Math.round((current + 0.1) * 10) / 10);
  zoomLevel.value = next;
};

const zoomOut = () => {
  const current = zoomLevel.value === 'fit' ? viewport.value.scale : Number(zoomLevel.value);
  const next = Math.max(0.2, Math.round((current - 0.1) * 10) / 10);
  zoomLevel.value = next;
};

const viewport = computed(() => {
  const base = sceneViewport(screenWidth.value, screenHeight.value, stageSize.value.w, stageSize.value.h);
  if (zoomLevel.value === 'fit') return base;
  const s = Number(zoomLevel.value);
  return {
    width: screenWidth.value,
    height: screenHeight.value,
    scale: s,
    frameWidth: screenWidth.value * s,
    frameHeight: screenHeight.value * s
  };
});
const canvasFrameStyle = computed(() => ({ width: `${viewport.value.frameWidth}px`, height: `${viewport.value.frameHeight}px` }));
const canvasStyle = computed(() => ({
  width: `${viewport.value.width}px`, height: `${viewport.value.height}px`,
  transform: `scale(${viewport.value.scale})`, transformOrigin: 'top left',
  '--scene-editor-inverse-scale': 1 / viewport.value.scale,
}));

let resizeObserver: ResizeObserver | undefined;
const loading = ref(true);
const loadFailed = ref(false);
let loadedMachineId: string | undefined;
let loadRevision = 0;

const snapshot = () =>
  JSON.parse(
    JSON.stringify({
      interactionLayoutVersion: 1,
      inputLayoutVersion: 1,
      screenWidth: screenWidth.value,
      screenHeight: screenHeight.value,
      settingsTab: settingsTab.value,
      extraElements: extraElements.value,
      boxes: { ...boxes.value, background: { x: 0, y: 0, w: 100, h: 100 } },
      layerOrder: normalizeOrder(layerOrder.value),
      avatarPos: avatarPos.value,
      bgType: bgType.value,
      bgColor: bgColor.value,
      bgImageUrl: bgImageUrl.value,
      showBanner: showBanner.value,
      showLogo: showLogo.value,
      logoUrl: logoUrl.value,
      showKingkong: showKingkong.value,
      kingkongList: kingkongList.value,
      timeKkEnabled: timeKkEnabled.value,
      timeDisplayMode: timeDisplayMode.value,
      timeKkTimezone: timeKkTimezone.value,
      timeKkTimezoneLabel: timeKkTimezoneLabel.value,
      timeKkFormat: timeKkFormat.value,
      timeKkPrompt: timeKkPrompt.value,
      showDialogue: showDialogue.value,
      showSubtitle: showSubtitle.value,
      previewQuestion: previewQuestion.value,
      previewAnswer: previewAnswer.value,
      subtitleText: subtitleText.value,
      showAudioWave: showAudioWave.value,
      showInput: showInput.value,
      inputPlaceholder: inputPlaceholder.value,
      showInterrupt: showInterrupt.value,
      interruptLabel: interruptLabel.value,
      showVoiceButton: showVoiceButton.value,
      voiceTheme: voiceTheme.value,
      voiceAnimationDuration: voiceAnimationDuration.value,
      showMultimedia: showMultimedia.value,
      multimediaUrl: multimediaUrl.value,
      multimediaFileName: multimediaFileName.value,
      isImageMedia: isImageMedia.value,
      historyFiles: historyFiles.value
    })
  );

const historyRefs: Record<string, { value: any }> = { screenWidth, screenHeight, extraElements, boxes, layerOrder, avatarPos, bgType, bgColor, bgImageUrl, showBanner, showLogo, logoUrl, showKingkong, kingkongList, timeKkEnabled, timeKkTimezone, timeKkTimezoneLabel, timeKkFormat, timeKkPrompt, showDialogue, showSubtitle, previewQuestion, previewAnswer, subtitleText, showAudioWave, showInput, inputPlaceholder, showInterrupt, interruptLabel, showVoiceButton, voiceTheme, voiceAnimationDuration, showMultimedia, multimediaUrl, multimediaFileName, isImageMedia, historyFiles };
const sceneHistory = createSceneHistory<Record<string, any>>(50);
const canUndo = ref(false), canRedo = ref(false);
let historyRestoring = false, historyGesture = false;
let historyTimer: ReturnType<typeof setTimeout> | undefined;
let pendingHistory: Record<string, any> | undefined;
const editableSnapshot = (data = snapshot()) => {
  const scene = { ...data };
  delete scene.settingsTab;
  return scene;
};
const refreshHistoryStatus = () => {
  canUndo.value = Boolean(pendingHistory) || sceneHistory.canUndo;
  canRedo.value = !pendingHistory && sceneHistory.canRedo;
};
const commitHistory = () => {
  clearTimeout(historyTimer);
  if (pendingHistory) sceneHistory.push(pendingHistory);
  pendingHistory = undefined;
  refreshHistoryStatus();
};
const queueSceneHistory = (data: Record<string, any>) => {
  if (historyRestoring) return;
  const scene = editableSnapshot(data);
  pendingHistory = sceneHistory.isCurrent(scene) ? undefined : scene;
  clearTimeout(historyTimer);
  if (!historyGesture && pendingHistory) historyTimer = setTimeout(commitHistory, 400);
  refreshHistoryStatus();
};
const resetSceneHistory = () => {
  clearTimeout(historyTimer);
  pendingHistory = undefined;
  historyGesture = false;
  sceneHistory.reset(editableSnapshot());
  refreshHistoryStatus();
};
const restoreHistory = (scene: Record<string, any> | undefined) => {
  if (!scene) return;
  historyRestoring = true;
  try {
    for (const [key, target] of Object.entries(historyRefs)) {
      if (key in scene) target.value = structuredClone(scene[key]);
    }
    if (!visibleLayers.value.some(layer => layer.id === selectedId.value)) selectedId.value = '';
  } finally { historyRestoring = false; }
  refreshHistoryStatus();
  void persist(loadedMachineId, snapshot()).catch(() => ElMessage.error('自动保存失败，请重试'));
};
const undoScene = () => { commitHistory(); restoreHistory(sceneHistory.undo()); };
const redoScene = () => { commitHistory(); restoreHistory(sceneHistory.redo()); };
const beginSceneGesture = (event: PointerEvent) => {
  if (event.button !== 0 || loading.value || loadFailed.value) return;
  commitHistory();
  historyGesture = true;
};
const finishSceneGesture = () => { historyGesture = false; commitHistory(); };
const handleHistoryKey = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || loading.value || loadFailed.value || interactionOpen.value) return;
  if (isNativeTextTarget(event.target) || (event.target instanceof Element && event.target.closest('.el-dialog,.el-drawer'))) return;
  const key = event.key.toLowerCase();
  const undo = event.code === 'KeyZ' || key === 'z';
  const redo = event.code === 'KeyY' || key === 'y';
  if (!undo && !redo) return;
  event.preventDefault();
  if (redo || event.shiftKey) redoScene(); else undoScene();
};

const saveStatus = ref<'saved' | 'saving' | 'error'>('saved');
const isApplying = ref(false);
const showSavedBadge = ref(false);
let savedBadgeTimer: any = undefined;

const triggerSavedBadge = () => {
  showSavedBadge.value = true;
  if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
  savedBadgeTimer = setTimeout(() => {
    showSavedBadge.value = false;
  }, 2800);
};

const persist = async (id = loadedMachineId, data = snapshot()) => {
  if (!id) return;
  saveStatus.value = 'saving';
  try {
    await writeScene(id, data);
    saveStatus.value = 'saved';
    triggerSavedBadge();
  } catch (err) {
    saveStatus.value = 'error';
    throw err;
  }
};

const load = async (id: string) => {
  const revision = ++loadRevision;
  loading.value = true;
  loadFailed.value = false;
  loadedMachineId = undefined;
  let saved: any;
  try {
    saved = await readScene(id);
  } catch {
    if (revision === loadRevision) {
      loading.value = false;
      loadFailed.value = true;
      ElMessage.error('场景读取失败，请重新进入。已保留原有配置，未覆盖保存');
    }
    return;
  }
  if (revision !== loadRevision) return;

  const machine = store.machines.find(m => m.id === id) as any;
  screenWidth.value = saved?.screenWidth || machine?.screenWidth || 1080;
  screenHeight.value = saved?.screenHeight || machine?.screenHeight || 1920;
  extraElements.value = restoreExtraElements(saved?.extraElements);
  // R01: 已保存值绝对优先，默认值仅在缺省字段时填充，严禁在读取时根据当前名称或特定尺寸反复强制覆盖
  const defaultB = defaultBoxes();
  const loadedBoxes: Record<string, ElementBox> = {
    ...defaultB,
    ...Object.fromEntries(Object.entries(extraElements.value).map(([key, item]) => [key, extraElementBox(item.kind)])),
    ...(saved?.boxes || {}),
    background: { x: 0, y: 0, w: 100, h: 100 }
  };
  // 仅在完全缺失时补充默认定位
  if (!loadedBoxes['kingkong-rail']) loadedBoxes['kingkong-rail'] = { ...defaultKingkongRailBox };
  if (!loadedBoxes['kk-time']) loadedBoxes['kk-time'] = { x: 68, y: 20, w: 26, h: 6.2 };
  if (!loadedBoxes['voice']) loadedBoxes['voice'] = defaultConversationOrbBox(screenWidth.value, screenHeight.value);
  if (!loadedBoxes['input']) loadedBoxes['input'] = { ...defaultB.input };
  if (!loadedBoxes['dialogue']) loadedBoxes['dialogue'] = { ...defaultB.dialogue };
  if (!loadedBoxes['person']) loadedBoxes['person'] = { ...defaultB.person };
  if (!loadedBoxes['interrupt']) loadedBoxes['interrupt'] = { x: 68, y: 79.5, w: 25, h: 5.2 };
  if (!loadedBoxes['topbar']) loadedBoxes['topbar'] = { ...defaultTopBarBox };

  boxes.value = loadedBoxes;
  layerOrder.value = normalizeOrder(saved?.layerOrder);
  avatarPos.value = saved?.avatarPos ?? 'CENTER';
  bgType.value = saved?.bgType || 'IMAGE';
  bgColor.value = saved?.bgColor || '#D09595';
  bgImageUrl.value = saved?.bgImageUrl ?? '/scene-presets/soft-studio.svg';

  showBanner.value = saved?.showBanner ?? false;
  showLogo.value = saved?.showLogo ?? true;
  logoUrl.value = saved?.logoUrl || '/logos/pinxin-smart.png';
  showKingkong.value = saved?.showKingkong ?? true;

  // R01: 完整恢复用户配置的金刚区按钮，不按文字匹配强行重置
  if (Array.isArray(saved?.kingkongList) && saved.kingkongList.length > 0) {
    kingkongList.value = saved.kingkongList.map((item: KingkongItem) => {
      const dItem = defaultKingkong().find(d => d.id === item.id);
      return {
        ...item,
        answer: item.answer ?? dItem?.answer ?? '',
        icon: item.icon || dItem?.icon || 'auto',
        showIcon: item.showIcon ?? dItem?.showIcon ?? true,
        enabled: item.enabled ?? true,
        configured: item.configured ?? Boolean(item.prompt?.trim())
      };
    });
  } else {
    kingkongList.value = defaultKingkong();
  }

  timeKkEnabled.value = saved?.timeKkEnabled ?? true;
  timeDisplayMode.value = saved?.timeDisplayMode || 'datetime';
  timeKkTimezone.value = saved?.timeKkTimezone || 'Asia/Shanghai';
  timeKkTimezoneLabel.value = saved?.timeKkTimezoneLabel ?? '北京时间 (UTC+8)';
  timeKkFormat.value = saved?.timeKkFormat || 'HH:mm:ss';
  timeKkPrompt.value = saved?.timeKkPrompt ?? '请播报当前准确时间与展厅问候语';
  updateClock();

  showInput.value = saved?.showInput ?? true;
  inputPlaceholder.value = saved?.inputPlaceholder ?? '点击左侧，开启对话交流';
  showInterrupt.value = saved?.showInterrupt ?? false;
  interruptLabel.value = saved?.interruptLabel ?? '打断播报';
  showVoiceButton.value = saved?.showVoiceButton ?? true;
  voiceTheme.value = saved?.voiceTheme || 'crystal';
  // The cycle control was removed; use the default idle motion for every saved scene.
  voiceAnimationDuration.value = 45;

  showMultimedia.value = saved?.showMultimedia ?? false;
  multimediaUrl.value = saved?.multimediaUrl || '/scene-presets/theater-stage.png';
  multimediaFileName.value = saved?.multimediaFileName || '金色剧场展台';
  isImageMedia.value = saved?.isImageMedia ?? true;
  historyFiles.value = saved?.historyFiles || [];

  showDialogue.value = saved?.showDialogue ?? true;
  showSubtitle.value = saved?.showSubtitle ?? false;
  previewQuestion.value = saved?.previewQuestion ?? '请给我一直说人工智能四个字';
  previewAnswer.value = saved?.previewAnswer ?? '人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能人工智能...';
  subtitleText.value = saved?.subtitleText ?? '欢迎来到西湖数字导览体验馆，我是您的AI专属导览员，有什么可以帮您？';
  showAudioWave.value = saved?.showAudioWave ?? true;

  selectedId.value = '';

  voiceInteractiveState.value = 'idle';
  isKkModalOpen.value = false;
  const savedSettingsTab = ['voice', 'dialogue'].includes(saved?.settingsTab) ? 'qa' : saved?.settingsTab;
  settingsTab.value = settingTabs.some(tab => tab.id === savedSettingsTab) ? savedSettingsTab : 'background';
  await nextTick();
  if (revision !== loadRevision) return;
  loadedMachineId = id;
  loading.value = false;
  resetSceneHistory();
};

watch(
  [
    screenWidth, screenHeight, boxes, layerOrder, avatarPos, bgType, bgColor, bgImageUrl, settingsTab, extraElements,
    showBanner, showLogo, logoUrl, showKingkong, kingkongList,
    timeKkEnabled, timeKkTimezone, timeKkTimezoneLabel, timeKkFormat, timeKkPrompt,
    showDialogue, showSubtitle,
    previewQuestion, previewAnswer, subtitleText, showAudioWave,
    showInput, inputPlaceholder, showInterrupt, interruptLabel,
    showVoiceButton, voiceTheme, voiceAnimationDuration,

    showMultimedia, multimediaUrl, multimediaFileName, isImageMedia, historyFiles
  ],
  () => {
    if (loading.value || loadFailed.value || historyRestoring || loadedMachineId !== machineId.value) return;
    const data = snapshot();
    queueSceneHistory(data);
    persist(loadedMachineId, data).catch(() => ElMessage.error('自动保存失败，请检查浏览器存储空间后重试'));
  },
  { deep: true, flush: 'sync' }
);

watch(machineId, id => {
  commitHistory();
  if (!loading.value && loadedMachineId) persist(loadedMachineId, snapshot()).catch(() => ElMessage.error('上一台机器的场景保存失败'));
  void load(id);
}, { flush: 'sync' });

const saveBeforeExit = () => {
  if (!loading.value && loadedMachineId && !loadFailed.value) void persist(loadedMachineId, snapshot()).catch(() => {});
};
const saveWhenHidden = () => { if (document.visibilityState === 'hidden') saveBeforeExit(); };

const activeScrollElements = new Map<Element, ReturnType<typeof setTimeout>>();
const handleGlobalScrollCapture = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (!target || !(target instanceof HTMLElement)) return;
  target.classList.add('is-scrolling');
  const existingTimer = activeScrollElements.get(target);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    target.classList.remove('is-scrolling');
    activeScrollElements.delete(target);
  }, 1000);
  activeScrollElements.set(target, timer);
};

onMounted(() => {
  window.addEventListener('scroll', handleGlobalScrollCapture, { capture: true, passive: true });
  window.addEventListener('keydown', handleHistoryKey);
  window.addEventListener('pointerup', finishSceneGesture);
  window.addEventListener('pointercancel', finishSceneGesture);
  window.addEventListener('blur', finishSceneGesture);
  resizeObserver = new ResizeObserver(entries => {
    const r = entries[0].contentRect;
    stageSize.value = { w: r.width, h: r.height };
  });
  if (stageRef.value) {
    updateStageDimensions();
    resizeObserver.observe(stageRef.value);
  }
  window.addEventListener('resize', handleWindowResize, { passive: true });
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  window.addEventListener('pagehide', saveBeforeExit);
  document.addEventListener('visibilitychange', saveWhenHidden);
  load(machineId.value);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleGlobalScrollCapture, { capture: true });
  commitHistory();
  window.removeEventListener('keydown', handleHistoryKey);
  window.removeEventListener('pointerup', finishSceneGesture);
  window.removeEventListener('pointercancel', finishSceneGesture);
  window.removeEventListener('blur', finishSceneGesture);
  saveBeforeExit();
  ++loadRevision;
  if (clockInterval) clearInterval(clockInterval);
  window.removeEventListener('resize', handleWindowResize);
  resizeObserver?.disconnect();
  window.removeEventListener('pagehide', saveBeforeExit);
  document.removeEventListener('visibilitychange', saveWhenHidden);
});

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// 9:16 背景裁切器状态
const isCropperOpen = ref(false);
const isCropping = ref(false);
const rawCropImage = ref('');
const rawImgNaturalWidth = ref(0);
const rawImgNaturalHeight = ref(0);

const cropperStageRef = ref<HTMLDivElement | null>(null);
const cropImgContainerRef = ref<HTMLDivElement | null>(null);
const cropImageEl = ref<HTMLImageElement | null>(null);

const cropDisplayW = ref(0);
const cropDisplayH = ref(0);
const cropScalePercent = ref(100);

const cropBox = ref({ x: 0, y: 0, w: 0, h: 0 });
let dragStartPointer = { x: 0, y: 0 };
let dragStartBox = { x: 0, y: 0 };
let isDraggingCrop = false;

const initCropperCanvas = () => {
  if (!rawImgNaturalWidth.value || !rawImgNaturalHeight.value) return;
  // 裁切区域最大可用宽高 (舞台为 600px 宽, 380px 高)
  const maxW = 560;
  const maxH = 360;
  const imgRatio = rawImgNaturalWidth.value / rawImgNaturalHeight.value;

  let dw = maxW;
  let dh = dw / imgRatio;
  if (dh > maxH) {
    dh = maxH;
    dw = dh * imgRatio;
  }
  cropDisplayW.value = Math.max(10, Math.round(dw));
  cropDisplayH.value = Math.max(10, Math.round(dh));

  cropScalePercent.value = 100;
  computeCropBox(100);
};

const computeCropBox = (percent: number) => {
  const dw = cropDisplayW.value;
  const dh = cropDisplayH.value;
  if (!dw || !dh) return;

  // 严格 9:16 裁切框
  let maxBoxH = dh;
  let maxBoxW = maxBoxH * (9 / 16);
  if (maxBoxW > dw) {
    maxBoxW = dw;
    maxBoxH = maxBoxW * (16 / 9);
  }

  const factor = percent / 100;
  const bw = Math.max(20, Math.round(maxBoxW * factor));
  const bh = Math.max(35, Math.round(maxBoxH * factor));

  const bx = Math.max(0, Math.round((dw - bw) / 2));
  const by = Math.max(0, Math.round((dh - bh) / 2));

  cropBox.value = { x: bx, y: by, w: bw, h: bh };
};

const handleCropScaleChange = (val: number) => {
  const dw = cropDisplayW.value;
  const dh = cropDisplayH.value;
  if (!dw || !dh) return;

  let maxBoxH = dh;
  let maxBoxW = maxBoxH * (9 / 16);
  if (maxBoxW > dw) {
    maxBoxW = dw;
    maxBoxH = maxBoxW * (16 / 9);
  }
  const factor = val / 100;
  const newW = Math.max(20, Math.round(maxBoxW * factor));
  const newH = Math.max(35, Math.round(maxBoxH * factor));

  const curCenterX = cropBox.value.x + cropBox.value.w / 2;
  const curCenterY = cropBox.value.y + cropBox.value.h / 2;

  let newX = Math.round(curCenterX - newW / 2);
  let newY = Math.round(curCenterY - newH / 2);

  newX = Math.max(0, Math.min(newX, dw - newW));
  newY = Math.max(0, Math.min(newY, dh - newH));

  cropBox.value = { x: newX, y: newY, w: newW, h: newH };
};

const alignCrop = (alignment: 'left' | 'center' | 'right' | 'top' | 'bottom') => {
  const dw = cropDisplayW.value;
  const dh = cropDisplayH.value;
  const bw = cropBox.value.w;
  const bh = cropBox.value.h;

  if (alignment === 'left') {
    cropBox.value.x = 0;
  } else if (alignment === 'center') {
    cropBox.value.x = Math.max(0, Math.round((dw - bw) / 2));
    cropBox.value.y = Math.max(0, Math.round((dh - bh) / 2));
  } else if (alignment === 'right') {
    cropBox.value.x = Math.max(0, dw - bw);
  } else if (alignment === 'top') {
    cropBox.value.y = 0;
  } else if (alignment === 'bottom') {
    cropBox.value.y = Math.max(0, dh - bh);
  }
};

const startCropDrag = (e: PointerEvent) => {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  isDraggingCrop = true;
  dragStartPointer = { x: e.clientX, y: e.clientY };
  dragStartBox = { x: cropBox.value.x, y: cropBox.value.y };

  const onPointerMove = (moveEvent: PointerEvent) => {
    if (!isDraggingCrop) return;
    const dx = moveEvent.clientX - dragStartPointer.x;
    const dy = moveEvent.clientY - dragStartPointer.y;

    const maxX = Math.max(0, cropDisplayW.value - cropBox.value.w);
    const maxY = Math.max(0, cropDisplayH.value - cropBox.value.h);

    cropBox.value.x = Math.max(0, Math.min(dragStartBox.x + dx, maxX));
    cropBox.value.y = Math.max(0, Math.min(dragStartBox.y + dy, maxY));
  };

  const onPointerUp = () => {
    isDraggingCrop = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
};

const handleConfirmCrop = () => {
  if (!cropImageEl.value || !cropDisplayW.value || !rawImgNaturalWidth.value) return;
  isCropping.value = true;

  try {
    const scale = cropDisplayW.value / rawImgNaturalWidth.value;
    const sx = Math.max(0, cropBox.value.x / scale);
    const sy = Math.max(0, cropBox.value.y / scale);
    const sw = Math.min(rawImgNaturalWidth.value - sx, cropBox.value.w / scale);
    const sh = Math.min(rawImgNaturalHeight.value - sy, cropBox.value.h / scale);

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropImageEl.value, sx, sy, sw, sh, 0, 0, 1080, 1920);

    const croppedUrl = canvas.toDataURL('image/jpeg', 0.92);
    bgImageUrl.value = croppedUrl;
    bgType.value = 'IMAGE';
    isCropperOpen.value = false;
    ElMessage.success('背景已成功裁切为 9:16 规格并应用');
  } catch {
    ElMessage.error('裁切图片处理失败');
  } finally {
    isCropping.value = false;
  }
};

const bgFileInput = ref<HTMLInputElement | null>(null);

const triggerBgFileInput = () => {
  if (bgFileInput.value) {
    bgFileInput.value.value = '';
    bgFileInput.value.click();
  }
};

const onBgFileInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    handleBgImageUpload({ raw: target.files[0] });
  }
};

const openExistingCropper = () => {
  if (!rawCropImage.value) {
    if (bgImageUrl.value) {
      rawCropImage.value = bgImageUrl.value;
      const img = new window.Image();
      img.onload = () => {
        rawImgNaturalWidth.value = img.naturalWidth;
        rawImgNaturalHeight.value = img.naturalHeight;
        isCropperOpen.value = true;
      };
      img.src = bgImageUrl.value;
      return;
    }
    return;
  }
  isCropperOpen.value = true;
};

const handleBgImageUpload = async (file: any) => {
  if (!file.raw) return;
  const target = machineId.value;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.raw.type) || file.raw.size > 15 * 1024 * 1024) {
    ElMessage.error('请上传不超过15MB的PNG、JPG或WEBP背景图');
    return;
  }
  try {
    const url = await readFile(file.raw);
    if (target !== machineId.value) return;

    // 读取图片真实尺寸并检查是否为 9:16
    const img = new window.Image();
    img.onload = () => {
      rawCropImage.value = url;
      rawImgNaturalWidth.value = img.naturalWidth;
      rawImgNaturalHeight.value = img.naturalHeight;

      const ratio = img.naturalWidth / img.naturalHeight;
      const targetRatio = 9 / 16; // 0.5625

      // 若已经严格符合 9:16（允许 1.5% 误差），直接更新
      if (Math.abs(ratio - targetRatio) < 0.015) {
        bgImageUrl.value = url;
        bgType.value = 'IMAGE';
        ElMessage.success('背景图片已更新 (9:16 规格)');
      } else {
        // 非 9:16，自动弹出裁切窗口
        isCropperOpen.value = true;
      }
    };
    img.src = url;
  } catch {
    ElMessage.error('背景图片读取失败');
  }
};

const handleLogoUpload = async (file: any) => {
  if (!file.raw) return;
  const target = machineId.value;
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
  if (!validTypes.includes(file.raw.type) || file.raw.size > 5 * 1024 * 1024) {
    ElMessage.error('请上传不超过5MB的PNG、JPG、SVG或WebP文件');
    return;
  }
  try {
    const url = await readFile(file.raw);
    if (target !== machineId.value) return;
    logoUrl.value = url;
  } catch {
    ElMessage.error('Logo读取失败');
  }
};

const handleMultimediaUpload = async (file: any) => {
  if (!file.raw) return;
  const raw = file.raw as File,
    target = machineId.value;
  const img = raw.type.startsWith('image/');
  const extension = raw.name.split('.').pop()?.toLowerCase();
  if (!['mp4', 'mov', 'avi', 'wmv', 'png', 'jpg', 'jpeg', 'gif'].includes(extension || '') || raw.size > (img ? 10 : 50) * 1024 * 1024) {
    ElMessage.error('文件格式或大小不符合要求');
    return;
  }
  try {
    const url = await readFile(raw);
    if (target !== machineId.value) return;
    multimediaUrl.value = url;
    multimediaFileName.value = raw.name;
    isImageMedia.value = img;
    historyFiles.value.unshift({
      id: `media-${Date.now()}`,
      name: raw.name,
      url,
      size: `${(raw.size / 1024 / 1024).toFixed(1)}MB`,
      type: img ? 'image' : 'video',
      createdAt: new Date().toISOString()
    });
    ElMessage.success('媒体文件已上传');
  } catch {
    ElMessage.error('媒体读取失败');
  }
};

const handleSelectHistoryFile = (file: HistoryMediaItem) => {
  multimediaUrl.value = file.url;
  multimediaFileName.value = file.name;
  isImageMedia.value = file.type === 'image';
};

const handleDeleteHistoryFile = (id: string) => {
  const file = historyFiles.value.find(f => f.id === id);
  historyFiles.value = historyFiles.value.filter(f => f.id !== id);
  if (file?.url === multimediaUrl.value) {
    multimediaUrl.value = '';
    multimediaFileName.value = '';
  }
};

const updateKingkongContent = (item: KingkongItem) => {
  item.label = item.label.trim() || `金刚区${item.id}`;
  item.configured = Boolean(item.prompt.trim());
  if (item.showIcon === undefined) item.showIcon = true;
  if (!item.icon) item.icon = 'auto';
};

watch(visibleLayers, layers => {
  if (selectedId.value && !layers.some(layer => layer.id === selectedId.value)) selectedId.value = '';
});

const handleOpenKkModal = (item: KingkongItem) => {
  editingKk.value = item;
  kkLabelInput.value = item.label;
  kkPromptInput.value = item.prompt;
  kkAnswerInput.value = item.answer || '';
  kkEnabledInput.value = item.enabled ?? true;
  kkShowIconInput.value = item.showIcon ?? true;
  kkIconInput.value = item.icon || 'auto';
  isKkModalOpen.value = true;
};

const handleClearCurrentKk = () => {
  if (!editingKk.value) return;
  const idx = kingkongList.value.findIndex(k => k.id === editingKk.value!.id);
  if (idx !== -1) {
    kingkongList.value[idx] = {
      ...kingkongList.value[idx],
      label: `金刚区${editingKk.value.id}`,
      prompt: '',
      answer: '',
      icon: 'auto',
      showIcon: true,
      enabled: false,
      configured: false
    };
  }
  isKkModalOpen.value = false;
  editingKk.value = null;
  ElMessage.info('已清空并停用该按钮');
};

const handleSaveKk = () => {
  if (!editingKk.value) return;
  const label = kkLabelInput.value.trim() || `金刚区${editingKk.value.id}`;
  const prompt = kkPromptInput.value.trim();
  const answer = kkAnswerInput.value.trim();
  const enabled = kkEnabledInput.value;
  const showIcon = kkShowIconInput.value;
  const icon = kkIconInput.value || 'auto';
  const idx = kingkongList.value.findIndex(k => k.id === editingKk.value!.id);
  kingkongList.value[idx] = {
    ...kingkongList.value[idx],
    label,
    prompt,
    answer,
    icon,
    showIcon,
    enabled,
    configured: Boolean(prompt)
  };
  isKkModalOpen.value = false;
  editingKk.value = null;
  ElMessage.success('已保存金刚区按钮配置');
};
</script>

<style scoped>
.scene-editor-stage-header .stage-action-btn {
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  line-height: 30px !important;
  font-size: 14px !important;
  box-sizing: border-box !important;
  padding: 0 16px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.scene-settings-main { display: flex; flex: 1 1 0; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
.scene-visibility-header { flex: 0 0 auto; padding: 16px 20px; border-bottom: 1px solid #e5e6eb; background: #fff; }
.scene-visibility-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 32px; font-size: 14px; color: #1d2129; font-weight: 500; }
.scene-visibility-row + .scene-visibility-row { margin-top: 12px; }
.scene-settings-main > .scene-settings-content { overflow-anchor: none; }
.scene-editor-element-appearance { width: 100%; height: 100%; pointer-events: none; }
.scene-editor-element-appearance .elder2-multimedia { box-shadow: none; object-fit: contain; }
.scene-multimedia-thumbnail > img.elder2-media-thumbnail { object-fit: contain !important; }
.scene-qa-state-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.scene-qa-state-options :deep(.el-radio-button__inner) { width: 100%; border: 1px solid var(--el-border-color); border-radius: 4px; box-shadow: none; }
.scene-qa-state-options :deep(.el-radio-button.is-active .el-radio-button__inner) { border-color: var(--el-color-primary); }
.scene-dialogue-appearance-preview { padding: 16px; border: 1px solid #e5e6eb; border-radius: 4px; background: #f7f8fa; }


</style>
