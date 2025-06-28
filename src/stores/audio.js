import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { audioService } from '../services/AudioService.js'
import { mediaCaptureService } from '../services/MediaCaptureService.js'
import { asrService } from '../services/ASRService.js'
import { useWebSocketStore } from './websocket.js'
import { createDiscreteApi } from 'naive-ui'

/**
 * 音频播放队列管理类
 * 用于管理AI回复时的音频顺序播放
 */
class AudioQueue {
  constructor(taskIntervalMs = 50) {
    this.queue = []
    this.running = false
    this.taskInterval = taskIntervalMs
    this.pendingComplete = false
    this.activeTasks = new Set()
  }

  /**
   * 添加音频到播放队列
   * @param {Function} task - 返回Promise的音频播放任务
   */
  addTask(task) {
    this.queue.push(task)
    this.runNextTask()
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.queue = []
    this.activeTasks.clear()
    this.running = false
  }

  /**
   * 运行下一个任务
   */
  async runNextTask() {
    if (this.running || this.queue.length === 0) {
      if (this.queue.length === 0 && this.activeTasks.size === 0 && this.pendingComplete) {
        this.pendingComplete = false
        await new Promise(resolve => setTimeout(resolve, this.taskInterval))
      }
      return
    }

    this.running = true
    const task = this.queue.shift()
    if (task) {
      const taskPromise = task()
      this.activeTasks.add(taskPromise)

      try {
        await taskPromise
        await new Promise(resolve => setTimeout(resolve, this.taskInterval))
      } catch (error) {
        console.error(`[AudioQueue] 任务执行失败: ${error.message}`)
      } finally {
        this.activeTasks.delete(taskPromise)
        this.running = false
        this.runNextTask()
      }
    }
  }

  /**
   * 检查是否有任务在执行
   */
  hasTask() {
    return this.queue.length > 0 || this.activeTasks.size > 0 || this.running
  }

  /**
   * 等待所有任务完成
   */
  waitForCompletion() {
    this.pendingComplete = true
    return new Promise((resolve) => {
      const check = () => {
        if (!this.hasTask()) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }
}

// 创建全局音频队列实例
const globalAudioQueue = new AudioQueue(50) // 50ms间隔，确保音频顺序播放

// 创建 message API
const { message } = createDiscreteApi(['message'])

// 错误处理工具
const errorUtils = {
  handleError(error, context, options = {}) {
    const { showMessage = true, throwError = true } = options
    console.error(`[${context}] 操作失败: ${error.message}`)
    if (showMessage) {
      message.error(`${context}错误: ${error.message}`)
    }
    if (throwError) {
      throw error
    }
  }
}

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[AudioStore]'
  const timestamp = new Date().toISOString()
  
  switch (level) {
    case 'error':
      console.error(`${timestamp} ${prefix} ${message}`)
      break
    case 'warn':
      console.warn(`${timestamp} ${prefix} ${message}`)
      break
    case 'debug':
      if (window.DEBUG_AUDIO) {
        console.log(`${timestamp} ${prefix} ${message}`)
      }
      break
    default:
      console.log(`${timestamp} ${prefix} ${message}`)
  }
}

export const useAudioStore = defineStore('audio', () => {
  const webSocketStore = useWebSocketStore()
  const currentAudio = ref(null)
  const isPlaying = ref(false)

  // 录音状态
  const isRecording = ref(false)
  const isInitialized = ref(false)
  const microphonePermission = ref('prompt') // 'granted', 'denied', 'prompt'
  
  // 播放状态
  
  // VAD状态
  const voiceDetected = ref(false)
  const audioLevel = ref(0)
  const silenceDetected = ref(true)
  
  // ASR状态
  const asrEnabled = ref(false)
  const asrResult = ref(null)
  const asrConfidence = ref(0)
  const asrProcessing = ref(false)
  
  // 默认ASR设置
  const defaultASRSettings = {
    asrEnabled: true,
    vadSettings: {
      positiveSpeechThreshold: 0.5,  // 50%
      negativeSpeechThreshold: 0.3,  // 30%
      redemptionFrames: 8
    },
    interruptOnSpeak: true
  }

  // 音频设置
  const audioSettings = ref({
    ...defaultASRSettings,
    // 录音设置
    vadThreshold: 0.01,
    silenceTimeout: 2000,
    autoStopOnSilence: false,
    
    // 播放设置
    volume: 1.0,
    playbackSpeed: 1.0,
    autoPlay: true,
    
    // 控制设置
    autoMicControl: true, // AI说话时自动关闭麦克风，结束后自动开启
    pushToTalk: false,
    
    // ASR设置
    asrLanguage: 'zh-CN',
    asrModel: 'default'
  })

  // 用户手动关闭麦克风标志
  const userMicDisabled = ref(false)

  // 计算属性
  const canRecord = computed(() => {
    return isInitialized.value && 
           microphonePermission.value === 'granted' && 
           !isPlaying.value
  })

  const recordingStatus = computed(() => {
    if (!isInitialized.value) return 'uninitialized'
    if (microphonePermission.value !== 'granted') return 'no-permission'
    if (isRecording.value) return 'recording'
    return 'ready'
  })

  const isReady = computed(() => isInitialized.value && microphonePermission.value === 'granted')

  // 检查麦克风权限
  const checkMicrophonePermission = async () => {
    try {
      // 1. 检查浏览器是否支持权限API
      if (!navigator.permissions || !navigator.permissions.query) {
        log('浏览器不支持权限API', 'warn')
        return 'prompt'
      }

      // 2. 检查麦克风权限
      const result = await navigator.permissions.query({ name: 'microphone' })
      microphonePermission.value = result.state
      
      // 3. 监听权限变化
      navigator.permissions.onchange = (event) => {
        const result = event.target
        log(`麦克风权限状态变化: ${result.state}`, 'debug')
        microphonePermission.value = result.state
      }
      
      // 4. 如果权限是granted，验证是否可以实际访问麦克风
      if (result.state === 'granted') {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          return 'granted'
        } catch (error) {
          log(`麦克风访问失败: ${error.message}`, 'error')
          return 'denied'
        }
      }
      
      return result.state
    } catch (error) {
      log(`检查麦克风权限失败: ${error.message}`, 'error')
      return 'prompt'
    }
  }

  // 初始化音频系统
  const initializeAudio = async () => {
    try {
      log('开始初始化音频系统')
      
      // 初始化音频服务
      await audioService.initialize()
      
      // 设置音频服务回调
      setupAudioCallbacks()
      
      // 设置 ASR 服务回调
      setupASRCallbacks()
      
      isInitialized.value = true
      log('音频系统初始化成功')
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 设置音频服务回调
  const setupAudioCallbacks = () => {
    audioService.setCallbacks({
      onAudioData: (data, level) => {
        audioLevel.value = level
      },
      onRecordingStart: () => {
        isRecording.value = true
        silenceDetected.value = true
      },
      onRecordingEnd: () => {
        isRecording.value = false
        voiceDetected.value = false
        silenceDetected.value = true
      },
      onError: (error) => {
        errorUtils.handleError(error, 'AudioStore', { showMessage: true })
      }
    })
  }

  // 设置 ASR 服务回调
  const setupASRCallbacks = () => {
    asrService.setCallbacks({
      onSpeechStart: () => {
        voiceDetected.value = true
        silenceDetected.value = false
      },
      onSpeechEnd: () => {
        voiceDetected.value = false
        silenceDetected.value = true
      },
      onFrameProcessed: (probs) => {
        // 可以在这里处理 VAD 帧处理结果
      },
      onVADMisfire: () => {
        // 可以在这里处理 VAD 误触发
      },
      onError: (error) => {
        errorUtils.handleError(error, 'AudioStore', { showMessage: true })
      }
    })
  }

  // 计算音频电平
  const calculateAudioLevel = (audioData) => {
    let sum = 0
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]
    }
    return Math.sqrt(sum / audioData.length)
  }

  // 开始录音
  const startRecording = async () => {
    try {
      if (!isReady.value) {
        throw new Error('音频系统未就绪')
      }

      await audioService.start()
      isRecording.value = true
      log('开始录音', 'debug')
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 停止录音
  const stopRecording = async () => {
    try {
      if (!isRecording.value) {
        return
      }

      await audioService.stop()
      isRecording.value = false
      log('停止录音', 'debug')
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 播放音频
  const playAudio = async (audioData, options = {}) => {
    try {
      if (!isReady.value) {
        throw new Error('音频系统未就绪')
      }

      isPlaying.value = true
      await audioService.playAudio(audioData, {
        ...options,
        onEnd: () => {
          isPlaying.value = false
          if (options.onEnd) options.onEnd()
        },
        onError: (error) => {
          isPlaying.value = false
          if (options.onError) options.onError(error)
        }
      })
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 播放 AI 音频
  const playAIAudio = async (audioData, options = {}) => {
    try {
      if (!isInitialized.value) {
        throw new Error('音频系统未初始化')
      }

      // 如果启用了自动麦克风控制，在AI说话时关闭麦克风
      if (audioSettings.value.autoMicControl && !userMicDisabled.value) {
        if (isRecording.value) {
          await stopRecording()
        }
      }

      // 如果 AI 正在说话，先停止
      if (isPlaying.value && currentAudio.value) {
        currentAudio.value.pause()
        currentAudio.value = null
        isPlaying.value = false
      }

      // 播放新的音频
      const result = await playAudio(audioData, {
        volume: audioSettings.value.volume,
        playbackSpeed: audioSettings.value.playbackSpeed,
        ...options,
        onPlaybackStart: () => {
          isPlaying.value = true
          if (options.onPlaybackStart) {
            options.onPlaybackStart()
          }
        },
        onPlaybackEnd: () => {
          isPlaying.value = false
          // 如果启用了自动麦克风控制，在AI说话结束后重新开启麦克风
          if (audioSettings.value.autoMicControl && !userMicDisabled.value) {
            startRecording()
          }
          if (options.onPlaybackEnd) {
            options.onPlaybackEnd()
          }
        }
      })

      return result
    } catch (error) {
      log(`播放 AI 音频失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 音频队列方法
  const addAudioTask = (task) => {
    globalAudioQueue.addTask(task)
  }

  const clearAudioQueue = () => {
    globalAudioQueue.clearQueue()
  }

  const hasAudioTask = () => {
    return globalAudioQueue.hasTask()
  }

  const waitForAudioCompletion = () => {
    return globalAudioQueue.waitForCompletion()
  }

  // 监听语音检测状态
  watch(() => asrService.isSpeechDetected, (newValue) => {
    voiceDetected.value = newValue
    silenceDetected.value = !newValue
  })

  // 更新 VAD 设置
  const updateVADSettings = async (settings) => {
    try {
      await asrService.updateVADSettings(settings)
      audioSettings.value.vadSettings = { ...audioSettings.value.vadSettings, ...settings }
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 更新音频设置
  const updateAudioSettings = async () => {
    try {
      if (!isInitialized.value) {
        throw new Error('音频系统未初始化')
      }

      // 更新音频服务设置
      await audioService.updateSettings({
        silenceTimeout: audioSettings.value.silenceTimeout,
        autoStopOnSilence: audioSettings.value.autoStopOnSilence,
        volume: audioSettings.value.volume,
        playbackSpeed: audioSettings.value.playbackSpeed
      })

      // 更新当前播放音频的设置
      if (currentAudio.value) {
        currentAudio.value.volume = Math.max(0, Math.min(1, audioSettings.value.volume))
        currentAudio.value.playbackRate = Math.max(0.5, Math.min(2, audioSettings.value.playbackSpeed))
      }

      log('音频设置已更新', 'debug')
      return true
    } catch (error) {
      log(`更新音频设置失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 停止播放
  const stopPlayback = () => {
    audioService.stopPlayback()
    isPlaying.value = false
  }

  // 设置音量
  const setVolume = (volume) => {
    try {
      audioService.setVolume(volume)
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 设置播放速度
  const setPlaybackSpeed = (speed) => {
    try {
      audioService.setPlaybackSpeed(speed)
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  // 销毁音频系统
  const destroyAudio = async () => {
    try {
      await audioService.destroy()
      isInitialized.value = false
      isRecording.value = false
      isPlaying.value = false
      voiceDetected.value = false
      silenceDetected.value = true
      audioLevel.value = 0
      log('音频系统已销毁')
    } catch (error) {
      errorUtils.handleError(error, 'AudioStore', { showMessage: true })
    }
  }

  return {
    // 状态
    isRecording,
    isPlaying,
    isInitialized,
    microphonePermission,
    currentAudio,
    voiceDetected,
    audioLevel,
    silenceDetected,
    asrEnabled,
    asrResult,
    asrConfidence,
    asrProcessing,
    audioSettings,
    userMicDisabled,

    // 计算属性
    canRecord,
    recordingStatus,
    isReady,

    // 方法
    initializeAudio,
    checkMicrophonePermission,
    startRecording,
    stopRecording,
    playAudio,
    playAIAudio,

    // 音频队列方法
    addAudioTask,
    clearAudioQueue,
    hasAudioTask,
    waitForAudioCompletion,
    updateVADSettings,
    updateAudioSettings,
    stopPlayback,
    setVolume,
    setPlaybackSpeed,
    destroyAudio
  }
})

// 导出audioQueue实例以保持向后兼容
export const audioQueue = globalAudioQueue

export default {
  asr: asrService,
  audio: audioService,
  audioQueue: globalAudioQueue
}
