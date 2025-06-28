<template>
  <div class="voice-settings-container">
    <!-- 状态卡片 -->
    <n-card class="status-card">
      <n-grid :cols="4" :x-gap="12">
        <n-grid-item>
          <n-statistic label="录音状态">
            <template #prefix>
              <n-icon :color="isRecording ? '#ff4d4f' : '#52c41a'">
                <record-icon v-if="isRecording" />
                <stop-icon v-else />
              </n-icon>
            </template>
            {{ isRecording ? '录音中' : '未录音' }}
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="播放状态">
            <template #prefix>
              <n-icon :color="isPlaying ? '#1890ff' : '#8c8c8c'">
                <play-icon v-if="isPlaying" />
                <pause-icon v-else />
              </n-icon>
            </template>
            {{ isPlaying ? '播放中' : '未播放' }}
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="音频电平">
            <template #prefix>
              <n-icon :color="audioLevel > 0.5 ? '#ff4d4f' : '#52c41a'">
                <volume-icon />
              </n-icon>
            </template>
            {{ Math.round(audioLevel * 100) }}%
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="系统状态">
            <template #prefix>
              <n-icon :color="isInitialized ? '#52c41a' : '#ff4d4f'">
                <check-icon v-if="isInitialized" />
                <close-icon v-else />
              </n-icon>
            </template>
            {{ isInitialized ? '已初始化' : '未初始化' }}
          </n-statistic>
        </n-grid-item>
      </n-grid>
    </n-card>

    <!-- 音频电平显示 -->
    <div class="audio-level">
      <n-progress
        :percentage="audioLevel * 100"
        :color="{
          from: '#108ee9',
          to: audioLevel > 0.5 ? '#ff4d4f' : '#52c41a'
        }"
        :indicator-placement="'inside'"
      >
        {{ Math.round(audioLevel * 100) }}%
      </n-progress>
    </div>

    <!-- 设置区域 -->
    <n-card class="settings-card">
      <n-tabs type="line" animated>
        <!-- 基本设置 -->
        <n-tab-pane name="basic" tab="基本设置">
          <n-form
            ref="formRef"
            :model="audioSettings"
            :rules="rules"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-form-item label="音量" path="volume">
              <n-slider
                v-model:value="audioSettings.volume"
                :min="0"
                :max="1"
                :step="0.1"
                :tooltip="true"
                @update:value="handleSettingsChange"
              />
            </n-form-item>
            <n-form-item label="播放速度" path="playbackSpeed">
              <n-slider
                v-model:value="audioSettings.playbackSpeed"
                :min="0.5"
                :max="2"
                :step="0.1"
                :tooltip="true"
                @update:value="handleSettingsChange"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- 语音检测设置 -->
        <n-tab-pane name="detection" tab="语音检测设置">
          <n-form
            ref="formRef"
            :model="audioSettings"
            :rules="rules"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-form-item label="静音超时" path="silenceTimeout">
              <n-input-number
                v-model:value="audioSettings.silenceTimeout"
                :min="1000"
                :max="10000"
                :step="100"
                @update:value="handleSettingsChange"
              />
            </n-form-item>
            <n-form-item label="自动停止" path="autoStopOnSilence">
              <n-switch
                v-model:value="audioSettings.autoStopOnSilence"
                @update:value="handleSettingsChange"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- 自动控制设置 -->
        <n-tab-pane name="auto" tab="自动控制设置">
          <n-form
            ref="formRef"
            :model="autoControlSettings"
            :rules="autoControlRules"
            label-placement="left"
            label-width="auto"
            require-mark-placement="right-hanging"
          >
            <n-form-item label="自动播放" path="autoPlay">
              <n-switch
                v-model:value="autoControlSettings.autoPlay"
                @update:value="handleAutoControlChange"
              />
            </n-form-item>
            <n-form-item label="自动停止" path="autoStop">
              <n-switch
                v-model:value="autoControlSettings.autoStop"
                @update:value="handleAutoControlChange"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <n-button
        type="primary"
        :disabled="!isInitialized"
        @click="handleRecord"
      >
        {{ isRecording ? '停止录音' : '开始录音' }}
      </n-button>
      <n-button
        type="info"
        :disabled="!isInitialized || !isPlaying"
        @click="handleStop"
      >
        停止播放
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAudioStore } from '@/stores/audio'
import { useAutoControlStore } from '@/stores/autoControl'
import {
  Record as RecordIcon,
  Stop as StopIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume as VolumeIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@vicons/ionicons5'

// 状态
const isInitialized = ref(false)
const isRecording = ref(false)
const isPlaying = ref(false)
const audioLevel = ref(0)

// 音频设置
const audioSettings = ref({
  volume: 1.0,
  playbackSpeed: 1.0,
  silenceTimeout: 2000,
  autoStopOnSilence: true
})

// 自动控制设置
const autoControlSettings = ref({
  autoPlay: true,
  autoStop: true
})

// 表单验证规则
const rules = {
  volume: {
    type: 'number',
    required: true,
    min: 0,
    max: 1,
    message: '音量必须在 0-1 之间'
  },
  playbackSpeed: {
    type: 'number',
    required: true,
    min: 0.5,
    max: 2,
    message: '播放速度必须在 0.5-2 之间'
  },
  silenceTimeout: {
    type: 'number',
    required: true,
    min: 1000,
    max: 10000,
    message: '静音超时必须在 1000-10000 毫秒之间'
  }
}

const autoControlRules = {
  autoPlay: {
    type: 'boolean',
    required: true
  },
  autoStop: {
    type: 'boolean',
    required: true
  }
}

// 获取 store
const audioStore = useAudioStore()
const autoControlStore = useAutoControlStore()

// 初始化
onMounted(async () => {
  try {
    await audioStore.initialize()
    isInitialized.value = true
    console.log('✅ 音频系统初始化成功')
  } catch (error) {
    console.error('❌ 音频系统初始化失败:', error)
  }
})

// 清理
onUnmounted(() => {
  if (isRecording.value) {
    audioStore.stopRecording()
  }
  if (isPlaying.value) {
    audioStore.stopPlayback()
  }
})

// 处理录音
const handleRecord = async () => {
  try {
    if (isRecording.value) {
      await audioStore.stopRecording()
      isRecording.value = false
    } else {
      await audioStore.startRecording()
      isRecording.value = true
    }
  } catch (error) {
    console.error('录音操作失败:', error)
  }
}

// 处理停止
const handleStop = async () => {
  try {
    await audioStore.stopPlayback()
    isPlaying.value = false
  } catch (error) {
    console.error('停止播放失败:', error)
  }
}

// 处理设置变更
const handleSettingsChange = async () => {
  try {
    await audioStore.updateAudioSettings()
    console.log('✅ 音频设置已更新')
  } catch (error) {
    console.error('❌ 更新音频设置失败:', error)
  }
}

// 处理自动控制设置变更
const handleAutoControlChange = async () => {
  try {
    await autoControlStore.updateSettings(autoControlSettings.value)
    console.log('✅ 自动控制设置已更新')
  } catch (error) {
    console.error('❌ 更新自动控制设置失败:', error)
  }
}

// 监听音频电平
const updateAudioLevel = () => {
  audioLevel.value = audioStore.audioLevel
}

// 监听播放状态
const updatePlaybackStatus = () => {
  isPlaying.value = audioStore.isPlaying
}

// 设置定时器
let levelTimer = null
let statusTimer = null

onMounted(() => {
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
  display: flex;
  justify-content: center;
  gap: 16px;
}
</style> 