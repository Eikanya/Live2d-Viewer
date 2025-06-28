/**
 * 音频服务类 - 处理录音、播放和音频处理
 */
import { asrService } from './ASRService'
import { createDiscreteApi } from 'naive-ui'

// 创建 message API
const { message } = createDiscreteApi(['message'])

// 音频工具函数
const audioUtils = {
  calculateAudioLevel(audioData) {
    let sum = 0
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]
    }
    return Math.sqrt(sum / audioData.length)
  },

  processAudioData(audioData, buffer, bufferSize) {
    // 合并音频数据
    const newBuffer = new Float32Array(buffer.length + audioData.length)
    newBuffer.set(buffer)
    newBuffer.set(audioData, buffer.length)
    
    // 保持缓冲区大小
    if (newBuffer.length > bufferSize) {
      newBuffer.splice(0, newBuffer.length - bufferSize)
    }
    
    // 计算音频电平
    const level = this.calculateAudioLevel(audioData)
    
    return { level, newBuffer }
  }
}

// 日志工具函数
const log = (message, level = 'info') => {
  const prefix = '[AudioService]'
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

class AudioService {
  constructor() {
    // 基础状态
    this.isInitialized = false
    this.isRecording = false
    this.isPlaying = false
    
    // 音频设置
    this.sampleRate = 16000  // 固定采样率
    this.channels = 1        // 固定单声道
    this.bitsPerSample = 16
    this.frameSize = 1024
    this.bufferSize = this.sampleRate * 2 // 2秒的缓冲区
    
    // 音频设备
    this.audioContext = null
    this.mediaStream = null
    this.audioSource = null
    this.audioProcessor = null
    this.currentAudio = null
    
    // 音频缓冲区
    this.audioBuffer = new Float32Array(0)
    
    // 播放设置
    this.volume = 1.0
    this.playbackSpeed = 1.0
    
    // 使用导入的 asrService 单例
    this.asrService = asrService
    
    // 回调函数
    this.callbacks = {
      onAudioData: null,
      onRecordingStart: null,
      onRecordingEnd: null,
      onError: null
    }
  }

  /**
   * 初始化音频服务
   */
  async initialize() {
    if (this.isInitialized) {
      log('音频服务已初始化', 'debug')
      return true
    }

    try {
      log('开始初始化音频服务')
      
      // 初始化 ASR 服务
      await this.asrService.initialize()
      
      // 创建音频上下文
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      })
      
      this.isInitialized = true
      log('音频服务初始化成功')
      return true
    } catch (error) {
      log(`初始化音频服务失败: ${error.message}`, 'error')
      this.isInitialized = false
      throw error
    }
  }

  /**
   * 开始录音
   */
  async start() {
    if (this.isRecording) {
      log('已经在录音中', 'warn')
      return
    }

    try {
      // 确保已初始化
      if (!this.isInitialized) {
        await this.initialize()
      }

      // 获取媒体流
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: this.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // 创建音频源
      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // 创建音频处理器
      this.audioProcessor = this.audioContext.createScriptProcessor(this.frameSize, 1, 1)
      
      // 设置音频处理回调
      this.audioProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        this.processAudioData(inputData)
      }

      // 连接音频节点
      this.audioSource.connect(this.audioProcessor)
      this.audioProcessor.connect(this.audioContext.destination)

      // 重置状态
      this.isRecording = true
      this.audioBuffer = new Float32Array(0)

      // 触发开始录音回调
      if (this.callbacks.onRecordingStart) {
        this.callbacks.onRecordingStart()
      }

      log('开始录音')
    } catch (error) {
      log(`开始录音失败: ${error.message}`, 'error')
      this.isRecording = false
      throw error
    }
  }

  /**
   * 停止录音
   */
  async stop() {
    if (!this.isRecording) {
      log('未在录音', 'warn')
      return
    }

    try {
      // 断开音频连接
      if (this.audioProcessor) {
        this.audioProcessor.disconnect()
        this.audioProcessor = null
      }

      if (this.audioSource) {
        this.audioSource.disconnect()
        this.audioSource = null
      }

      // 停止媒体流
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop())
        this.mediaStream = null
      }

      // 重置状态
      this.isRecording = false
      this.audioBuffer = new Float32Array(0)

      // 触发停止录音回调
      if (this.callbacks.onRecordingEnd) {
        this.callbacks.onRecordingEnd()
      }

      log('停止录音成功')
    } catch (error) {
      log(`停止录音失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 处理音频数据
   */
  async processAudioData(audioData) {
    try {
      // 使用工具函数处理音频数据
      const { level, newBuffer } = audioUtils.processAudioData(audioData, this.audioBuffer, this.bufferSize)
      this.audioBuffer = newBuffer
      
      // 触发音频数据回调
      if (this.callbacks.onAudioData) {
        this.callbacks.onAudioData({ data: audioData }, level)
      }

      // 使用 ASR 服务处理音频数据
      if (this.asrService && this.asrService.isInitialized) {
        await this.asrService.processAudioData(audioData)
      }
    } catch (error) {
      log(`处理音频数据失败: ${error.message}`, 'error')
      if (this.callbacks.onError) {
        this.callbacks.onError(error)
      }
    }
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 播放音频
   */
  async playAudio(audioData, options = {}) {
    return new Promise((resolve) => {
      if (!audioData) {
        log('没有音频数据', 'warn')
        resolve()
        return
      }

      try {
        // 停止当前播放的音频
        if (this.currentAudio) {
          this.currentAudio.pause()
          this.currentAudio = null
        }

        // 处理音频数据
        let audioUrl
        if (typeof audioData === 'string') {
          // Base64编码的音频数据
          const binaryString = atob(audioData)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const audioBlob = new Blob([bytes], { type: 'audio/wav' })
          audioUrl = URL.createObjectURL(audioBlob)
        } else if (audioData instanceof Blob) {
          audioUrl = URL.createObjectURL(audioData)
        } else {
          throw new Error('不支持的音频数据格式')
        }

        // 创建音频元素
        const audio = new Audio(audioUrl)
        this.currentAudio = audio
        this.isPlaying = true

        // 设置音频属性
        audio.volume = Math.max(0, Math.min(1, options.volume || this.volume))
        audio.playbackRate = Math.max(0.5, Math.min(2, options.playbackSpeed || this.playbackSpeed))

        // 设置事件监听器
        audio.onloadeddata = () => {
          if (options.onPlaybackStart) {
            options.onPlaybackStart()
          }
        }

        audio.onended = () => {
          this.isPlaying = false
          this.currentAudio = null
          URL.revokeObjectURL(audioUrl)
          if (options.onPlaybackEnd) {
            options.onPlaybackEnd()
          }
          resolve()
        }

        audio.onerror = (error) => {
          log(`音频播放错误: ${error.message}`, 'error')
          this.isPlaying = false
          this.currentAudio = null
          URL.revokeObjectURL(audioUrl)
          if (options.onError) {
            options.onError(error)
          }
          resolve()
        }

        // 播放音频
        audio.play().catch(error => {
          log(`音频播放失败: ${error.message}`, 'error')
          this.isPlaying = false
          this.currentAudio = null
          URL.revokeObjectURL(audioUrl)
          if (options.onError) {
            options.onError(error)
          }
          resolve()
        })
      } catch (error) {
        log(`音频播放失败: ${error.message}`, 'error')
        this.isPlaying = false
        this.currentAudio = null
        if (options.onError) {
          options.onError(error)
        }
        resolve()
      }
    })
  }

  /**
   * 停止播放
   */
  stopPlayback() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    this.isPlaying = false
  }

  /**
   * 设置音量
   */
  setVolume(volume) {
    try {
      // 确保音量在有效范围内
      const validVolume = Math.max(0, Math.min(1, volume))
      
      // 更新当前音频的音量
      if (this.currentAudio) {
        this.currentAudio.volume = validVolume
      }
      
      // 保存音量设置
      this.volume = validVolume
      
      log('音量已设置为:', validVolume)
      return true
    } catch (error) {
      log('设置音量失败:', error)
      throw error
    }
  }

  /**
   * 设置播放速度
   */
  setPlaybackSpeed(speed) {
    try {
      // 确保速度在有效范围内
      const validSpeed = Math.max(0.5, Math.min(2, speed))
      
      // 更新当前音频的播放速度
      if (this.currentAudio) {
        this.currentAudio.playbackRate = validSpeed
      }
      
      // 保存播放速度设置
      this.playbackSpeed = validSpeed
      
      log('播放速度已设置为:', validSpeed)
      return true
    } catch (error) {
      log('设置播放速度失败:', error)
      throw error
    }
  }

  /**
   * 销毁服务
   */
  async destroy() {
    try {
      await this.stop()
      await this.asrService.destroy()
      this.isInitialized = false
      log('服务已销毁')
    } catch (error) {
      log('销毁服务失败:', error)
      throw error
    }
  }
}

// 导出单例
export const audioService = new AudioService()

// 导出AudioService类（可选）
export { AudioService }
