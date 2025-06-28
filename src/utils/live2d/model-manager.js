/**
 * Live2D Model Manager - 模型管理器
 * 负责模型的加载、移除、查找和生命周期管理
 */

import { HeroModel } from './hero-model.js'
import { useLive2DStore } from '../../stores/live2d'

export class Live2DModelManager {
  constructor(coreManager) {
    this.coreManager = coreManager
    this.models = new Map()
    this.currentModelId = null
    this.modelPositions = new Map()
    this.isPetMode = false
    this.petModeScale = 0.4  // 默认桌宠模式缩放比例
  }

  /**
   * 设置桌宠模式
   * @param {boolean} enabled - 是否启用桌宠模式
   */
  setPetMode(enabled) {
    this.isPetMode = enabled
    console.log(`🐾 [Live2DModelManager] 桌宠模式${enabled ? '已启用' : '已禁用'}`)

    if (enabled) {
      // 调整所有模型的位置和大小
      this.models.forEach((model, modelId) => {
        if (model.model) {
          // 设置桌宠模式下的默认位置和大小
          model.model.position.set(
            this.coreManager.app.screen.width / 2,
            this.coreManager.app.screen.height / 2
          )
          model.setScale(this.petModeScale) // 使用可配置的缩放比例
          model.setAnchor(0.5)
        }
      })
    } else {
      // 恢复原始位置和大小
      this.repositionModels()
    }
  }

  /**
   * 设置桌宠模式缩放比例
   * @param {number} scale - 缩放比例
   */
  setPetModeScale(scale) {
    if (scale < 0.1 || scale > 2.0) {
      console.warn('⚠️ [Live2DModelManager] 缩放比例超出范围 (0.1-2.0):', scale)
      return
    }
    this.petModeScale = scale
    console.log('📏 [Live2DModelManager] 设置桌宠模式缩放比例:', scale)

    // 如果当前是桌宠模式，立即应用新的缩放比例
    if (this.isPetMode) {
      this.models.forEach((model) => {
        if (model.model) {
          model.setScale(scale)
        }
      })
    }
  }

  /**
   * 加载模型
   * @param {Object} modelData - 模型数据
   */
  async loadModel(modelData) {
    let heroModel = null
    try {
      const modelId = modelData.id

      // 检查模型是否已加载
      if (this.models.has(modelId)) {
        return this.models.get(modelId)
      }

      // 创建 HeroModel 实例
      heroModel = new HeroModel(modelId)
      await heroModel.create(modelData.url)

      // 添加到场景
      this.addModelToScene(heroModel, modelId)

      // 存储模型
      this.models.set(modelId, heroModel)

      // 设置为当前模型（如果是第一个模型）
      if (!this.currentModelId) {
        this.currentModelId = modelId
      }

      console.log('✅ [Live2DModelManager] 模型加载成功:', modelId)
      return heroModel
    } catch (error) {
      console.error('❌ [Live2DModelManager] 模型加载失败:', error)

      // 清理失败的模型实例
      if (heroModel) {
        try {
          heroModel.destroy()
        } catch (cleanupError) {
          console.error('❌ [Live2DModelManager] 清理失败模型时出错:', cleanupError)
        }
      }

      throw error
    }
  }

  /**
   * 刷新模型（重新加载）
   * @param {string} modelId - 模型ID
   * @param {Object} modelData - 模型数据
   */
  async refreshModel(modelId, modelData) {
    try {
      console.log('🔄 [Live2DModelManager] 刷新模型:', modelId)

      // 保存当前模型的位置和状态
      const oldModel = this.models.get(modelId)
      let savedPosition = null
      let savedSettings = null

      if (oldModel && oldModel.model) {
        savedPosition = {
          x: oldModel.model.position.x,
          y: oldModel.model.position.y
        }
        savedSettings = {
          scale: oldModel.getScale(),
          angle: oldModel.getAngle(),
          alpha: oldModel.getAlpha()
        }
      }

      // 移除旧模型
      this.removeModel(modelId)

      // 加载新模型
      const newModel = await this.loadModel(modelData)

      // 恢复位置和设置
      if (savedPosition && newModel.model) {
        newModel.model.position.set(savedPosition.x, savedPosition.y)
        this.modelPositions.set(modelId, savedPosition)
      }

      if (savedSettings) {
        newModel.setScale(savedSettings.scale.x)
        newModel.setAngle(savedSettings.angle)
        newModel.setAlpha(savedSettings.alpha)
      }

      return newModel
    } catch (error) {
      console.error('❌ [Live2DModelManager] 模型刷新失败:', error)
      throw error
    }
  }

  /**
   * 添加模型到场景
   * @param {HeroModel} heroModel - HeroModel 实例
   * @param {string} modelId - 模型ID
   */
  addModelToScene(heroModel, modelId) {
    if (!this.coreManager.modelContainer || !heroModel.model) {
      console.warn('⚠️ [Live2DModelManager] 无法添加模型到场景:', modelId)
      return
    }

    // 添加到模型容器
    this.coreManager.modelContainer.addChild(heroModel.model)

    // 确保模型可见性
    heroModel.model.visible = true
    heroModel.model.alpha = 1.0

    // 设置模型属性
    heroModel.setAnchor(0.5)
    
    // 根据模式设置不同的缩放比例
    const scale = this.isPetMode ? this.petModeScale : 0.2
    heroModel.setScale(scale)

    // 计算模型位置
    const position = {
      x: this.coreManager.app.screen.width / 2,
      y: this.coreManager.app.screen.height / 2
    }
    
    heroModel.model.position.set(position.x, position.y)
    this.modelPositions.set(modelId, position)

    // 创建前景（已注释，避免遮挡其它模型。如需前景可自定义透明度）
    this.createModelForeground(heroModel)

    console.log('✅ [Live2DModelManager] 模型已添加到场景:', modelId, {
      position: position,
      visible: heroModel.model.visible,
      alpha: heroModel.model.alpha,
      parent: !!heroModel.model.parent,
      scale: heroModel.model.scale,
      isPetMode: this.isPetMode,
      petModeScale: this.petModeScale
    })
  }

  /**
   * 计算模型位置（避免重叠）
   */
  calculateModelPosition() {
    // 始终使用中心位置，确保模型居中显示
    return {
      x: this.coreManager.app.screen.width / 2,
      y: this.coreManager.app.screen.height / 2
    }
  }

  /**
   * 创建模型前景
   * @param {HeroModel} heroModel - 模型实例
   */
  createModelForeground(heroModel) {
    if (!heroModel || !heroModel.model) return

    // 读取全局设置
    const live2dStore = useLive2DStore && typeof useLive2DStore === 'function' ? useLive2DStore() : null
    const show = live2dStore?.settings?.showForeground
    const alpha = live2dStore?.settings?.foregroundAlpha ?? 0.0
    if (!show) return
    
    // PIXI 7.x兼容性：创建白色纹理
    let whiteTexture
    if (window.PIXI.Texture.WHITE) {
      whiteTexture = window.PIXI.Texture.WHITE
    } else {
      // 如果WHITE不可用，创建一个1x1的白色纹理
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, 1, 1)
      whiteTexture = window.PIXI.Texture.from(canvas)
    }
    
    const foreground = window.PIXI.Sprite.from(whiteTexture)
    
    // 使用公共API获取模型尺寸，避免使用内部属性
    const modelSize = heroModel.getModelOriginalSize()
    if (modelSize) {
      foreground.width = modelSize.width
      foreground.height = modelSize.height
    } else {
      // 回退方案：使用模型的bounds
      const bounds = heroModel.model.getBounds()
      foreground.width = bounds.width
      foreground.height = bounds.height
    }
    
    foreground.alpha = alpha
    foreground.visible = true
    foreground.zIndex = 999
    heroModel.model.addChild(foreground)
    heroModel.foreground = foreground
  }

  /**
   * 移除模型
   * @param {string} modelId - 模型ID
   */
  removeModel(modelId) {
    const heroModel = this.models.get(modelId)
    if (!heroModel) {
      console.warn('⚠️ [Live2DModelManager] 尝试移除不存在的模型:', modelId)
      return
    }

    console.log('🗑️ [Live2DModelManager] 移除模型:', modelId)

    try {
      // 1. 清理交互事件监听器（如果交互管理器存在）
      if (this.coreManager.interactionManager) {
        try {
          this.coreManager.interactionManager.cleanupModelEventListeners(modelId)
          console.log('🧹 [Live2DModelManager] 已清理模型交互事件:', modelId)
        } catch (error) {
          console.error('❌ [Live2DModelManager] 清理交互事件失败:', modelId, error)
        }
      }

      // 2. 使用 HeroModel 的 destroy 方法销毁模型
      heroModel.destroy()

      // 3. 清理位置信息
      this.modelPositions.delete(modelId)

      // 4. 从映射中删除
      this.models.delete(modelId)

      // 5. 如果移除的是当前模型，选择新的当前模型
      if (this.currentModelId === modelId) {
        const remainingIds = Array.from(this.models.keys())
        this.currentModelId = remainingIds.length > 0 ? remainingIds[0] : null
        console.log('🎯 [Live2DModelManager] 当前模型已移除，新当前模型:', this.currentModelId)
      }

      console.log('✅ [Live2DModelManager] 模型移除完成:', modelId, {
        remainingModels: this.models.size,
        currentModel: this.currentModelId
      })
    } catch (error) {
      console.error('❌ [Live2DModelManager] 移除模型失败:', error)
      throw error
    }
  }

  /**
   * 重新定位所有模型
   */
  repositionModels() {
    let index = 0
    this.models.forEach((heroModel, modelId) => {
      if (heroModel.model) {
        // 获取存储的位置或计算新位置
        let position = this.modelPositions.get(modelId)
        if (!position) {
          const offsetX = (index % 3) * 200
          const offsetY = Math.floor(index / 3) * 150
          position = {
            x: this.coreManager.app.screen.width / 2.5 + offsetX,
            y: this.coreManager.app.screen.height / 2 + offsetY
          }
          this.modelPositions.set(modelId, position)
        }
        heroModel.model.position.set(position.x, position.y)
        index++
      }
    })
  }

  // === 查询方法 ===

  /**
   * 获取模型
   */
  getModel(modelId) {
    return this.models.get(modelId)
  }

  /**
   * 检查模型是否存在
   */
  hasModel(modelId) {
    return this.models.has(modelId)
  }

  /**
   * 获取所有模型
   */
  getAllModels() {
    return Array.from(this.models.values())
  }

  /**
   * 获取所有模型ID
   */
  getAllModelIds() {
    return Array.from(this.models.keys())
  }

  /**
   * 根据模型实例获取模型ID
   * @param {HeroModel} heroModel - 模型实例
   * @returns {string|null} 模型ID
   */
  getModelId(heroModel) {
    for (const [modelId, model] of this.models.entries()) {
      if (model === heroModel) {
        return modelId
      }
    }
    return null
  }

  /**
   * 获取当前活跃模型
   */
  getCurrentModel() {
    if (!this.currentModelId || !this.models.has(this.currentModelId)) {
      return null
    }
    return this.models.get(this.currentModelId)
  }

  /**
   * 设置当前活跃模型
   */
  setCurrentModel(modelId) {
    if (this.hasModel(modelId)) {
      this.currentModelId = modelId
      console.log('🎯 [Live2DModelManager] 设置当前模型:', modelId)
    } else {
      console.warn('⚠️ [Live2DModelManager] 模型不存在:', modelId)
    }
  }

  /**
   * 获取第一个可用模型
   */
  getFirstAvailableModel() {
    const modelIds = Array.from(this.models.keys())
    if (modelIds.length === 0) return null
    return this.models.get(modelIds[0])
  }

  /**
   * 获取模型数量
   */
  getModelCount() {
    return this.models.size
  }

  /**
   * 清理所有模型
   */
  clear() {
    this.models.forEach((_, modelId) => {
      this.removeModel(modelId)
    })
    this.models.clear()
    this.modelPositions.clear()
    this.currentModelId = null
  }

  /**
   * 更新缩放设置
   * @param {Object} settings - 缩放设置对象
   * @param {number} settings.minScale - 最小缩放值（已废弃，不再使用）
   * @param {number} settings.maxScale - 最大缩放值（已废弃，不再使用）
   * @param {number} settings.zoomSpeed - 缩放步长
   */
  updateZoomSettings(settings) {
    if (!settings) return

    try {
      // 更新交互管理器的缩放设置
      if (this.coreManager.interactionManager) {
        this.coreManager.interactionManager.updateZoomSettings(settings)
      }

      console.log('⚙️ [Live2DModelManager] 缩放设置已更新:', settings)
    } catch (error) {
      console.error('❌ [Live2DModelManager] 更新缩放设置失败:', error)
    }
  }

  /**
   * 获取当前缩放设置
   * @returns {Object} 当前缩放设置
   */
  getZoomSettings() {
    if (this.coreManager.interactionManager) {
      return this.coreManager.interactionManager.getZoomSettings()
    }
    return null
  }
}
