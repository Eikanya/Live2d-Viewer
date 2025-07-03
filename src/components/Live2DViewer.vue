<template>
  <div
    ref="viewerContainer"
    class="live2d-viewer"
    id="viewer-place"
    :style="petModeStyle"
  >
    <!-- 加载状态指示器 -->
    <div v-if="isLoading" class="loading-overlay">
      <n-spin size="large">
        <template #description>
          <n-text>正在加载模型...</n-text>
        </template>
      </n-spin>
    </div>

    <!-- 错误状态指示器 -->
    <div v-if="error" class="error-overlay">
      <n-result status="error" title="模型加载失败" :description="error">
        <template #footer>
          <n-space>
            <n-button @click="retryLoadModel" type="primary">
              重试
            </n-button>
            <n-button @click="clearError" quaternary>
              清除错误
            </n-button>
          </n-space>
        </template>
      </n-result>
    </div>

    <!-- PIXI应用将在这里渲染 -->

    <!-- 文本容器 -->
    <div id="text-container" class="text-container"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useLive2DStore } from '../stores/live2d'
import { Live2DManager } from '../utils/live2d/index.js'
import { isPetMode, isElectron, petModeAPI } from '../utils/electron.js'
import { globalStateSyncManager } from '../utils/live2d/state-sync-manager.js'
import { globalResourceManager } from '../utils/resource-manager.js'

// 常量定义
const DEFAULT_MODEL_SCALE = 0.2; // 默认模型缩放值

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[Live2DViewer]'
  const timestamp = new Date().toISOString()
  
  switch (level) {
    case 'error':
      console.error(`${timestamp} ${prefix} ${message}`)
      break
    case 'warn':
      console.warn(`${timestamp} ${prefix} ${message}`)
      break
    case 'debug':
      if (window.DEBUG_LIVE2D) {
        console.log(`${timestamp} ${prefix} ${message}`)
      }
      break
    default:
      console.log(`${timestamp} ${prefix} ${message}`)
  }
}

export default {
  setup() {
    const viewerContainer = ref(null)
    const live2dStore = useLive2DStore()
    let live2dManager = null

    // 检查是否桌宠模式
    const petMode = computed(() => isPetMode())
    const electronMode = computed(() => isElectron())

    // 安全访问 store 状态的计算属性
    const isLoading = computed(() => live2dStore?.isLoading || false)
    const error = computed(() => live2dStore?.error || null)

    // 桌宠模式专用配置
    const petModeConfig = computed(() => {
      if (!petMode.value) return null

      return {
        // 桌宠模式专用设置
        autoHide: true,           // 自动隐藏到系统托盘
        alwaysOnTop: true,        // 始终置顶
        clickThrough: false,      // 点击穿透
        autoInteraction: true,    // 自动交互
        reducedAnimation: false,  // 减少动画以节省性能

        // 交互优化
        interaction: {
          clickSensitivity: 1.2,  // 提高点击灵敏度
          hoverResponse: true,    // 鼠标悬停响应
          edgeSnap: true,         // 边缘吸附
          autoMove: false         // 自动移动
        },

        // 性能优化
        performance: {
          maxFPS: 60,             // 统一60 FPS保持同步
          minFPS: 60,
          enableCulling: true,
          enableBatching: true,
          textureGCMode: 'aggressive', // 积极的纹理回收
          antialias: false,       // 关闭抗锯齿节省性能
          powerPreference: 'low-power' // 低功耗模式
        }
      }
    })

    const petModeStyle = computed(() =>
      petMode.value
        ? {
            background: 'transparent',
            '-webkit-app-region': 'drag',
            position: 'absolute',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            // 桌宠模式专用样式
            zIndex: 9999,
            userSelect: 'none',
            overflow: 'hidden'
          }
        : {}
    )

    const initLive2D = async () => {
      if (!viewerContainer.value) return

      try {
        log('开始初始化Live2D管理器...')

        // 创建Live2D管理器实例
        live2dManager = new Live2DManager(viewerContainer.value)

        // 基础配置
        const baseConfig = {
          maxFPS: 60,
          minFPS: 60,
          enableCulling: true,
          enableBatching: true,
          contextAttributes: {
            alpha: true,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
          }
        }

        // 根据模式选择特定配置
        const modeConfig = petMode.value && petModeConfig.value
          ? {
              textureGCMode: petModeConfig.value.performance.textureGCMode,
              antialias: petModeConfig.value.performance.antialias,
              powerPreference: petModeConfig.value.performance.powerPreference,
              transparent: true,
              preserveDrawingBuffer: false,
              clearBeforeRender: false,
              contextAttributes: {
                ...baseConfig.contextAttributes,
                antialias: false,
              },
              batchSize: 4096,
              maxTextures: 16,
              textureGC: {
                mode: 'aggressive',
                maxIdle: 15 * 60,
                checkInterval: 30,
              }
            }
          : {
              textureGCMode: 'auto',
              antialias: true,
              powerPreference: 'high-performance',
              batchSize: 8192,
              maxTextures: 32,
              textureGC: {
                mode: 'auto',
                maxIdle: 30 * 60,
                checkInterval: 60,
              }
            }

        const initOptions = {
          ...baseConfig,
          ...modeConfig
        }

        log('使用配置模式:', petMode.value ? '桌宠模式' : '标准模式')
        log('基础优化配置:', {
          帧率: `${initOptions.maxFPS} FPS`,
          批处理大小: initOptions.batchSize,
          纹理单元: initOptions.maxTextures,
          WebGL深度缓冲: initOptions.contextAttributes?.depth ? '开启' : '关闭',
          WebGL模板缓冲: initOptions.contextAttributes?.stencil ? '开启' : '关闭',
          纹理回收策略: initOptions.textureGC?.mode,
          纹理回收间隔: `${initOptions.textureGC?.maxIdle / 60}分钟`
        })

        await live2dManager.init(initOptions)

        // 存储到store中
        live2dStore.setManager(live2dManager)

        // 桌宠模式特殊初始化
        if (petMode.value && petModeConfig.value) {
          await initPetModeFeatures()

          // Electron 桌宠模式特殊设置
          if (electronMode.value) {
            await initElectronPetMode()
          }
        }

        log('Live2D管理器初始化成功')

        // 输出性能优化信息
        log('性能优化已启用:', {
          WebGL优化: '深度缓冲关闭, 模板缓冲关闭',
          批处理优化: `批处理大小: ${initOptions.batchSize || '默认'}`,
          纹理优化: `纹理单元: ${initOptions.maxTextures || '默认'}`,
          内存优化: '绘图缓冲不保留',
          帧率同步: '60 FPS统一帧率'
        })
      } catch (error) {
        log(`Live2D Viewer 初始化失败: ${error.message}`, 'error')
        live2dStore.setError(error.message)
      }
    }

    const loadModel = async (modelData) => {
      if (!live2dManager) {
        const errorMsg = 'Live2D Manager 未初始化'
        log(errorMsg, 'error')
        live2dStore.setError(errorMsg)
        return false
      }

      if (!modelData || !modelData.id || !modelData.url) {
        const errorMsg = '模型数据无效，缺少必要的id或url字段'
        log(errorMsg, 'error')
        live2dStore.setError(errorMsg)
        return false
      }

      let heroModel = null
      let initTimeout = null

      try {
        log('开始加载模型', 'debug')

        // 设置加载状态
        live2dStore.setLoading(true)
        live2dStore.setError(null)

        // 检查模型是否已经加载
        const currentModel = live2dManager.getCurrentModel()
        if (currentModel && currentModel.id === modelData.id) {
          log(`模型已存在，跳过加载: ${modelData.id}`, 'debug')
          live2dStore.setLoading(false)
          return true
        }

        // 加载模型
        heroModel = await live2dManager.modelManager.loadModel(modelData)

        // 等待模型初始化
        await new Promise((resolve, reject) => {
          initTimeout = globalResourceManager.registerTimer(setTimeout(() => {
            reject(new Error('模型初始化超时'))
          }, 30000))

          const checkModel = () => {
            if (heroModel?.model?.internalModel) {
              clearTimeout(initTimeout)
              resolve()
            } else if (heroModel?.model) {
              heroModel.model.once('ready', () => {
                clearTimeout(initTimeout)
                resolve()
              })
              heroModel.model.once('error', (error) => {
                clearTimeout(initTimeout)
                reject(error)
              })
            } else {
              reject(new Error('模型实例无效'))
            }
          }

          checkModel()
        })

        // 绑定交互事件
        log(`绑定模型交互事件: ${modelData.id}`, 'debug')
        if (live2dManager.interactionManager) {
          live2dManager.interactionManager.bindModelInteractionEvents(modelData.id, heroModel)
        }

        // 将模型添加到store
        live2dStore.addLoadedModel(modelData, heroModel)
        // 切换当前模型
        live2dStore.setCurrentModel(modelData)

        // 设置加载完成状态
        live2dStore.setLoading(false)

        // 确保所有状态都已更新
        await nextTick()

        // 安全地应用当前设置到新加载的模型
        await applyCurrentSettingsToModel(heroModel, modelData.id)

        // 注册模型状态同步
        registerModelStateSync(modelData.id, heroModel)

        // 自动适应画布大小
        if (viewerContainer.value) {
          const canvasWidth = viewerContainer.value.clientWidth
          const canvasHeight = viewerContainer.value.clientHeight
          if (canvasWidth > 0 && canvasHeight > 0) {
            // 检查是否已经有用户设置的缩放值
            const currentScale = heroModel.getScale()
            const hasUserScale = currentScale && (
              (typeof currentScale === 'object' && (currentScale.x !== DEFAULT_MODEL_SCALE || currentScale.y !== DEFAULT_MODEL_SCALE)) ||
              (typeof currentScale === 'number' && currentScale !== DEFAULT_MODEL_SCALE)
            )
            
            if (!hasUserScale) {
              // 只有在没有用户设置的情况下才进行自动适配
              heroModel.autoFitToCanvas(canvasWidth, canvasHeight, 0.8)
              heroModel.setPosition(canvasWidth / 2, canvasHeight / 2)
            } else {
              console.log('📐 [Live2DViewer] 检测到用户设置的缩放值，跳过自动适配')
            }
          }
        }

        log(`模型加载成功: ${modelData.id}`)
        return true
      } catch (error) {
        log(`模型加载失败: ${error.message}`, 'error')
        live2dStore.setError(error.message || '模型加载失败')
        live2dStore.setLoading(false)
        
        // 清理资源
        if (initTimeout) {
          clearTimeout(initTimeout)
        }
        
        if (heroModel?.model) {
          try {
            // 移除事件监听器
            heroModel.model.removeAllListeners()
            // 销毁模型
            heroModel.model.destroy({ children: true, texture: true, baseTexture: true })
          } catch (cleanupError) {
            log(`清理失败模型时出错: ${cleanupError.message}`, 'error')
          }
        }
        
        return false
      }
    }

    const removeModel = (modelId) => {
      if (!live2dManager) {
        log('Live2D Manager 未初始化', 'warn')
        return false
      }

      try {
        log(`移除模型: ${modelId}`, 'debug')
        
        // 注销状态同步
        unregisterModelStateSync(modelId)
        
        // 使用 Live2DManager 的 removeModel 方法
        live2dManager.removeModel(modelId)
        
        // 从 store 中移除模型
        live2dStore.removeLoadedModel(modelId)
        
        // 如果移除的是当前模型，清除当前模型
        if (live2dStore.currentModel?.id === modelId) {
          live2dStore.setCurrentModel(null)
        }
        
        log(`模型移除成功: ${modelId}`)
        return true
      } catch (error) {
        log(`移除模型失败: ${error.message}`, 'error')
        return false
      }
    }

    // 桌宠模式特殊功能初始化
    const initPetModeFeatures = async () => {
      if (!petMode.value || !petModeConfig.value) return

      log('初始化桌宠模式功能...')

      // 设置桌宠模式专用配置
      if (live2dManager) {
        // 启用自动交互
        live2dManager.setPetInteraction(true)

        // 设置性能优化
        live2dManager.setPerformanceMode('pet')

        log('桌宠模式功能初始化完成')
      }
    }

    // 重试加载模型
    const retryLoadModel = async () => {
      if (live2dStore.currentModel) {
        log('重试加载模型', 'debug')
        await loadModel(live2dStore.currentModel)
      }
    }

    // 清除错误状态
    const clearError = () => {
      live2dStore.setError(null)
    }

    // Electron 桌宠模式初始化
    const initElectronPetMode = async () => {
      try {
        log('初始化 Electron 桌宠模式')

        if (!petModeAPI) return

        // 获取屏幕信息
        const screenInfo = await petModeAPI.getScreenInfo()
        if (screenInfo) {
          log('屏幕信息获取成功', 'debug')
        }

        // 设置桌宠窗口属性
        await petModeAPI.setAlwaysOnTop(true)
        log('桌宠窗口置顶已启用')

        // 添加拖拽功能
        if (viewerContainer.value) {
          let isDragging = false
          let dragOffset = { x: 0, y: 0 }

          const handleMouseDown = (e) => {
            if (e.button === 0) { // 左键
              isDragging = true
              dragOffset.x = e.clientX
              dragOffset.y = e.clientY
              viewerContainer.value.style.cursor = 'move'
            }
          }

          const handleMouseMove = async (e) => {
            if (isDragging) {
              const deltaX = e.clientX - dragOffset.x
              const deltaY = e.clientY - dragOffset.y

              // 获取当前窗口位置并更新
              if (screenInfo) {
                const newX = Math.max(0, Math.min(screenInfo.workAreaSize.width - 400, deltaX))
                const newY = Math.max(0, Math.min(screenInfo.workAreaSize.height - 600, deltaY))
                await petModeAPI.setPosition(newX, newY)
              }
            }
          }

          const handleMouseUp = () => {
            if (isDragging) {
              isDragging = false
              viewerContainer.value.style.cursor = 'default'
            }
          }

          viewerContainer.value.addEventListener('mousedown', handleMouseDown)
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)

          // 使用资源管理器注册事件监听器
          globalResourceManager.registerEventListener(viewerContainer.value, 'mousedown', handleMouseDown)
          globalResourceManager.registerEventListener(document, 'mousemove', handleMouseMove)
          globalResourceManager.registerEventListener(document, 'mouseup', handleMouseUp)

          log('✅ [Live2DViewer] Electron 桌宠拖拽功能已启用')
        }

        log('✅ [Live2DViewer] Electron 桌宠模式初始化完成')

      } catch (error) {
        log('❌ [Live2DViewer] Electron 桌宠模式初始化失败:', error)
      }
    }

    // 桌宠模式悬停处理
    const handlePetModeHover = () => {
      try {
        const model = live2dManager?.getCurrentModel()
        if (model && petModeConfig.value?.interaction?.hoverResponse) {
          // 触发悬停动作或表情
          model.playRandomMotion?.()
          log('🐾 [Live2DViewer] 桌宠悬停响应触发')
        }
      } catch (error) {
        log('❌ [Live2DViewer] 桌宠悬停处理失败:', error)
      }
    }

    const handlePetModeLeave = () => {
      try {
        const model = live2dManager?.getCurrentModel()
        if (model && petModeConfig.value?.interaction?.hoverResponse) {
          // 可以触发离开时的动作
          log('🐾 [Live2DViewer] 桌宠悬停离开')
        }
      } catch (error) {
        log('❌ [Live2DViewer] 桌宠离开处理失败:', error)
      }
    }

    // 桌宠模式自动交互
    let petModeAutoInteractionTimer = null
    const startPetModeAutoInteraction = () => {
      try {
        if (petModeAutoInteractionTimer) {
          clearInterval(petModeAutoInteractionTimer)
        }

        // 每30-60秒触发一次自动交互
        const intervalTime = 30000 + Math.random() * 30000 // 30-60秒随机
        petModeAutoInteractionTimer = globalResourceManager.registerTimer(setInterval(() => {
          const model = live2dManager?.getCurrentModel()
          if (model && petModeConfig.value?.autoInteraction) {
            // 随机触发动作或表情
            if (Math.random() > 0.5) {
              model.playRandomMotion?.()
            } else {
              model.playRandomExpression?.()
            }
            console.log('🐾 [Live2DViewer] 桌宠自动交互触发')
          }
        }, intervalTime))

        console.log('✅ [Live2DViewer] 桌宠自动交互已启动，间隔:', Math.round(intervalTime / 1000), '秒')

      } catch (error) {
        console.error('❌ [Live2DViewer] 桌宠自动交互启动失败:', error)
      }
    }

    const stopPetModeAutoInteraction = () => {
      if (petModeAutoInteractionTimer) {
        clearInterval(petModeAutoInteractionTimer)
        petModeAutoInteractionTimer = null
        console.log('🛑 [Live2DViewer] 桌宠自动交互已停止')
      }
    }

    // 安全地应用当前设置到新加载的模型
    const applyCurrentSettingsToModel = async (heroModel, modelId) => {
      try {
        if (!heroModel || !live2dStore.modelState?.settings) {
          console.log('📝 [Live2DViewer] 无当前设置或模型无效，跳过设置应用')
          return
        }

        const settings = live2dStore.modelState.settings
        console.log('⚙️ [Live2DViewer] 应用当前设置到新模型:', settings)

        // 安全地应用基础设置
        if (typeof settings.scale === 'number' && settings.scale > 0) {
          const clampedScale = Math.max(0.01, Math.min(1, settings.scale))
          heroModel.setScale(clampedScale)
        }

        if (typeof settings.rotation === 'number') {
          const clampedRotation = Math.max(0, Math.min(360, settings.rotation))
          heroModel.setAngle(clampedRotation)
        }

        // 应用布尔设置（使用默认值作为后备）
        heroModel.setBreathing(settings.breathing !== undefined ? Boolean(settings.breathing) : true)
        heroModel.setEyeBlinking(settings.eyeBlinking !== undefined ? Boolean(settings.eyeBlinking) : true)
        heroModel.setInteractive(settings.interactive !== undefined ? Boolean(settings.interactive) : true)

        // 应用交互设置
        if (live2dManager && typeof settings.wheelZoom === 'boolean') {
          live2dManager.setWheelZoomEnabled(settings.wheelZoom)
        }

        // 应用缩放设置
        if (live2dManager && settings.zoomSettings) {
          console.log('⚙️ [Live2DViewer] 缩放设置已应用:', settings.zoomSettings)
        }

        console.log('✅ [Live2DViewer] 设置已应用到新模型')

      } catch (error) {
        console.error('❌ [Live2DViewer] 应用设置到模型失败:', error)
        // 不抛出错误，避免影响模型加载流程
      }
    }

    // 处理WebSocket Live2D模型配置更新
    const handleLive2DModelConfig = (event) => {
      try {
        const { modelInfo, confName, confUid } = event.detail
        console.log('📨 [Live2DViewer] 收到Live2D模型配置更新:', modelInfo)

        if (!live2dManager || !modelInfo) return

        const currentModel = live2dManager.getCurrentModel()
        if (!currentModel) {
          console.warn('⚠️ [Live2DViewer] 当前没有加载的模型，无法应用配置')
          return
        }

        // 安全地应用模型配置
        if (modelInfo.tapMotions) {
          // 更新点击交互配置
          const modelId = live2dManager.modelManager.getModelId(currentModel)
          if (modelId && live2dManager.interactionManager) {
            live2dManager.interactionManager.setModelTapMotions(modelId, modelInfo.tapMotions)
            console.log('✅ [Live2DViewer] 已更新模型点击交互配置')
          }
        }

        // 更新store中的模型数据
        const modelId = live2dManager.modelManager.getModelId(currentModel)
        if (modelId) {
          const existingData = live2dStore.getModelData(modelId) || {}
          live2dStore.setModelData(modelId, {
            ...existingData,
            ...modelInfo,
            confName,
            confUid
          })
        }

      } catch (error) {
        console.error('❌ [Live2DViewer] 处理Live2D模型配置失败:', error)
      }
    }

    // 安全的Store同步方法
    const syncSettingToStore = (settingKey, value) => {
      try {
        if (!live2dStore.modelState) {
          console.log('📝 [Live2DViewer] Store状态未初始化，跳过同步')
          return
        }

        const currentSettings = live2dStore.modelState.settings || {}
        const updatedSettings = { ...currentSettings }

        // 根据设置类型安全地更新
        switch (settingKey) {
          case 'scale':
            updatedSettings.scale = value
            break
          case 'position':
            updatedSettings.positionX = value.x
            updatedSettings.positionY = value.y
            break
          case 'rotation':
            updatedSettings.rotation = value
            break
          default:
            updatedSettings[settingKey] = value
        }

        // 更新Store
        live2dStore.updateModelState({
          ...live2dStore.modelState,
          settings: updatedSettings
        })

        // 同时同步到状态同步管理器
        const model = live2dManager?.getCurrentModel()
        const modelId = live2dManager?.modelManager?.getModelId(model)
        if (modelId && model) {
          globalStateSyncManager.syncUISettingsToModel(modelId, model, { [settingKey]: value })
        }

        console.log('✅ [Live2DViewer] 设置已同步到Store和状态管理器:', settingKey, value)

      } catch (error) {
        console.error('❌ [Live2DViewer] Store同步失败:', error)
        // 不抛出错误，避免影响API功能
      }
    }

    // 状态同步管理器集成
    const registerModelStateSync = (modelId, heroModel) => {
      if (!modelId || !heroModel) return

      // 注册状态同步回调，用于监控模型状态变化
      globalStateSyncManager.registerSyncCallback(modelId, (currentState) => {
        if (!currentState) return

        // 将模型状态同步回 Store
        // 假设 currentState 包含一个 settings 对象，其结构与 live2dStore.modelState.settings 兼容
        // 并且 globalStateSyncManager 内部有机制避免循环同步
        live2dStore.updateModelState({
          ...live2dStore.modelState,
          settings: {
            ...(live2dStore.modelState?.settings || {}), // 保留现有设置
            ...(currentState.settings || {}) // 覆盖来自模型的最新设置
          }
        })

        console.log('🔄 [Live2DViewer] 模型状态已从状态同步管理器接收并同步到Store:', modelId, currentState)
      })

      console.log('📝 [Live2DViewer] 模型状态同步已注册:', modelId)
    }

    const unregisterModelStateSync = (modelId) => {
      if (!modelId) return

      globalStateSyncManager.unregisterSyncCallback(modelId)
      console.log('🗑️ [Live2DViewer] 模型状态同步已注销:', modelId)
    }

    const validateModelStateConsistency = (modelId, heroModel, expectedState) => {
      if (!modelId || !heroModel || !expectedState) return null

      return globalStateSyncManager.validateStateConsistency(modelId, heroModel, expectedState)
    }

    onMounted(() => {
      initLive2D().then(() => {
        // 全局挂载live2dManager主要方法
        if (live2dManager) {
          window.live2d = {
            // === 现有方法（保持向后兼容）===
            speak: (...args) => live2dManager.getCurrentModel()?.speak?.(...args),
            expression: (...args) => live2dManager.getCurrentModel()?.expression?.(...args),
            setExpression: (...args) => live2dManager.getCurrentModel()?.setExpression?.(...args),
            playRandomMotion: (...args) => live2dManager.getCurrentModel()?.playRandomMotion?.(...args),

            // === 新增的安全API方法 ===

            // 获取模型信息
            getModelInfo: () => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) return null

                return {
                  id: live2dManager.modelManager.getModelId(model),
                  expressions: model.getExpressions?.() || [],
                  motions: model.getMotions?.() || {},
                  isLoaded: true,
                  scale: model.model?.scale?.x || 1,
                  position: {
                    x: model.model?.x || 0,
                    y: model.model?.y || 0
                  }
                }
              } catch (error) {
                console.error('❌ [Live2D API] 获取模型信息失败:', error)
                return null
              }
            },

            // 设置模型缩放
            setScale: (scale) => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) {
                  console.warn('⚠️ [Live2D API] 当前没有加载的模型')
                  return false
                }

                if (typeof scale !== 'number' || scale <= 0 || scale > 5) {
                  console.warn('⚠️ [Live2D API] 无效的缩放值，应在0-5之间:', scale)
                  return false
                }

                // 应用到模型
                model.setScale(scale)

                // 统一通过syncSettingToStore同步到Store和状态管理器
                syncSettingToStore('scale', scale)

                console.log('✅ [Live2D API] 设置模型缩放:', scale)
                return true
              } catch (error) {
                console.error('❌ [Live2D API] 设置缩放失败:', error)
                return false
              }
            },

            // 设置模型位置
            setPosition: (x, y) => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) {
                  console.warn('⚠️ [Live2D API] 当前没有加载的模型')
                  return false
                }

                if (typeof x !== 'number' || typeof y !== 'number') {
                  console.warn('⚠️ [Live2D API] 无效的位置值:', x, y)
                  return false
                }

                const clampedX = Math.max(-1000, Math.min(1000, x))
                const clampedY = Math.max(-1000, Math.min(1000, y))

                // 应用到模型
                model.setPosition(clampedX, clampedY)

                // 统一通过syncSettingToStore同步到Store和状态管理器
                syncSettingToStore('position', { x: clampedX, y: clampedY })

                console.log('✅ [Live2D API] 设置模型位置:', clampedX, clampedY)
                return true
              } catch (error) {
                console.error('❌ [Live2D API] 设置位置失败:', error)
                return false
              }
            },

            // 播放指定动作
            playMotion: (group, index = 0, priority = 2) => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) {
                  console.warn('⚠️ [Live2D API] 当前没有加载的模型')
                  return false
                }

                if (!group || typeof group !== 'string') {
                  console.warn('⚠️ [Live2D API] 无效的动作组名称:', group)
                  return false
                }

                model.playMotion(group, index, priority)
                console.log('✅ [Live2D API] 播放动作:', group, index)
                return true
              } catch (error) {
                console.error('❌ [Live2D API] 播放动作失败:', error)
                return false
              }
            },

            // 获取管理器状态
            getManagerStatus: () => {
              try {
                return {
                  isInitialized: live2dManager.isInitialized,
                  hasModel: !!live2dManager.getCurrentModel(),
                  modelCount: live2dManager.getAllModelIds().length,
                  currentModelId: live2dManager.modelManager.currentModelId
                }
              } catch (error) {
                console.error('❌ [Live2D API] 获取管理器状态失败:', error)
                return null
              }
            },

            // 获取所有可用的动作组
            getAvailableMotions: () => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) return {}

                return model.getMotions?.() || {}
              } catch (error) {
                console.error('❌ [Live2D API] 获取动作列表失败:', error)
                return {}
              }
            },

            // 获取所有可用的表情
            getAvailableExpressions: () => {
              try {
                const model = live2dManager.getCurrentModel()
                if (!model) return []

                return model.getExpressions?.() || []
              } catch (error) {
                console.error('❌ [Live2D API] 获取表情列表失败:', error)
                return []
              }
            },

            // === 调试和诊断API ===

            // 检查交互性状态
            checkInteractivity: () => {
              try {
                const app = live2dManager?.coreManager?.app
                const model = live2dManager?.getCurrentModel()
                const canvas = document.getElementById('live2d-canvas')

                const status = {
                  pixiApp: {
                    exists: !!app,
                    stageInteractive: app?.stage?.interactive,
                    stageInteractiveChildren: app?.stage?.interactiveChildren,
                    stageEventMode: app?.stage?.eventMode,
                    pixiVersion: window.PIXI?.VERSION || 'unknown'
                  },
                  model: {
                    exists: !!model,
                    interactive: model?.model?.interactive,
                    buttonMode: model?.model?.buttonMode,
                    eventMode: model?.model?.eventMode,
                    cursor: model?.model?.cursor,
                    hasEventListeners: !!model?.model?._events
                  },
                  canvas: {
                    exists: !!canvas,
                    pointerEvents: canvas?.style?.pointerEvents,
                    touchAction: canvas?.style?.touchAction,
                    userSelect: canvas?.style?.userSelect,
                    hasDirectListeners: canvas ? Object.keys(canvas).filter(key => key.startsWith('on')).length > 0 : false
                  },
                  manager: {
                    initialized: live2dManager?.isInitialized,
                    hasInteractionManager: !!live2dManager?.interactionManager,
                    hasCoreManager: !!live2dManager?.coreManager
                  }
                }

                console.log('🔍 [Live2D API] 交互性状态检查:', status)
                return status
              } catch (error) {
                console.error('❌ [Live2D API] 检查交互性状态失败:', error)
                return null
              }
            },

            // === 缩放设置API ===

            // 设置滚轮缩放启用状态
            setWheelZoomEnabled: (enabled) => {
              try {
                live2dManager?.setWheelZoomEnabled(Boolean(enabled))
                console.log(`✅ [Live2D API] 滚轮缩放已${enabled ? '启用' : '禁用'}`)
              } catch (error) {
                console.error('❌ [Live2D API] 设置滚轮缩放失败:', error)
              }
            },

            // === 桌宠模式专用API ===

            // 获取桌宠模式状态
            getPetModeStatus: () => {
              try {
                return {
                  enabled: petMode.value,
                  config: petModeConfig.value,
                  isActive: petMode.value && !!live2dManager?.getCurrentModel()
                }
              } catch (error) {
                console.error('❌ [Live2D API] 获取桌宠模式状态失败:', error)
                return null
              }
            },

            // 桌宠模式交互控制
            setPetInteraction: (enabled) => {
              try {
                if (!petMode.value) {
                  console.warn('⚠️ [Live2D API] 当前不在桌宠模式')
                  return false
                }

                const model = live2dManager.getCurrentModel()
                if (!model) {
                  console.warn('⚠️ [Live2D API] 当前没有加载的模型')
                  return false
                }

                // 设置交互状态
                model.setInteractive(Boolean(enabled))

                // 同步到Store
                syncSettingToStore('interactive', Boolean(enabled))

                console.log('✅ [Live2D API] 桌宠交互设置:', enabled ? '启用' : '禁用')
                return true
              } catch (error) {
                console.error('❌ [Live2D API] 设置桌宠交互失败:', error)
                return false
              }
            },

            // 桌宠模式性能优化控制
            setPetPerformanceMode: (mode) => {
              try {
                if (!petMode.value) {
                  console.warn('⚠️ [Live2D API] 当前不在桌宠模式')
                  return false
                }

                if (!live2dManager) {
                  console.warn('⚠️ [Live2D API] Live2D管理器未初始化')
                  return false
                }

                // 根据模式调整性能设置
                const performanceSettings = {
                  'low': { maxFPS: 15, minFPS: 10 },
                  'normal': { maxFPS: 30, minFPS: 15 },
                  'high': { maxFPS: 60, minFPS: 30 }
                }

                const settings = performanceSettings[mode]
                if (!settings) {
                  console.warn('⚠️ [Live2D API] 无效的性能模式:', mode)
                  return false
                }

                // 应用性能设置（如果管理器支持）
                if (live2dManager.coreManager?.pixiApp) {
                  const app = live2dManager.coreManager.pixiApp
                  app.ticker.maxFPS = settings.maxFPS
                  app.ticker.minFPS = settings.minFPS
                }

                console.log('✅ [Live2D API] 桌宠性能模式设置:', mode, settings)
                return true
              } catch (error) {
                console.error('❌ [Live2D API] 设置桌宠性能模式失败:', error)
                return false
              }
            }
          }

          console.log('✅ [Live2DViewer] 全局Live2D API已挂载')
        }

        // 注册WebSocket事件监听器
        window.addEventListener('websocket:live2d-model-config', handleLive2DModelConfig)
        console.log('✅ [Live2DViewer] WebSocket事件监听器已注册')

        // 在开发环境下显示资源管理器状态
        if (import.meta.env.DEV) {
          console.log('📊 [Live2DViewer] 资源管理器状态:', globalResourceManager.getResourceCount())
        }
      })
    })

    onUnmounted(() => {
      console.log('🧹 [Live2DViewer] 组件卸载，开始清理Live2D管理器')

      try {
        // 1. 清理桌宠模式资源
        if (petMode.value) {
          console.log('🧹 [Live2DViewer] 清理桌宠模式资源...')
          
          // 停止自动交互
          stopPetModeAutoInteraction()

          // 清理 Electron 拖拽事件监听器 (如果已注册)
          // 注意: globalResourceManager.registerEventListener 已经处理了移除，这里是双重保险
          if (viewerContainer.value) {
            // 假设 handleMouseDown, handleMouseMove, handleMouseUp 是在 setup 作用域内定义的
            // 并且没有被直接暴露或存储在可访问的地方，那么通过 globalResourceManager 清理是更可靠的方式
            // 如果需要直接移除，需要确保这些函数是可访问的
            // 例如：viewerContainer.value.removeEventListener('mousedown', handleMouseDown)
            // 由于这些事件是通过 globalResourceManager 注册的，我们依赖其清理机制
            console.log('🧹 [Live2DViewer] Electron 拖拽事件监听器将由资源管理器清理')
          }

          // 清理悬停事件监听器 (如果已注册)
          if (viewerContainer.value) {
            try {
              viewerContainer.value.removeEventListener('mouseenter', handlePetModeHover)
              viewerContainer.value.removeEventListener('mouseleave', handlePetModeLeave)
              console.log('🧹 [Live2DViewer] 桌宠悬停事件监听器已清理')
            } catch (error) {
              console.error('❌ [Live2DViewer] 清理桌宠悬停事件失败:', error)
            }
          }

          console.log('🧹 [Live2DViewer] 桌宠模式资源已清理')
        }

        // 2. 清理Live2D管理器
        if (live2dManager) {
          console.log('🧹 [Live2DViewer] 销毁Live2D管理器...')
          try {
            live2dManager.destroy()
            console.log('✅ [Live2DViewer] Live2D管理器已销毁')
          } catch (error) {
            console.error('❌ [Live2DViewer] 销毁Live2D管理器失败:', error)
          }
          live2dManager = null
        }

        // 3. 清理全局live2d对象
        if (window.live2d) {
          try {
            delete window.live2d
            console.log('🧹 [Live2DViewer] 全局live2d对象已清理')
          } catch (error) {
            console.error('❌ [Live2DViewer] 清理全局live2d对象失败:', error)
          }
        }

        // 4. 清理WebSocket事件监听器
        try {
          window.removeEventListener('websocket:live2d-model-config', handleLive2DModelConfig)
          console.log('🧹 [Live2DViewer] WebSocket事件监听器已清理')
        } catch (error) {
          console.error('❌ [Live2DViewer] 清理WebSocket事件监听器失败:', error)
        }

        // 5. 清理状态同步管理器
        try {
          if (globalStateSyncManager) { // 直接使用导入的 globalStateSyncManager
            globalStateSyncManager.destroy()
            // 不需要 delete window.globalStateSyncManager，因为它不是挂载在 window 上的
            console.log('🧹 [Live2DViewer] 状态同步管理器已清理')
          }
        } catch (error) {
          console.error('❌ [Live2DViewer] 清理状态同步管理器失败:', error)
        }

        // 6. 清理资源管理器中注册的所有资源
        try {
          globalResourceManager.cleanupAll()
          console.log('✅ [Live2DViewer] 资源管理器中所有资源已清理')
        } catch (error) {
          console.error('❌ [Live2DViewer] 清理资源管理器失败:', error)
        }

        console.log('✅ [Live2DViewer] 组件卸载清理完成')
      } catch (error) {
        console.error('❌ [Live2DViewer] 组件卸载清理失败:', error)
      }
    })

    return {
      viewerContainer,
      petModeStyle,
      retryLoadModel,
      clearError,
      isLoading,
      error,
      loadModel,
    }
  }
}
</script>

<style scoped>
.live2d-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: transparent; /* 移除 !important */
}

:deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: auto; /* 移除 !important */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 文本容器样式 */
.text-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  max-width: 80%;
  pointer-events: none;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 文本内容样式 */
.text-container :deep(.text-content) {
  background: rgba(255, 255, 255, 0.2); /* 移除多余空格 */
  color: white; /* 移除多余空格 */
  margin: 0 auto; /* 移除多余空格 */
  padding: 8px 12px; /* 移除多余空格 */
  border-radius: 12px; /* 移除多余空格 */
  font-size: 16px; /* 移除多余空格 */
  line-height: 1.5; /* 移除多余空格 */
  max-width: 800px; /* 移除多余空格 */
  word-wrap: break-word; /* 移除多余空格 */
  text-align: center; /* 移除多余空格 */
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.1); /* 移除多余空格 */
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.2); /* 移除多余空格 */
  display: block; /* 移除多余空格 */
  position: relative; /* 移除多余空格 */
}

/* 加载状态指示器样式 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* 错误状态指示器样式 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
</style>
