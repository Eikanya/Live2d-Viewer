<template>
    <n-card title="画布设置" :bordered="false">
    <n-scrollbar class="scrollable-content">
    <template #header-extra>
      <n-space>
        <n-button
          quaternary
          circle
          @click="resetSettings"
          :loading="resetting"
        >
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-space>
    </template>

    <n-spin :show="loading">
      <n-space vertical size="large">
        <!-- 显示设置 -->
        <n-card title="显示设置" size="small" :segmented="{ content: true }">
          <template #header-extra>
            <n-icon size="18" color="var(--n-info-color)">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 7h5v5H5zm7 0h7v2h-7zm0 3h7v2h-7zM5 13h5v5H5zm7 0h7v5h-7z"/>
              </svg>
            </n-icon>
          </template>

          <n-form :model="settings" label-placement="left" label-width="100">
            <n-space vertical size="large">
              <!-- 画布尺寸 -->
              <n-collapse>
                <n-collapse-item title="画布尺寸" name="canvas-size">
                  <template #header-extra>
                    <n-tag size="tiny" type="info">{{ settings.canvasWidth }}×{{ settings.canvasHeight }}</n-tag>
                  </template>

                  <n-space vertical size="medium">
                    <!-- 画布宽度 -->
                    <n-form-item label="宽度">
                      <n-space vertical style="width: 100%;">
                        <n-slider
                          :value="settings.canvasWidth"
                          :min="800"
                          :max="2560"
                          :step="10"
                          @update:value="(value) => { settings.canvasWidth = value; updateSettings(); }"
                          :tooltip="true"
                        />
                        <n-input-number
                          :value="settings.canvasWidth"
                          :min="800"
                          :max="2560"
                          :step="10"
                          size="small"
                          @update:value="(value) => { settings.canvasWidth = value; updateSettings(); }"
                          style="width: 120px;"
                        />
                      </n-space>
                    </n-form-item>

                    <!-- 画布高度 -->
                    <n-form-item label="高度">
                      <n-space vertical style="width: 100%;">
                        <n-slider
                          :value="settings.canvasHeight"
                          :min="600"
                          :max="1440"
                          :step="10"
                          @update:value="(value) => { settings.canvasHeight = value; updateSettings(); }"
                          :tooltip="true"
                        />
                        <n-input-number
                          :value="settings.canvasHeight"
                          :min="600"
                          :max="1440"
                          :step="10"
                          size="small"
                          @update:value="(value) => { settings.canvasHeight = value; updateSettings(); }"
                          style="width: 120px;"
                        />
                      </n-space>
                    </n-form-item>
                  </n-space>
                </n-collapse-item>
              </n-collapse>

              <n-divider style="margin: 8px 0;" />

              <!-- 其他设置 -->
              <n-space vertical size="medium">
                <n-space juCanvasSettings.vuestify="space-between" align="center">
                  <n-space align="center">
                    <span style="font-weight: 500;">自适应窗口</span>
                    <n-tooltip>
                      <template #trigger>
                        <n-icon size="14" color="var(--n-text-color-disabled)">
                          <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6Z"/>
                          </svg>
                        </n-icon>
                      </template>
                      <span>画布尺寸自动适应窗口大小变化</span>
                    </n-tooltip>
                  </n-space>
                  <n-switch
                    :value="settings.autoResize"
                    @update:value="(value) => { settings.autoResize = value; updateSettings(); }"
                  >
                    <template #checked>开启</template>
                    <template #unchecked>关闭</template>
                  </n-switch>
                </n-space>

                <!-- 前景遮罩设置 -->
                <n-space justify="space-between" align="center">
                  <n-space align="center">
                    <span style="font-weight: 500;">显示前景遮罩</span>
                    <n-tooltip>
                      <template #trigger>
                        <n-icon size="14" color="var(--n-text-color-disabled)">
                          <svg viewBox="0 0 24 24">
                            <path fill="currentColor" d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6Z"/>
                          </svg>
                        </n-icon>
                      </template>
                      <span>为每个模型添加可调节透明度的前景遮罩</span>
                    </n-tooltip>
                  </n-space>
                  <n-switch
                    :value="settings.showForeground"
                    @update:value="(value) => { settings.showForeground = value; updateSettings(); }"
                  >
                    <template #checked>开启</template>
                    <template #unchecked>关闭</template>
                  </n-switch>
                </n-space>
                <n-form-item label="前景遮罩透明度" v-if="settings.showForeground">
                  <n-slider
                    :value="settings.foregroundAlpha"
                    :min="0"
                    :max="0.5"
                    :step="0.01"
                    @update:value="(value) => { settings.foregroundAlpha = value; updateSettings(); }"
                    :tooltip="true"
                  />
                  <n-input-number
                    :value="settings.foregroundAlpha"
                    :min="0"
                    :max="0.5"
                    :step="0.01"
                    size="small"
                    @update:value="(value) => { settings.foregroundAlpha = value; updateSettings(); }"
                    style="width: 120px; margin-left: 12px;"
                  />
                </n-form-item>
              </n-space>
            </n-space>
          </n-form>
        </n-card>

        <!-- Live2D 控制设置 -->
        <n-card title="Live2D 控制" size="small" :segmented="{ content: true }">
          <template #header-extra>
            <n-icon size="18" color="var(--n-warning-color)">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </n-icon>
          </template>

          <n-form :model="settings" label-placement="left" label-width="100">
            <n-space vertical size="large">
              <!-- 性能设置 -->
              <n-collapse>
                <n-collapse-item title="性能优化" name="performance">
                  <template #header-extra>
                    <n-tag size="tiny" type="info">{{ settings.maxFPS }} FPS</n-tag>
                  </template>

                  <n-space vertical size="medium">
                    <!-- 最大FPS -->
                    <n-form-item label="最大FPS">
                      <n-select
                        :value="settings.maxFPS"
                        @update:value="(value) => { settings.maxFPS = value; updateLive2DSettings(); }"
                        :options="[
                          { label: '30 FPS', value: 30 },
                          { label: '60 FPS', value: 60 },
                          { label: '120 FPS', value: 120 }
                        ]"
                      />
                    </n-form-item>

                    <!-- 纹理垃圾回收 -->
                    <n-form-item label="纹理回收">
                      <n-select
                        :value="settings.textureGCMode"
                        @update:value="(value) => { settings.textureGCMode = value; updateLive2DSettings(); }"
                        :options="[
                          { label: '激进模式', value: 'aggressive' },
                          { label: '自动模式', value: 'auto' },
                          { label: '保守模式', value: 'conservative' }
                        ]"
                      />
                    </n-form-item>

                    <!-- 视锥剔除 -->
                    <n-space justify="space-between" align="center">
                      <n-space align="center">
                        <span style="font-weight: 500;">视锥剔除</span>
                        <n-tooltip>
                          <template #trigger>
                            <n-icon size="14" color="var(--n-text-color-disabled)">
                              <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6Z"/>
                              </svg>
                            </n-icon>
                          </template>
                          <span>启用视锥剔除可以提高渲染性能</span>
                        </n-tooltip>
                      </n-space>
                      <n-switch
                        :value="settings.enableCulling"
                        @update:value="(value) => { settings.enableCulling = value; updateLive2DSettings(); }"
                      >
                        <template #checked>开启</template>
                        <template #unchecked>关闭</template>
                      </n-switch>
                    </n-space>

                    <!-- 批处理 -->
                    <n-space justify="space-between" align="center">
                      <n-space align="center">
                        <span style="font-weight: 500;">批处理优化</span>
                        <n-tooltip>
                          <template #trigger>
                            <n-icon size="14" color="var(--n-text-color-disabled)">
                              <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6Z"/>
                              </svg>
                            </n-icon>
                          </template>
                          <span>启用批处理可以减少绘制调用次数</span>
                        </n-tooltip>
                      </n-space>
                      <n-switch
                        :value="settings.enableBatching"
                        @update:value="(value) => { settings.enableBatching = value; updateLive2DSettings(); }"
                      >
                        <template #checked>开启</template>
                        <template #unchecked>关闭</template>
                      </n-switch>
                    </n-space>
                  </n-space>
                </n-collapse-item>
              </n-collapse>

              <n-divider style="margin: 8px 0;" />

              <!-- 模型控制 -->
              <n-space vertical size="medium">
                <h4 style="margin: 0; font-size: 14px; color: var(--n-text-color-base);">模型控制</h4>

                <!-- 控制按钮 -->
                <n-space>
                  <n-button @click="pauseRendering" size="small" :type="isPaused ? 'warning' : 'default'">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24" v-if="!isPaused">
                          <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                        <svg viewBox="0 0 24 24" v-else>
                          <path fill="currentColor" d="M8 5v14l11-7z"/>
                        </svg>
                      </n-icon>
                    </template>
                    {{ isPaused ? '恢复渲染' : '暂停渲染' }}
                  </n-button>
                </n-space>

                <!-- 性能统计 -->
                <n-space vertical size="medium">
                  <n-space justify="space-between" align="center">
                    <span style="font-weight: 500;">性能统计</span>
                    <n-switch
                      :value="settings.showStats"
                      @update:value="(value) => { settings.showStats = value; toggleStats(); }"
                    >
                      <template #checked>显示</template>
                      <template #unchecked>隐藏</template>
                    </n-switch>
                  </n-space>

                  <div v-if="settings.showStats" class="stats-panel">
                    <n-space vertical size="small">
                      <n-space justify="space-between">
                        <span>FPS:</span>
                        <n-tag size="small" :type="getFPSTagType(stats.fps)">
                          {{ stats.fps?.toFixed(1) || 'N/A' }}
                        </n-tag>
                      </n-space>
                      <n-space justify="space-between">
                        <span>模型数量:</span>
                        <n-tag size="small" type="info">{{ stats.modelCount || 0 }}</n-tag>
                      </n-space>
                      <n-space justify="space-between">
                        <span>Delta Time:</span>
                        <n-tag size="small" type="default">{{ stats.deltaTime?.toFixed(2) || 'N/A' }}</n-tag>
                      </n-space>
                      <n-space justify="space-between" v-if="stats.textureMemory">
                        <span>纹理数量:</span>
                        <n-tag size="small" type="warning">{{ stats.textureMemory.count || 'N/A' }}</n-tag>
                      </n-space>
                    </n-space>
                  </div>
                </n-space>
              </n-space>
            </n-space>
          </n-form>
        </n-card>
      </n-space>
    </n-spin>

    <!-- 操作按钮 -->
    <template #action>
      <n-space justify="space-between">
        <n-button @click="exportSettings" secondary>
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11Z"/>
              </svg>
            </n-icon>
          </template>
          导出设置
        </n-button>

        <n-space>
          <n-button @click="resetSettings" :loading="resetting">
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </n-icon>
            </template>
            重置
          </n-button>

          <n-button type="primary" @click="applySettings" :loading="applying">
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </n-icon>
            </template>
            应用设置
          </n-button>
        </n-space>
      </n-space>
    </template>
    </n-scrollbar>
    </n-card>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useLive2DStore } from '../stores/live2d'

export default {
  name: 'CanvasSettings',
  components: {
  },
  setup() {
    const live2dStore = useLive2DStore()
    const message = useMessage()

    // 状态管理
    const loading = ref(false)
    const resetting = ref(false)
    const applying = ref(false)

    // 安全获取store设置的辅助函数
    const getSafeSetting = (key, defaultValue) => {
      try {
        if (live2dStore?.settings && typeof live2dStore.settings === 'object') {
          const value = live2dStore.settings[key]
          return value !== undefined && value !== null ? value : defaultValue
        }
        return defaultValue
      } catch (error) {
        console.warn(`⚠️ [CanvasSettings] 获取设置 ${key} 失败:`, error)
        return defaultValue
      }
    }

    const settings = reactive({
      canvasWidth: getSafeSetting('canvasWidth', 1200),
      canvasHeight: getSafeSetting('canvasHeight', 800),
      autoResize: getSafeSetting('autoResize', true),
      // Live2D 性能设置
      maxFPS: getSafeSetting('maxFPS', 60),
      textureGCMode: getSafeSetting('textureGCMode', 'auto'),
      enableCulling: getSafeSetting('enableCulling', true),
      enableBatching: getSafeSetting('enableBatching', true),
      showStats: getSafeSetting('showStats', false),
      showForeground: getSafeSetting('showForeground', false),
      foregroundAlpha: getSafeSetting('foregroundAlpha', 0.0)
    })

    // 默认设置备份
    const defaultSettings = {
      canvasWidth: 1200,
      canvasHeight: 800,
      autoResize: true,
      // Live2D 性能设置默认值
      maxFPS: 60,
      textureGCMode: 'auto',
      enableCulling: true,
      enableBatching: true,
      showStats: false,
      showForeground: false,
      foregroundAlpha: 0.0
    }

    // 性能统计数据
    const stats = ref({})
    const isPaused = ref(false)
    let statsInterval = null

    // 方法
    const updateSettings = () => {
      try {
        // 验证设置对象
        if (!settings || typeof settings !== 'object') {
          console.error('❌ [CanvasSettings] 无效的设置对象:', settings)
          message.error('设置对象无效')
          return
        }

        // 分别更新不同类型的设置
        if (live2dStore?.manager) {
          try {
            // 更新画布尺寸
            if (settings.canvasWidth && settings.canvasHeight) {
              live2dStore.manager.resize(Number(settings.canvasWidth), Number(settings.canvasHeight))
            }

            // 更新性能设置
            live2dStore.manager.updatePerformanceSettings({
              maxFPS: settings.maxFPS,
              textureGCMode: settings.textureGCMode,
              enableCulling: settings.enableCulling,
              enableBatching: settings.enableBatching
            })

            console.log('✅ [CanvasSettings] 所有设置已更新:', {
              canvasSize: `${settings.canvasWidth}x${settings.canvasHeight}`,
              autoResize: settings.autoResize,
              maxFPS: settings.maxFPS
            })
          } catch (error) {
            console.error('❌ [CanvasSettings] 设置更新失败:', error)
            message.error('设置更新失败')
            return
          }
        } else {
          console.warn('⚠️ [CanvasSettings] Live2D Manager 未初始化')
        }

      } catch (error) {
        console.error('❌ [CanvasSettings] updateSettings执行失败:', error)
        console.error('❌ [CanvasSettings] 错误堆栈:', error.stack)
        message.error('设置更新失败')
      }
    }

    // Live2D 相关方法
    const updateLive2DSettings = () => {
      try {
        if (!live2dStore?.manager) {
          console.warn('⚠️ [CanvasSettings] Live2D Manager 未初始化')
          return
        }

        // 更新性能设置
        live2dStore.manager.updatePerformanceSettings({
          maxFPS: settings.maxFPS,
          textureGCMode: settings.textureGCMode,
          enableCulling: settings.enableCulling,
          enableBatching: settings.enableBatching
        })

        console.log('✅ [CanvasSettings] Live2D设置已更新')
      } catch (error) {
        console.error('❌ [CanvasSettings] Live2D设置更新失败:', error)
        message.error('Live2D设置更新失败')
      }
    }

    const pauseRendering = () => {
      try {
        if (live2dStore?.manager && typeof live2dStore.manager.setPaused === 'function') {
          isPaused.value = !isPaused.value
          live2dStore.manager.setPaused(isPaused.value)
          message.success(isPaused.value ? '渲染已暂停' : '渲染已恢复')
        }
      } catch (error) {
        console.error('❌ [CanvasSettings] 暂停/恢复渲染失败:', error)
        message.error('操作失败')
      }
    }

    const toggleStats = () => {
      if (settings.showStats) {
        startStatsUpdate()
      } else {
        stopStatsUpdate()
      }
    }

    const startStatsUpdate = () => {
      if (statsInterval) return

      statsInterval = setInterval(() => {
        try {
          if (live2dStore?.manager && typeof live2dStore.manager.getPerformanceStats === 'function') {
            const perf = live2dStore.manager.getPerformanceStats()
            stats.value = {
              fps: perf.fps,
              modelCount: live2dStore.manager.getModelCount ? live2dStore.manager.getModelCount() : 1,
              deltaTime: perf.deltaTime,
              textureMemory: perf.textureMemory
            }
          }
        } catch (error) {
          console.error('❌ [CanvasSettings] 获取性能统计失败:', error)
        }
      }, 1000)
    }

    const stopStatsUpdate = () => {
      if (statsInterval) {
        clearInterval(statsInterval)
        statsInterval = null
      }
    }

    const getFPSTagType = (fps) => {
      if (!fps) return 'default'
      if (fps >= 50) return 'success'
      if (fps >= 30) return 'warning'
      return 'error'
    }

    const resetSettings = async () => {
      resetting.value = true
      try {
        Object.assign(settings, defaultSettings)
        updateSettings()
        message.success('设置已重置为默认值')
      } catch (error) {
        console.error('❌ [CanvasSettings] 重置设置失败:', error)
        message.error('重置设置失败')
      } finally {
        resetting.value = false
      }
    }

    const applySettings = async () => {
      applying.value = true
      try {
        updateSettings()
        message.success('设置已应用')
      } catch (error) {
        console.error('❌ [CanvasSettings] 应用设置失败:', error)
        message.error('应用设置失败')
      } finally {
        applying.value = false
      }
    }

    const exportSettings = () => {
      try {
        // 创建安全的设置副本用于导出
        const safeExportSettings = {
          canvasWidth: Number(settings.canvasWidth) || 1200,
          canvasHeight: Number(settings.canvasHeight) || 800,
          autoResize: Boolean(settings.autoResize)
        }

        const settingsJson = JSON.stringify(safeExportSettings, null, 2)
        const blob = new Blob([settingsJson], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'canvas-settings.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        message.success('设置已导出')
      } catch (error) {
        console.error('❌ [CanvasSettings] 导出设置失败:', error)
        message.error('导出设置失败')
      }
    }

    onMounted(() => {
      try {
        console.log('🔄 [CanvasSettings] 组件已挂载')

        // 等待一个tick确保所有依赖都已初始化
        setTimeout(() => {
          try {
            // 从store中获取现有设置
            if (live2dStore?.settings && typeof live2dStore.settings === 'object') {
              // 安全地合并设置，只更新存在的属性
              Object.keys(settings).forEach(key => {
                if (live2dStore.settings[key] !== undefined && live2dStore.settings[key] !== null) {
                  settings[key] = live2dStore.settings[key]
                }
              })
            } else {
              console.warn('⚠️ [CanvasSettings] Live2D store或settings未初始化，使用默认设置')
            }

            // 初始化设置
            updateSettings()

            // 初始化Live2D设置
            updateLive2DSettings()

            // 如果启用了性能统计，开始更新
            if (settings.showStats) {
              startStatsUpdate()
            }
          } catch (innerError) {
            console.error('❌ [CanvasSettings] 延迟初始化失败:', innerError)
            message.error('组件初始化失败')
          }
        }, 100)
      } catch (error) {
        console.error('❌ [CanvasSettings] 组件初始化失败:', error)
        message.error('组件初始化失败')
      }
    })

    // 组件卸载时清理
    onUnmounted(() => {
      stopStatsUpdate()
    })

    return {
      // 响应式数据
      settings,
      loading,
      resetting,
      applying,
      stats,
      isPaused,

      // 方法
      updateSettings,
      resetSettings,
      applySettings,
      exportSettings,
      updateLive2DSettings,
      pauseRendering,
      toggleStats,
      getFPSTagType
    }
  }
}
</script>

<style scoped>
/* 自定义样式 */
:deep(.n-card) {
  transition: all 0.3s ease;
}

:deep(.n-card:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:deep(.n-form-item-label) {
  font-weight: 500;
  font-size: 13px;
}

:deep(.n-slider) {
  margin: 8px 0;
}

:deep(.n-input-number) {
  transition: all 0.3s ease;
}

:deep(.n-switch) {
  transition: all 0.3s ease;
}

:deep(.n-color-picker) {
  width: 100%;
}

:deep(.n-collapse-item) {
  margin-bottom: 8px;
}

:deep(.n-collapse-item__header) {
  font-weight: 500;
  padding: 12px 16px;
}

/* 预设颜色样式 */
.preset-colors {
  width: 100%;
}

:deep(.preset-color-button) {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.preset-color-button:hover) {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 工具提示样式 */
:deep(.n-tooltip) {
  max-width: 200px;
}

/* 表单样式 */
:deep(.n-form-item) {
  margin-bottom: 16px;
}

:deep(.n-form-item-label__text) {
  font-size: 14px;
  color: var(--n-text-color-base);
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.n-space) {
    gap: 8px !important;
  }

  :deep(.n-card) {
    margin-bottom: 12px;
  }

  .preset-colors :deep(.n-space) {
    justify-content: center;
  }
}

/* 加载状态 */
:deep(.n-spin-container) {
  min-height: 200px;
}

/* 按钮样式 */
:deep(.n-button) {
  transition: all 0.3s ease;
}

:deep(.n-button:hover) {
  transform: translateY(-1px);
}

/* 标签样式 */
:deep(.n-tag) {
  font-size: 11px;
  margin: 2px;
}

/* 分割线样式 */
:deep(.n-divider) {
  margin: 16px 0;
}

/* 折叠面板样式 */
:deep(.n-collapse) {
  border-radius: 6px;
  overflow: hidden;
}

:deep(.n-collapse-item__content-wrapper) {
  padding: 1px;
}

/* 颜色选择器样式 */
:deep(.n-color-picker-trigger) {
  width: 100%;
  height: 40px;
  border-radius: 6px;
}

/* 滑块样式 */
:deep(.n-slider-rail) {
  height: 6px;
  border-radius: 3px;
}

:deep(.n-slider-handle) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

/* 输入框样式 */
:deep(.n-input-number) {
  border-radius: 6px;
}

/* 开关样式 */
:deep(.n-switch) {
  --n-rail-height: 22px;
  --n-rail-width: 44px;
  --n-button-width: 18px;
  --n-button-height: 18px;
}

/* 性能统计面板样式 */
.stats-panel {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid var(--n-border-color);
}

.stats-panel :deep(.n-space) {
  width: 100%;
}

.stats-panel :deep(.n-tag) {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

/* Live2D 控制卡片样式 */
:deep(.n-card[title="Live2D 控制"]) {
  border: 1px solid var(--n-warning-color-suppl);
}

:deep(.n-card[title="Live2D 控制"] .n-card-header) {
  background: linear-gradient(135deg, var(--n-warning-color-suppl), transparent);
}

/* 控制按钮组样式 */
:deep(.n-button[type="warning"]) {
  background: var(--n-warning-color);
  border-color: var(--n-warning-color);
}

:deep(.n-button[type="warning"]:hover) {
  background: var(--n-warning-color-hover);
  border-color: var(--n-warning-color-hover);
}

/* 折叠面板增强样式 */
:deep(.n-collapse-item[name="wheel-zoom"] .n-collapse-item__header) {
  background: linear-gradient(90deg, var(--n-success-color-suppl), transparent);
}

:deep(.n-collapse-item[name="performance"] .n-collapse-item__header) {
  background: linear-gradient(90deg, var(--n-info-color-suppl), transparent);
}

/* 滑块增强样式 */
:deep(.n-slider-fill) {
  background: linear-gradient(90deg, var(--n-primary-color), var(--n-primary-color-hover));
}

/* 选择器样式 */
:deep(.n-select) {
  transition: all 0.3s ease;
}

:deep(.n-select:hover) {
  transform: translateY(-1px);
}

/* 标签增强样式 */
:deep(.n-tag[type="success"]) {
  background: var(--n-success-color-suppl);
  color: var(--n-success-color);
  border-color: var(--n-success-color);
}

:deep(.n-tag[type="warning"]) {
  background: var(--n-warning-color-suppl);
  color: var(--n-warning-color);
  border-color: var(--n-warning-color);
}

:deep(.n-tag[type="error"]) {
  background: var(--n-error-color-suppl);
  color: var(--n-error-color);
  border-color: var(--n-error-color);
}
</style>
