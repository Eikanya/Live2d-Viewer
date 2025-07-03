/**
 * Live2D Model Manager - 模型管理器
 * 负责模型的加载、移除、查找和生命周期管理
 */

import { HeroModel } from './hero-model.js'
import { createLogger } from './utils.js'

export class Live2DModelManager {
  constructor(coreManager) {
    this.coreManager = coreManager
    this.models = new Map()
    this.currentModelId = null
    this.isPetMode = false
    this.petModeScale = 0.4  // 默认桌宠模式缩放比例
    this.logger = createLogger('Live2DModelManager')
  }

  /**
   * 设置桌宠模式
   * @param {boolean} enabled - 是否启用桌宠模式
   */
  setPetMode(enabled) {
    this.isPetMode = enabled
    this.logger.log(`🐾 桌宠模式${enabled ? '已启用' : '已禁用'}`)

    if (this.coreManager.interactionManager) {
      this.coreManager.interactionManager.setDesktopMode(enabled)
    }

    if (enabled) {
      // 在桌宠模式下，模型位置和缩放由 interactionManager 处理
      this.models.forEach((model) => {
        if (model.model) {
          model.setScale(this.petModeScale) // 应用桌宠模式缩放
          model.setAnchor(0.5) // 确保锚点正确
        }
      })
      // 立即更新桌面模式布局
      if (this.coreManager.interactionManager) {
        this.coreManager.interactionManager.updateDesktopModeLayout()
      }
    } else {
      // 恢复原始位置和大小（居中）
      this.repositionModels()
    }
  }

  /**
   * 设置桌宠模式缩放比例
   * @param {number} scale - 缩放比例
   */
  setPetModeScale(scale) {
    if (scale < 0.1 || scale > 2.0) {
      this.logger.warn('⚠️ 缩放比例超出范围 (0.1-2.0):', scale)
      return
    }
    this.petModeScale = scale
    this.logger.log('📏 设置桌宠模式缩放比例:', scale)

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

      this.logger.log('✅ 模型加载成功:', modelId)
      return heroModel
    } catch (error) {
      this.logger.error('❌ 模型加载失败:', error)

      // 清理失败的模型实例
      if (heroModel) {
        try {
          heroModel.destroy()
        } catch (cleanupError) {
          this.logger.error('❌ 清理失败模型时出错:', cleanupError)
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
      this.logger.log('🔄 刷新模型:', modelId)

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
      // 刷新模型后，根据当前模式重新应用布局
      if (this.isPetMode && this.coreManager.interactionManager) {
        this.coreManager.interactionManager.updateDesktopModeLayout()
      } else if (newModel.model) {
        // 恢复位置和设置
        if (savedPosition) {
          newModel.model.position.set(savedPosition.x, savedPosition.y)
        } else {
          // 默认居中
          newModel.model.position.set(
            this.coreManager.app.screen.width / 2,
            this.coreManager.app.screen.height / 2
          )
        }
      }

      if (savedSettings) {
        newModel.setScale(savedSettings.scale.x)
        newModel.setAngle(savedSettings.angle)
        newModel.setAlpha(savedSettings.alpha)
      }

      return newModel
    } catch (error) {
      this.logger.error('❌ 模型刷新失败:', error)
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
      this.logger.warn('⚠️ 无法添加模型到场景:', modelId)
      return
    }

    // 添加到模型容器
    this.coreManager.modelContainer.addChild(heroModel.model)

    // 确保模型可见性
    heroModel.model.visible = true
    heroModel.model.alpha = 1.0

    // 应用模型布局（位置和缩放）
    this._applyModelLayout(heroModel)

    this.logger.log('✅ 模型已添加到场景:', modelId, {
      position: heroModel.model.position,
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
  /**
   * 应用模型布局（位置和缩放）
   * @param {HeroModel} heroModel - HeroModel 实例
   * @private
   */
  _applyModelLayout(heroModel) {
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
    
    // 根据模式设置模型位置
    if (this.isPetMode && this.coreManager.interactionManager) {
      // 在桌宠模式下，位置由 interactionManager 处理
      const desktopPosition = this.coreManager.interactionManager.calculateDesktopPosition(heroModel.id)
      heroModel.model.position.set(desktopPosition.x, desktopPosition.y)
    } else {
      // 非桌宠模式下，模型居中
      heroModel.model.position.set(position.x, position.y)
    }
  }

  /**
   * 移除模型
   * @param {string} modelId - 模型ID
   */
  removeModel(modelId) {
    const heroModel = this.models.get(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 尝试移除不存在的模型:', modelId)
      return
    }

    this.logger.log('🗑️ 移除模型:', modelId)

    try {
      // 1. 清理交互事件监听器（如果交互管理器存在）
      if (this.coreManager.interactionManager) {
        try {
          this.coreManager.interactionManager.cleanupModelEventListeners(modelId)
          this.logger.log('🧹 已清理模型交互事件:', modelId)
        } catch (error) {
          this.logger.error('❌ 清理交互事件失败:', modelId, error)
        }
      }

      // 2. 使用 HeroModel 的 destroy 方法销毁模型
      heroModel.destroy()


      // 4. 从映射中删除
      this.models.delete(modelId)

      // 5. 如果移除的是当前模型，选择新的当前模型
      if (this.currentModelId === modelId) {
        const remainingIds = Array.from(this.models.keys())
        this.currentModelId = remainingIds.length > 0 ? remainingIds[0] : null
        this.logger.log('🎯 当前模型已移除，新当前模型:', this.currentModelId)
      }

      this.logger.log('✅ 模型移除完成:', modelId, {
        remainingModels: this.models.size,
        currentModel: this.currentModelId
      })
    } catch (error) {
      this.logger.error('❌ 移除模型失败:', error)
      throw error
    }
  }

  /**
   * 重新定位所有模型
   */
  repositionModels() {
    // 在非桌宠模式下，模型应始终居中
    // 在桌宠模式下，由 interactionManager 处理位置
    this.models.forEach((heroModel) => {
      if (heroModel.model) {
        heroModel.model.position.set(
          this.coreManager.app.screen.width / 2,
          this.coreManager.app.screen.height / 2
        )
      }
    })
    // 如果是桌宠模式，重新触发布局更新
    if (this.isPetMode && this.coreManager.interactionManager) {
      this.coreManager.interactionManager.updateDesktopModeLayout()
    }
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
      this.logger.log('🎯 设置当前模型:', modelId)
    } else {
      this.logger.warn('⚠️ 模型不存在:', modelId)
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
    this.currentModelId = null
  }
}
