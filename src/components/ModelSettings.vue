<template>
    <n-card :bordered="false">
    <!-- 模型信息头部 -->
    <template #header>
      <n-space align="center">
        <n-button
          quaternary
          circle
          @click="goBack"
        >
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>

        <div>
          <div style="font-size: 16px; font-weight: 600;">
            {{ getModelDisplayName(currentModel?.url) || '未选择模型' }}
          </div>
          <div style="font-size: 12px; color: var(--n-text-color-disabled);">
            {{ currentModel?.url || '' }}
          </div>
        </div>
      </n-space>
    </template>

    <template #header-extra>
      <n-space>
        <n-tag v-if="currentModel" type="success" size="small">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </n-icon>
          </template>
          已加载
        </n-tag>
      </n-space>
    </template>

    <n-spin :show="!currentModel || loading">
      <div v-if="currentModel">
        <n-scrollbar class="scrollable-content">
            <!-- 使用折叠面板组织所有设置 -->
            <n-collapse default-expanded-names="display">
              <!-- 显示设置 -->
              <n-collapse-item title="显示设置" name="display">
                <template #header-extra>
                  <n-space>
                    <n-tag size="small" type="primary">基础</n-tag>
                    <n-icon size="16" color="var(--n-primary-color)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </n-icon>
                  </n-space>
                </template>

                <n-form :model="modelSettings" label-placement="left" label-width="80">
                  <n-space vertical size="medium">
                    <!-- 大小控制 -->
                    <setting-slider
                      label="大小"
                      :model-value="modelSettings.scale"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :default-value="0.2"
                      :show-min-max-input="false"
                      :show-reset-button="true"
                      :updater="currentHeroModel?.setScale"
                      @update:model-value="val => modelSettings.scale = val"
                      @reset="resetScale"
                    />

                    <!-- 旋转控制 -->
                    <setting-slider
                      label="旋转"
                      :model-value="modelSettings.rotation"
                      :min="0"
                      :max="360"
                      :step="1"
                      :default-value="0"
                      :show-min-max-input="false"
                      :updater="currentHeroModel?.setAngle"
                      @update:model-value="val => modelSettings.rotation = val"
                    />

                    <n-divider style="margin: 8px 0;" />

                    <!-- 开关控制 -->
                    <n-space vertical size="medium">
                      <setting-switch
                        label="呼吸动画"
                        :model-value="modelSettings.breathing"
                        :updater="currentHeroModel?.setBreathing"
                        @update:model-value="val => modelSettings.breathing = val"
                      />

                      <setting-switch
                        label="眨眼动画"
                        :model-value="modelSettings.eyeBlinking"
                        :updater="currentHeroModel?.setEyeBlinking"
                        @update:model-value="val => modelSettings.eyeBlinking = val"
                      />

                      <setting-switch
                        label="模型拖拽"
                        :model-value="modelSettings.interactive"
                        :updater="currentHeroModel?.setInteractive"
                        @update:model-value="val => modelSettings.interactive = val"
                      />

                      <!-- 新增：语音播放开关 -->
                      <setting-switch
                        label="语音播放"
                        :model-value="modelSettings.enableAudio"
                        :updater="val => currentHeroModel.model.audioEnabled = val"
                        @update:model-value="val => modelSettings.enableAudio = val"
                      />

                      <!-- 新增：文本显示开关 -->
                      <setting-switch
                        label="文本显示"
                        :model-value="modelSettings.showText"
                        :updater="val => currentHeroModel.model.textEnabled = val"
                        @update:model-value="val => modelSettings.showText = val"
                      />
                    </n-space>

                    <n-divider style="margin: 16px 0;" />

                    <!-- 交互功能控制 -->
                    <n-space vertical size="medium">
                      <div style="font-size: 14px; font-weight: 500; color: var(--n-text-color-base);">
                        交互功能
                      </div>

                      <setting-switch
                        label="滚轮缩放"
                        :model-value="modelSettings.wheelZoom"
                        @update:model-value="(value) => { modelSettings.wheelZoom = value; updateWheelZoom(); }"
                      />

                      <setting-switch
                        label="鼠标交互"
                        :model-value="modelSettings.clickInteraction"
                        @update:model-value="(value) => { modelSettings.clickInteraction = value; updateClickInteraction(); }"
                      />

                      <!-- 缩放设置 -->
                      <div v-if="modelSettings.wheelZoom" style="margin-top: 12px;">
                        <n-space vertical size="small">
                          <div style="font-size: 13px; color: var(--n-text-color-disabled);">缩放设置</div>

                          <n-form-item label="缩放速度" label-placement="left" style="margin: 0;">
                            <n-slider
                              :value="modelSettings.zoomSpeed"
                              :min="0.01"
                              :max="0.1"
                              :step="0.01"
                              @update:value="(value) => { modelSettings.zoomSpeed = value; updateZoomSettings(); }"
                              style="flex: 1; margin-right: 12px;"
                            />
                            <n-input-number
                              :value="modelSettings.zoomSpeed"
                              :min="0.01"
                              :max="0.1"
                              :step="0.01"
                              size="small"
                              @update:value="(value) => { modelSettings.zoomSpeed = value; updateZoomSettings(); }"
                              style="width: 80px;"
                            />
                          </n-form-item>

                          <n-form-item label="最小缩放" label-placement="left" style="margin: 0;">
                            <n-slider
                              :value="modelSettings.minScale"
                              :min="0.01"
                              :max="1.0"
                              :step="0.01"
                              @update:value="(value) => { modelSettings.minScale = value; updateZoomSettings(); }"
                              style="flex: 1; margin-right: 12px;"
                            />
                            <n-input-number
                              :value="modelSettings.minScale"
                              :min="0.01"
                              :max="1.0"
                              :step="0.1"
                              size="small"
                              @update:value="(value) => { modelSettings.minScale = value; updateZoomSettings(); }"
                              style="width: 80px;"
                            />
                          </n-form-item>

                          <n-form-item label="最大缩放" label-placement="left" style="margin: 0;">
                            <n-slider
                              :value="modelSettings.maxScale"
                              :min="1.0"
                              :max="5.0"
                              :step="0.1"
                              @update:value="(value) => { modelSettings.maxScale = value; updateZoomSettings(); }"
                              style="flex: 1; margin-right: 12px;"
                            />
                            <n-input-number
                              :value="modelSettings.maxScale"
                              :min="1.0"
                              :max="5.0"
                              :step="0.1"
                              size="small"
                              @update:value="(value) => { modelSettings.maxScale = value; updateZoomSettings(); }"
                              style="width: 80px;"
                            />
                          </n-form-item>
                        </n-space>
                      </div>
                    </n-space>
                  </n-space>
                </n-form>
              </n-collapse-item>

              <!-- 表情控制 -->
              <n-collapse-item title="表情控制" name="expressions">
                <template #header-extra>
                  <n-space>
                    <n-tag size="small" type="warning">{{ expressions.length }} 个</n-tag>
                    <n-icon size="16" color="var(--n-warning-color)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                      </svg>
                    </n-icon>
                  </n-space>
                </template>

                <div v-if="expressions.length > 0" style="max-height: 300px; overflow-y: auto;">
                  <n-list hoverable clickable>
                    <n-list-item
                      v-for="(expression, index) in expressions"
                      :key="index"
                      @click="setExpression(index)"
                    >
                      <template #prefix>
                        <n-icon color="var(--n-warning-color)">
                          <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </n-icon>
                      </template>
                      {{ expression.Name || `表情 ${index + 1}` }}
                    </n-list-item>
                  </n-list>
                </div>

                <n-empty v-else description="暂无表情数据" size="small">
                  <template #icon>
                    <n-icon size="32" color="var(--n-text-color-disabled)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c.93 0 1.69.76 1.69 1.69S12.93 8.38 12 8.38s-1.69-.76-1.69-1.69S11.07 5 12 5zm0 9.38c-2.03 0-3.78-.92-4.97-2.34.03-.31.17-.6.43-.82.26-.22.6-.34.96-.34h7.16c.36 0 .7.12.96.34.26.22.4.51.43.82-1.19 1.42-2.94 2.34-4.97 2.34z"/>
                      </svg>
                    </n-icon>
                  </template>
                </n-empty>
              </n-collapse-item>

              <!-- 动作控制 -->
              <n-collapse-item title="动作控制" name="motions">
                <template #header-extra>
                  <n-space>
                    <n-tag size="small" type="success">{{ Object.keys(motions).length }} 组</n-tag>
                    <n-button
                      size="tiny"
                      type="primary"
                      @click.stop="playRandomMotion"
                      :disabled="Object.keys(motions).length === 0"
                      style="margin-left: 8px;"
                    >
                      随机播放
                    </n-button>
                    <n-button
                      size="tiny"
                      type="error"
                      @click.stop="stopCurrentMotion"
                      :disabled="!isMotionPlaying"
                      style="margin-left: 4px;"
                    >
                      停止
                    </n-button>
                    <n-icon size="16" color="var(--n-success-color)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M8 5v14l11-7z"/>
                      </svg>
                    </n-icon>
                  </n-space>
                </template>

                <div v-if="Object.keys(motions).length > 0" style="max-height: 600px; overflow-y: auto;">
                  <!-- 当前播放状态 -->
                  <div v-if="currentPlayingMotion" style="margin-bottom: 16px; padding: 12px; background: var(--n-info-color-suppl); border-radius: 6px;">
                    <n-space align="center" justify="space-between">
                      <div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--n-info-color);">
                          正在播放: {{ currentPlayingMotion.name }}
                        </div>
                        <div style="font-size: 11px; color: var(--n-text-color-disabled);">
                          {{ currentPlayingMotion.group }} - {{ currentPlayingMotion.index + 1 }}
                        </div>
                      </div>
                      <n-button size="small" type="error" @click="stopCurrentMotion">
                        停止
                      </n-button>
                    </n-space>
                  </div>

                  <n-collapse>
                    <n-collapse-item
                      v-for="(motionGroup, groupName) in motions"
                      :key="groupName"
                      :title="groupName"
                      :name="groupName"
                    >
                      <template #header-extra>
                        <n-space>
                          <n-tag size="tiny" type="info">{{ motionGroup.length }}</n-tag>
                          <n-button
                            size="tiny"
                            type="primary"
                            @click.stop="playRandomMotionFromGroup(groupName)"
                            style="margin-left: 4px;"
                          >
                            随机
                          </n-button>
                        </n-space>
                      </template>

                      <n-list hoverable clickable>
                        <n-list-item
                          v-for="(motion, index) in motionGroup"
                          :key="`${groupName}-${index}`"
                          @click="playMotion(groupName, index, motion)"
                          :class="{ 'motion-playing': isCurrentMotion(groupName, index) }"
                        >
                          <template #prefix>
                            <n-icon
                              :color="isCurrentMotion(groupName, index) ? 'var(--n-warning-color)' : 'var(--n-success-color)'"
                              :size="isCurrentMotion(groupName, index) ? 18 : 16"
                            >
                              <svg viewBox="0 0 24 24" v-if="!isCurrentMotion(groupName, index)">
                                <path fill="currentColor" d="M8 5v14l11-7z"/>
                              </svg>
                              <svg viewBox="0 0 24 24" v-else>
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                              </svg>
                            </n-icon>
                          </template>

                          <n-space justify="space-between" align="center" style="width: 100%;">
                            <div>
                              <div style="font-size: 13px;">{{ getMotionDisplayName(motion, index) }}</div>
                              <div v-if="motion.Text" style="font-size: 11px; color: var(--n-text-color-disabled); margin-top: 2px;">
                                {{ motion.Text.substring(0, 30) }}{{ motion.Text.length > 30 ? '...' : '' }}
                              </div>
                            </div>

                            <n-space size="small">
                              <n-tag v-if="motion.Audio" size="tiny" type="warning">
                                音频
                              </n-tag>
                              <n-tag v-if="motion.Text" size="tiny" type="info">
                                文本
                              </n-tag>
                            </n-space>
                          </n-space>
                        </n-list-item>
                      </n-list>
                    </n-collapse-item>
                  </n-collapse>
                </div>

                <n-empty v-else description="暂无动作数据" size="small">
                  <template #icon>
                    <n-icon size="32" color="var(--n-text-color-disabled)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M8 5v14l11-7z"/>
                      </svg>
                    </n-icon>
                  </template>
                </n-empty>
              </n-collapse-item>

              <!-- 参数控制 -->
              <n-collapse-item title="参数控制" name="parameters">
                <template #header-extra>
                  <n-space>
                    <n-tag size="small" type="info">{{ parameters.length }} 个</n-tag>
                    <n-icon size="16" color="var(--n-info-color)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                      </svg>
                    </n-icon>
                  </n-space>
                </template>

                <div v-if="parameters.length > 0" style="max-height: 600px; overflow-y: auto;">
                  <n-space vertical size="medium">
                    <div
                      v-for="param in parameters"
                      :key="param.parameterIds"
                      style="padding: 12px; border: 1px solid var(--n-border-color); border-radius: 6px;"
                    >
                      <setting-slider
                        :label="param.parameterIds"
                        :model-value="currentParameters[param.parameterIds] ?? param.defaultValue"
                        :min="param.min"
                        :max="param.max"
                        :step="0.01"
                        :updater="(value) => currentHeroModel?.setParameters(param.parameterIds, value)"
                        @update:model-value="(value) => currentParameters[param.parameterIds] = value"
                        :form-item-style="{ margin: '0' }"
                        :slider-style="{ margin: '8px 0' }"
                        :input-number-style="{ width: '80px' }"
                        space-size="small"
                      />
                    </div>
                  </n-space>
                </div>

                <n-empty v-else description="暂无参数数据" size="small">
                  <template #icon>
                    <n-icon size="32" color="var(--n-text-color-disabled)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                      </svg>
                    </n-icon>
                  </template>
                </n-empty>
              </n-collapse-item>

              <!-- 部件控制 -->
              <n-collapse-item title="部件控制" name="parts" >
                <template #header-extra>
                  <n-space>
                    <n-tag size="small" type="error">{{ partOpacity.length }} 个</n-tag>
                    <n-icon size="16" color="var(--n-error-color)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </n-icon>
                  </n-space>
                </template>

                <div v-if="partOpacity.length > 0" style="max-height: 600px; overflow-y: auto;">
                  <n-space vertical size="medium">
                    <div
                      v-for="part in partOpacity"
                      :key="part.partId"
                      style="padding: 12px; border: 1px solid var(--n-border-color); border-radius: 6px;"
                    >
                      <setting-slider
                        :label="part.partId"
                        :model-value="currentParts[part.partId] ?? part.defaultValue"
                        :min="0"
                        :max="1"
                        :step="0.1"
                        :updater="(value) => currentHeroModel?.setPartOpacity(part.partId, value)"
                        @update:model-value="(value) => currentParts[part.partId] = value"
                        :form-item-style="{ margin: '0' }"
                        :slider-style="{ margin: '8px 0' }"
                        :input-number-style="{ width: '80px' }"
                        space-size="small"
                      />
                    </div>
                  </n-space>
                </div>

                <n-empty v-else description="暂无部件数据" size="small">
                  <template #icon>
                    <n-icon size="32" color="var(--n-text-color-disabled)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </n-icon>
                  </template>
                </n-empty>
              </n-collapse-item>
            </n-collapse>
        </n-scrollbar>
      </div>

      <template #action>
        <n-space justify="center">
          <n-button @click="goBack">
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                </svg>
              </n-icon>
            </template>
            返回
          </n-button>
        </n-space>
      </template>
    </n-spin>
    </n-card>
</template>

<script>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useLive2DStore } from '../stores/live2d'
import { globalStateSyncManager } from '../utils/live2d/state-sync-manager.js'
import { globalResourceManager } from '../utils/resource-manager.js'
import SettingSlider from './settings/SettingSlider.vue'
import SettingSwitch from './settings/SettingSwitch.vue'


export default {
  name: 'ModelSettings',
  components: {
    SettingSlider,
    SettingSwitch
  },
  emits: ['back'],
  setup(_, { emit }) {
    const live2dStore = useLive2DStore()
    const message = useMessage()

    // 状态管理
    const loading = ref(false)
    // 移除 dataLoaded, expressionsLoaded, motionsLoaded, parametersLoaded, partsLoaded，因为计算属性会直接从模型获取

    // 设置同步控制
    const settingsSyncEnabled = ref(true)
    const isLoadingFromStore = ref(false)
    const syncDebounceTimer = ref(null)

    // 状态同步管理器集成
    const stateSyncEnabled = ref(true)
    const lastSyncTime = ref(0)
    const syncInterval = 100 // 100ms同步间隔

    // 动作播放状态管理
    const isMotionPlaying = ref(false)
    const currentPlayingMotion = ref(null)

    // 扩展状态管理
    const currentExpression = ref(null)
    const currentParameters = reactive({})
    const currentParts = reactive({})
    const currentAudioState = ref(false)
    const currentTextState = ref(false)

    const modelSettings = reactive({
      scale: 0.2,
      rotation: 0,
      breathing: true,
      eyeBlinking: true,
      interactive: true,
      // 交互功能设置
      wheelZoom: true,
      clickInteraction: true,
      // 缩放设置
      zoomSpeed: 0.01,
      minScale: 0.01,
      maxScale: 5.0,
      // 新增
      enableAudio: true,
      showText: true
    })

    // 计算属性
    const currentModel = computed(() => live2dStore.currentModel)

    // 获取当前的 heroModel 实例
    const currentHeroModel = computed(() => {
      const manager = live2dStore?.manager;
      const currentModelValue = currentModel.value;

      // 1. 确保 manager 和 currentModelValue 都已准备好
      if (!manager || !currentModelValue || !currentModelValue.id) {
        // console.log('🔍 [ModelSettings] Manager or currentModel is not ready.');
        return null;
      }
      
      // 2. 确保模型已完全加载
      if (live2dStore.isLoading) {
        // console.log(`🔍 [ModelSettings] Store is loading, model might not be fully ready.`);
        return null;
      }

      // 3. 确保模型在管理器中实际存在
      const heroModel = manager.getModel(currentModelValue.id);
      if (!heroModel) {
        // console.log(`🔍 [ModelSettings] HeroModel with id ${currentModelValue.id} not found in manager.`);
        return null;
      }

      console.log(`[ModelSettings] currentHeroModel resolved for id ${currentModelValue.id}.`);
      return heroModel;
    });

    // 从 heroModel 获取表情数据
    const expressions = computed(() => {
      if (!currentHeroModel.value) {
        console.log('🔍 [ModelSettings] expressions: currentHeroModel is null.')
        return []
      }
      try {
        const exprs = currentHeroModel.value.getExpressions() || []
        console.log('🔍 [ModelSettings] expressions computed:', exprs.length, 'items')
        return exprs
      } catch (error) {
        console.error('❌ [ModelSettings] 获取表情数据失败:', error)
        return []
      }
    })

    // 从 heroModel 获取动作数据
    const motions = computed(() => {
      if (!currentHeroModel.value) {
        console.log('🔍 [ModelSettings] motions: currentHeroModel is null.')
        return {}
      }
      try {
        const mots = currentHeroModel.value.getMotions() || {}
        console.log('🔍 [ModelSettings] motions computed:', Object.keys(mots).length, 'groups')
        return mots
      } catch (error) {
        console.error('❌ [ModelSettings] 获取动作数据失败:', error)
        return {}
      }
    })

    // 从 heroModel 获取参数数据
    const parameters = computed(() => {
      if (!currentHeroModel.value) {
        console.log('🔍 [ModelSettings] parameters: currentHeroModel is null.')
        return []
      }
      try {
        const modelParams = currentHeroModel.value.getAllParameters() || []
        console.log('🔍 [ModelSettings] parameters computed:', modelParams.length, 'items')
        return modelParams
      } catch (error) {
        console.error('❌ [ModelSettings] 获取参数数据失败:', error)
        return []
      }
    })

    // 从 heroModel 获取部件不透明度数据
    const partOpacity = computed(() => {
      if (!currentHeroModel.value) {
        console.log('🔍 [ModelSettings] partOpacity: currentHeroModel is null.')
        return []
      }
      try {
        const modelParts = currentHeroModel.value.getAllPartOpacity() || []
        console.log('🔍 [ModelSettings] partOpacity computed:', modelParts.length, 'items.')
        return modelParts
      } catch (error) {
        console.error('❌ [ModelSettings] 获取部件数据失败:', error)
        return []
      }
    })

    // 资源清理函数
    const cleanupResources = () => {
      // 清理定时器 - 使用资源管理器
      if (syncDebounceTimer.value) {
        globalResourceManager.cleanupTimers()
        syncDebounceTimer.value = null
      }
      console.log('🧹 [ModelSettings] 资源清理完成')
    }
    // 设置同步方法
    const syncSettingsToStore = () => {
      if (isLoadingFromStore.value) return // 正在加载时不写入，防止循环
      if (!live2dStore || isLoadingFromStore.value) return

      try {
        // 写入Store前加锁，防止watch监听到
        isLoadingFromStore.value = true

        const currentSettings = {
          scale: modelSettings.scale,
          rotation: modelSettings.rotation,
          breathing: modelSettings.breathing,
          eyeBlinking: modelSettings.eyeBlinking,
          interactive: modelSettings.interactive,
          wheelZoom: modelSettings.wheelZoom,
          clickInteraction: modelSettings.clickInteraction,
          zoomSettings: {
            speed: modelSettings.zoomSpeed,
            min: modelSettings.minScale,
            max: modelSettings.maxScale
          },
          enableAudio: modelSettings.enableAudio,
          showText: modelSettings.showText,
          expression: currentExpression.value,
          motion: currentPlayingMotion.value,
          parameters: { ...currentParameters },
          parts: { ...currentParts }
        }

        // 统一使用updateModelState更新所有设置
        if (live2dStore && typeof live2dStore.updateModelState === 'function') {
          live2dStore.updateModelState(currentSettings)
        }

        console.log('💾 [ModelSettings] 设置已同步到Store:', { ...modelSettings })
      } finally {
        // 延迟解锁，确保Store更新完成后再允许watch监听
        setTimeout(() => {
          isLoadingFromStore.value = false
        }, 10)
      }
    }

    // 从Store加载设置的安全方法
    const loadSettingsFromStore = () => {
      if (isLoadingFromStore.value) return // 如果正在写入，不加载
      
      isLoadingFromStore.value = true
      try {
        if (!currentModel.value || !live2dStore.modelState?.settings) {
          console.log('📝 [ModelSettings] Store中没有设置数据，使用默认值')
          return
        }

        const settings = live2dStore.modelState.settings

        // 统一处理基础设置和扩展设置
        const applySetting = (key, target, source, defaultValue = undefined) => {
          if (source[key] !== undefined) {
            target[key] = source[key]
          } else if (defaultValue !== undefined) {
            target[key] = defaultValue
          }
        }

        // 基础设置
        applySetting('scale', modelSettings, settings)
        applySetting('rotation', modelSettings, settings)
        applySetting('breathing', modelSettings, settings)
        applySetting('eyeBlinking', modelSettings, settings)
        applySetting('interactive', modelSettings, settings)

        // 交互功能设置
        applySetting('wheelZoom', modelSettings, settings)
        applySetting('clickInteraction', modelSettings, settings)

        // 缩放设置 - 修复数据结构匹配
        if (settings.zoomSettings) {
          applySetting('speed', modelSettings, settings.zoomSettings, modelSettings.zoomSpeed)
          applySetting('min', modelSettings, settings.zoomSettings, modelSettings.minScale)
          applySetting('max', modelSettings, settings.zoomSettings, modelSettings.maxScale)
        } else {
          // 兼容旧格式
          applySetting('zoomSpeed', modelSettings, settings)
          applySetting('minScale', modelSettings, settings)
          applySetting('maxScale', modelSettings, settings)
        }

        // 扩展设置
        applySetting('enableAudio', modelSettings, settings)
        applySetting('showText', modelSettings, settings)

        // 扩展状态
        applySetting('expression', currentExpression, settings, null)
        applySetting('motion', currentPlayingMotion, settings, null)
        if (settings.parameters !== undefined) {
          // 清空现有参数
          for (const key in currentParameters) {
            delete currentParameters[key]
          }
          // 复制新参数
          Object.assign(currentParameters, settings.parameters)
        }
        if (settings.parts !== undefined) {
          // 清空现有部件
          for (const key in currentParts) {
            delete currentParts[key]
          }
          // 复制新部件
          Object.assign(currentParts, settings.parts)
        }
        applySetting('audio', currentAudioState, settings, false)
        applySetting('text', currentTextState, settings, false)

        console.log('✅ [ModelSettings] 设置已从Store加载')
      } finally {
        isLoadingFromStore.value = false
      }
    }

    // 统一同步所有模型状态到UI的函数
    const syncAllModelStatesToUI = () => {
      if (!currentHeroModel.value) return;

      console.log('🔄 [ModelSettings] Starting full state sync from model to UI.');

      try {
        // 1. 同步基础变换属性
        const scale = currentHeroModel.value.getScale();
        if (scale && typeof scale.x === 'number') modelSettings.scale = scale.x;
        
        const rotation = currentHeroModel.value.getAngle();
        if (typeof rotation === 'number') modelSettings.rotation = rotation;

        // 2. 同步布尔值状态
        if (currentHeroModel.value.model) {
          modelSettings.breathing = currentHeroModel.value.model.breathing;
          modelSettings.eyeBlinking = currentHeroModel.value.model.eyeBlinking;
          modelSettings.interactive = currentHeroModel.value.model.interactive;
        }

        // 3. 同步表情
        const expressionIndex = currentHeroModel.value.getCurrentExpressionIndex();
        currentExpression.value = expressionIndex;

        // 4. 同步动作
        const motionManager = currentHeroModel.value.model?.internalModel?.motionManager;
        if (motionManager && motionManager.currentMotion) {
          const currentMotion = motionManager.currentMotion;
          currentPlayingMotion.value = {
            group: currentMotion.group,
            index: currentMotion.index,
            isPlaying: true,
            name: currentMotion.name || `${currentMotion.group}_${currentMotion.index}`
          };
          isMotionPlaying.value = true;
        } else {
          currentPlayingMotion.value = null;
          isMotionPlaying.value = false;
        }

        // 5. 同步参数
        const params = currentHeroModel.value.getAllParameters() || [];
        for (const key in currentParameters) delete currentParameters[key];
        params.forEach(p => {
          currentParameters[p.parameterIds] = p.defaultValue;
        });

        // 6. 同步部件不透明度
        const parts = currentHeroModel.value.getAllPartOpacity() || [];
        for (const key in currentParts) delete currentParts[key];
        parts.forEach(p => {
          currentParts[p.partId] = p.defaultValue;
        });

        // 7. 同步音频和文本状态
        modelSettings.enableAudio = currentHeroModel.value.model.audioEnabled !== false;
        modelSettings.showText = currentHeroModel.value.model.textEnabled !== false;
        currentAudioState.value = modelSettings.enableAudio;
        currentTextState.value = modelSettings.showText;

        // 8. 同步交互设置
        updateZoomSettings();

        console.log('✅ [ModelSettings] Full state sync completed.');
      } catch (error) {
        console.error('❌ [ModelSettings] 同步模型状态失败:', error);
        message.error('同步模型状态失败');
      }
    }

    // 监听模型变化
    watch(currentModel, async (newModel, oldModel) => {
      if (newModel && newModel.id !== oldModel?.id) {
        console.log('🔄 [ModelSettings] 模型变化，重新加载设置:', newModel.id)

        // 注销旧模型的状态同步
        if (oldModel) {
          unregisterStateSync()
        }

        // 清理之前模型的资源
        cleanupResources()

        // 暂时禁用同步，避免重复触发
        settingsSyncEnabled.value = false
        stateSyncEnabled.value = false

        // 重置基础设置到默认值
        Object.assign(modelSettings, {
          scale: 0.2,
          rotation: 0,
          breathing: true,
          eyeBlinking: true,
          interactive: true,
          // 交互功能设置
          wheelZoom: true,
          clickInteraction: true,
          // 缩放设置
          zoomSpeed: 0.01,
          minScale: 0.05,
          maxScale: 2.0,
          // 新增
          enableAudio: true,
          showText: true
        })

        // 重置扩展状态
        currentExpression.value = null
        currentPlayingMotion.value = null
        for (const key in currentParameters) {
          delete currentParameters[key]
        }
        for (const key in currentParts) {
          delete currentParts[key]
        }
        currentAudioState.value = false
        currentTextState.value = false
        isMotionPlaying.value = false

        // 延迟加载数据以提升性能
        await nextTick()

        // 尝试从Store加载设置
        loadSettingsFromStore()

        // 尝试从状态同步管理器恢复状态
        if (newModel && currentHeroModel.value) {
          const restored = globalStateSyncManager.restoreStateFromCache(newModel.id, currentHeroModel.value)
          if (restored) {
            console.log('✅ [ModelSettings] 状态已从状态同步管理器恢复')
          }
        }

        // 重新启用同步
        settingsSyncEnabled.value = true
        stateSyncEnabled.value = true

        // 注册新模型的状态同步
        await nextTick()
        registerStateSync()

        // 同步模型的当前状态
        syncAllModelStatesToUI()
      }
    }, { immediate: true })

    // 监听Store中的modelState变化
    watch(() => live2dStore.modelState, (newState) => {
      if (newState && newState.settings && !isLoadingFromStore.value) {
        console.log('🔄 [ModelSettings] Store状态变化，重新加载设置')
        loadSettingsFromStore()
      }
    }, { deep: true })

    // 监听 heroModel 变化，确保数据同步
    watch(currentHeroModel, (newHeroModel) => {
      if (newHeroModel) {
        console.log('🦸‍♂️ [ModelSettings] HeroModel 准备就绪，执行完全同步')
        // 首次加载时，currentModel 的 watch 回调会调用 syncAllModelStatesToUI
        // 此处不再需要重复调用，以避免冗余的同步操作
      }
    }, { immediate: true })

    // 监听动作播放状态变化
    watch(isMotionPlaying, (newValue) => {
      if (newValue && currentPlayingMotion.value) {
        console.log('🎬 [ModelSettings] 动作开始播放:', currentPlayingMotion.value)
      } else if (!newValue) {
        console.log('⏹️ [ModelSettings] 动作已停止')
      }
    })

    // 监听表情变化
    watch(currentExpression, (newExpression) => {
      if (newExpression !== null) {
        console.log('😊 [ModelSettings] 表情已设置:', newExpression)
        syncSettingsToStore()
      }
    })

    // 监听参数变化
    watch(currentParameters, (newParameters) => {
      console.log('🔧 [ModelSettings] 参数已更新:', newParameters)
      syncSettingsToStore()
    }, { deep: true })

    // 监听部件变化
    watch(currentParts, (newParts) => {
      console.log('🎨 [ModelSettings] 部件已更新:', newParts)
      syncSettingsToStore()
    }, { deep: true })

    // 监听音频和文本状态变化
    watch([currentAudioState, currentTextState], ([newAudio, newText]) => {
      console.log('🔊 [ModelSettings] 音频/文本状态已更新:', { audio: newAudio, text: newText })
      syncSettingsToStore()
    })

    const setExpression = (index) => {
      if (!currentHeroModel.value || !expressions.value[index]) return

      const expression = expressions.value[index]
      currentHeroModel.value.setExpression(index)
      currentExpression.value = index

      message.success(`已设置表情: ${expression.Name || `表情 ${index + 1}`}`)
      syncSettingsToStore()
    }

    // 动作播放方法 - 优化版本，移除冗余检查
    const playMotion = (group, index, motion) => {
      if (!currentHeroModel.value) return

      // 停止当前动作
      if (isMotionPlaying.value) {
        currentHeroModel.value.model.stopMotions()
      }

      // 播放新动作
      currentHeroModel.value.playMotion(group, index)
      
      // 更新状态
      isMotionPlaying.value = true
      currentPlayingMotion.value = {
        group,
        index,
        isPlaying: true,
        name: motion?.Text || `${group}_${index}`
      }

      message.success(`正在播放动作: ${currentPlayingMotion.value.name}`)
      syncSettingsToStore()
    }

    const stopCurrentMotion = () => {
      if (!currentHeroModel.value) return

      currentHeroModel.value.model.stopMotions()
      isMotionPlaying.value = false
      currentPlayingMotion.value = null

      message.success('动作已停止')
      syncSettingsToStore()
    }

    const playRandomMotion = () => {
      if (!currentHeroModel.value || Object.keys(motions.value).length === 0) return

      const groups = Object.keys(motions.value)
      const randomGroup = groups[Math.floor(Math.random() * groups.length)]
      const motionGroup = motions.value[randomGroup]
      const randomIndex = Math.floor(Math.random() * motionGroup.length)
      const motion = motionGroup[randomIndex]

      playMotion(randomGroup, randomIndex, motion)
    }

    const playRandomMotionFromGroup = (groupName) => {
      if (!currentHeroModel.value || !motions.value[groupName]) return

      const motionGroup = motions.value[groupName]
      const randomIndex = Math.floor(Math.random() * motionGroup.length)
      const motion = motionGroup[randomIndex]

      playMotion(groupName, randomIndex, motion)
    }

    const isCurrentMotion = (group, index) => {
      return currentPlayingMotion.value && 
             currentPlayingMotion.value.group === group && 
             currentPlayingMotion.value.index === index
    }


    // 交互功能更新方法 - 优化版本，移除冗余检查
    const updateWheelZoom = () => {
      try {
        // 直接调用Live2D管理器的滚轮缩放设置
        if (live2dStore?.manager) {
          live2dStore.manager.setWheelZoomEnabled(modelSettings.wheelZoom)
        }

        // 手动同步到Store，避免重复调用
        syncSettingsToStore()

        console.log('🔍 [ModelSettings] 滚轮缩放设置已更新:', modelSettings.wheelZoom)
      } catch (error) {
        console.error('❌ [ModelSettings] 更新滚轮缩放设置失败:', error)
        message.error('更新滚轮缩放设置失败')
      }
    }

    const updateClickInteraction = () => {
      try {
        // 直接调用Live2D管理器的交互功能设置
        if (live2dStore?.manager) {
          live2dStore.manager.setInteractionEnabled(modelSettings.clickInteraction)
        }

        // 同时更新模型的交互性状态，确保协调
        if (currentHeroModel.value) {
          const shouldBeInteractive = modelSettings.interactive && modelSettings.clickInteraction
          currentHeroModel.value.setInteractive(shouldBeInteractive)
        }

        // 手动同步到Store，避免重复调用
        syncSettingsToStore()
        
        console.log('🖱️ [ModelSettings] 鼠标交互设置已更新:', modelSettings.clickInteraction)
      } catch (error) {
        console.error('❌ [ModelSettings] 更新鼠标交互设置失败:', error)
        message.error('更新鼠标交互设置失败')
      }
    }

    // 交互功能更新方法 - 优化版本，移除冗余检查
    function updateZoomSettings() {
      try {
        // 只处理缩放步长，不再应用最小和最大值限制
        const zoomSpeed = Math.max(0.001, Math.min(0.1, modelSettings.zoomSpeed))

        // 检查live2dStore和manager是否存在
        if (!live2dStore) {
          console.warn('⚠️ [ModelSettings] live2dStore不存在，跳过缩放设置更新')
          return
        }

        if (!live2dStore.manager) {
          console.warn('⚠️ [ModelSettings] live2dStore.manager不存在，跳过缩放设置更新')
          return
        }

        // 检查manager是否有updateZoomSettings方法
        if (typeof live2dStore.manager.updateZoomSettings !== 'function') {
          console.warn('⚠️ [ModelSettings] manager.updateZoomSettings方法不存在，manager类型:', typeof live2dStore.manager)
          console.log('🔍 [ModelSettings] manager对象:', live2dStore.manager)
          return
        }

        // 直接更新Live2D管理器的缩放设置
        live2dStore.manager.updateZoomSettings({
          zoomSpeed: zoomSpeed
        })

        // 手动同步到Store，避免重复调用
        syncSettingsToStore()
        
        console.log('⚙️ [ModelSettings] 缩放设置已更新:', {
          speed: zoomSpeed.toFixed(3)
        })
      } catch (error) {
        console.error('❌ [ModelSettings] 更新缩放设置失败:', error)
        console.error('🔍 [ModelSettings] 错误详情:', {
          live2dStore: !!live2dStore,
          manager: !!live2dStore?.manager,
          managerType: typeof live2dStore?.manager,
          hasUpdateZoomSettings: typeof live2dStore?.manager?.updateZoomSettings
        })
        message.error('更新缩放设置失败')
      }
    }


    // 状态同步管理器集成方法 - 优化版本，简化逻辑
    const registerStateSync = () => {
      if (!currentModel.value || !currentHeroModel.value) return

      const modelId = currentModel.value.id
      
      // 注册同步回调 - 简化版本
      globalStateSyncManager.registerSyncCallback(modelId, (currentState) => {
        if (!currentState || !stateSyncEnabled.value) return

        // 避免频繁同步
        const now = Date.now()
        if (now - lastSyncTime.value < syncInterval) return
        lastSyncTime.value = now

        // 统一应用状态到UI
        const applyStateToUI = (key, targetRef, sourceValue, tolerance = 0, min = -Infinity, max = Infinity) => {
          if (sourceValue !== undefined) {
            if (typeof sourceValue === 'number' && Math.abs(sourceValue - targetRef.value) > tolerance) {
              targetRef.value = Math.max(min, Math.min(max, sourceValue))
            } else if (typeof sourceValue === 'boolean' && sourceValue !== targetRef.value) {
              targetRef.value = sourceValue
            } else if (typeof sourceValue === 'object' && JSON.stringify(sourceValue) !== JSON.stringify(targetRef.value)) {
              targetRef.value = sourceValue
            }
            // 对于 modelSettings 中的布尔值，也同步更新
            if (modelSettings[key] !== undefined && typeof modelSettings[key] === 'boolean') {
              modelSettings[key] = sourceValue
            }
          }
        }

        applyStateToUI('scale', modelSettings.scale, currentState.scale, 0.001, 0.01, 1)
        applyStateToUI('rotation', modelSettings.rotation, currentState.rotation, 0.1, 0, 360)
        applyStateToUI('breathing', modelSettings.breathing, currentState.breathing)
        applyStateToUI('eyeBlinking', modelSettings.eyeBlinking, currentState.eyeBlinking)
        applyStateToUI('interactive', modelSettings.interactive, currentState.interactive)
        applyStateToUI('wheelZoom', modelSettings.wheelZoom, currentState.wheelZoom)
        applyStateToUI('clickInteraction', modelSettings.clickInteraction, currentState.clickInteraction)
        applyStateToUI('enableAudio', modelSettings.enableAudio, currentState.audio)
        applyStateToUI('showText', modelSettings.showText, currentState.text)

        // 复杂对象同步
        if (currentState.expression !== undefined && currentState.expression !== currentExpression.value) {
          currentExpression.value = currentState.expression
        }

        if (currentState.motion !== undefined) {
          if (currentState.motion && JSON.stringify(currentState.motion) !== JSON.stringify(currentPlayingMotion.value)) {
            currentPlayingMotion.value = currentState.motion
            isMotionPlaying.value = currentState.motion.isPlaying
          } else if (!currentState.motion && isMotionPlaying.value) {
            isMotionPlaying.value = false
            currentPlayingMotion.value = null
          }
        }

        if (currentState.parameters && typeof currentState.parameters === 'object') {
          // 清空现有参数
          for (const key in currentParameters) {
            delete currentParameters[key]
          }
          // 复制新参数
          Object.assign(currentParameters, currentState.parameters)
        }

        if (currentState.parts && typeof currentState.parts === 'object') {
          // 清空现有部件
          for (const key in currentParts) {
            delete currentParts[key]
          }
          // 复制新部件
          Object.assign(currentParts, currentState.parts)
        }

        console.log('🔄 [ModelSettings] 状态已从模型同步到UI:', modelId, currentState)
      })

      console.log('📝 [ModelSettings] 状态同步已注册:', modelId)
    }

    const unregisterStateSync = () => {
      if (!currentModel.value) return

      const modelId = currentModel.value.id
      globalStateSyncManager.unregisterSyncCallback(modelId)
      console.log('🗑️ [ModelSettings] 状态同步已注销:', modelId)
    }

    const syncUISettingsToModel = () => {
      if (!currentModel.value || !currentHeroModel.value || !stateSyncEnabled.value) return

      const modelId = currentModel.value.id
      const uiSettings = {
        scale: modelSettings.scale,
        rotation: modelSettings.rotation,
        breathing: modelSettings.breathing,
        eyeBlinking: modelSettings.eyeBlinking,
        interactive: modelSettings.interactive,
        expression: currentExpression.value,
        motion: currentPlayingMotion.value,
        parameters: currentParameters,
        parts: currentParts,
        audio: currentAudioState.value,
        text: currentTextState.value
      }

      // 使用状态同步管理器同步设置
      const applied = globalStateSyncManager.syncUISettingsToModel(modelId, currentHeroModel.value, uiSettings)

      if (applied) {
        console.log('✅ [ModelSettings] UI设置已同步到模型:', modelId, uiSettings)
      }
    }

    const validateStateConsistency = () => {
      if (!currentModel.value || !currentHeroModel.value) return

      const modelId = currentModel.value.id
      const expectedState = {
        scale: modelSettings.scale,
        rotation: modelSettings.rotation,
        breathing: modelSettings.breathing,
        eyeBlinking: modelSettings.eyeBlinking,
        interactive: modelSettings.interactive,
        expression: currentExpression.value,
        motion: currentPlayingMotion.value,
        parameters: currentParameters,
        parts: currentParts,
        audio: currentAudioState.value,
        text: currentTextState.value
      }

      // 获取当前模型状态
      const currentState = globalStateSyncManager.getModelState(currentHeroModel.value)
      
      const validation = globalStateSyncManager.validateStateConsistency(modelId, expectedState, currentState)

      if (!validation.isConsistent) {
        console.warn('⚠️ [ModelSettings] 状态不一致，尝试强制同步:', validation.inconsistencies)
        
        // 尝试强制同步
        const success = globalStateSyncManager.forceSyncState(modelId, currentHeroModel.value, expectedState)
        
        if (success) {
          console.log('✅ [ModelSettings] 强制同步成功')
        } else {
          console.error('❌ [ModelSettings] 强制同步失败')
        }
      }

      return validation
    }

    // 组件挂载时的初始化
    onMounted(() => {
      console.log('🚀 [ModelSettings] 组件挂载，初始化设置同步')

      // 如果当前有模型，尝试加载其设置
      if (currentModel.value) {
        loadSettingsFromStore()
        
        // 注册状态同步
        nextTick(() => {
          registerStateSync()
          
          // 初始化滚轮缩放设置
          if (live2dStore?.manager && modelSettings.wheelZoom !== undefined) {
            live2dStore.manager.setWheelZoomEnabled(modelSettings.wheelZoom)
            console.log('🔍 [ModelSettings] 滚轮缩放已初始化:', modelSettings.wheelZoom)
          }
        })
      }

      // 在开发环境下显示资源管理器状态
      if (import.meta.env.DEV) {
        console.log('📊 [ModelSettings] 资源管理器状态:', globalResourceManager.getResourceCount())
      }
    })

    // 组件卸载时的清理
    onUnmounted(() => {
      console.log('🧹 [ModelSettings] 组件卸载，开始清理资源')

      // 注册清理回调到资源管理器
      globalResourceManager.registerCleanupCallback(() => {
        // 注销状态同步
        unregisterStateSync()

        // 清理防抖定时器
        if (syncDebounceTimer.value) {
          clearTimeout(syncDebounceTimer.value)
          syncDebounceTimer.value = null
        }

        // 清理所有资源
        cleanupResources()

        // 最后一次同步设置到Store
        if (settingsSyncEnabled.value && currentHeroModel.value) {
          syncSettingsToStore()
        }
      })

      console.log('📝 [ModelSettings] 清理回调已注册到资源管理器')
    })

    // 基础方法
    const goBack = () => {
      emit('back')
    }



    const getModelDisplayName = (url) => {
      if (!url) return '未选择模型'
      
      try {
        // 尝试从URL中提取文件名
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const filename = pathname.split('/').pop()
        
        if (filename && filename !== '') {
          // 移除文件扩展名
          return filename.replace(/\.(model3\.json|model\.json|json)$/i, '')
        }
        
        // 如果无法从URL提取，返回域名
        return urlObj.hostname || '未知模型'
      } catch (error) {
        // 如果URL解析失败，尝试从路径中提取
        const pathParts = url.split('/')
        const lastPart = pathParts[pathParts.length - 1]
        if (lastPart && lastPart !== '') {
          return lastPart.replace(/\.(model3\.json|model\.json|json)$/i, '')
        }
        return '未知模型'
      }
    }

    const getMotionDisplayName = (motion, index) => {
      if (!motion) return `动作 ${index + 1}`
      
      // 优先使用Text字段
      if (motion.Text) {
        return motion.Text
      }
      
      // 使用File字段（去掉扩展名）
      if (motion.File) {
        return motion.File.replace(/\.(motion3\.json|motion\.json|json)$/i, '')
      }
      
      // 使用Sound字段
      if (motion.Sound) {
        return `音频: ${motion.Sound}`
      }
      
      // 默认返回索引
      return `动作 ${index + 1}`
    }

    const resetScale = () => {
      modelSettings.scale = 0.2
      if (currentHeroModel.value?.setScale) {
        currentHeroModel.value.setScale(0.2)
      }
      syncSettingsToStore()
    }

    return {
      // 响应式数据
      currentModel,
      currentHeroModel,
      expressions,
      motions,
      parameters,
      partOpacity,
      modelSettings,
      loading,

      // 动作播放状态
      isMotionPlaying,
      currentPlayingMotion,

      // 扩展状态
      currentExpression,
      currentParameters,
      currentParts,
      currentAudioState,
      currentTextState,

      // 方法
      goBack,
      setExpression,
      playMotion,
      stopCurrentMotion,
      playRandomMotion,
      playRandomMotionFromGroup,
      isCurrentMotion,
      getMotionDisplayName,
      getModelDisplayName,
      // 交互功能方法
      updateWheelZoom,
      updateClickInteraction,
      updateZoomSettings,

      // 设置同步方法
      syncSettingsToStore,
      loadSettingsFromStore,

      // 同步控制状态
      settingsSyncEnabled,
      isLoadingFromStore,

      // 状态同步管理器集成方法
      registerStateSync,
      unregisterStateSync,
      syncUISettingsToModel,
      validateStateConsistency,
      resetScale
    }
  }
}
</script>

<style scoped>
:deep(.n-form-item-label) {
  font-weight: 500;
  font-size: 13px;
}

:deep(.n-slider) {
  margin: 8px 0;
}

:deep(.n-list-item) {
  transition: all 0.15s ease;
  border-radius: 4px;
  margin-bottom: 4px;
}

:deep(.n-list-item:hover) {
  transform: translateX(4px);
}

/* 动作播放状态样式 */
.motion-playing {
  background: linear-gradient(90deg, var(--n-warning-color-suppl) 0%, transparent 100%);
  border-left: 3px solid var(--n-warning-color);
}

.motion-playing:hover {
  background: linear-gradient(90deg, var(--n-warning-color-suppl) 0%, var(--n-warning-color-suppl) 20%, transparent 100%);
}

:deep(.n-collapse-item) {
  margin-bottom: 8px;
}

:deep(.n-collapse-item__header) {
  font-weight: 500;
  padding: 12px 16px;
}

:deep(.n-scrollbar) {
  padding-right: 8px;
}

.parameter-item,
.part-item {
  border-radius: 6px;
  padding: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.n-form-item) {
    margin-bottom: 12px;
  }

  :deep(.n-space) {
    gap: 8px !important;
  }

  :deep(.n-card) {
    margin-bottom: 12px;
  }
}

/* 加载状态 */
:deep(.n-spin-container) {
  min-height: 200px;
}

/* 空状态样式 */
:deep(.n-empty) {
  padding: 20px;
}

/* 标签样式 */
:deep(.n-tag) {
  font-size: 11px;
}

/* 滚动条样式 */
:deep(.n-scrollbar-rail) {
  right: 2px;
}

:deep(.n-scrollbar-rail__scrollbar) {
  width: 4px;
  border-radius: 2px;
}

@media (max-width: 600px) {
  :deep(.n-card) {
    border-radius: 8px;
    box-shadow: none;
  }
  :deep(.n-form-item-label) {
    font-size: 12px;
  }
  :deep(.n-space) {
    gap: 4px !important;
  }
  :deep(.n-input-number), :deep(.n-slider) {
    font-size: 12px;
  }
  .parameter-item, .part-item {
    padding: 8px;
    border-radius: 6px;
  }
}
</style>
