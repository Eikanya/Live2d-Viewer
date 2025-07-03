<template>
  <n-card title="AI 控制面板" size="small" class="ai-control-panel">
    <template #header-extra>
      <n-space size="small">
        <n-tag size="small" :type="connectionBadgeType">
          {{ connectionStatusText }}
        </n-tag>
      </n-space>
    </template>

    <n-space vertical size="large">
      <!-- 快速聊天输入区域 -->
      <n-card title="快速聊天" size="small" :bordered="false" embedded>
        <n-space vertical size="medium">
          <n-input
            v-model:value="inputText"
            type="textarea"
            placeholder="输入消息与AI对话..."
            :rows="3"
            :maxlength="500"
            show-count
            clearable
            :disabled="!webSocketStore.isConnected || chatStore.isTyping"
            @keydown="handleKeyDown"
          />

          <n-space vertical size="small">
            <!-- VAD状态指示器 -->
            <div v-if="isVoiceChatting" class="vad-status">
              <n-space align="center" size="small">
                <div class="vad-indicator" :class="{ 'active': audioStore.voiceDetected }">
                  <div class="vad-dot"></div>
                </div>
                <n-text size="small" :depth="audioStore.voiceDetected ? 1 : 3">
                  {{ audioStore.voiceDetected ? '检测到语音' : '等待语音...' }}
                </n-text>
              </n-space>
            </div>

            <n-space justify="space-between" align="center">
              <!-- 语音对话按钮 -->
              <n-tooltip placement="top" :disabled="webSocketStore.isConnected && chatStore.chatSettings.enableVoiceInput">
                <template #trigger>
                  <n-button
                    :type="isVoiceChatting ? 'warning' : 'default'"
                    @click="toggleVoiceChat"
                    :disabled="!webSocketStore.isConnected || !chatStore.chatSettings.enableVoiceInput"
                  >
                    <template #icon>
                      <n-icon>
                        <svg v-if="isVoiceChatting" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M6 19h12V5H6v14z"/>
                        </svg>
                        <svg v-else viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                        </svg>
                      </n-icon>
                    </template>
                    {{ isVoiceChatting ? '停止语音对话' : '开始语音对话' }}
                  </n-button>
                </template>
                <span v-if="!webSocketStore.isConnected">
                  请先连接服务器
                </span>
                <span v-else-if="!chatStore.chatSettings.enableVoiceInput">
                  请先在设置中开启语音输入
                </span>
              </n-tooltip>

              <!-- 发送按钮 -->
              <n-button
                type="primary"
                :disabled="!inputText.trim() || !webSocketStore.isConnected || chatStore.isTyping"
                :loading="chatStore.isTyping"
                @click="handleSendMessage"
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </n-icon>
                </template>
                {{ chatStore.isTyping ? '发送中...' : '发送' }}
              </n-button>
            </n-space>
          </n-space>
        </n-space>
      </n-card>

      <!-- 设置选项区域 -->
      <n-card title="聊天设置" size="small" :bordered="false" embedded>
        <n-space vertical size="medium">
          <n-space justify="space-between" align="center">
            <n-text>自动播放语音</n-text>
            <n-switch v-model:value="chatStore.chatSettings.autoPlayAudio" />
          </n-space>

          <n-space justify="space-between" align="center">
            <n-text>显示字幕</n-text>
            <n-switch v-model:value="subtitleStore.showSubtitle" />
          </n-space>

          <n-space justify="space-between" align="center">
            <n-text>语音输入</n-text>
            <n-switch 
              v-model:value="chatStore.chatSettings.enableVoiceInput"
              @update:value="handleVoiceInputToggle"
            />
          </n-space>
        </n-space>
      </n-card>

    </n-space>
  </n-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useWebSocketStore } from '@/stores/websocket'
import { useChatStore } from '@/stores/chat'
import { useSubtitleStore } from '@/stores/subtitle'
import { useAudioStore } from '@/stores/audio'
import { audioService } from '@/services/AudioService.js'

const webSocketStore = useWebSocketStore()
const chatStore = useChatStore()
const subtitleStore = useSubtitleStore()
const audioStore = useAudioStore()
const message = useMessage()

const inputText = ref('')
const isVoiceChatting = ref(false)

const connectionBadgeType = computed(() => webSocketStore.isConnected ? 'success' : 'error')
const connectionStatusText = computed(() => webSocketStore.isConnected ? '已连接' : '未连接')

const handleSendMessage = async () => {
  if (!inputText.value.trim()) return
  
  try {
    // 使用 chatStore 的发送方法，确保消息能正确同步到 ChatInterface.vue
    await chatStore.sendTextMessage(inputText.value.trim())
    inputText.value = ''
    message.success('消息已发送')
  } catch (error) {
    console.error('发送消息失败:', error)
    message.error('发送消息失败')
  }
}

const handleKeyDown = (e) => {
  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault()
    handleSendMessage()
  }
}

const toggleVoiceChat = async () => {
  if (!chatStore.chatSettings.enableVoiceInput) {
    message.warning('请先在聊天设置中开启语音输入')
    return
  }
  
  if (isVoiceChatting.value) {
    // 停止语音对话 - 只停止VAD监听，不发送消息
    try {
      await audioStore.stopRecording()
      isVoiceChatting.value = false
      audioService.setCallbacks({ onAudioData: null })
      message.info('语音对话已停止')
    } catch (error) {
      console.error('停止语音对话失败:', error)
      message.error('停止语音对话失败')
    }
  } else {
    // 开始语音对话 - 只启动VAD监听，不发送消息
    try {
      await audioStore.initializeAudio()
      await audioStore.startRecording()
      isVoiceChatting.value = true
      
      audioService.setCallbacks({
        onAudioData: (data, level) => {
          // 兼容 { data: Float32Array } 结构
          let raw = data
          if (data && typeof data === 'object' && data.data instanceof Float32Array) {
            raw = data.data
          }
          // 只允许 Float32Array 或 Int16Array
          if (!(raw instanceof Float32Array || raw instanceof Int16Array)) {
            console.warn('[AIControlPanel] onAudioData received invalid data:', data)
            return
          }
          // 使用VAD检测语音活动，仅在检测到语音时发送音频数据
          if (raw.length > 0 && webSocketStore.isConnected && audioStore.voiceDetected) {
            try {
              webSocketStore.sendAudioData(raw)
            } catch (e) {
              console.error('发送音频数据失败:', e)
            }
          }
        }
      })
      message.success('语音对话已开始，请开始说话')
    } catch (error) {
      console.error('启动语音对话失败:', error)
      message.error('启动语音对话失败')
      isVoiceChatting.value = false
    }
  }
}

const handleVoiceInputToggle = (value) => {
  // 关闭语音输入时可做清理
  if (!value) {
    if (isVoiceChatting.value) {
      // 如果正在语音对话，停止语音对话
      audioService.setCallbacks({ onAudioData: null })
      audioStore.stopRecording()
      isVoiceChatting.value = false
      message.info('语音输入已关闭')
    }
  }
}

// 使用VAD检测语音活动，静音时发送mic-audio-end
watch(
  () => audioStore.voiceDetected,
  async (val, oldVal) => {
    if (
      isVoiceChatting.value &&
      oldVal === true &&
      val === false // 检测到从有声变为静音
    ) {
      // 发送mic-audio-end信号，但不停止录音
      await webSocketStore.sendAudioEnd()
    }
  }
)

onUnmounted(() => {
  // 组件卸载时停止语音对话
  if (isVoiceChatting.value) {
    audioService.setCallbacks({ onAudioData: null })
    audioStore.stopRecording()
    isVoiceChatting.value = false
  }
})

// 建议添加键盘快捷键
const handleGlobalKeydown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    // 发送消息
  }
  if (e.ctrlKey && e.key === 'n') {
    // 新建对话
  }
}

const handleStopAudio = async () => {
  try {
    await chatStore.stopAISpeaking()
    message.info('已停止语音并打断AI说话')
  } catch (error) {
    message.error('停止语音失败')
  }
}
</script>

<style scoped>
.ai-control-panel {
  width: 100%;
  margin: 0 auto;
  height: 350px;
  max-height: 800px;
  overflow-y: auto;
}

.recognition-result {
  padding: 8px;
  background-color: var(--n-color-modal);
  border-radius: 4px;
  margin-top: 8px;
}

:deep(.n-card), :deep(.n-space), :deep(.n-input) {
  width: 100%;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

/* VAD状态指示器样式 */
.vad-status {
  padding: 8px 12px;
  background: var(--n-color-modal);
  border-radius: 6px;
  border: 1px solid var(--n-border-color);
}

.vad-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--n-text-color-disabled);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.vad-indicator.active {
  background: var(--n-success-color);
  box-shadow: 0 0 8px rgba(24, 160, 88, 0.4);
}

.vad-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  animation: vad-pulse 1.5s ease-in-out infinite;
}

.vad-indicator.active .vad-dot {
  animation: vad-pulse-active 0.8s ease-in-out infinite;
}

@keyframes vad-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes vad-pulse-active {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
