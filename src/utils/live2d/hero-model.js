/**
 * HeroModel 类
 * 封装 Live2D 模型的加载、控制和信息获取
 */

import { waitForLive2D, createLogger } from './utils.js'

// 高阶函数：统一空值检查
const withModelCheck = (method, operationName = '操作') => {
  return function(...args) {
    if (!this.model) {
      this.logger.warn(`⚠️ 模型未加载，无法${operationName}`)
      return false
    }
    if (!this.model.internalModel && operationName.includes('参数')) {
      this.logger.warn(`⚠️ 内部模型未准备好，无法${operationName}`)
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
      this.logger.error(`❌ ${operationName}失败:`, error)
      return false
    }
  }
}

// 统一参数操作工具
const ParameterUtils = {
  // 设置参数值
  setParameterValue(model, paramId, value, parametersValues, weight = 1, logger) {
    if (!model?.internalModel?.coreModel) return false
    
    try {
      model.internalModel.coreModel.setParameterValueById(paramId, value, weight)
      
      // 同步更新内部存储
      const paramIndex = parametersValues.parameter?.findIndex(param => param.parameterIds === paramId)
      if (paramIndex !== -1) {
        parametersValues.parameter[paramIndex].defaultValue = value
      }
      return true
    } catch (error) {
      logger.error('设置参数失败:', error)
      return false
    }
  },

  // 设置部件不透明度
  setPartOpacity(model, partId, value, parametersValues, logger) {
    if (!model?.internalModel?.coreModel) return false
    
    try {
      model.internalModel.coreModel.setPartOpacityById(partId, value)
      
      // 同步更新内部存储
      const part = parametersValues.partOpacity?.find(p => p.partId === partId)
      if (part) {
        part.defaultValue = value
      }
      return true
    } catch (error) {
      logger.error('设置部件不透明度失败:', error)
      return false
    }
  }
}

export class HeroModel {
  constructor(id, model) {
    this.id = id
    this.model = model
    this._destroyed = false
    this.logger = createLogger(`HeroModel:${this.id}`)
    
    // 模型相关属性
    this.modelName = ''
    this.costume = ''
    this.cubismModelSettings = null
    this.rawModelSettings = null
    
    // 缓存数据
    this.cachedExpressions = []
    this.cachedMotions = {}
    this.parametersValues = {}
    
    // 前景对象
    this.foreground = null
  }

  /**
   * 异步创建并加载 Live2D 模型
   * @param {string} src - 模型设置文件的URL或路径
   */
  async create(src) {
    try {
      // 等待本地 PIXI Live2D 库完全加载
      await waitForLive2D()

      this.logger.log('🔄 开始创建模型:', src)

      // 获取模型设置 JSON 文件
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`模型设置文件加载失败: ${response.status} ${response.statusText}`)
      }
      
      const settingsJSON = await response.json()
      settingsJSON.url = src

      this.logger.log('📄 原始设置 JSON:', settingsJSON)

      // 使用 PIXI Live2D 创建模型设置实例
      if (!window.PIXI.live2d.Cubism4ModelSettings) {
        throw new Error('❌ 本地 Cubism4ModelSettings 未加载，请检查 /libs/cubism4.min.js')
      }
      this.cubismModelSettings = new window.PIXI.live2d.Cubism4ModelSettings(settingsJSON)

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
      this.rawModelSettings = settingsJSON

      // 设置初始位置和缩放
      this.model.position.set(0, 0)
      this.model.scale.set(0.2) // 使用您设置的默认缩放值

      // 等待模型完全加载后初始化参数
      if (this.model.internalModel) {
        this.initializeParameters();
      } else {
        // 监听模型准备就绪事件
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('模型初始化超时'))
          }, 30000)

          this.model.once('ready', () => {
            clearTimeout(timeout)
            this.logger.log('📢 模型ready事件触发，初始化参数')
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
      this.logger.error('❌ 创建失败:', error)
      
      // 清理资源
      if (this.model) {
        try {
          this.model.removeAllListeners()
          this.model.destroy({ children: true, texture: true, baseTexture: true })
        } catch (cleanupError) {
          this.logger.error('❌ 清理失败模型时出错:', cleanupError)
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
    this.cachedExpressions = this.cubismModelSettings.expressions || []

    // 缓存动作数据
    this.cachedMotions = this.cubismModelSettings.motions || {}
  }

  initializeParameters(retries = 5, delay = 200) {
    if (this._destroyed) {
      this.logger.log('模型已销毁，取消参数初始化。');
      return;
    }

    if (!this.model || !this.model.internalModel || !this.model.internalModel.coreModel) {
      this.logger.warn('⚠️ 内部模型或核心模型未准备好，无法初始化参数。');
      if (retries > 0) {
        this.logger.log(`[HeroModel] 将在 ${delay}ms 后重试参数初始化... (${retries} 次剩余)`);
        setTimeout(() => this.initializeParameters(retries - 1, delay), delay);
      } else {
        this.logger.error('❌ [HeroModel] 参数初始化失败，已达最大重试次数。');
      }
      return;
    }

    this.parametersValues = {};
    this.logger.log('⚙️ [HeroModel] initializeParameters: 开始初始化参数。');
    const coreModel = this.model.internalModel.coreModel;

    // 优先从模型设置文件(.model3.json)中读取参数定义
    this.parametersValues.parameter = [];
    if (this.rawModelSettings && this.rawModelSettings.Parameters) {
      const paramDefs = this.rawModelSettings.Parameters;
      this.logger.log(`⚙️ [HeroModel] 从JSON定义中找到 ${paramDefs.length} 个参数。`);

      for (const paramDef of paramDefs) {
        const paramId = paramDef.Id;
        const paramIndex = coreModel.getParameterIndex(paramId);

        if (paramIndex === -1) {
          this.logger.warn(`⚠️ 参数ID "${paramId}" 在核心模型中未找到。`);
          continue;
        }

        const parameter = {
          parameterIds: paramId,
          max: coreModel.getParameterMaximumValue(paramIndex),
          min: coreModel.getParameterMinimumValue(paramIndex),
          defaultValue: coreModel.getParameterDefaultValue(paramIndex)
        };
        this.parametersValues.parameter.push(parameter);
      }
      this.logger.log(`✅ [HeroModel] 已成功从JSON定义初始化 ${this.parametersValues.parameter.length} 个参数。`);
    } else {
      // 如果JSON中没有定义，则回退到从 Live2DCubismCore.Model 获取 ID
      this.logger.warn('⚠️ 在模型JSON中未找到参数定义，回退到核心模型遍历。');
      
      // 正确的方式是从 coreModel.getModel() 获取底层模型，然后访问其参数
      const live2dCoreModel = coreModel.getModel();
      const parameterIds = live2dCoreModel.parameters.ids;
      const parameterCount = live2dCoreModel.parameters.count;

      if (parameterCount === 0 && retries > 0) {
        this.logger.warn(`⚠️ [HeroModel] 发现参数数量为 0，可能模型尚未完全加载。将在 ${delay}ms 后重试。`);
        setTimeout(() => this.initializeParameters(retries - 1, delay), delay);
        return;
      }

      for (let i = 0; i < parameterCount; i++) {
        const paramId = parameterIds[i];
        // getParameterIndex is on coreModel (CubismModel), not the Live2DCubismCore.Model
        const paramIndex = coreModel.getParameterIndex(paramId);
        if (paramIndex === -1) {
          this.logger.warn(`⚠️ 参数ID "${paramId}" 在核心模型中未找到索引。`);
          continue;
        }
        this.parametersValues.parameter.push({
          parameterIds: paramId,
          max: coreModel.getParameterMaximumValue(paramIndex),
          min: coreModel.getParameterMinimumValue(paramIndex),
          defaultValue: coreModel.getParameterDefaultValue(paramIndex)
        });
      }
      this.logger.log(`✅ [HeroModel] 已成功从核心模型遍历初始化 ${this.parametersValues.parameter.length} 个参数。`);
    }

    // 初始化部件（逻辑不变）
    this.parametersValues.partOpacity = [];
    const partCount = coreModel.getPartCount();
    this.logger.log(`⚙️ [HeroModel] 发现 ${partCount} 个核心模型部件。`);
    for (let i = 0; i < partCount; i++) {
      const partId = coreModel.getPartId(i);
      this.parametersValues.partOpacity.push({
        partId: partId,
        defaultValue: coreModel.getPartOpacityByIndex(i)
      });
    }
    this.logger.log(`✅ [HeroModel] 已成功初始化 ${this.parametersValues.partOpacity.length} 个部件。`);

    // 新增：健全性检查和重试逻辑
    // 如果参数列表为空，但部件列表不为空，说明参数可能未正确加载，进行重试
    if (this.parametersValues.parameter.length === 0 && this.parametersValues.partOpacity.length > 0 && retries > 0) {
      this.logger.warn(`⚠️ [HeroModel] 参数初始化后数量为0，但部件数量为 ${this.parametersValues.partOpacity.length}。可能存在加载时序问题，将在 ${delay}ms 后重试。`);
      setTimeout(() => this.initializeParameters(retries - 1, delay), delay);
      return; // 必须返回，防止后续代码执行
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
      this.logger.warn('⚠️ 呼吸功能不可用')
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
      
      this.logger.log(`🫁 呼吸动画已${bool ? '启用' : '禁用'}`)
    } catch (error) {
      this.logger.error('❌ 设置呼吸参数失败:', error)
    }
  }, '设置呼吸')

  /**
   * 设置眨眼动画 - 优化版本
   * @param {boolean} bool - 是否启用眨眼
   */
  setEyeBlinking = withModelCheck(function(bool) {
    this.model.eyeBlinking = bool
    if (!this.model.internalModel?.eyeBlink) {
      this.logger.warn('⚠️ 眨眼功能不可用')
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
      
      this.logger.log(`👁️ 眨眼动画已${bool ? '启用' : '禁用'}`)
    } catch (error) {
      this.logger.error('❌ 设置眨眼参数失败:', error)
    }
  }, '设置眨眼')

  /**
   * 设置交互性 - 优化版本
   * @param {boolean} bool - 是否可交互
   */
  setInteractive = withModelCheck(function(bool) {
    this.model.interactive = bool
    this.logger.log(`🖱️ 交互性已${bool ? '启用' : '禁用'}`)
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
        this.logger.warn('⚠️ 内部模型未准备好')
        return false
      }

      const expressions = this.model.internalModel.settings.getExpressionDefinitions()
      if (!expressions || !expressions[index]) {
        this.logger.warn(`⚠️ 表情索引无效: ${index}`)
        return false
      }

      this.model.internalModel.expression(expressions[index].name)
      this.logger.log(`😊 表情已播放: ${expressions[index].name}`)
      return true
    } catch (error) {
      this.logger.error('❌ 播放表情失败:', error)
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
      this.logger.warn('⚠️ 内部模型未准备好')
      return false
    }

    const motionManager = this.model.internalModel.motionManager
    if (!motionManager) {
      this.logger.warn('⚠️ 动作管理器未准备好')
      return false
    }

    // 如果播放的不是待机动作，则在播放结束后自动切换到随机待机动作
    if (group !== 'idle') {
      motionManager.once('motionFinish', () => {
        this.playRandomMotion('idle');
      });
    }

    const success = await motionManager.startMotion(group, index)

    if (success) {
      this.logger.log(`🎬 动作已播放: ${group}_${index}`)
    } else {
      this.logger.warn(`⚠️ 动作播放失败: ${group}_${index}`)
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
    state.parameters = {}
    if (this.model?.internalModel?.coreModel) {
      const coreModel = this.model.internalModel.coreModel
      const live2dCoreModel = coreModel.getModel();
      const parameterCount = live2dCoreModel.parameters.count;
      const parameterIds = live2dCoreModel.parameters.ids;

      for (let i = 0; i < parameterCount; i++) {
        const paramId = parameterIds[i];
        state.parameters[paramId] = coreModel.getParameterValueByIndex(i)
      }
    }

    // 保存部件不透明度状态
    state.partOpacity = {}
    if (this.model?.internalModel?.coreModel) {
      const coreModel = this.model.internalModel.coreModel
      const partCount = coreModel.getPartCount()
      for (let i = 0; i < partCount; i++) {
        const partId = coreModel.getPartId(i)
        state.partOpacity[partId] = coreModel.getPartOpacityByIndex(i)
      }
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
      if (state.parameters && this.model?.internalModel?.coreModel) {
        Object.entries(state.parameters).forEach(([paramId, value]) => {
          this.model.internalModel.coreModel.setParameterValueById(paramId, value)
        })
      }

      // 还原部件不透明度状态
      if (state.partOpacity && this.model?.internalModel?.coreModel) {
        Object.entries(state.partOpacity).forEach(([partId, value]) => {
          this.model.internalModel.coreModel.setPartOpacityById(partId, value)
        })
      }

      this.logger.log('🔄 模型状态已还原')
    } catch (error) {
      this.logger.error('❌ 还原状态失败:', error)
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
      this.logger.warn('⚠️ 没有可用的动作组')
      return false
    }

    // 选择动作组
    const targetGroup = group || availableGroups[Math.floor(Math.random() * availableGroups.length)]
    const motionGroup = this.cachedMotions[targetGroup]

    if (!motionGroup || motionGroup.length === 0) {
      this.logger.warn('⚠️ 动作组为空:', targetGroup)
      return false
    }

    // 选择随机动作索引
    const randomIndex = Math.floor(Math.random() * motionGroup.length)

    return this.playMotion(targetGroup, randomIndex)
  }, '播放随机动作')

  /**
   * 停止所有动作
   */
  stopAllMotions() {
    if (!this.model || !this.model.internalModel || !this.model.internalModel.motionManager) {
      return
    }
    this.model.internalModel.motionManager.stopAllMotions()
  }

  /**
   * 播放随机表情
   */
  playRandomExpression() {
    if (this.cachedExpressions.length === 0) {
      this.logger.warn('⚠️ 没有可用的表情')
      return false
    }

    const randomIndex = Math.floor(Math.random() * this.cachedExpressions.length)
    return this.setExpression(randomIndex)
  }

  /**
   * 获取当前表情的索引
   * @returns {number|null} 当前表情的索引，如果没有则返回 null
   */
  getCurrentExpressionIndex() {
    if (!this.model || !this.model.internalModel || !this.model.internalModel.expressionManager) {
      this.logger.warn('⚠️ 无法获取当前表情：模型或表情管理器未准备好')
      return null
    }
    try {
      const expressionManager = this.model.internalModel.expressionManager;
      const currentExpressionName = expressionManager.getCurrentExpression(); // 假设此方法返回当前表情名称
      
      if (currentExpressionName) {
        const index = this.cachedExpressions.findIndex(expr => expr.Name === currentExpressionName);
        if (index !== -1) {
          return index;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('❌ 获取当前表情索引失败:', error);
      return null;
    }
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
    const params = this.parametersValues.parameter || []
    this.logger.log('⚙️ [HeroModel] getAllParameters: 返回参数数量:', params.length)
    return params
  }

  /**
   * 获取所有部件不透明度数据
   */
  getAllPartOpacity() {
    const parts = this.parametersValues.partOpacity || []
    this.logger.log('⚙️ [HeroModel] getAllPartOpacity: 返回部件数量:', parts.length)
    return parts
  }

  /**
   * 设置参数值 - 使用统一工具
   * @param {string} paramId - 参数ID
   * @param {number} value - 参数值
   * @param {number} weight - 权重
   */
  setParameters(paramId, value, weight = 1) {
    return ParameterUtils.setParameterValue(this.model, paramId, value, this.parametersValues, weight, this.logger)
  }

  /**
   * 设置部件不透明度 - 使用统一工具
   * @param {string} partId - 部件ID
   * @param {number} value - 不透明度值
   */
  setPartOpacity(partId, value) {
    return ParameterUtils.setPartOpacity(this.model, partId, value, this.parametersValues, this.logger)
  }

  /**
   * 设置前景可见性 - 优化版本
   * @param {boolean} visible - 是否可见
   */
  setForegroundVisible = withModelCheck(function(visible) {
    if (this.foreground) {
      this.foreground.visible = visible
      this.logger.log(`🎨 前景可见性已设置: ${visible}`)
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
  }

  /**
   * 销毁模型及其所有资源
   */
  destroy() {
    if (this._destroyed) {
      this.logger.warn('destroy() called more than once for model:', this.id)
      return
    }
    this._destroyed = true;
    this.logger.log('🗑️ 开始销毁模型:', this.id)

    try {
      // 1. 停止所有动作和表情
      try {
        this.stopAllMotions()
      } catch (e) {
        this.logger.warn('⚠️ 停止动作失败:', e)
      }

      // 2. 移除所有事件监听器
      if (this.model && typeof this.model.removeAllListeners === 'function') {
        try {
          this.model.removeAllListeners()
        } catch (e) {
          this.logger.warn('⚠️ 移除事件监听器失败:', e)
        }
      }

      // 3. 从父容器中移除
      if (this.model && this.model.parent) {
        try {
          this.model.parent.removeChild(this.model)
        } catch (e) {
          this.logger.warn('⚠️ 从父容器移除失败:', e)
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
          this.logger.warn('⚠️ 销毁前景对象失败:', e)
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
                  this.logger.warn('⚠️ 销毁子对象失败:', e)
                }
              })
            }
            this.model.destroy({ children: true, texture: true, baseTexture: true })
          } else {
            this.logger.warn('⚠️ 模型对象没有 destroy 方法')
          }
        } catch (e) {
          this.logger.warn('⚠️ 销毁主模型失败:', e)
        }
        // 现在再置空内部模型和相关属性
        if (this.model.internalModel) {
          this.model.internalModel = null
        }
        this.model = null
      }

      // 6. 清理其他资源
      this.cubismModelSettings = null
      this.rawModelSettings = null
      this.parametersValues = {}
      this.cachedExpressions = []
      this.cachedMotions = {}

      this.logger.log('✅ 模型销毁完成:', this.id)
    } catch (error) {
      this.logger.error('❌ 销毁模型失败:', error)
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
      
      if (this.rawModelSettings && this.rawModelSettings.CanvasSize) {
        // 从模型设置中获取画布尺寸
        modelWidth = this.rawModelSettings.CanvasSize.Width
        modelHeight = this.rawModelSettings.CanvasSize.Height
        this.logger.log('📐 从模型设置获取尺寸:', { modelWidth, modelHeight })
      } else {
        // 从核心模型获取尺寸
        const coreModel = this.model.internalModel.coreModel
        modelWidth = coreModel.getCanvasWidth()
        modelHeight = coreModel.getCanvasHeight()
        this.logger.log('📐 从核心模型获取尺寸:', { modelWidth, modelHeight })
      }

      if (!modelWidth || !modelHeight) {
        this.logger.warn('⚠️ 无法获取模型原始尺寸，使用默认缩放')
        this.setScale(0.2)
        this.model.position.set(canvasWidth / 2, canvasHeight / 2)
        return false
      }

      // 如果尺寸看起来不合理（太小），使用默认缩放并居中
      if (modelWidth < 100 || modelHeight < 100) {
        this.logger.warn('⚠️ 模型尺寸异常，使用默认缩放:', { modelWidth, modelHeight })
        this.setScale(0.2)
        this.model.position.set(canvasWidth / 2, canvasHeight / 2)
        return false
      }

      // 计算模型的宽高比
      const modelAspectRatio = modelWidth / modelHeight
      const canvasAspectRatio = canvasWidth / canvasHeight

      this.logger.log('📐 尺寸分析:', {
        模型尺寸: `${modelWidth}x${modelHeight}`,
        模型宽高比: modelAspectRatio.toFixed(3),
        画布尺寸: `${canvasWidth}x${canvasHeight}`,
        画布宽高比: canvasAspectRatio.toFixed(3)
      })

      let finalScale = 1.0

      // 根据模型和画布的宽高比决定适配策略
      if (modelAspectRatio > canvasAspectRatio) {
        // 横屏模型：优先适配宽度，使用更保守的缩放
        this.logger.log('📐 检测到横屏模型，优先适配宽度')
        const maxWidth = canvasWidth * 0.8 // 留20%边距
        finalScale = maxWidth / modelWidth
        
        // 检查高度是否超出
        const scaledHeight = modelHeight * finalScale
        if (scaledHeight > canvasHeight * 0.9) {
          const maxHeight = canvasHeight * 0.9
          const heightScale = maxHeight / modelHeight
          finalScale = Math.min(finalScale, heightScale)
          this.logger.log('📐 高度超出限制，调整缩放比例')
        }
      } else {
        // 竖屏模型：优先适配高度，使用更保守的缩放
        this.logger.log('📐 检测到竖屏模型，优先适配高度')
        const targetHeight = canvasHeight * targetHeightRatio
        finalScale = targetHeight / modelHeight
        
        // 检查宽度是否超出
        const scaledWidth = modelWidth * finalScale
        if (scaledWidth > canvasWidth * 0.9) {
          const maxWidth = canvasWidth * 0.9
          const widthScale = maxWidth / modelWidth
          finalScale = Math.min(finalScale, widthScale)
          this.logger.log('📐 宽度超出限制，调整缩放比例')
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

      this.logger.log('📐 模型已适应画布大小:', {
        画布尺寸: `${canvasWidth}x${canvasHeight}`,
        模型原始尺寸: `${modelWidth}x${modelHeight}`,
        缩放比例: finalScale.toFixed(3),
        最终尺寸: `${scaledModelWidth.toFixed(0)}x${scaledModelHeight.toFixed(0)}`,
        位置: `(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`,
        适配策略: modelAspectRatio > canvasAspectRatio ? '横屏适配' : '竖屏适配'
      })

      return true
    } catch (error) {
      this.logger.error('❌ 适应画布大小失败:', error)
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
      this.logger.error('❌ 获取模型原始尺寸失败:', error)
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

      this.logger.log('🔄 模型已重置到默认状态')
      return true
    } catch (error) {
      this.logger.error('❌ 重置模型失败:', error)
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
      this.logger.log('📐 强制使用默认缩放:', defaultScale)
      return true
    } catch (error) {
      this.logger.error('❌ 设置默认缩放失败:', error)
      return false
    }
  }, '设置默认缩放')
}
