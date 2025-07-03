/**
 * Live2D Animation Manager - 动画管理器
 * 负责处理模型动作、表情和音频播放
 */

import { createLogger } from './utils.js'

export class Live2DAnimationManager {
  constructor(modelManager) {
    this.modelManager = modelManager
    this.currentAudioPlayer = null
    this.animationQueue = new Map() // 动画队列
    this.isPlaying = new Map() // 播放状态跟踪
    this.isPetMode = false
    this.logger = createLogger('Live2DAnimationManager')
  }

  /**
   * 设置桌宠模式
   * @param {boolean} enabled - 是否启用桌宠模式
   */
  setPetMode(enabled) {
    this.isPetMode = enabled
    this.logger.log(`🐾 桌宠模式${enabled ? '已启用' : '已禁用'}`)

    if (enabled) {
      // 停止所有当前动画
      this.stopAllAnimations()
      
      // 停止音频播放
      this.stopAudio()
    }
  }

  /**
   * 播放模型动作
   * @param {string} modelId - 模型ID
   * @param {string} group - 动作组名
   * @param {number} index - 动作索引
   * @param {number} priority - 优先级
   */
  async playMotion(modelId, group, index, priority = 2) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return false
    }

    try {
      // 桌宠模式下限制动作优先级
      const adjustedPriority = this.isPetMode ? Math.min(priority, 1) : priority
      
      const result = await heroModel.playMotion(group, index, adjustedPriority)
      this.logger.log('🎭 播放动作:', {
        modelId, group, index, priority: adjustedPriority, result
      })
      return result
    } catch (error) {
      this.logger.error('❌ 播放动作失败:', error)
      return false
    }
  }

  /**
   * 播放随机动作
   * @param {string} modelId - 模型ID
   * @param {string} group - 动作组名（可选）
   */
  async playRandomMotion(modelId, group = null) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return false
    }

    try {
      // 桌宠模式下优先使用空闲动作
      const targetGroup = this.isPetMode ? (group || 'idle') : group
      
      const result = await heroModel.playRandomMotion(targetGroup)
      this.logger.log('🎲 播放随机动作:', {
        modelId, group: targetGroup, result
      })
      return result
    } catch (error) {
      this.logger.error('❌ 播放随机动作失败:', error)
      return false
    }
  }

  /**
   * 设置模型表情
   * @param {string} modelId - 模型ID
   * @param {number} expressionIndex - 表情索引
   */
  setExpression(modelId, expressionIndex) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return false
    }

    try {
      heroModel.setExpression(expressionIndex)
      this.logger.log('😊 设置表情:', {
        modelId, expressionIndex
      })
      return true
    } catch (error) {
      this.logger.error('❌ 设置表情失败:', error)
      return false
    }
  }

  /**
   * 播放随机表情
   * @param {string} modelId - 模型ID
   */
  playRandomExpression(modelId) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return false
    }

    try {
      const result = heroModel.playRandomExpression()
      this.logger.log('🎲 播放随机表情:', {
        modelId, result
      })
      return result
    } catch (error) {
      this.logger.error('❌ 播放随机表情失败:', error)
      return false
    }
  }

  /**
   * 批量控制表情
   * @param {Array} expressions - 表情索引数组
   * @param {Array} modelIds - 目标模型ID数组（可选，默认所有模型）
   */
  batchControlExpressions(expressions, modelIds = null) {
    const targetIds = modelIds || this.modelManager.getAllModelIds()
    const results = []

    targetIds.forEach(modelId => {
      expressions.forEach(expressionIndex => {
        const result = this.setExpression(modelId, expressionIndex)
        results.push({ modelId, expressionIndex, success: result })
      })
    })

    // this.logger.log('🎭 批量表情控制完成:', results)
    return results
  }

  /**
   * 批量控制动作
   * @param {Array} motions - 动作数据数组 [{group, index, priority}]
   * @param {Array} modelIds - 目标模型ID数组（可选，默认所有模型）
   */
  async batchControlMotions(motions, modelIds = null) {
    const targetIds = modelIds || this.modelManager.getAllModelIds()
    const results = []

    for (const modelId of targetIds) {
      for (const motion of motions) {
        const { group, index, priority = 2 } = motion
        const result = await this.playMotion(modelId, group, index, priority)
        results.push({ modelId, group, index, priority, success: result })
      }
    }

    // this.logger.log('🎭 批量动作控制完成:', results)
    return results
  }

  /**
   * 播放音频
   * @param {string} audioUrl - 音频URL
   * @param {Object} options - 播放选项
   */
  async playAudio(audioUrl, options = {}) {
    // 桌宠模式下不播放音频
    if (this.isPetMode) {
      // this.logger.log('🔇 桌宠模式下不播放音频')
      return false
    }

    try {
      // 停止当前播放的音频
      this.stopAudio()

      // 创建新的音频播放器
      this.currentAudioPlayer = new Audio(audioUrl)
      
      // 设置音频属性
      const { volume = 1.0, loop = false, playbackRate = 1.0 } = options
      this.currentAudioPlayer.volume = volume
      this.currentAudioPlayer.loop = loop
      this.currentAudioPlayer.playbackRate = playbackRate

      // 播放音频
      await this.currentAudioPlayer.play()
      
      this.logger.log('🔊 音频播放开始:', audioUrl)

      // 监听播放结束事件
      this.currentAudioPlayer.addEventListener('ended', () => {
        this.logger.log('🔇 音频播放结束')
        this.currentAudioPlayer = null
      })

      return true
    } catch (error) {
      this.logger.error('❌ 音频播放失败:', error)
      this.currentAudioPlayer = null
      return false
    }
  }

  /**
   * 停止音频播放
   */
  stopAudio() {
    if (this.currentAudioPlayer) {
      this.currentAudioPlayer.pause()
      this.currentAudioPlayer.currentTime = 0
      this.currentAudioPlayer = null
      this.logger.log('⏹️ 音频播放已停止')
    }
  }

  /**
   * 暂停音频播放
   */
  pauseAudio() {
    if (this.currentAudioPlayer && !this.currentAudioPlayer.paused) {
      this.currentAudioPlayer.pause()
      this.logger.log('⏸️ 音频播放已暂停')
      return true
    }
    return false
  }

  /**
   * 恢复音频播放
   */
  resumeAudio() {
    if (this.currentAudioPlayer && this.currentAudioPlayer.paused) {
      this.currentAudioPlayer.play()
      this.logger.log('▶️ 音频播放已恢复')
      return true
    }
    return false
  }

  /**
   * 设置音频音量
   * @param {number} volume - 音量 (0.0 - 1.0)
   */
  setAudioVolume(volume) {
    if (this.currentAudioPlayer) {
      this.currentAudioPlayer.volume = Math.max(0, Math.min(1, volume))
      this.logger.log('🔊 音量设置为:', volume)
      return true
    }
    return false
  }

  /**
   * 获取音频播放状态
   */
  getAudioStatus() {
    if (!this.currentAudioPlayer) {
      return { playing: false, paused: false, currentTime: 0, duration: 0 }
    }

    return {
      playing: !this.currentAudioPlayer.paused,
      paused: this.currentAudioPlayer.paused,
      currentTime: this.currentAudioPlayer.currentTime,
      duration: this.currentAudioPlayer.duration || 0,
      volume: this.currentAudioPlayer.volume
    }
  }

  /**
   * 获取模型动作信息
   * @param {string} modelId - 模型ID
   */
  getModelMotions(modelId) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return null
    }

    try {
      return heroModel.getMotions()
    } catch (error) {
      this.logger.error('❌ 获取动作信息失败:', error)
      return null
    }
  }

  /**
   * 获取模型表情信息
   * @param {string} modelId - 模型ID
   */
  getModelExpressions(modelId) {
    const heroModel = this.modelManager.getModel(modelId)
    if (!heroModel) {
      this.logger.warn('⚠️ 模型不存在:', modelId)
      return null
    }

    try {
      return heroModel.getExpressions()
    } catch (error) {
      this.logger.error('❌ 获取表情信息失败:', error)
      return null
    }
  }

  /**
   * 停止所有动画
   */
  stopAllAnimations() {
    this.modelManager.getAllModels().forEach(heroModel => {
      try {
        if (heroModel.stopAllMotions) {
          heroModel.stopAllMotions()
        }
      } catch (error) {
        this.logger.error('❌ 停止动画失败:', error)
      }
    })

    this.stopAudio()
    this.logger.log('⏹️ 所有动画已停止')
  }

  /**
   * 销毁动画管理器
   */
  destroy() {
    this.stopAllAnimations()
    this.animationQueue.clear()
    this.isPlaying.clear()
    this.logger.log('🧹 动画管理器已销毁')
  }
}
