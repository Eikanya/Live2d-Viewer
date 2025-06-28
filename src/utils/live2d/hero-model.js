/**
 * HeroModel 类
 * 封装 Live2D 模型的加载、控制和信息获取
 */

import { waitForLive2D } from './utils.js'

// 高阶函数：统一空值检查
const withModelCheck = (method, operationName = '操作') => {
  return function(...args) {
    if (!this.model) {
      this.log('warn', `⚠️ [HeroModel] 模型未加载，无法${operationName}`)
      return false
    }
    if (!this.model.internalModel && operationName.includes('参数')) {
      this.log('warn', `⚠️ [HeroModel] 内部模型未准备好，无法${operationName}`)
      return false
    }
    return method.apply(this, args)
  }
}

// 高阶函数：统一错误处理
const withErrorHandling = (method, operationName = '操作') => {
  return async function(...args) {
    try {
      return await method.apply(this, args)
    } catch (error) {
      this.log('error', `❌ [HeroModel] ${operationName}失败:`, error)
      return false
    }
  }
}

// 统一参数操作工具
const ParameterUtils = {
  // 设置参数值
  setParameterValue(model, paramId, value, parametersValues) {
    if (!model?.internalModel?.coreModel) return false
    
    try {
      model.internalModel.coreModel.setParameterValueById(paramId, value)
      
      // 同步更新内部存储
      const paramIndex = parametersValues.parameter?.findIndex(param => param.parameterIds === paramId)
      if (paramIndex !== -1) {
        parametersValues.parameter[paramIndex].defaultValue = value
      }
      return true
    } catch (error) {
      console.error('设置参数失败:', error)
      return false
    }
  },

  // 设置部件不透明度
  setPartOpacity(model, partId, value, parametersValues) {
    if (!model?.internalModel?.coreModel) return false
    
    try {
      model.internalModel.coreModel.setPartOpacityById(partId, value)
      
      // 同步更新内部存储
      const partIndex = parametersValues.partOpacity?.findIndex(part => part.partId === partId)
      if (partIndex !== -1) {
        parametersValues.partOpacity[partIndex].defaultValue = value
      }
      return true
    } catch (error) {
      console.error('设置部件不透明度失败:', error)
      return false
    }
  }
}

export class HeroModel {
  constructor(id, model) {
    this.id = id
    this.model = model
    this._destroyed = false
    this.debugMode = process.env.NODE_ENV === 'development'
    
    // 模型相关属性
    this.modelName = ''
    this.costume = ''
    this._modelsetting = null
    this.modelsetting = null
    
    // 缓存数据
    this.cachedExpressions = []
    this.cachedMotions = {}
    this.parametersValues = {}
    
    // 前景对象
    this.foreground = null
  }

  /**
   * 日志记录方法
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  log(level, message, ...args) {
    if (!this.debugMode) return

    const prefix = `[HeroModel:${this.id}]`
    const timestamp = new Date().toISOString()

    switch (level) {
      case 'error':
        console.error(`${timestamp} ${prefix} ${message}`, ...args)
        break
      case 'warn':
        console.warn(`${timestamp} ${prefix} ${message}`, ...args)
        break
      case 'debug':
        console.debug(`${timestamp} ${prefix} ${message}`, ...args)
        break
      default:
        console.log(`${timestamp} ${prefix} ${message}`, ...args)
    }
  }

  /**
   * 异步创建并加载 Live2D 模型
   * @param {string} src - 模型设置文件的URL或路径
   */
  async create(src) {
    try {
      // 等待本地 PIXI Live2D 库完全加载
      await waitForLive2D()

      this.log('log', '🔄 [HeroModel] 开始创建模型:', src)

      // 获取模型设置 JSON 文件
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`模型设置文件加载失败: ${response.status} ${response.statusText}`)
      }
      
      const settingsJSON = await response.json()
      settingsJSON.url = src

      this.log('log', '📄 [HeroModel] 原始设置 JSON:', settingsJSON)

      // 使用 PIXI Live2D 创建模型设置实例
      if (!window.PIXI.live2d.Cubism4ModelSettings) {
        throw new Error('❌ 本地 Cubism4ModelSettings 未加载，请检查 /libs/cubism4.min.js')
      }
      this._modelsetting = new window.PIXI.live2d.Cubism4ModelSettings(settingsJSON)

      // 使用 PIXI Live2D 创建模型
      if (!window.PIXI.live2d.Live2DModel) {
        throw new Error('❌ 本地 Live2DModel 未加载，请检查 /libs/cubism4.min.js')
      }

      // 创建模型并等待加载完成
      this.model = await window.PIXI.live2d.Live2DModel.from(settingsJSON)
      
      // 验证模型实例
      if (!this.model) {
        throw new Error('模型创建失败：模型实例为空')
      }

      // 保存原始设置 JSON
      this.modelsetting = settingsJSON

      // 设置初始位置和缩放
      this.model.position.set(0, 0)
      this.model.scale.set(0.2) // 使用您设置的默认缩放值

      // 等待模型完全加载后初始化参数
      if (this.model.internalModel) {
        this.initializeParameters()
      } else {
        // 监听模型准备就绪事件
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('模型初始化超时'))
          }, 30000)

          this.model.once('ready', () => {
            clearTimeout(timeout)
            this.log('log', '📢 [HeroModel] 模型ready事件触发，初始化参数')
            this.initializeParameters()
            resolve()
          })

          this.model.once('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        })
      }

      // 立即缓存表情和动作数据
      this.cacheModelData()

      return this
    } catch (error) {
      this.log('error', '❌ [HeroModel] 创建失败:', error)
      
      // 清理资源
      if (this.model) {
        try {
          this.model.removeAllListeners()
          this.model.destroy({ children: true, texture: true, baseTexture: true })
        } catch (cleanupError) {
          this.log('error', '❌ [HeroModel] 清理失败模型时出错:', cleanupError)
        }
      }
      
      throw error
    }
  }

  /**
   * 缓存模型数据（表情、动作等）
   */
  cacheModelData() {
    // 缓存表情数据
    this.cachedExpressions = this._modelsetting.expressions || []

    // 缓存动作数据
    this.cachedMotions = this._modelsetting.motions || {}
  }

  /**
   * 初始化参数值存储
   */
  initializeParameters() {
    if (!this.model) {
      this.log('warn', '⚠️ [HeroModel] 模型未加载，无法初始化参数')
      return
    }

    if (!this.model.internalModel) {
      this.log('warn', '⚠️ [HeroModel] 内部模型未准备好，监听ready事件...')
      // 监听模型准备就绪事件
      this.model.once('ready', () => {
        this.log('log', '📢 [HeroModel] 模型已准备就绪，重新初始化参数')
        this.initializeParameters()
      })
      return
    }

    this.parametersValues = {}

    // 初始化呼吸参数 - 使用公共API
    if (this.model.internalModel.breath) {
      try {
        // 使用getParameters()方法获取呼吸参数
        const breathParams = this.model.internalModel.breath.getParameters()
        this.parametersValues.breath = breathParams ? [...breathParams] : []
      } catch (error) {
        this.log('warn', '⚠️ [HeroModel] 获取呼吸参数失败:', error)
        this.parametersValues.breath = []
      }
    }

    // 初始化眨眼参数 - 使用公共API
    if (this.model.internalModel.eyeBlink) {
      try {
        // 使用getParameterIds()方法获取眨眼参数
        const eyeBlinkParams = this.model.internalModel.eyeBlink.getParameterIds()
        this.parametersValues.eyeBlink = eyeBlinkParams ? [...eyeBlinkParams] : []
      } catch (error) {
        this.log('warn', '⚠️ [HeroModel] 获取眨眼参数失败:', error)
        this.parametersValues.eyeBlink = []
      }
    }

    // 初始化所有参数的默认值、最大值和最小值
    this.parametersValues.parameter = []
    if (this.model.internalModel.coreModel) {
      const coreModel = this.model.internalModel.coreModel

      try {
        // 使用公共API获取参数信息
        const parameterCount = coreModel.getParameterCount()
        for (let i = 0; i < parameterCount; i++) {
          // 注意：Cubism4.js没有getParameterId方法，我们需要使用其他方式获取参数ID
          // 这里我们使用一个安全的方法来获取参数信息
          const parameter = {
            parameterIds: `param_${i}`, // 临时ID，实际使用时需要从模型设置中获取
            max: coreModel.getParameterMaximumValue(i),
            min: coreModel.getParameterMinimumValue(i),
            defaultValue: coreModel.getParameterDefaultValue(i)
          }
          this.parametersValues.parameter.push(parameter)
        }
      } catch (error) {
        this.log('warn', '⚠️ [HeroModel] 获取参数信息失败:', error)
      }
    }

    // 初始化所有部件的默认不透明度
    this.parametersValues.partOpacity = []
    if (this.model.internalModel.coreModel) {
      const coreModel = this.model.internalModel.coreModel

      try {
        // 使用公共API获取部件信息
        const partCount = coreModel.getPartCount()
        for (let i = 0; i < partCount; i++) {
          const partId = coreModel.getPartId(i)
          const part = {
            partId: partId,
            defaultValue: coreModel.getPartOpacityByIndex(i)
          }
          this.parametersValues.partOpacity.push(part)
        }
      } catch (error) {
        this.log('warn', '⚠️ [HeroModel] 获取部件信息失败:', error)
      }
    }
  }

  /**
   * 设置模型名称和服装名称
   * @param {string} char - 角色名称
   * @param {string} cost - 服装名称
   */
  setName(char, cost) {
    this.modelName = char
    this.costume = cost
  }

  // 使用高阶函数优化所有setter/getter方法
  setAnchor = withModelCheck(function(x, y) {
    this.model.anchor.set(x, y)
  }, '设置锚点')

  getAnchor() {
    if (!this.model) return { x: 0.5, y: 0.5 }
    return { x: this.model.anchor.x, y: this.model.anchor.y }
  }

  setScale = withModelCheck(function(val) {
    this.model.scale.set(val)
  }, '设置缩放')

  getScale() {
    if (!this.model) return { x: 1, y: 1 }
    return { x: this.model.scale.x, y: this.model.scale.y }
  }

  setVisible = withModelCheck(function(val) {
    this.model.visible = val
  }, '设置可见性')

  getVisible() {
    if (!this.model) return false
    return this.model.visible
  }

  setAngle = withModelCheck(function(val) {
    this.model.angle = val
  }, '设置角度')

  getAngle() {
    if (!this.model) return 0
    return this.model.angle
  }

  setAlpha = withModelCheck(function(val) {
    this.model.alpha = val
  }, '设置透明度')

  getAlpha() {
    if (!this.model) return 1
    return this.model.alpha
  }

  setPosition = withModelCheck(function(x, y) {
    this.model.position.set(x, y)
  }, '设置位置')

  getPosition() {
    if (!this.model) return { x: 0, y: 0 }
    return { x: this.model.position.x, y: this.model.position.y }
  }

  /**
   * 设置前景
   * @param {PIXI.Sprite} sprite - 前景精灵
   */
  setForeground(sprite) {
    if (!this.model) return
    this.foreground = sprite
    this.model.addChild(sprite)
  }

  /**
   * 设置呼吸动画 - 优化版本
   * @param {boolean} bool - 是否启用呼吸
   */
  setBreathing = withModelCheck(function(bool) {
    this.model.breathing = bool

    if (!this.model.internalModel?.breath) {
      this.log('warn', '⚠️ [HeroModel] 呼吸功能不可用')
      return
    }

    try {
      // 如果parametersValues.breath没有初始化，尝试从内部模型获取
      if (!this.parametersValues.breath) {
        const breathParams = this.model.internalModel.breath.getParameters()
        this.parametersValues.breath = breathParams ? [...breathParams] : []
      }

      // 使用setParameters方法设置呼吸参数
      if (bool && this.parametersValues.breath && this.parametersValues.breath.length > 0) {
        this.model.internalModel.breath.setParameters([...this.parametersValues.breath])
      } else {
        this.model.internalModel.breath.setParameters([])
      }
      
      this.log('log', `🫁 [HeroModel] 呼吸动画已${bool ? '启用' : '禁用'}`)
    } catch (error) {
      this.log('error', '❌ [HeroModel] 设置呼吸参数失败:', error)
    }
  }, '设置呼吸')

  /**
   * 设置眨眼动画 - 优化版本
   * @param {boolean} bool - 是否启用眨眼
   */
  setEyeBlinking = withModelCheck(function(bool) {
    this.model.eyeBlinking = bool
    if (!this.model.internalModel?.eyeBlink) {
      this.log('warn', '⚠️ [HeroModel] 眨眼功能不可用')
      return
    }

    try {
      // 如果parametersValues.eyeBlink没有初始化，尝试从内部模型获取
      if (!this.parametersValues.eyeBlink) {
        const eyeBlinkParams = this.model.internalModel.eyeBlink.getParameterIds()
        this.parametersValues.eyeBlink = eyeBlinkParams ? [...eyeBlinkParams] : []
      }

      // 使用setParameterIds方法设置眨眼参数
      if (bool && this.parametersValues.eyeBlink && this.parametersValues.eyeBlink.length > 0) {
        this.model.internalModel.eyeBlink.setParameterIds([...this.parametersValues.eyeBlink])
      } else {
        this.model.internalModel.eyeBlink.setParameterIds([])
      }
      
      this.log('log', `👁️ [HeroModel] 眨眼动画已${bool ? '启用' : '禁用'}`)
    } catch (error) {
      this.log('error', '❌ [HeroModel] 设置眨眼参数失败:', error)
    }
  }, '设置眨眼')

  /**
   * 设置交互性 - 优化版本
   * @param {boolean} bool - 是否可交互
   */
  setInteractive = withModelCheck(function(bool) {
    this.model.interactive = bool
    this.log('log', `🖱️ [HeroModel] 交互性已${bool ? '启用' : '禁用'}`)
  }, '设置交互性')

  /**
   * 设置视线跟随 - 优化版本
   * @param {boolean} bool - 是否跟随鼠标
   */
  setLookatMouse = withModelCheck(function(bool) {
    this.model.focusing = bool

    if (!bool) {
      // 重置视线到中心位置
      this.model.focus(this.model.x, this.model.y)
    }
  }, '设置视线跟随')

  /**
   * 播放表情 - 优化版本
   * @param {number} index - 表情索引
   * @returns {boolean} 是否成功播放
   */
  setExpression = withModelCheck(function(index) {
    try {
      if (!this.model.internalModel) {
        this.log('warn', '⚠️ [HeroModel] 内部模型未准备好')
        return false
      }

      const expressions = this.model.internalModel.settings.getExpressionDefinitions()
      if (!expressions || !expressions[index]) {
        this.log('warn', `⚠️ [HeroModel] 表情索引无效: ${index}`)
        return false
      }

      this.model.internalModel.expression(expressions[index].name)
      this.log('log', `😊 [HeroModel] 表情已播放: ${expressions[index].name}`)
      return true
    } catch (error) {
      this.log('error', '❌ [HeroModel] 播放表情失败:', error)
      return false
    }
  }, '播放表情')

  /**
   * 播放动作 - 优化版本
   * @param {string} group - 动作组名
   * @param {number} index - 动作索引
   * @returns {boolean} 是否成功播放
   */
  playMotion = withErrorHandling(withModelCheck(async function(group, index) {
    if (!this.model.internalModel) {
      this.log('warn', '⚠️ [HeroModel] 内部模型未准备好')
      return false
    }

    const motionManager = this.model.internalModel.motionManager
    if (!motionManager) {
      this.log('warn', '⚠️ [HeroModel] 动作管理器未准备好')
      return false
    }

    const success = await motionManager.startMotion(group, index)
    if (success) {
      this.log('log', `🎬 [HeroModel] 动作已播放: ${group}_${index}`)
    } else {
      this.log('warn', `⚠️ [HeroModel] 动作播放失败: ${group}_${index}`)
    }
    return success
  }, '播放动作'), '播放动作')

  /**
   * 保存当前模型状态
   * @returns {Object} 当前状态
   */
  saveCurrentState() {
    if (!this.model) return null
    
    const state = {
      scale: this.getScale(),
      angle: this.getAngle(),
      alpha: this.getAlpha(),
      position: {
        x: this.model.position.x,
        y: this.model.position.y
      }
    }

    // 保存参数状态
    if (this.parametersValues.parameter) {
      state.parameters = {}
      this.parametersValues.parameter.forEach(param => {
        if (this.model.internalModel) {
          state.parameters[param.parameterIds] = this.model.internalModel.coreModel.getParameterValueById(param.parameterIds)
        }
      })
    }

    // 保存部件不透明度状态
    if (this.parametersValues.partOpacity) {
      state.partOpacity = {}
      this.parametersValues.partOpacity.forEach(part => {
        if (this.model.internalModel) {
          state.partOpacity[part.partId] = this.model.internalModel.coreModel.getPartOpacityById(part.partId)
        }
      })
    }

    return state
  }

  /**
   * 还原模型状态
   * @param {Object} state - 要还原的状态
   */
  restoreState(state) {
    if (!state || !this.model) return

    try {
      // 还原基础属性
      if (state.scale) {
        this.setScale(state.scale.x)
      }
      if (state.angle !== undefined) {
        this.setAngle(state.angle)
      }
      if (state.alpha !== undefined) {
        this.setAlpha(state.alpha)
      }
      if (state.position) {
        this.model.position.set(state.position.x, state.position.y)
      }

      // 还原参数状态
      if (state.parameters) {
        Object.entries(state.parameters).forEach(([paramId, value]) => {
          this.setParameters(paramId, value)
        })
      }

      // 还原部件不透明度状态
      if (state.partOpacity) {
        Object.entries(state.partOpacity).forEach(([partId, value]) => {
          this.setPartOpacity(partId, value)
        })
      }

      this.log('log', '🔄 [HeroModel] 模型状态已还原')
    } catch (error) {
      this.log('error', '❌ [HeroModel] 还原状态失败:', error)
    }
  }

  /**
   * 安排状态还原
   * @param {Object} initialState - 初始状态
   * @param {string} group - 动作组
   * @param {number} index - 动作索引
   */
  scheduleStateRestore(initialState, group, index) {
    if (!initialState) return

    // 获取动作持续时间（从动作数据中获取）
    const motionGroup = this.cachedMotions[group]
    const motion = motionGroup ? motionGroup[index] : null
    const duration = motion?.Duration || 3000 // 默认3秒

    // 设置定时器，在动作结束后还原状态
    setTimeout(() => {
      // 检查是否还在播放同一个动作
      if (this.model && this.model.internalModel && this.model.internalModel.motionManager) {
        const motionManager = this.model.internalModel.motionManager
        // 使用MotionManager的公共API检查当前动作状态
        if (motionManager.state && motionManager.state.isActive(group, index)) {
          // 动作还在播放，继续等待
          this.scheduleStateRestore(initialState, group, index)
        } else {
          // 动作已结束，还原状态
          this.restoreState(initialState)
        }
      } else {
        // 无法检查状态，直接还原
        this.restoreState(initialState)
      }
    }, duration + 500) // 额外500ms缓冲时间
  }

  /**
   * 播放随机动作
   * @param {string} group - 动作组（可选）
   */
  playRandomMotion = withModelCheck(async function(group = null) {
    const availableGroups = Object.keys(this.cachedMotions)
    if (availableGroups.length === 0) {
      this.log('warn', '⚠️ [HeroModel] 没有可用的动作组')
      return false
    }

    // 选择动作组
    const targetGroup = group || availableGroups[Math.floor(Math.random() * availableGroups.length)]
    const motionGroup = this.cachedMotions[targetGroup]

    if (!motionGroup || motionGroup.length === 0) {
      this.log('warn', '⚠️ [HeroModel] 动作组为空:', targetGroup)
      return false
    }

    // 选择随机动作索引
    const randomIndex = Math.floor(Math.random() * motionGroup.length)

    return this.playMotion(targetGroup, randomIndex)
  }, '播放随机动作')

  /**
   * 播放随机表情
   */
  playRandomExpression() {
    if (this.cachedExpressions.length === 0) {
      this.log('warn', '⚠️ [HeroModel] 没有可用的表情')
      return false
    }

    const randomIndex = Math.floor(Math.random() * this.cachedExpressions.length)
    return this.setExpression(randomIndex)
  }

  /**
   * 获取动作数据
   */
  getMotions() {
    return this.cachedMotions
  }

  /**
   * 获取表情数据
   */
  getExpressions() {
    return this.cachedExpressions
  }

  /**
   * 获取所有参数数据
   */
  getAllParameters() {
    return this.parametersValues.parameter || []
  }

  /**
   * 获取所有部件不透明度数据
   */
  getAllPartOpacity() {
    return this.parametersValues.partOpacity || []
  }

  /**
   * 设置参数值 - 使用统一工具
   * @param {string} paramId - 参数ID
   * @param {number} value - 参数值
   */
  setParameters(paramId, value) {
    return ParameterUtils.setParameterValue(this.model, paramId, value, this.parametersValues)
  }

  /**
   * 设置部件不透明度 - 使用统一工具
   * @param {string} partId - 部件ID
   * @param {number} value - 不透明度值
   */
  setPartOpacity(partId, value) {
    return ParameterUtils.setPartOpacity(this.model, partId, value, this.parametersValues)
  }

  /**
   * 设置前景可见性 - 优化版本
   * @param {boolean} visible - 是否可见
   */
  setForegroundVisible = withModelCheck(function(visible) {
    if (this.foreground) {
      this.foreground.visible = visible
      this.log('log', `🎨 [HeroModel] 前景可见性已设置: ${visible}`)
    }
  }, '设置前景可见性')

  /**
   * 设置模型属性
   * @param {object} modelData - 包含模型数据的object
   */
  setModelProperties(modelData) {
    this.modelName = modelData.name || ''
    this.costume = modelData.costume || ''
    this.setAnchor(modelData.anchorX, modelData.anchorY)
    this.setScale(modelData.scaleX || 1)
    this.setVisible(modelData.visible || true)
    this.setAngle(modelData.angle || 0)
    this.setAlpha(modelData.alpha || 1)
    this.initializeParameters()
    this.cacheModelData()
  }

  /**
   * 销毁模型及其所有资源
   */
  destroy() {
    if (this._destroyed) {
      this.log('warn', '[HeroModel] destroy() called more than once for model:', this.id)
      return
    }
    this._destroyed = true;
    this.log('log', '🗑️ [HeroModel] 开始销毁模型:', this.id)

    try {
      // 1. 停止所有动作和表情
      if (this.model && typeof this.model.stopMotions === 'function') {
        try {
          this.model.stopMotions()
        } catch (e) {
          this.log('warn', '⚠️ [HeroModel] 停止动作失败:', e)
        }
      }

      // 2. 移除所有事件监听器
      if (this.model && typeof this.model.removeAllListeners === 'function') {
        try {
          this.model.removeAllListeners()
        } catch (e) {
          this.log('warn', '⚠️ [HeroModel] 移除事件监听器失败:', e)
        }
      }

      // 3. 从父容器中移除
      if (this.model && this.model.parent) {
        try {
          this.model.parent.removeChild(this.model)
        } catch (e) {
          this.log('warn', '⚠️ [HeroModel] 从父容器移除失败:', e)
        }
      }

      // 4. 销毁前景对象
      if (this.foreground) {
        try {
          if (this.foreground.parent) {
            this.foreground.parent.removeChild(this.foreground)
          }
          if (typeof this.foreground.destroy === 'function') {
            this.foreground.destroy({ children: true, texture: true, baseTexture: true })
          }
        } catch (e) {
          this.log('warn', '⚠️ [HeroModel] 销毁前景对象失败:', e)
        }
        this.foreground = null
      }

      // 5. 销毁主模型
      if (this.model) {
        try {
          if (typeof this.model.destroy === 'function') {
            if (this.model.children) {
              this.model.children.forEach(child => {
                try {
                  if (child && typeof child.destroy === 'function') {
                    child.destroy({ children: true, texture: true, baseTexture: true })
                  }
                } catch (e) {
                  this.log('warn', '⚠️ [HeroModel] 销毁子对象失败:', e)
                }
              })
            }
            this.model.destroy({ children: true, texture: true, baseTexture: true })
          } else {
            this.log('warn', '⚠️ [HeroModel] 模型对象没有 destroy 方法')
          }
        } catch (e) {
          this.log('warn', '⚠️ [HeroModel] 销毁主模型失败:', e)
        }
        // 现在再置空内部模型和相关属性
        if (this.model.internalModel) {
          this.model.internalModel = null
        }
        this.model = null
      }

      // 6. 清理其他资源
      this._modelsetting = null
      this.modelsetting = null
      this.parametersValues = {}
      this.cachedExpressions = []
      this.cachedMotions = {}

      this.log('log', '✅ [HeroModel] 模型销毁完成:', this.id)
    } catch (error) {
      this.log('error', '❌ [HeroModel] 销毁模型失败:', error)
      throw error
    }
  }

  /**
   * 自动适应画布大小
   * @param {number} canvasWidth - 画布宽度
   * @param {number} canvasHeight - 画布高度
   * @param {number} targetHeightRatio - 目标高度比例（默认0.5，即模型高度占画布高度的50%）
   */
  autoFitToCanvas = withModelCheck(function(canvasWidth, canvasHeight, targetHeightRatio = 0.5) {
    try {
      // 尝试从模型设置中获取尺寸信息
      let modelWidth, modelHeight
      
      if (this.modelsetting && this.modelsetting.CanvasSize) {
        // 从模型设置中获取画布尺寸
        modelWidth = this.modelsetting.CanvasSize.Width
        modelHeight = this.modelsetting.CanvasSize.Height
        this.log('log', '📐 [HeroModel] 从模型设置获取尺寸:', { modelWidth, modelHeight })
      } else {
        // 从核心模型获取尺寸
        const coreModel = this.model.internalModel.coreModel
        modelWidth = coreModel.getCanvasWidth()
        modelHeight = coreModel.getCanvasHeight()
        this.log('log', '📐 [HeroModel] 从核心模型获取尺寸:', { modelWidth, modelHeight })
      }

      if (!modelWidth || !modelHeight) {
        this.log('warn', '⚠️ [HeroModel] 无法获取模型原始尺寸，使用默认缩放')
        this.setScale(0.2)
        this.model.position.set(canvasWidth / 2, canvasHeight / 2)
        return false
      }

      // 如果尺寸看起来不合理（太小），使用默认缩放并居中
      if (modelWidth < 100 || modelHeight < 100) {
        this.log('warn', '⚠️ [HeroModel] 模型尺寸异常，使用默认缩放:', { modelWidth, modelHeight })
        this.setScale(0.2)
        this.model.position.set(canvasWidth / 2, canvasHeight / 2)
        return false
      }

      // 计算模型的宽高比
      const modelAspectRatio = modelWidth / modelHeight
      const canvasAspectRatio = canvasWidth / canvasHeight

      this.log('log', '📐 [HeroModel] 尺寸分析:', {
        模型尺寸: `${modelWidth}x${modelHeight}`,
        模型宽高比: modelAspectRatio.toFixed(3),
        画布尺寸: `${canvasWidth}x${canvasHeight}`,
        画布宽高比: canvasAspectRatio.toFixed(3)
      })

      let finalScale = 1.0

      // 根据模型和画布的宽高比决定适配策略
      if (modelAspectRatio > canvasAspectRatio) {
        // 横屏模型：优先适配宽度，使用更保守的缩放
        this.log('log', '📐 [HeroModel] 检测到横屏模型，优先适配宽度')
        const maxWidth = canvasWidth * 0.8 // 留20%边距
        finalScale = maxWidth / modelWidth
        
        // 检查高度是否超出
        const scaledHeight = modelHeight * finalScale
        if (scaledHeight > canvasHeight * 0.9) {
          const maxHeight = canvasHeight * 0.9
          const heightScale = maxHeight / modelHeight
          finalScale = Math.min(finalScale, heightScale)
          this.log('log', '📐 [HeroModel] 高度超出限制，调整缩放比例')
        }
      } else {
        // 竖屏模型：优先适配高度，使用更保守的缩放
        this.log('log', '📐 [HeroModel] 检测到竖屏模型，优先适配高度')
        const targetHeight = canvasHeight * targetHeightRatio
        finalScale = targetHeight / modelHeight
        
        // 检查宽度是否超出
        const scaledWidth = modelWidth * finalScale
        if (scaledWidth > canvasWidth * 0.9) {
          const maxWidth = canvasWidth * 0.9
          const widthScale = maxWidth / modelWidth
          finalScale = Math.min(finalScale, widthScale)
          this.log('log', '📐 [HeroModel] 宽度超出限制，调整缩放比例')
        }
      }

      // 确保缩放比例在合理范围内
      finalScale = Math.max(0.1, Math.min(2.0, finalScale))

      // 应用缩放
      this.setScale(finalScale)

      // 计算缩放后的尺寸
      const scaledModelWidth = modelWidth * finalScale
      const scaledModelHeight = modelHeight * finalScale

      // 居中定位
      const centerX = canvasWidth / 2
      const centerY = canvasHeight / 2

      // 设置位置
      this.model.position.set(centerX, centerY)

      this.log('log', '📐 [HeroModel] 模型已适应画布大小:', {
        画布尺寸: `${canvasWidth}x${canvasHeight}`,
        模型原始尺寸: `${modelWidth}x${modelHeight}`,
        缩放比例: finalScale.toFixed(3),
        最终尺寸: `${scaledModelWidth.toFixed(0)}x${scaledModelHeight.toFixed(0)}`,
        位置: `(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`,
        适配策略: modelAspectRatio > canvasAspectRatio ? '横屏适配' : '竖屏适配'
      })

      return true
    } catch (error) {
      this.log('error', '❌ [HeroModel] 适应画布大小失败:', error)
      // 降级到默认缩放并居中
      this.setScale(0.2)
      this.model.position.set(canvasWidth / 2, canvasHeight / 2)
      return false
    }
  }, '适应画布大小')

  /**
   * 获取模型原始尺寸
   * @returns {Object|null} 包含width和height的对象
   */
  getModelOriginalSize() {
    if (!this.model || !this.model.internalModel) {
      return null
    }

    try {
      const coreModel = this.model.internalModel.coreModel
      return {
        width: coreModel.getCanvasWidth(),
        height: coreModel.getCanvasHeight()
      }
    } catch (error) {
      this.log('error', '❌ [HeroModel] 获取模型原始尺寸失败:', error)
      return null
    }
  }

  /**
   * 重置模型到默认状态
   * @param {number} canvasWidth - 画布宽度
   * @param {number} canvasHeight - 画布高度
   */
  resetToDefault = withModelCheck(function(canvasWidth, canvasHeight) {
    try {
      // 重置到默认缩放
      this.setScale(0.2)
      
      // 重置到默认位置（画布中心）
      if (canvasWidth && canvasHeight) {
        const centerX = canvasWidth / 2
        const centerY = canvasHeight / 2
        this.model.position.set(centerX, centerY)
      } else {
        this.model.position.set(0, 0)
      }

      // 重置旋转和透明度
      this.setAngle(0)
      this.setAlpha(1)

      this.log('log', '🔄 [HeroModel] 模型已重置到默认状态')
      return true
    } catch (error) {
      this.log('error', '❌ [HeroModel] 重置模型失败:', error)
      return false
    }
  }, '重置模型')

  /**
   * 强制设置默认缩放
   * @param {number} defaultScale - 默认缩放值（默认0.2）
   */
  forceDefaultScale = withModelCheck(function(defaultScale = 0.2) {
    try {
      this.setScale(defaultScale)
      this.log('log', '📐 [HeroModel] 强制使用默认缩放:', defaultScale)
      return true
    } catch (error) {
      this.log('error', '❌ [HeroModel] 设置默认缩放失败:', error)
      return false
    }
  }, '设置默认缩放')
}
