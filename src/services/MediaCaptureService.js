/**
 * 媒体捕获服务 - 处理摄像头和屏幕捕获
 */
class MediaCaptureService {
  constructor() {
    this.cameraStream = null
    this.screenStream = null
    this.isInitialized = false
  }

  /**
   * 初始化媒体捕获服务
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('⚠️ [MediaCaptureService] 媒体捕获服务已初始化')
      return true
    }

    try {
      console.log('📷 [MediaCaptureService] 开始初始化媒体捕获服务')
      
      // 请求摄像头权限
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })

      this.isInitialized = true
      console.log('✅ [MediaCaptureService] 媒体捕获服务初始化成功')
      return true
    } catch (error) {
      console.error('❌ [MediaCaptureService] 媒体捕获服务初始化失败:', error)
      this.isInitialized = false
      throw error
    }
  }

  /**
   * 开始屏幕捕获
   */
  async startScreenCapture() {
    try {
      const displayMediaOptions = {
        video: true,
        audio: false
      }
      
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
      return true
    } catch (error) {
      console.error('❌ [MediaCaptureService] 开始屏幕捕获失败:', error)
      throw error
    }
  }

  /**
   * 停止屏幕捕获
   */
  stopScreenCapture() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }
  }

  /**
   * 捕获所有媒体
   */
  async captureAllMedia() {
    const images = []

    // 捕获摄像头图像
    if (this.cameraStream) {
      const cameraFrame = await this.captureFrame(this.cameraStream, 'camera')
      if (cameraFrame) {
        images.push({
          source: 'camera',
          data: cameraFrame,
          mime_type: 'image/jpeg'
        })
      }
    }

    // 捕获屏幕图像
    if (this.screenStream) {
      const screenFrame = await this.captureFrame(this.screenStream, 'screen')
      if (screenFrame) {
        images.push({
          source: 'screen',
          data: screenFrame,
          mime_type: 'image/jpeg'
        })
      }
    }

    return images
  }

  /**
   * 捕获单个媒体流的一帧
   */
  async captureFrame(stream, source) {
    if (!stream) {
      console.warn(`⚠️ [MediaCaptureService] 没有可用的${source}流`)
      return null
    }

    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) {
      console.warn(`⚠️ [MediaCaptureService] ${source}流中没有视频轨道`)
      return null
    }

    try {
      const imageCapture = new ImageCapture(videoTrack)
      const bitmap = await imageCapture.grabFrame()
      
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法获取canvas上下文')
      }

      ctx.drawImage(bitmap, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.error(`❌ [MediaCaptureService] 捕获${source}帧失败:`, error)
      return null
    }
  }

  /**
   * 销毁媒体捕获服务
   */
  destroy() {
    console.log('🗑️ [MediaCaptureService] 销毁媒体捕获服务')

    // 停止摄像头流
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop())
      this.cameraStream = null
    }

    // 停止屏幕流
    this.stopScreenCapture()

    this.isInitialized = false
  }
}

export const mediaCaptureService = new MediaCaptureService() 