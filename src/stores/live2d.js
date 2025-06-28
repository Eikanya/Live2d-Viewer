import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { globalStateSyncManager } from '../utils/live2d/state-sync-manager.js'

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[Live2DStore]'
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

export const useLive2DStore = defineStore('live2d', () => {
  // 状态
  const manager = ref(null)
  const currentModel = ref(null)
  const loadedModels = ref(new Map()) // 存储 HeroModel 实例
  const modelDataMap = ref(new Map()) // 存储模型数据
  const isLoading = ref(false)
  const error = ref(null)
  
  // 设置
  const settings = reactive({
    showText: true,
    enableAudio: true,
    canvasWidth: 1200,
    canvasHeight: 800,
    autoResize: true,

    // AI控制设置
    enableAIControl: true,
    autoExpression: true,
    autoMotion: true,
    autoLipSync: true,
    textDisplayDuration: 3000,

    // 表情映射设置
    emotionMapping: {
      neutral: 0,
      happy: 1,
      sad: 2,
      angry: 3,
      surprised: 4,
      fear: 5,
      disgust: 6
    }
  })

  // 模型状态 - 简化为基础数据存储，不包含同步逻辑
  const modelState = reactive({
    // 基础设置 - 仅存储数据，不处理同步
    settings: {
      scale: 0.2,
      position: { x: 0, y: 0 },
      rotation: 0,
      breathing: true,
      eyeBlinking: true,
      interactive: true,
      // 扩展设置
      wheelZoom: true,
      clickInteraction: true,
      zoomSettings: {
        speed: 0.01,
        min: 0.01,
        max: 5.0
      },
      enableAudio: true,
      showText: true
    }
  })

  // 默认模型设置
  const defaultModelSettings = {
    scale: 0.2,
    position: { x: 0, y: 0 },
    rotation: 0,
    breathing: true,
    eyeBlinking: true,
    interactive: true
  }

  // Actions
  const setManager = (newManager) => {
    manager.value = newManager
    
    // 集成状态同步管理器
    if (newManager) {
      globalStateSyncManager.integrateWithStore({
        updateModelState: updateModelState,
        getCurrentModelState: getCurrentModelState
      })
      console.log('🔗 [Live2DStore] 已集成状态同步管理器')
    }
  }

  const setCurrentModel = (model) => {
    currentModel.value = model
    
    // 同步设置模型管理器中的当前模型
    if (manager.value && model?.id) {
      try {
        manager.value.setCurrentModel(model.id)
        console.log('🎯 [Live2DStore] 已同步设置模型管理器当前模型:', model.id)
      } catch (error) {
        console.error('❌ [Live2DStore] 设置模型管理器当前模型失败:', error)
      }
    }
    
    if (!model) {
      // 若为 null，重置 modelState 并安全返回
      Object.assign(modelState.settings, {
        scale: 0.2,
        position: { x: 0, y: 0 },
        rotation: 0,
        breathing: true,
        eyeBlinking: true,
        interactive: true
      })
      return
    }
    
    // 检查是否已经有用户设置的缩放值
    const hasUserScale = modelState.settings.scale && modelState.settings.scale !== 0.2
    
    // 同步状态
    const meta = modelDataMap.value.get(model.id)
    if (meta && meta.defaultState) {
      // 保留用户已设置的缩放值
      const userScale = hasUserScale ? modelState.settings.scale : undefined
      Object.assign(modelState.settings, meta.defaultState)
      if (userScale !== undefined) {
        modelState.settings.scale = userScale
      }
    } else {
      // 保留用户已设置的缩放值
      const userScale = hasUserScale ? modelState.settings.scale : 0.2
      Object.assign(modelState.settings, {
        scale: userScale,
        position: { x: 0, y: 0 },
        rotation: 0,
        breathing: true,
        eyeBlinking: true,
        interactive: true
      })
    }
  }

  const addLoadedModel = (modelData, modelInstance) => {
    if (!modelData || !modelData.id) return
    // 避免重复加载同id
    if (loadedModels.value.has(modelData.id)) return
    // 避免重复加载同url
    for (const data of modelDataMap.value.values()) {
      if (modelData.url && data.url === modelData.url) return
    }
    loadedModels.value.set(modelData.id, modelInstance)
    const fullModelData = {
      id: modelData.id,
      url: modelData.url || '',
      name: modelData.name || modelData.id,
      description: modelData.description || '',
      thumbnail: modelData.thumbnail || '',
      version: modelData.version || '',
      author: modelData.author || '',
      tags: modelData.tags || []
    }
    modelDataMap.value.set(modelData.id, fullModelData)
  }

  const removeLoadedModel = (id) => {
    loadedModels.value.delete(id)
    modelDataMap.value.delete(id)
  }

  const setModelData = (modelData = {}) => {
    if (!modelData.id) return
    if (modelDataMap.value.has(modelData.id)) {
      const old = modelDataMap.value.get(modelData.id)
      modelDataMap.value.set(modelData.id, {
        ...old,
        ...modelData,
        name: modelData.name || old.name || modelData.id,
        url: modelData.url || old.url || ''
      })
      return
    }
    const fullModelData = {
      id: modelData.id,
      url: modelData.url || '',
      name: modelData.name || modelData.id,
      description: modelData.description || '',
      thumbnail: modelData.thumbnail || '',
      version: modelData.version || '',
      author: modelData.author || '',
      tags: modelData.tags || []
    }
    modelDataMap.value.set(modelData.id, fullModelData)
  }

  const getModelData = (id) => modelDataMap.value.get(id) || null

  const setLoading = (loading) => {
    isLoading.value = loading
  }

  const setError = (err) => {
    error.value = err
  }

  // === 状态管理 API ===
  // 注意：状态同步逻辑由 state-sync-manager.js 负责
  // 这里只负责数据存储，不处理同步逻辑

  /**
   * 更新模型状态数据（仅数据存储，不处理同步）
   * @param {Object} newState - 新的状态数据
   */
  const updateModelState = (newState) => {
    try {
      // 仅更新数据存储，不处理同步逻辑
      // 同步逻辑由 state-sync-manager.js 负责
      if (newState && typeof newState === 'object') {
        Object.assign(modelState, newState)
        console.log('📝 [Live2DStore] 模型状态数据已更新:', newState)
      }
    } catch (error) {
      log(`更新模型状态失败: ${error.message}`, 'error')
    }
  }

  /**
   * 获取当前模型状态数据（仅返回数据，不进行同步）
   * @returns {Object} 当前状态数据的副本
   */
  const getCurrentModelState = () => {
    return { ...modelState }
  }

  /**
   * 更新设置数据（仅数据存储，不处理同步）
   * @param {Object} settings - 新的设置数据
   */
  const updateSettingsData = (settings) => {
    try {
      // 仅更新设置数据存储，不处理同步逻辑
      if (settings && typeof settings === 'object') {
        Object.assign(modelState.settings || {}, settings)
        console.log('📝 [Live2DStore] 设置数据已更新:', settings)
      }
    } catch (error) {
      log(`更新设置数据失败: ${error.message}`, 'error')
    }
  }

  // 移除重复的 updateSettings 方法，避免与 live2d-manager.js 中的方法混淆
  // 状态同步逻辑统一由 state-sync-manager.js 处理

  // AI控制相关方法
  const handleAIResponse = (aiResponse) => {
    if (!manager.value || !settings.enableAIControl) {
      return
    }

    manager.value.handleAIResponse(aiResponse)
  }

  const setAIControlEnabled = (enabled) => {
    settings.enableAIControl = enabled
    if (manager.value) {
      manager.value.setAIControlEnabled(enabled)
    }
  }

  const updateEmotionMapping = (mapping) => {
    Object.assign(settings.emotionMapping, mapping)
  }

  const triggerExpression = (emotionName) => {
    if (!manager.value || !settings.enableAIControl) return

    const expressionIndex = settings.emotionMapping[emotionName.toLowerCase()]
    if (typeof expressionIndex === 'number') {
      const currentModel = manager.value.getCurrentModel()
      if (currentModel) {
        currentModel.setExpression(expressionIndex)
      }
    }
  }

  const triggerMotion = (group, index, priority = 'NORMAL') => {
    if (!manager.value) return

    const currentModel = manager.value.getCurrentModel()
    if (currentModel) {
      // 将字符串优先级转换为数字
      let numericPriority = 2
      switch (priority) {
        case 'IDLE':
          numericPriority = 1
          break
        case 'NORMAL':
          numericPriority = 2
          break
        case 'FORCE':
          numericPriority = 3
          break
      }
      
      currentModel.playMotion(group, index, numericPriority)
    }
  }

  // Getters
  const hasLoadedModels = () => {
    return loadedModels.value.size > 0
  }

  const getModelById = (id) => loadedModels.value.get(id) || null

  const getAllModels = () => Array.from(loadedModels.value.values()) || []

  const getModelByUrl = (url) => {
    for (const [id, modelData] of modelDataMap.value.entries()) {
      if (modelData.url === url) {
        return {
          id,
          model: loadedModels.value.get(id) || null,
          data: modelData
        }
      }
    }
    return null
  }

  // 获取默认模型
  const getDefaultModel = () => {
    // 首先尝试获取当前模型
    if (currentModel.value) {
      return currentModel.value
    }

    // 如果没有当前模型，尝试获取第一个已加载的模型
    const models = getAllModels()
    if (models.length > 0) {
      const firstModel = models[0]
      const modelId = firstModel.id || Object.keys(modelDataMap.value)[0]
      if (modelId) {
        return modelDataMap.value.get(modelId)
      }
    }
  }

  return {
    // State
    manager,
    currentModel,
    loadedModels,
    modelDataMap,
    isLoading,
    error,
    settings,
    modelState,

    // Actions
    setManager,
    setCurrentModel,
    addLoadedModel,
    removeLoadedModel,
    setModelData,
    getModelData,
    setLoading,
    setError,
    updateSettingsData,
    updateModelState,

    // AI Control Actions
    handleAIResponse,
    setAIControlEnabled,
    updateEmotionMapping,
    triggerExpression,
    triggerMotion,

    // Getters
    hasLoadedModels,
    getModelById,
    getAllModels,
    getModelByUrl,
    getDefaultModel,

    // Additional Getters
    getCurrentModelState
  }
})
