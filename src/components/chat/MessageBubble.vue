<template>
  <div class="message-bubble" :class="bubbleClass">
    <!-- AI消息 -->
    <n-space v-if="message.sender === 'ai'" :align="'flex-start'" :size="8">
      <!-- AI头像 -->
      <n-avatar
        v-if="showAvatar"
        size="small"
        round
        src="/assets/ai-avatar.png"
        :fallback-src="'/assets/ai-avatar-fallback.png'"
      />
      
      <div class="ai-response-bubble" :class="{ 'is-streaming': message.metadata?.isStreaming }">
        <div class="bubble-content">
          <div class="message-text">
            <n-text>{{ displayText }}</n-text>
            <div v-if="message.metadata?.isStreaming" class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <!-- 音频指示器（仅显示有音频，实际播放由 ChatStore 统一管理） -->
          <div v-if="hasAudio" class="audio-indicator">
            <n-space align="center" size="small">
              <n-icon size="16" color="var(--n-primary-color)">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </n-icon>
              <n-text depth="3" style="font-size: 12px;">
                包含音频回复
              </n-text>
            </n-space>
          </div>

          <div class="message-timestamp">
            <n-space align="center" size="small">
              <n-text depth="3">{{ formatTimestamp(message.timestamp) }}</n-text>

              <!-- AI消息保存状态指示器 -->
              <div v-if="message.metadata" class="ai-message-status">
                <n-icon
                  size="12"
                  :color="getAIStatusColor(message.metadata)"
                  :title="getAIStatusText(message.metadata)"
                >
                  <!-- 已保存 -->
                  <svg v-if="message.metadata.isSaved" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <!-- 流式传输中 -->
                  <svg v-else-if="message.metadata.isStreaming" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <!-- 已完成但未保存 -->
                  <svg v-else viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 16.17l6.59-6.59L19 11l-8 8z"/>
                  </svg>
                </n-icon>
              </div>
            </n-space>
          </div>
        </div>
      </div>
    </n-space>

    <!-- 用户消息和系统消息 -->
    <n-space v-else :align="message.sender === 'user' ? 'flex-end' : 'center'" :size="8">
      <!-- 消息内容 -->
      <div class="message-content" :class="contentClass">
        <!-- 消息文本 -->
        <div v-if="message.content" class="message-text">
          <n-text>{{ message.content }}</n-text>
        </div>

        <!-- 系统消息 -->
        <div v-if="message.type === 'system'" class="message-system">
          <n-text depth="3" style="font-style: italic;">
            {{ message.content }}
          </n-text>
        </div>

        <!-- 时间戳和状态 -->
        <div v-if="showTimestamp" class="message-timestamp">
          <n-space align="center" size="small">
            <n-text depth="3" style="font-size: 11px;">
              {{ formatTimestamp(message.timestamp) }}
            </n-text>

            <!-- 消息状态指示器 -->
            <div v-if="message.sender === 'user' && message.metadata?.status" class="message-status">
              <n-icon
                size="12"
                :color="getStatusColor(message.metadata.status)"
                :title="getStatusText(message.metadata.status)"
              >
                <svg v-if="message.metadata.status === 'sending'" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <svg v-else-if="message.metadata.status === 'sent'" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <svg v-else-if="message.metadata.status === 'failed'" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </n-icon>
            </div>
          </n-space>
        </div>
      </div>

      <!-- 用户头像 -->
      <n-avatar
        v-if="showAvatar && message.sender === 'user'"
        size="small"
        round
        src="/assets/user-avatar.png"
        :fallback-src="'/assets/user-avatar-fallback.png'"
      />
    </n-space>
  </div>
</template>

<script>
import { computed, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

export default {
  name: 'MessageBubble',
  emits: ['regenerate'],
  props: {
    message: {
      type: Object,
      required: true
    },
    showAvatar: {
      type: Boolean,
      default: true
    },
    showTimestamp: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const chatStore = useChatStore()

    // 计算属性
    const bubbleClass = computed(() => {
      return {
        'bubble-user': props.message.sender === 'user',
        'bubble-ai': props.message.sender === 'ai',
        'bubble-system': props.message.sender === 'system'
      }
    })

    const contentClass = computed(() => {
      return {
        'content-user': props.message.sender === 'user',
        'content-ai': props.message.sender === 'ai',
        'content-system': props.message.sender === 'system'
      }
    })

    const displayText = computed(() => {

      // 优先使用allDisplayTexts数组（用于音频响应）
      if (props.message.metadata && Array.isArray(props.message.metadata.allDisplayTexts) && props.message.metadata.allDisplayTexts.length > 0) {
        const uniqueTexts = []
        const seenTexts = new Set()

        props.message.metadata.allDisplayTexts.forEach(item => {
          let text = ''
          if (typeof item === 'object' && item.text) {
            text = item.text
          } else if (typeof item === 'string') {
            text = item
          }

          if (text && !seenTexts.has(text)) {
            seenTexts.add(text)
            uniqueTexts.push(text)
          }
        })

        return uniqueTexts.join('')
      }

      // 新增：如果是语音识别文本
      if (props.message.type === 'user-input-transcription' && props.message.content) {
        return props.message.content
      }

      // 使用content字段（用于简单文本响应）
      const result = props.message.content || ''

      // 如果content是"Thinking..."但有allDisplayTexts，优先显示allDisplayTexts
      if (result === 'Thinking...' && props.message.metadata?.allDisplayTexts?.length > 0) {
        // 直接处理allDisplayTexts
        const uniqueTexts = []
        const seenTexts = new Set()

        props.message.metadata.allDisplayTexts.forEach(item => {
          let text = ''
          if (typeof item === 'object' && item.text) {
            text = item.text
          } else if (typeof item === 'string') {
            text = item
          }

          if (text && !seenTexts.has(text)) {
            seenTexts.add(text)
            uniqueTexts.push(text)
          }
        })

        return uniqueTexts.join('')
      }

      return result
    })

    // 音频指示器
    const hasAudio = computed(() => {
      return props.message.audio && props.message.sender === 'ai'
    })

    // 方法
    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) {
        return '刚刚'
      } else if (diffMins < 60) {
        return `${diffMins}分钟前`
      } else if (diffHours < 24) {
        return `${diffHours}小时前`
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else {
        return date.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }

    const getStatusColor = (status) => {
      switch (status) {
        case 'sending': return '#f0a020'
        case 'sent': return '#18a058'
        case 'failed': return '#d03050'
        default: return '#909399'
      }
    }

    const getStatusText = (status) => {
      switch (status) {
        case 'sending': return '发送中'
        case 'sent': return '已发送'
        case 'failed': return '发送失败'
        default: return '未知状态'
      }
    }

    // AI消息状态处理
    const getAIStatusColor = (metadata) => {
      if (metadata.isSaved) {
        return '#18a058' // 绿色 - 已保存
      } else if (metadata.isStreaming) {
        return '#f0a020' // 橙色 - 流式传输中
      } else {
        return '#909399' // 灰色 - 已完成但未保存
      }
    }

    const getAIStatusText = (metadata) => {
      if (metadata.isSaved) {
        const saveTime = metadata.saveTimestamp ? new Date(metadata.saveTimestamp).toLocaleTimeString() : ''
        return `已保存到历史记录${saveTime ? ` (${saveTime})` : ''}`
      } else if (metadata.isStreaming) {
        return 'AI正在回复中...'
      } else if (metadata.status === 'completed') {
        return '回复已完成，等待保存'
      } else {
        return '已接收，等待保存确认'
      }
    }

    // 添加自动滚动功能
    const scrollToBottom = () => {
      // 只有在开启自动滚动时才执行滚动
      if (chatStore.chatSettings.autoScroll) {
        nextTick(() => {
          const container = document.querySelector('.messages-scrollbar')
          if (container) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            })
          }
        })
      }
    }

    // 监听消息内容变化，自动滚动
    watch(() => props.message.content, () => {
      scrollToBottom()
    })

    // 监听消息元数据变化，自动滚动
    watch(() => props.message.metadata?.isStreaming, (newValue) => {
      if (newValue) {
        scrollToBottom()
      }
    })

    return {
      bubbleClass,
      contentClass,
      hasAudio,
      displayText,
      formatTimestamp,
      getStatusColor,
      getStatusText,
      getAIStatusColor,
      getAIStatusText
    }
  }
}
</script>

<style scoped>
.message-bubble {
  max-width: 95%;
  min-width: 120px;
  margin: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  animation: fadeIn 0.3s ease-out;
}

.bubble-user {
  align-items: flex-end;
}

.bubble-ai {
  align-items: flex-start;
}

/* 用户气泡（右侧，蓝色） */
.content-user {
  background: linear-gradient(135deg, #4f9cff 0%, #1976d2 100%);
  color: #fff;
  border-radius: 18px 4px 18px 18px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  padding: 12px 18px;
  position: relative;
  margin-left: 40px;
  margin-right: 0;
  max-width: 420px;
  word-break: break-word;
}
.content-user::after {
  content: '';
  position: absolute;
  right: -10px;
  top: 16px;
  border-width: 8px 0 8px 10px;
  border-style: solid;
  border-color: transparent transparent transparent #1976d2;
}

/* AI气泡（左侧，灰色） */
.content-ai, .bubble-content {
  background: #f5f6fa;
  color: #222;
  border-radius: 4px 18px 18px 18px;
  box-shadow: 0 2px 8px rgba(60, 60, 60, 0.06);
  padding: 12px 18px;
  position: relative;
  margin-right: 40px;
  margin-left: 0;
  max-width: 420px;
  word-break: break-word;
}
.content-ai::after, .bubble-content::after {
  content: '';
  position: absolute;
  left: -10px;
  top: 16px;
  border-width: 8px 10px 8px 0;
  border-style: solid;
  border-color: transparent #f5f6fa transparent transparent;
}

/* 头像紧贴气泡 */
.n-avatar {
  margin: 0 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.message-timestamp {
  margin-top: 4px;
  font-size: 11px;
  text-align: right;
  opacity: 0.7;
  color: #888;
}

/* 系统消息 */
.content-system {
  background: #e0e0e0;
  color: #666;
  border-radius: 12px;
  padding: 8px 14px;
  margin: 0 auto;
  max-width: 320px;
  font-style: italic;
}

/* 其他保留原有样式 */
.audio-indicator {
  margin: 8px 0 4px 0;
  padding: 6px 10px;
  background: var(--n-color-embedded);
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  opacity: 0.8;
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  height: 20px;
}

.typing-indicator span {
  width: 4px;
  height: 4px;
  margin: 0 2px;
  background-color: #888;
  border-radius: 50%;
  opacity: 0.6;
  animation: typing 1s infinite ease-in-out;
}

@media (max-width: 768px) {
  .content-user, .content-ai, .bubble-content {
    max-width: 90vw;
    padding: 10px 12px;
    font-size: 14px;
  }
}

@keyframes typing {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 音频指示器样式 */
.audio-indicator :deep(.n-icon) {
  opacity: 0.7;
}
</style>
