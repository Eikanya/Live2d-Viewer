/**
 * Live2D 交互管理器
 * 统一管理模型交互事件
 */

import { globalResourceManager } from '../resource-manager.js'

export class Live2DInteractionManager {
  constructor(coreManager, modelManager) {
    this.coreManager = coreManager
    this.modelManager = modelManager
    
    // 交互配置
    this.isEnabled = true
    this.isDesktopMode = false
    this.zoomSettings = {
      enabled: true,
      minScale: 0.01,
      maxScale: 2.0,
      step: 0.01
    }
    
    // 事件状态
    this.isDragging = false
    this.dragStartPos = { x: 0, y: 0 }
    this.dragStartModelPos = { x: 0, y: 0 }
    this.clickThreshold = 5 // 点击判定阈值（像素）
    
    // 鼠标跟踪状态
    this.mousePosition = { x: 0, y: 0 }
    this.hoveredModel = null
    
    // 使用ResourceManager统一管理事件监听器
    this.modelEventListeners = new Map()
    this.globalEventListeners = new Map()
    
    // 点击区域配置
    this.clickAreas = new Map() // 存储每个模型的点击区域配置
    
    // 调试模式
    this.debugMode = window.DEBUG_LIVE2D || false
    
    // 初始化
    this.initialize()
  }

  /**
   * 初始化交互管理器
   */
  initialize() {
    try {
      // 设置舞台为可交互
      this.coreManager.app.stage.interactive = true
      this.coreManager.app.stage.cursor = 'pointer'

      // 绑定全局事件监听器
      this.bindGlobalEventListeners()
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 初始化失败:', error)
    }
  }

  /**
   * 绑定全局事件监听器
   */
  bindGlobalEventListeners() {
    // 窗口大小变化监听
    const resizeHandler = () => {
      if (this.isDesktopMode) {
        this.updateDesktopModeLayout()
      }
    }
    
    globalResourceManager.registerGlobalEventListener(
      'interaction-resize', 
      'resize', 
      resizeHandler
    )

    // 滚轮缩放监听器现在由 setWheelZoomEnabled 方法统一管理
    // 根据当前设置决定是否启用
    if (this.zoomSettings.enabled) {
      this.setWheelZoomEnabled(true)
    }
  }

  /**
   * 处理滚轮缩放事件
   * @param {WheelEvent} event - 滚轮事件
   */
  handleWheelZoom(event) {
    if (!this.zoomSettings.enabled) return

    try {
      // 更新鼠标位置
      this.mousePosition.x = event.clientX
      this.mousePosition.y = event.clientY
      
      // 使用当前悬停的模型进行缩放
      if (this.hoveredModel) {
        const modelId = this.modelManager.getModelId(this.hoveredModel)
        if (!modelId) return
        
        // 获取当前缩放值
        const currentScale = this.hoveredModel.getScale().x
        
        // 计算缩放方向
        const delta = event.deltaY > 0 ? -1 : 1
        
        // 计算新缩放值
        let newScale = currentScale + (delta * this.zoomSettings.step)
        
        // 限制最低缩放为0
        newScale = Math.max(0, newScale)
        
        // 应用缩放
        this.hoveredModel.setScale(newScale, newScale)
        return
      }
      
      // 如果没有悬停的模型，尝试使用PIXI的getObjectsUnderPoint
      const mousePoint = new window.PIXI.Point(this.mousePosition.x, this.mousePosition.y)
      
      if (this.coreManager.app.renderer && this.coreManager.app.renderer.getObjectsUnderPoint) {
        try {
          const objects = this.coreManager.app.renderer.getObjectsUnderPoint(mousePoint)
          if (objects && objects.length > 0) {
            // 找到最上层的模型对象
            for (const obj of objects) {
              const models = this.modelManager.getAllModels()
              for (const model of models) {
                if (model.model && (model.model === obj || model.model.children.includes(obj))) {
                  const modelId = this.modelManager.getModelId(model)
                  
                  // 获取当前缩放值
                  const currentScale = model.getScale().x
                  
                  // 计算缩放方向
                  const delta = event.deltaY > 0 ? -1 : 1
                  
                  // 计算新缩放值
                  let newScale = currentScale + (delta * this.zoomSettings.step)
                  
                  // 限制最低缩放为0
                  newScale = Math.max(0, newScale)
                  
                  // 应用缩放
                  model.setScale(newScale, newScale)
                  return
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ [Live2DInteractionManager] getObjectsUnderPoint失败:', error)
        }
      }
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 处理滚轮缩放失败:', error)
    }
  }

  /**
   * 设置桌宠模式
   * @param {boolean} enabled - 是否启用桌宠模式
   */
  setDesktopMode(enabled) {
    this.isDesktopMode = enabled
    
    if (enabled) {
      this.updateDesktopModeLayout()
    }
  }

  /**
   * 更新桌宠模式布局
   */
  updateDesktopModeLayout() {
    if (!this.isDesktopMode) return

    const models = this.modelManager.getAllModels()
    models.forEach(model => {
      // 桌宠模式下的布局逻辑
      const position = this.calculateDesktopPosition(model.id)
      this.setModelPosition(model.id, position.x, position.y)
    })
  }

  /**
   * 计算桌宠模式位置
   * @param {string} modelId - 模型ID
   * @returns {Object} 位置坐标
   */
  calculateDesktopPosition(modelId) {
    // 简单的桌宠模式位置计算
    const index = Array.from(this.modelManager.getAllModels().keys()).indexOf(modelId)
    const spacing = 100
    return {
      x: 50 + index * spacing,
      y: window.innerHeight - 200
    }
  }

  /**
   * 设置模型位置
   * @param {string} modelId - 模型ID
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  setModelPosition(modelId, x, y) {
    const model = this.modelManager.getModel(modelId)
    if (!model) return

    model.setPosition(x, y)
  }

  /**
   * 获取模型位置
   * @param {string} modelId - 模型ID
   * @returns {Object} 位置坐标
   */
  getModelPosition(modelId) {
    const model = this.modelManager.getModel(modelId)
    if (!model) return { x: 0, y: 0 }

    return model.getPosition()
  }

  /**
   * 绑定模型交互事件
   * @param {string} modelId - 模型ID
   * @param {Object} model - 模型实例
   */
  bindModelInteractionEvents(modelId, model) {
    if (!model || !model.model) {
      console.warn('⚠️ [Live2DInteractionManager] 模型无效，无法绑定交互事件:', modelId)
      return
    }

    const pixiModel = model.model

    // 设置模型为可交互
    pixiModel.interactive = true
    // PIXI 7.x: 使用cursor替代buttonMode
    pixiModel.cursor = 'pointer'

    // 指针按下事件
    const pointerDownHandler = (event) => {
      this.handlePointerDown(modelId, event)
    }

    // 指针移动事件
    const pointerMoveHandler = (event) => {
      this.handlePointerMove(modelId, event)
    }

    // 指针抬起事件
    const pointerUpHandler = (event) => {
      this.handlePointerUp(modelId, event)
    }

    // 鼠标进入事件
    const pointerOverHandler = (event) => {
      this.hoveredModel = model
    }

    // 鼠标离开事件
    const pointerOutHandler = (event) => {
      if (this.hoveredModel === model) {
        this.hoveredModel = null
      }
    }

    // 注册事件监听器到ResourceManager
    globalResourceManager.registerModelEventListener(modelId, 'pointerdown', pointerDownHandler)
    globalResourceManager.registerModelEventListener(modelId, 'pointermove', pointerMoveHandler)
    globalResourceManager.registerModelEventListener(modelId, 'pointerup', pointerUpHandler)
    globalResourceManager.registerModelEventListener(modelId, 'pointerover', pointerOverHandler)
    globalResourceManager.registerModelEventListener(modelId, 'pointerout', pointerOutHandler)

    // 绑定到PIXI模型
    pixiModel.on('pointerdown', pointerDownHandler)
    pixiModel.on('pointermove', pointerMoveHandler)
    pixiModel.on('pointerup', pointerUpHandler)
    pixiModel.on('pointerover', pointerOverHandler)
    pixiModel.on('pointerout', pointerOutHandler)
  }

  /**
   * 向后兼容的绑定模型交互方法
   * @param {Object} model - 模型实例
   * @param {string} modelId - 模型ID
   * @deprecated 使用 bindModelInteractionEvents(modelId, model) 替代
   */
  bindModelInteraction(model, modelId) {
    console.warn('⚠️ [Live2DInteractionManager] bindModelInteraction已废弃，请使用bindModelInteractionEvents')
    return this.bindModelInteractionEvents(modelId, model)
  }

  /**
   * 处理指针按下事件
   * @param {string} modelId - 模型ID
   * @param {Object} event - 事件对象
   */
  handlePointerDown(modelId, event) {
    const model = this.modelManager.getModel(modelId)
    if (!model) return

    this.isDragging = true
    this.dragStartPos = { x: event.data.global.x, y: event.data.global.y }
    this.dragStartModelPos = model.getPosition()
  }

  /**
   * 处理指针移动事件
   * @param {string} modelId - 模型ID
   * @param {Object} event - 事件对象
   */
  handlePointerMove(modelId, event) {
    if (!this.isDragging) return

    const model = this.modelManager.getModel(modelId)
    if (!model) return

    const currentPos = { x: event.data.global.x, y: event.data.global.y }
    const deltaX = currentPos.x - this.dragStartPos.x
    const deltaY = currentPos.y - this.dragStartPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 如果移动距离超过阈值，开始拖拽
    if (distance > this.clickThreshold && !this.isDragging) {
      this.isDragging = true
    }

    if (this.isDragging) {
      const newX = this.dragStartModelPos.x + deltaX
      const newY = this.dragStartModelPos.y + deltaY
      model.setPosition(newX, newY)
    }
  }

  /**
   * 处理指针抬起事件
   * @param {string} modelId - 模型ID
   * @param {Object} event - 事件对象
   */
  handlePointerUp(modelId, event) {
    const model = this.modelManager.getModel(modelId)
    if (!model) return

    const currentPos = { x: event.data.global.x, y: event.data.global.y }
    const deltaX = currentPos.x - this.dragStartPos.x
    const deltaY = currentPos.y - this.dragStartPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 如果移动距离小于阈值，判定为点击
    if (distance < this.clickThreshold) {
      this.handleModelClick(modelId, event)
    }

    if (this.isDragging) {
      this.isDragging = false
    }
  }

  /**
   * 处理模型点击
   * @param {string} modelId - 模型ID
   * @param {Object} event - 事件对象
   */
  handleModelClick(modelId, event) {
    const model = this.modelManager.getModel(modelId)
    if (!model) {
      console.warn('⚠️ [Live2DInteractionManager] 模型未找到:', modelId)
      return
    }

    // 获取点击坐标
    const globalPos = event.data.global

    // 转换为模型本地坐标
    const localPos = this.convertToModelCoordinates(model, globalPos)

    // 检查点击区域
    const hitArea = this.getHitArea(model, localPos)
    if (hitArea) {
      this.playHitAreaMotion(model, hitArea)
    } else {
      this.playRandomMotion(model)
    }
  }

  /**
   * 转换坐标到模型本地坐标系
   * @param {Object} model - 模型实例
   * @param {Object} globalPos - 全局坐标
   * @returns {Object} 本地坐标
   */
  convertToModelCoordinates(model, globalPos) {
    try {
      const globalPoint = new window.PIXI.Point(globalPos.x, globalPos.y)
      const localPoint = model.model.toLocal(globalPoint)
      
      return {
        x: localPoint.x,
        y: localPoint.y
      }
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 坐标转换失败:', error)
      return globalPos
    }
  }

  /**
   * 获取点击区域
   * @param {Object} model - 模型实例
   * @param {Object} localPos - 本地坐标
   * @returns {Object|null} 点击区域信息
   */
  getHitArea(model, localPos) {
    try {
      const hitAreas = this.clickAreas.get(model.id) || []
      
      for (const area of hitAreas) {
        if (this.isPointInArea(localPos, area)) {
          return area
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 获取命中区域失败:', error)
      return null
    }
  }

  /**
   * 检查点是否在区域内
   * @param {Object} point - 点坐标
   * @param {Object} area - 区域信息
   * @returns {boolean} 是否在区域内
   */
  isPointInArea(point, area) {
    try {
      return point.x >= area.x && 
             point.x <= area.x + area.width && 
             point.y >= area.y && 
             point.y <= area.y + area.height
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 区域判断失败:', error)
      return false
    }
  }

  /**
   * 播放点击区域动作
   * @param {Object} model - 模型实例
   * @param {Object} hitArea - 点击区域
   */
  playHitAreaMotion(model, hitArea) {
    if (!hitArea.motion) return

    try {
      const [group, index] = hitArea.motion.split('_')
      model.playMotion(group, parseInt(index))
    } catch (error) {
      this.playRandomMotion(model)
    }
  }

  /**
   * 播放随机动作
   * @param {Object} model - 模型实例
   */
  playRandomMotion(model) {
    try {
      model.playRandomMotion()
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 播放随机动作失败:', error)
    }
  }

  /**
   * 设置模型点击区域
   * @param {string} modelId - 模型ID
   * @param {Array} hitAreas - 点击区域配置
   */
  setModelClickAreas(modelId, hitAreas) {
    this.clickAreas.set(modelId, hitAreas || [])
  }

  /**
   * 清除模型点击区域
   * @param {string} modelId - 模型ID
   */
  clearModelClickAreas(modelId) {
    this.clickAreas.delete(modelId)
  }

  /**
   * 清理模型事件监听器
   * @param {string} modelId - 模型ID
   */
  cleanupModelEventListeners(modelId) {
    const model = this.modelManager.getModel(modelId)
    if (!model || !model.model) {
      return
    }

    try {
      // 移除PIXI事件监听器
      model.model.off('pointerdown')
      model.model.off('pointermove')
      model.model.off('pointerup')
      model.model.off('pointerover')
      model.model.off('pointerout')

      // 清理悬停状态
      if (this.hoveredModel === model) {
        this.hoveredModel = null
      }

      // 从ResourceManager清理
      globalResourceManager.cleanupResource('modelEventListener', modelId)
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 清理模型事件监听器失败:', modelId, error)
    }
  }

  /**
   * 清理所有事件监听器
   */
  cleanupAllEventListeners() {
    try {
      // 清理模型事件监听器
      const modelIds = Array.from(this.modelEventListeners.keys())
      modelIds.forEach(modelId => {
        this.cleanupModelEventListeners(modelId)
      })

      // 清理全局事件监听器
      globalResourceManager.cleanupResource('globalEventListener', 'interaction-resize')
      
      // 清理滚轮事件监听器
      globalResourceManager.cleanupResource('globalEventListener', 'interaction-wheel')
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 清理事件监听器失败:', error)
    }
  }

  /**
   * 销毁交互管理器
   */
  destroy() {
    try {
      // 清理所有事件监听器
      this.cleanupAllEventListeners()

      // 清理点击区域
      this.clickAreas.clear()

      // 重置状态
      this.isDragging = false
      this.dragStartPos = { x: 0, y: 0 }
      this.dragStartModelPos = { x: 0, y: 0 }
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 销毁交互管理器失败:', error)
    }
  }

  /**
   * 设置滚轮缩放启用状态
   * @param {boolean} enabled - 是否启用
   */
  setWheelZoomEnabled(enabled) {
    this.zoomSettings.enabled = enabled
    
    // 获取canvas元素
    const canvas = this.coreManager?.app?.view
    if (!canvas) {
      console.warn('⚠️ [Live2DInteractionManager] 未找到canvas，无法绑定滚轮缩放')
      return
    }

    if (enabled) {
      // 只在canvas上监听滚轮事件
      const wheelHandler = (event) => {
        event.preventDefault()
        this.handleWheelZoom(event)
      }
      // 先解绑，防止重复
      canvas.removeEventListener('wheel', this._canvasWheelHandler)
      canvas.addEventListener('wheel', wheelHandler, { passive: false })
      this._canvasWheelHandler = wheelHandler
    } else {
      // 解绑canvas上的滚轮事件
      if (this._canvasWheelHandler) {
        canvas.removeEventListener('wheel', this._canvasWheelHandler)
        this._canvasWheelHandler = null
      }
    }
  }

  /**
   * 设置交互功能启用状态
   * @param {boolean} enabled - 是否启用
   */
  setInteractionEnabled(enabled) {
    this.isEnabled = enabled
    
    // 更新所有模型的交互状态
    const models = this.modelManager.getAllModels()
    models.forEach(model => {
      if (model.model) {
        model.model.interactive = enabled
        model.model.cursor = enabled ? 'pointer' : null
      }
    })
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
      // 只更新缩放步长，不再应用最小和最大值限制
      if (settings.zoomSpeed !== undefined) {
        this.zoomSettings.step = Math.max(0.001, Math.min(0.1, settings.zoomSpeed))
      }
    } catch (error) {
      console.error('❌ [Live2DInteractionManager] 更新缩放设置失败:', error)
    }
  }

  /**
   * 获取当前缩放设置
   * @returns {Object} 当前缩放设置
   */
  getZoomSettings() {
    return { ...this.zoomSettings }
  }
}

// 页面卸载时的全局清理已由 state-sync-manager.js 统一处理
// 移除重复的 beforeunload 事件监听器