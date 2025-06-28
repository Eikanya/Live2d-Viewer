/**
 * ASR服务类 - 处理语音识别和VAD
 */
import { MicVAD } from '@ricky0123/vad-web'
import { createDiscreteApi } from 'naive-ui'

// 创建 message API
const { message } = createDiscreteApi(['message'])

// 禁用 ONNX Runtime 警告
if (typeof window !== 'undefined') {
  // 保存原始的 console.warn
  const originalWarn = console.warn
  
  // 重写 console.warn 来过滤 ONNX Runtime 的警告
  console.warn = function(...args) {
    // 检查是否是 ONNX Runtime 的警告
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('onnxruntime') || 
         args[0].includes('CleanUnusedInitializersAndNodeArgs'))) {
      return // 忽略这些警告
    }
    // 其他警告正常显示
    // originalWarn.apply(console, args)
  }

  window.ENV = window.ENV || {}
  window.ENV.WEBGL_CPU_FORWARD = true
  window.ENV.ORT_LOGGING_LEVEL = 3 // 3 = ERROR, 2 = WARNING, 1 = INFO, 0 = VERBOSE
  
  // 设置 ONNX Runtime 配置
  window.ort = window.ort || {}
  window.ort.env = window.ort.env || {}
  window.ort.env.wasm = window.ort.env.wasm || {}
  window.ort.env.wasm.simd = true
  window.ort.env.wasm.proxy = true
  window.ort.env.wasm.numThreads = 1
  window.ort.env.wasm.loggingLevel = 3
  window.ort.env.wasm.initializingTimeout = 0
  window.ort.env.wasm.initializingTimeoutMessage = ''
}

// 错误处理工具
const errorUtils = {
  handleError(error, context, options = {}) {
    const { showMessage = true, throwError = true } = options
    console.error(`❌ [${context}] 操作失败:`, error)
    if (showMessage) {
      message.error(`${context}错误: ${error.message}`)
    }
    if (throwError) {
      throw error
    }
  }
}

// 回调管理工具
const callbackUtils = {
  createCallbacks(defaultCallbacks = {}) {
    return {
      callbacks: { ...defaultCallbacks },
      setCallbacks(newCallbacks) {
        this.callbacks = { ...this.callbacks, ...newCallbacks }
      },
      triggerCallback(name, ...args) {
        if (this.callbacks[name]) {
          this.callbacks[name](...args)
        }
      }
    }
  }
}

class ASRService {
  constructor() {
    // 基础状态
    this.isInitialized = false
    this.isProcessing = false
    this.vadReady = false
    this.isSpeechDetected = false
    this.speechStartTime = 0
    this.previousTriggeredProbability = 0

    // VAD 设置
    this.vadSettings = {
      positiveSpeechThreshold: 50,  // 语音检测阈值 (0-100)
      negativeSpeechThreshold: 35,  // 静音检测阈值 (0-100)
      redemptionFrames: 35          // 容错帧数
    }

    // 语音识别设置
    this.minSpeechDuration = 500    // 最小语音持续时间（毫秒）
    this.recognitionTimeout = 30000 // 最长识别时间（毫秒）

    // VAD 实例
    this.vadInstance = null

    // 使用回调管理工具
    this.callbackManager = callbackUtils.createCallbacks({
      onSpeechStart: null,
      onSpeechEnd: null,
      onFrameProcessed: null,
      onVADMisfire: null,
      onError: null
    })
    
    // 服务器配置
    this.serverConfig = {
      host: 'localhost',
      port: 12393,
      protocol: 'http'
    }

    // 节流控制
    this.lastSendTime = 0
    this.minSendInterval = 1000 // 最小发送间隔（毫秒）
    this.isSending = false // 是否正在发送请求
  }

  /**
   * 初始化ASR服务
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ [ASRService] ASR服务已初始化')
        return true
      }

      console.log('🎤 [ASRService] 开始初始化ASR服务')
      await this.initializeVAD()
      this.isInitialized = true
      console.log('✅ [ASRService] ASR服务初始化成功')
      return true
    } catch (error) {
      errorUtils.handleError(error, 'ASRService', { showMessage: true })
    }
  }

  /**
   * 初始化 VAD
   */
  async initializeVAD() {
    try {
      // 创建 VAD 实例
      this.vadInstance = await MicVAD.new({
        model: "v5",
        preSpeechPadFrames: 20,
        positiveSpeechThreshold: this.vadSettings.positiveSpeechThreshold / 100,
        negativeSpeechThreshold: this.vadSettings.negativeSpeechThreshold / 100,
        redemptionFrames: this.vadSettings.redemptionFrames,
        onSpeechStart: () => {
          console.log('🎤 [ASRService] 检测到语音开始')
          this.isSpeechDetected = true
          this.speechStartTime = Date.now()
          this.callbackManager.triggerCallback('onSpeechStart')
        },
        onSpeechEnd: (audio) => {
          console.log('🎤 [ASRService] 检测到语音结束')
          const speechDuration = Date.now() - this.speechStartTime
          if (speechDuration >= this.minSpeechDuration) {
            this.isSpeechDetected = false
            // this.sendAudioForRecognition(audio) // 禁用本地ASR HTTP POST
            this.callbackManager.triggerCallback('onSpeechEnd', audio)
          } else {
            console.log('⏳ [ASRService] 语音持续时间太短，忽略')
            this.callbackManager.triggerCallback('onVADMisfire')
          }
        },
        onFrameProcessed: (probs) => {
          if (probs.isSpeech > this.previousTriggeredProbability) {
            this.previousTriggeredProbability = probs.isSpeech
            this.callbackManager.triggerCallback('onFrameProcessed', probs)
          }
        }
      })

      // 启动 VAD
      await this.vadInstance.start()
      this.vadReady = true
      return true
    } catch (error) {
      errorUtils.handleError(error, 'ASRService', { showMessage: true })
    }
  }

  /**
   * 处理音频数据
   */
  async processAudioData(audioData) {
    try {
      if (!this.vadReady || !this.vadInstance) {
        return
      }
      // MicVAD 自动监听麦克风流，无需手动处理音频帧
      // 保留此方法以兼容调用链，但不做任何处理
    } catch (error) {
      errorUtils.handleError(error, 'ASRService', { showMessage: false })
    }
  }

  /**
   * 发送音频进行识别
   */
  async sendAudioForRecognition(audioData) {
    try {
      if (this.isProcessing) {
        console.warn('⚠️ [ASRService] 正在处理上一次识别')
        return
      }

      this.isProcessing = true
      console.log('🎤 [ASRService] 开始语音识别')

      // 将音频数据转换为 WAV 格式
      const wavBlob = await this.convertToWav(audioData)
      
      // 创建 FormData
      const formData = new FormData()
      formData.append('file', wavBlob, 'audio.wav')

      // 发送请求到 ASR 服务器
      const response = await fetch(`${this.serverConfig.protocol}://${this.serverConfig.host}:${this.serverConfig.port}/asr`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`ASR 请求失败: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('✅ [ASRService] 语音识别成功:', result.text)
      this.callbackManager.triggerCallback('onRecognitionResult', result.text)

      this.isProcessing = false
    } catch (error) {
      this.isProcessing = false
      errorUtils.handleError(error, 'ASRService', { showMessage: true })
    }
  }

  /**
   * 将音频数据转换为 WAV 格式
   */
  async convertToWav(audioData) {
    if (!audioData || audioData.length === 0) {
      // 空数据保护
      return new Blob([], { type: 'audio/wav' });
    }
    // 创建 WAV 文件头
    const wavHeader = this.createWavHeader(audioData.length);
    // 将音频数据转换为 16 位 PCM
    const pcmData = this.float32ToInt16(audioData);
    // 合并 WAV 头和音频数据（注意长度要乘2）
    const wavData = new Uint8Array(wavHeader.length + pcmData.length * 2);
    wavData.set(wavHeader, 0);
    wavData.set(new Uint8Array(pcmData.buffer), wavHeader.length);
    return new Blob([wavData], { type: 'audio/wav' });
  }

  /**
   * 创建 WAV 文件头
   */
  createWavHeader(dataLength) {
    const buffer = new ArrayBuffer(44)
    const view = new DataView(buffer)
    
    // RIFF 标识
    this.writeString(view, 0, 'RIFF')
    // 文件长度
    view.setUint32(4, 36 + dataLength * 2, true)
    // WAVE 标识
    this.writeString(view, 8, 'WAVE')
    // fmt 标识
    this.writeString(view, 12, 'fmt ')
    // fmt 块长度
    view.setUint32(16, 16, true)
    // 音频格式 (1 表示 PCM)
    view.setUint16(20, 1, true)
    // 声道数
    view.setUint16(22, 1, true)
    // 采样率
    view.setUint32(24, 16000, true)
    // 字节率
    view.setUint32(28, 16000 * 2, true)
    // 块对齐
    view.setUint16(32, 2, true)
    // 位深度
    view.setUint16(34, 16, true)
    // data 标识
    this.writeString(view, 36, 'data')
    // 数据长度
    view.setUint32(40, dataLength * 2, true)
    
    return new Uint8Array(buffer)
  }

  /**
   * 写入字符串到 DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 更新 VAD 设置
   */
  async updateVADSettings(settings) {
    try {
      if (!this.vadInstance) {
        throw new Error('VAD 未初始化')
      }

      // 更新设置
      this.vadSettings = { ...this.vadSettings, ...settings }

      // 重新初始化 VAD
      await this.vadInstance.destroy()
      await this.initializeVAD()

      console.log('✅ [ASRService] VAD 设置已更新')
      return true
    } catch (error) {
      errorUtils.handleError(error, 'ASRService', { showMessage: true })
    }
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks) {
    this.callbackManager.setCallbacks(callbacks)
  }

  /**
   * 销毁服务
   */
  async destroy() {
    try {
      if (this.vadInstance) {
        await this.vadInstance.destroy()
        this.vadInstance = null
      }
      this.isInitialized = false
      this.vadReady = false
      console.log('✅ [ASRService] 服务已销毁')
    } catch (error) {
      errorUtils.handleError(error, 'ASRService', { showMessage: true })
    }
  }

  /**
   * float32 PCM 转 int16 PCM
   */
  float32ToInt16(buffer) {
    let l = buffer.length;
    const result = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return result;
  }
}

// 导出单例
export const asrService = new ASRService()