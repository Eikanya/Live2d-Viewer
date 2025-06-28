<template>
  <div class="voice-settings-container">
    <!-- 顶部状态卡片 -->
    <n-card class="status-card">
      <n-grid :cols="4" :x-gap="12">
        <!-- 系统状态 -->
        <n-grid-item>
          <n-space vertical align="center">
            <n-icon size="24" :color="audioStore.isInitialized ? '#18a058' : '#d03050'">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <path fill="currentColor" d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              </svg>
            </n-icon>
            <n-text>系统状态</n-text>
            <n-tag :type="audioStore.isInitialized ? 'success' : 'error'" size="small">
              {{ audioStore.isInitialized ? '已初始化' : '未初始化' }}
            </n-tag>
          </n-space>
        </n-grid-item>

        <!-- 麦克风权限 -->
        <n-grid-item>
          <n-space vertical align="center">
            <n-icon size="24" :color="micPermissionType === 'success' ? '#18a058' : '#d03050'">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </n-icon>
            <n-text>麦克风权限</n-text>
            <n-tag :type="micPermissionType" size="small">
              {{ micPermissionText }}
            </n-tag>
          </n-space>
        </n-grid-item>

        <!-- 录音状态 -->
        <n-grid-item>
          <n-space vertical align="center">
            <n-icon size="24" :color="audioStore.isRecording ? '#18a058' : '#909399'">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </n-icon>
            <n-text>录音状态</n-text>
            <n-tag :type="audioStore.isRecording ? 'success' : 'default'" size="small">
              {{ audioStore.isRecording ? '录音中' : '未录音' }}
            </n-tag>
          </n-space>
        </n-grid-item>

        <!-- 播放状态 -->
        <n-grid-item>
          <n-space vertical align="center">
            <n-icon size="24" :color="audioStore.isPlaying ? '#18a058' : '#909399'">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
            </n-icon>
            <n-text>播放状态</n-text>
            <n-tag :type="audioStore.isPlaying ? 'success' : 'default'" size="small">
              {{ audioStore.isPlaying ? '播放中' : '未播放' }}
            </n-tag>
          </n-space>
        </n-grid-item>
      </n-grid>

      <!-- 音频电平 -->
      <div class="audio-level">
        <n-space align="center">
          <n-icon size="20" :color="audioStore.audioLevel > 0.8 ? '#d03050' : '#18a058'">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </n-icon>
          <n-progress
            :percentage="audioStore.audioLevel * 100"
            :color="audioStore.audioLevel > 0.8 ? '#d03050' : '#18a058'"
            :height="8"
            :border-radius="4"
          />
        </n-space>
      </div>
    </n-card>

    <!-- 设置卡片 -->
    <n-card class="settings-card">
      <n-tabs type="line" animated>
        <!-- 基本设置 -->
        <n-tab-pane name="basic" tab="基本设置">
          <n-form
            :model="audioStore.audioSettings"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-grid :cols="2" :x-gap="12">
              <n-grid-item>
                <n-form-item label="音量">
                  <n-slider
                    v-model:value="audioStore.audioSettings.volume"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    :tooltip="true"
                    @update:value="updateAudioSettings"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item label="播放速度">
                  <n-slider
                    v-model:value="audioStore.audioSettings.playbackSpeed"
                    :min="0.5"
                    :max="2"
                    :step="0.1"
                    :tooltip="true"
                    @update:value="updateAudioSettings"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>
        </n-tab-pane>

        <!-- 语音检测设置 -->
        <n-tab-pane name="vad" tab="语音检测">
          <n-form
            :model="audioStore.audioSettings"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-grid :cols="2" :x-gap="24">
              <n-grid-item>
                <n-form-item label="语音检测阈值">
                  <n-slider
                    v-model:value="audioStore.audioSettings.vadSettings.positiveSpeechThreshold"
                    :min="0"
                    :max="100"
                    :step="1"
                    :tooltip="true"
                    @update:value="updateVADSettings"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item label="静音检测阈值">
                  <n-slider
                    v-model:value="audioStore.audioSettings.vadSettings.negativeSpeechThreshold"
                    :min="0"
                    :max="100"
                    :step="1"
                    :tooltip="true"
                    @update:value="updateVADSettings"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item label="容错帧数">
                  <n-input-number
                    v-model:value="audioStore.audioSettings.vadSettings.redemptionFrames"
                    :min="1"
                    :max="50"
                    @update:value="updateVADSettings"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>
        </n-tab-pane>

        <!-- 自动控制设置 -->
        <n-tab-pane name="auto" tab="自动控制">
          <n-form
            :model="audioStore.audioSettings"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-grid :cols="2" :x-gap="24">
              <n-grid-item>
                <n-form-item label="自动停止">
                  <n-switch
                    v-model:value="audioStore.audioSettings.autoStopOnSilence"
                    @update:value="updateAudioSettings"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item label="自动麦克风控制">
                  <n-switch
                    v-model:value="audioStore.audioSettings.autoMicControl"
                    @update:value="updateAudioSettings"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 操作按钮 -->
    <n-space justify="center" class="action-buttons">
      <n-button
        type="primary"
        :disabled="!audioStore.isInitialized"
        @click="handleInitialize"
      >
        初始化音频系统
      </n-button>
      <n-button
        :disabled="audioStore.microphonePermission === 'granted'"
        @click="handleRequestPermission"
      >
        请求麦克风权限
      </n-button>
      <n-button
        type="primary"
        :disabled="!audioStore.canRecord"
        @click="handleRecord"
      >
        {{ audioStore.isRecording ? '停止录音' : '开始录音' }}
      </n-button>
    </n-space>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useAudioStore } from '@/stores/audio'
import { useWebSocketStore } from '@/stores/websocket'

const audioStore = useAudioStore()
const webSocketStore = useWebSocketStore()
const message = useMessage()

// 计算属性
const audioStatusText = computed(() => {
  if (!audioStore.isInitialized) return '未初始化'
  if (audioStore.microphonePermission === 'denied') return '无麦克风权限'
  if (audioStore.isRecording) return '录音中'
  if (audioStore.isPlaying) return '播放中'
  return '就绪'
})

const micPermissionType = computed(() => {
  switch (audioStore.microphonePermission) {
    case 'granted':
      return 'success'
    case 'denied':
      return 'error'
    default:
      return 'warning'
  }
})

const micPermissionText = computed(() => {
  switch (audioStore.microphonePermission) {
    case 'granted':
      return '已授权'
    case 'denied':
      return '已拒绝'
    default:
      return '未请求'
  }
})

// 音频设置选项
const sampleRateOptions = [
  { label: '16kHz', value: 16000 },
  { label: '44.1kHz', value: 44100 },
  { label: '48kHz', value: 48000 }
]

const channelOptions = [
  { label: '单声道', value: 1 },
  { label: '立体声', value: 2 }
]

// 状态
const isInitialized = ref(false)
const isRecording = ref(false)
const isPlaying = ref(false)
const audioLevel = ref(0)

// 定时器
let levelTimer = null
let statusTimer = null

// 初始化音频系统
const handleInitialize = async () => {
  try {
    await audioStore.initializeAudio()
    message.success('音频系统初始化成功')
  } catch (error) {
    console.error('初始化音频系统失败:', error)
    message.error('初始化音频系统失败')
  }
}

// 请求麦克风权限
const handleRequestPermission = async () => {
  try {
    await audioStore.requestMicrophonePermission()
    message.success('麦克风权限请求成功')
  } catch (error) {
    console.error('请求麦克风权限失败:', error)
    message.error('请求麦克风权限失败')
  }
}

// 更新 VAD 设置
const updateVADSettings = async () => {
  try {
    const settings = {
      positiveSpeechThreshold: audioStore.audioSettings.vadSettings.positiveSpeechThreshold,
      negativeSpeechThreshold: audioStore.audioSettings.vadSettings.negativeSpeechThreshold,
      redemptionFrames: audioStore.audioSettings.vadSettings.redemptionFrames
    }
    await audioStore.updateVADSettings(settings)
    message.success('VAD 设置已更新')
  } catch (error) {
    console.error('更新 VAD 设置失败:', error)
    message.error('更新 VAD 设置失败')
  }
}

// 更新音频设置
const updateAudioSettings = async () => {
  try {
    await audioStore.updateAudioSettings()
    console.log('✅ 音频设置已更新')
  } catch (error) {
    console.error('❌ 更新音频设置失败:', error)
  }
}

// 更新音频电平
const updateAudioLevel = () => {
  audioLevel.value = audioStore.audioLevel
}

// 更新播放状态
const updatePlaybackStatus = () => {
  isPlaying.value = audioStore.isPlaying
}

// 检查音频系统状态
const checkAudioStatus = async () => {
  try {
    // 检查初始化状态
    if (!audioStore.isInitialized) {
      await audioStore.initializeAudio()
    }
    
    // 检查麦克风权限
    if (audioStore.microphonePermission === 'prompt') {
      await audioStore.checkMicrophonePermission()
    }
    
    console.log('✅ 音频系统状态检查完成')
  } catch (error) {
    console.error('❌ 检查音频系统状态失败:', error)
  }
}

// 处理录音
const handleRecord = async () => {
  try {
    if (audioStore.isRecording) {
      await audioStore.stopRecording()
    } else {
      await audioStore.startRecording()
    }
  } catch (error) {
    console.error('录音操作失败:', error)
    message.error('录音操作失败')
  }
}

// 初始化
onMounted(() => {
  checkAudioStatus()
  levelTimer = setInterval(updateAudioLevel, 100)
  statusTimer = setInterval(updatePlaybackStatus, 100)
})

onUnmounted(() => {
  if (levelTimer) clearInterval(levelTimer)
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<style scoped>
.voice-settings-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.status-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.settings-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.audio-level {
  margin-top: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.action-buttons {
  margin-top: 24px;
}

:deep(.n-card) {
  background: #ffffff;
}

:deep(.n-form-item) {
  margin-bottom: 24px;
}

:deep(.n-slider) {
  width: 100%;
}

:deep(.n-input-number) {
  width: 120px;
}

:deep(.n-tabs-nav) {
  margin-bottom: 24px;
}

:deep(.n-tab-pane) {
  padding: 16px 0;
}

:deep(.n-grid-item) {
  padding: 8px;
}

:deep(.n-progress) {
  width: 100%;
}

:deep(.n-space) {
  width: 100%;
}
</style>
