/**
 * Live2D Manager - 主管理器
 * 整合所有子管理器，提供统一的API接口
 */

import { Live2DCoreManager } from './core-manager.js'
import { Live2DModelManager } from './model-manager.js'
import { Live2DInteractionManager } from './interaction-manager.js'
import { Live2DAnimationManager } from './animation-manager.js'
import { getRecommendedSettings, checkWebGLSupport } from './utils.js'

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[Live2DManager]'
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

export class Live2DManager {
  constructor(container) {
    this.container = container
    
    // 初始化子管理器
    this.coreManager = new Live2DCoreManager(container)
    this.modelManager = new Live2DModelManager(this.coreManager)
    this.animationManager = new Live2DAnimationManager(this.modelManager)
    
    // interactionManager将在coreManager初始化后创建
    this.interactionManager = null
    
    this.isInitialized = false
  }

  /**
   * 初始化Live2D管理器
   * @param {Object} options - 初始化选项
   */
  async init(options = {}) {
    try {
      log('开始初始化...')

      // 检查WebGL支持
      if (!checkWebGLSupport()) {
        throw new Error('浏览器不支持WebGL，无法运行Live2D')
      }

      // 获取推荐设置
      const recommendedSettings = getRecommendedSettings()
      const settings = { ...recommendedSettings, ...options }

      // 初始化核心管理器
      await this.coreManager.init()

      // 应用性能优化设置
      this.coreManager.optimizePerformance(settings)

      // 在coreManager初始化后创建interactionManager
      this.interactionManager = new Live2DInteractionManager(this.coreManager, this.modelManager)
      if (this.interactionManager) {
        this.interactionManager.initialize()
      }

      this.isInitialized = true
      log('初始化完成')
      
      return true
    } catch (error) {
      log(`初始化失败: ${error.message}`, 'error')
      throw error
    }
  }

  // === 模型管理 API ===

  /**
   * 验证模型状态
   * @param {HeroModel} model - 要验证的模型
   * @returns {boolean} 模型是否有效
   */
  validateModel(model) {
    if (!model) {
      log('模型为空')
      return false
    }

    if (!model.model) {
      log('模型实例为空')
      return false
    }

    if (!model.model.internalModel) {
      log('模型内部实例为空')
      return false
    }

    return true
  }

  /**
   * 加载模型
   * @param {Object} modelData - 模型数据
   * @returns {Promise<Object>} 加载的模型实例
   */
  async loadModel(modelData) {
    try {
      log('开始加载模型:', modelData.id)

      // 使用模型管理器加载模型
      const heroModel = await this.modelManager.loadModel(modelData)

      if (heroModel && this.interactionManager) {
        // 绑定交互事件
        this.interactionManager.bindModelInteractionEvents(modelData.id, heroModel)
        log('模型加载成功:', modelData.id)
      }

      return heroModel
    } catch (error) {
      log('模型加载失败:', error, 'error')
      throw error
    }
  }

  /**
   * 卸载模型
   * @param {string} modelId - 模型ID
   */
  unloadModel(modelId) {
    try {
      log('开始卸载模型:', modelId)

      // 清理交互事件监听器
      if (this.interactionManager) {
        this.interactionManager.cleanupModelEventListeners(modelId)
      }

      // 使用模型管理器卸载模型
      this.modelManager.unloadModel(modelId)

      log('模型卸载成功:', modelId)
    } catch (error) {
      log('模型卸载失败:', error, 'error')
    }
  }

  /**
   * 切换模型
   * @param {Object} modelData - 新模型数据
   * @returns {Promise<Object>} 新模型实例
   */
  async switchModel(modelData) {
    try {
      log('开始切换模型:', modelData.id)

      // 卸载当前模型
      const currentModel = this.modelManager.getCurrentModel()
      if (currentModel && this.interactionManager) {
        this.interactionManager.cleanupModelEventListeners(currentModel.id)
        this.modelManager.unloadModel(currentModel.id)
      }

      // 加载新模型
      const newModel = await this.loadModel(modelData)

      // 绑定新模型的交互事件
      if (newModel && this.interactionManager) {
        this.interactionManager.bindModelInteractionEvents(modelData.id, newModel)
      }

      log('模型切换成功:', modelData.id)
      return newModel
    } catch (error) {
      log('模型切换失败:', error, 'error')
      throw error
    }
  }

  /**
   * 自动适应模型到画布大小
   * @param {HeroModel} heroModel - 模型实例
   */
  autoFitModelToCanvas(heroModel) {
    if (!heroModel || !this.container) return

    try {
      const canvasWidth = this.container.clientWidth
      const canvasHeight = this.container.clientHeight
      
      if (canvasWidth > 0 && canvasHeight > 0) {
        // 使用更保守的高度比例，横屏模型会自动适配
        heroModel.autoFitToCanvas(canvasWidth, canvasHeight, 0.5)
      }
    } catch (error) {
      log(`自动适应画布大小失败: ${error.message}`, 'warn')
    }
  }

  /**
   * 移除模型
   * @param {string} modelId - 模型ID
   */
  removeModel(modelId) {
    log('开始移除模型:', modelId)

    try {
      const heroModel = this.modelManager.getModel(modelId)
      if (!heroModel) {
        log('模型不存在:', modelId)
        return
      }

      // 1. 停止所有动画
      try {
        if (this.animationManager) {
          this.animationManager.stopAllAnimations(modelId)
          log('已停止模型动画:', modelId)
        }
      } catch (e) {
        log(`停止动画失败: ${e.message}`, 'warn')
      }

      // 2. 清理交互事件
      try {
        if (this.interactionManager) {
          this.interactionManager.cleanupModelEventListeners(modelId)
          log('已清理模型交互事件:', modelId)
        }
      } catch (e) {
        log(`清理交互事件失败: ${e.message}`, 'warn')
      }

      // 3. 从模型管理器中移除（这会触发模型的销毁）
      try {
        this.modelManager.removeModel(modelId)
        log('已从模型管理器移除:', modelId)
      } catch (e) {
        log(`从模型管理器移除失败: ${e.message}`, 'error')
        throw e
      }

      log(`模型移除完成: ${modelId}`)
    } catch (error) {
      log(`移除模型失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 刷新模型
   */
  async refreshModel(modelId, modelData) {
    // 清理旧的交互事件
    if (this.interactionManager) {
      this.interactionManager.cleanupModelEventListeners(modelId)
    }
    
    // 刷新模型
    const heroModel = await this.modelManager.refreshModel(modelId, modelData)
    
    // 重新绑定交互事件
    if (heroModel && this.interactionManager) {
      this.interactionManager.bindModelInteractionEvents(modelId, heroModel)
    }
    
    return heroModel
  }

  /**
   * 获取模型
   * @param {string} modelId - 模型ID
   * @returns {HeroModel|null} 模型实例
   */
  getModel(modelId) {
    return this.modelManager.getModel(modelId)
  }

  /**
   * 检查模型是否存在
   * @param {string} modelId - 模型ID
   * @returns {boolean} 是否存在
   */
  hasModel(modelId) {
    return this.modelManager.hasModel(modelId)
  }

  /**
   * 获取所有模型
   * @returns {HeroModel[]} 所有模型实例
   */
  getAllModels() {
    return this.modelManager.getAllModels()
  }

  /**
   * 获取所有模型ID
   * @returns {string[]} 所有模型ID
   */
  getAllModelIds() {
    return this.modelManager.getAllModelIds()
  }

  /**
   * 获取当前模型
   * @returns {HeroModel|null} 当前模型实例
   */
  getCurrentModel() {
    return this.modelManager.getCurrentModel()
  }

  /**
   * 设置当前模型
   * @param {string} modelId - 模型ID
   */
  setCurrentModel(modelId) {
    this.modelManager.setCurrentModel(modelId)
  }

  /**
   * 获取第一个可用模型
   * @returns {HeroModel|null} 第一个可用模型
   */
  getFirstAvailableModel() {
    return this.modelManager.getFirstAvailableModel()
  }

  // === 动画控制 API ===

  /**
   * 播放动作
   */
  async playMotion(modelId, group, index, priority = 2) {
    return this.animationManager.playMotion(modelId, group, index, priority)
  }

  /**
   * 播放随机动作
   */
  async playRandomMotion(modelId, group = null) {
    return this.animationManager.playRandomMotion(modelId, group)
  }

  /**
   * 设置表情
   */
  setExpression(modelId, expressionIndex) {
    return this.animationManager.setExpression(modelId, expressionIndex)
  }

  /**
   * 播放随机表情
   */
  playRandomExpression(modelId) {
    return this.animationManager.playRandomExpression(modelId)
  }

  /**
   * 批量控制表情
   */
  batchControlExpressions(expressions, modelIds = null) {
    return this.animationManager.batchControlExpressions(expressions, modelIds)
  }

  /**
   * 批量控制动作
   */
  async batchControlMotions(motions, modelIds = null) {
    return this.animationManager.batchControlMotions(motions, modelIds)
  }

  /**
   * 播放音频
   */
  async playAudio(audioUrl, options = {}) {
    return this.animationManager.playAudio(audioUrl, options)
  }

  /**
   * 停止音频
   */
  stopAudio() {
    this.animationManager.stopAudio()
  }

  /**
   * 获取音频状态
   */
  getAudioStatus() {
    return this.animationManager.getAudioStatus()
  }

  // === 交互控制 API ===

  /**
   * 设置交互功能启用状态
   * @param {boolean} enabled - 是否启用
   */
  setInteractionEnabled(enabled) {
    if (this.interactionManager) {
      this.interactionManager.setInteractionEnabled(enabled)
      log(`🖱️ [Live2DManager] 交互功能已${enabled ? '启用' : '禁用'}`)
    }
  }

  /**
   * 设置模型位置
   * @param {string} modelId - 模型ID
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  setModelPosition(modelId, x, y) {
    if (this.interactionManager) {
      return this.interactionManager.setModelPosition(modelId, x, y)
    }
  }

  /**
   * 更新缩放设置
   * @param {Object} settings - 缩放设置对象
   * @param {number} settings.zoomSpeed - 缩放步长
   */
  updateZoomSettings(settings) {
    if (!this.interactionManager) {
      log('交互管理器未初始化，无法更新缩放设置', 'warn')
      return
    }

    try {
      this.interactionManager.updateZoomSettings(settings)
      log('缩放设置已更新:', settings)
    } catch (error) {
      log('更新缩放设置失败:', error, 'error')
    }
  }

  /**
   * 获取当前缩放设置
   * @returns {Object|null} 当前缩放设置
   */
  getZoomSettings() {
    if (!this.interactionManager) {
      return null
    }

    try {
      return this.interactionManager.getZoomSettings()
    } catch (error) {
      log('获取缩放设置失败:', error, 'error')
      return null
    }
  }

  /**
   * 设置滚轮缩放启用状态
   * @param {boolean} enabled - 是否启用滚轮缩放
   */
  setWheelZoomEnabled(enabled) {
    if (!this.interactionManager) {
      log('交互管理器未初始化，无法设置滚轮缩放', 'warn')
      return
    }

    try {
      this.interactionManager.setWheelZoomEnabled(enabled)
      log('滚轮缩放状态已设置:', enabled)
    } catch (error) {
      log('设置滚轮缩放状态失败:', error, 'error')
    }
  }

  // === 性能和设置 API ===

  /**
   * 更新性能设置
   */
  updatePerformanceSettings(settings) {
    this.coreManager.optimizePerformance(settings)
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return this.coreManager.getPerformanceStats()
  }

  /**
   * 暂停/恢复渲染
   */
  setPaused(paused) {
    this.coreManager.setPaused(paused)
  }

  /**
   * 更新画布尺寸
   */
  resize(width, height) {
    this.coreManager.resize(width, height)
    this.modelManager.repositionModels()
    
    // 自动适应所有模型到新的画布大小
    this.autoFitAllModelsToCanvas(width, height)
  }

  /**
   * 自动适应所有模型到画布大小
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  autoFitAllModelsToCanvas(width, height) {
    if (!width || !height) return

    try {
      const models = this.modelManager.getAllModels()
      models.forEach(heroModel => {
        if (heroModel && heroModel.autoFitToCanvas) {
          // 使用更保守的高度比例，横屏模型会自动适配
          heroModel.autoFitToCanvas(width, height, 0.5)
        }
      })
    } catch (error) {
      log(`自动适应所有模型到画布大小失败: ${error.message}`, 'warn')
    }
  }

  /**
   * 销毁Live2D管理器
   */
  destroy() {
    log('开始销毁Live2D管理器...')

    try {
      // 销毁交互管理器
      if (this.interactionManager) {
        this.interactionManager.destroy()
      }

      // 销毁其他管理器
      if (this.animationManager) {
        this.animationManager.destroy()
      }

      if (this.modelManager) {
        this.modelManager.destroy()
      }

      if (this.coreManager) {
        this.coreManager.destroy()
      }

      this.isInitialized = false
      log('Live2D管理器销毁完成')
    } catch (error) {
      log(`销毁Live2D管理器失败: ${error.message}`, 'error')
    }
  }

  // === 子管理器直接暴露 ===
  get interaction() {
    return this.interactionManager
  }

  get model() {
    return this.modelManager
  }

  get animation() {
    return this.animationManager
  }

  get core() {
    return this.coreManager
  }
}

// 说明：
// 现在可直接通过 live2dManager.interaction.xxx()、live2dManager.animation.xxx() 等方式访问子管理器API。
// 原有的简单转发方法已移除，推荐直接使用子管理器。
