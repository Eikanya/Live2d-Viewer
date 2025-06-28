<template>
  <div class="chat-interface-wrapper">
    <n-scrollbar class="scrollable-content">
      <div class="chat-interface-container">
      <!-- AI状态指示器 -->
      <div class="ai-status-section">
      </div>

      <!-- 主聊天界面 -->
      <n-card :bordered="false" class="chat-interface">
        <!-- 聊天头部 -->
        <template #header>
          <n-space justify="space-between" align="center">
            <div class="chat-header-info">
              <n-space align="center" size="medium">
                <n-text strong style="font-size: 16px;">AI 智能对话</n-text>
                <n-tag
                  :type="webSocketStore.isConnected ? 'success' : 'error'"
                  size="small"
                  :bordered="false"
                >
                  {{ connectionStatus }}
                </n-tag>
                <n-text v-if="currentChatTitle" depth="2" style="font-size: 13px;">
                  {{ currentChatTitle }}
                </n-text>
              </n-space>
            </div>

            <n-space size="small">
              <!-- 历史记录按钮 -->
              <n-button
                quaternary
                circle
                @click="showHistoryDrawer = true"
                title="历史记录"
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l4 3.99L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                  </n-icon>
                </template>
              </n-button>

              <!-- 新建对话按钮 -->
              <n-tooltip placement="top" :disabled="webSocketStore.isConnected">
                <template #trigger>
                  <n-button
                    type="primary"
                    size="small"
                    @click="handleCreateNewHistory"
                    :disabled="!webSocketStore.isConnected"
                  >
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </n-icon>
                    </template>
                    新建对话
                  </n-button>
                </template>
                <span v-if="!webSocketStore.isConnected">
                  请先连接服务器
                </span>
              </n-tooltip>

              <!-- 设置按钮 -->
              <n-button
                quaternary
                circle
                @click="showSettingsModal = true"
                title="设置"
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                    </svg>
                  </n-icon>
                </template>
              </n-button>
            </n-space>
          </n-space>
        </template>

        <!-- 聊天消息区域 -->
        <div class="chat-content">
          <n-scrollbar ref="scrollbar" class="messages-scrollbar">
            <div class="messages-container">
              <!-- 空状态提示 -->
              <div v-if="chatStore.messages.length === 0" class="empty-chat">
                <n-empty description="开始新的对话吧！" size="large">
                  <template #icon>
                    <n-icon size="64" color="var(--n-text-color-disabled)">
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                      </svg>
                    </n-icon>
                  </template>
                  <template #extra>
                    <n-space>
                      <n-button size="small" @click="handleCreateNewHistory">
                        开始对话
                      </n-button>
                    </n-space>
                  </template>
                </n-empty>
              </div>

              <!-- 消息列表 -->
              <div
                v-for="(message, idx) in chatStore.messages"
                :key="message.id || idx"
                :class="['message-wrapper', message.sender === 'user' ? 'message-user' : 'message-ai']"
              >
                <MessageBubble
                  :message="message"
                  :show-avatar="chatStore.chatSettings.showAvatar"
                  :show-timestamp="chatStore.chatSettings.showTimestamp"
                  @regenerate="handleRegenerate"
                />
              </div>

              <!-- 打字指示器 -->
              <div v-if="chatStore.isTyping" class="message-wrapper message-ai">
                <div class="typing-indicator">
                  <n-space align="center">
                    <n-avatar size="small" round style="background: var(--n-primary-color);">
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c.93 0 1.69.76 1.69 1.69S12.93 8.38 12 8.38s-1.69-.76-1.69-1.69S11.07 5 12 5zm0 9.38c-2.03 0-3.78-.92-4.97-2.34.03-.31.17-.6.43-.82.26-.22.6-.34.96-.34h7.16c.36 0 .7.12.96.34.26.22.4.51.43.82-1.19 1.42-2.94 2.34-4.97 2.34z"/>
                        </svg>
                      </n-icon>
                    </n-avatar>
                    <n-text depth="2">AI正在思考</n-text>
                    <div class="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </n-space>
                </div>
              </div>
            </div>
          </n-scrollbar>
        </div>
        <div class="input-container">
          <div class="input-wrapper">
            <n-input
              v-model:value="inputText"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="输入消息..."
              @keydown="handleKeyDown"
            />
            <n-button
              type="primary"
              :disabled="!inputText.trim() || !webSocketStore.isConnected || chatStore.isTyping"
              :loading="chatStore.isTyping"
              @click="handleSendMessage"
              class="send-button"
            >
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </n-icon>
              </template>
              {{ getSendButtonText() }}
            </n-button>
          </div>
        </div>
      
      </n-card>

      <!-- 设置模态框 -->
      <n-modal
        v-model:show="showSettingsModal"
        preset="card"
        title="聊天设置"
        style="width: 700px; max-height: 80vh;"
        :bordered="false"
        :segmented="true"
      >
        <n-scrollbar style="max-height: 60vh;">
          <n-space vertical size="large">
            <!-- 基础设置 -->
            <n-card title="基础设置" size="small" :bordered="false">
              <template #header-extra>
                <n-icon size="18">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c.93 0 1.69.76 1.69 1.69S12.93 8.38 12 8.38s-1.69-.76-1.69-1.69S11.07 5 12 5zm0 9.38c-2.03 0-3.78-.92-4.97-2.34.03-.31.17-.6.43-.82.26-.22.6-.34.96-.34h7.16c.36 0 .7.12.96.34.26.22.4.51.43.82-1.19 1.42-2.94 2.34-4.97 2.34z"/>
                  </svg>
                </n-icon>
              </template>
              <n-form :model="chatStore.chatSettings" label-placement="left" label-width="120">
                <n-grid :cols="2" :x-gap="24">
                  <n-grid-item>
                    <n-form-item label="显示时间戳">
                      <n-switch v-model:value="chatStore.chatSettings.showTimestamp" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="显示头像">
                      <n-switch v-model:value="chatStore.chatSettings.showAvatar" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="自动滚动">
                      <n-switch v-model:value="chatStore.chatSettings.autoScroll" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="语音输入">
                      <n-switch v-model:value="chatStore.chatSettings.enableVoiceInput" />
                    </n-form-item>
                  </n-grid-item>
                </n-grid>
              </n-form>
            </n-card>

            <!-- 消息设置 -->
            <n-card title="消息设置" size="small" :bordered="false">
              <template #header-extra>
                <n-icon size="18">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                </n-icon>
              </template>
              <n-form :model="chatStore.chatSettings" label-placement="left" label-width="120">
                <n-grid :cols="2" :x-gap="24">
                  <n-grid-item>
                    <n-form-item label="最大消息数">
                      <n-input-number
                        v-model:value="chatStore.chatSettings.maxMessages"
                        :min="10"
                        :max="1000"
                        :step="10"
                      />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="消息长度限制">
                      <n-input-number
                        v-model:value="chatStore.chatSettings.maxMessageLength"
                        :min="100"
                        :max="10000"
                        :step="100"
                      />
                    </n-form-item>
                  </n-grid-item>
                </n-grid>
              </n-form>
            </n-card>
          </n-space>
        </n-scrollbar>
      </n-modal>

      <!-- 历史记录抽屉 -->
      <n-drawer
        v-model:show="showHistoryDrawer"
        :width="400"
        placement="right"
        :trap-focus="false"
        :block-scroll="false"
      >
        <n-drawer-content title="历史记录">
          <template #header-extra>
            <n-space>
              <n-button
                size="small"
                @click="handleRefreshHistory"
                :loading="isLoadingHistory"
                quaternary
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                  </n-icon>
                </template>
                刷新
              </n-button>
              <n-button
                type="primary"
                size="small"
                @click="handleCreateNewHistory"
                :disabled="!webSocketStore.isConnected"
              >
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </n-icon>
                </template>
                新建对话
              </n-button>
            </n-space>
          </template>

          <!-- 历史记录列表 -->
          <div v-if="isLoadingHistory" class="history-loading">
            <n-space justify="center" align="center" style="height: 200px;">
              <n-spin size="medium">
                <template #description>
                  <n-text depth="3">正在加载历史记录...</n-text>
                </template>
              </n-spin>
            </n-space>
          </div>

          <n-scrollbar v-else style="max-height: calc(100vh - 200px);">
            <n-list v-if="sortedHistoryList.length > 0">
              <n-list-item
                v-for="history in sortedHistoryList"
                :key="getHistoryId(history)"
                :class="['history-item', { 'history-item-selected': isCurrentHistory(history) }]"
                @click="handleSwitchHistory(getHistoryId(history))"
              >
                <n-thing>
                  <template #header>
                    <n-space align="center" justify="space-between">
                      <n-text
                        :class="{ 'history-title-current': isCurrentHistory(history) }"
                        style="font-weight: 500;"
                      >
                        {{ history.title || '未命名对话' }}
                      </n-text>
                      <n-space size="small">
                        <n-tag size="small" type="info">
                          {{ getHistoryMessageCount(history) }} 条消息
                        </n-tag>
                        <n-button
                          v-if="!isCurrentHistory(history)"
                          size="tiny"
                          type="error"
                          secondary
                          @click.stop="handleDeleteHistory(getHistoryId(history))"
                        >
                          <template #icon>
                            <n-icon>
                              <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/>
                              </svg>
                            </n-icon>
                          </template>
                        </n-button>
                      </n-space>
                    </n-space>
                  </template>
                  <template #description>
                    <n-text depth="3" style="font-size: 12px;">
                      {{ formatTime(getHistoryTimestamp(history)) }}
                    </n-text>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>

            <n-empty v-else description="暂无历史记录" class="history-empty">
              <template #icon>
                <n-icon size="48" color="var(--n-text-color-disabled)">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l4 3.99L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                  </svg>
                </n-icon>
              </template>
              <template #extra>
                <n-button size="small" @click="handleCreateNewHistory">
                  创建第一个对话
                </n-button>
              </template>
            </n-empty>
          </n-scrollbar>
        </n-drawer-content>
      </n-drawer>
    </div>
    </n-scrollbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useWebSocketStore } from '@/stores/websocket'
import { useChatStore } from '@/stores/chat'

import MessageBubble from './MessageBubble.vue'

// 组件引用
const scrollbar = ref(null)
const showHistoryDrawer = ref(false)
const showSettingsModal = ref(false)
const inputText = ref('')

// 历史记录相关状态
const isLoadingHistory = ref(false)

// Store
const webSocketStore = useWebSocketStore()
const chatStore = useChatStore()
const message = useMessage()

// 计算属性
const connectionStatus = computed(() => webSocketStore.connectionStatus)
const currentChatTitle = computed(() => chatStore.currentHistory?.title || '新对话')

// 历史记录相关计算属性
const sortedHistoryList = computed(() => {
  return [...chatStore.historyList].sort((a, b) => {
    // 统一时间戳字段处理
    const timeA = a.timestamp || a.created_at || a.latest_message?.timestamp || 0
    const timeB = b.timestamp || b.created_at || b.latest_message?.timestamp || 0

    // 转换为时间戳进行比较
    const timestampA = typeof timeA === 'string' ? new Date(timeA).getTime() : timeA
    const timestampB = typeof timeB === 'string' ? new Date(timeB).getTime() : timeB

    return timestampB - timestampA // 最新的在前
  })
})

// 方法
const handleEnter = async () => {
  if (!inputText.value.trim()) return
  await handleSendMessage()
}

const handleSendMessage = async () => {
  if (!inputText.value.trim()) return
  
  try {
    await chatStore.sendTextMessage(inputText.value.trim())
    inputText.value = ''
  } catch (error) {
    console.error('发送消息失败:', error)
    message.error('发送消息失败')
  }
}

const getSendButtonText = () => {
  if (!webSocketStore.isConnected) return '未连接'
  if (chatStore.isTyping) return '发送中...'
  if (!inputText.value.trim()) return '发送'
  return '发送'
}

// 历史记录操作方法
const handleRefreshHistory = async () => {
  if (!webSocketStore.isConnected) {
    message.warning('请先连接服务器')
    return
  }

  try {
    isLoadingHistory.value = true
    await chatStore.fetchHistoryList()
    message.success('历史记录已刷新')
  } catch (error) {
    console.error('❌ [ChatInterface] 刷新历史记录失败:', error)
    message.error(`刷新历史记录失败: ${error.message || '未知错误'}`)
  } finally {
    isLoadingHistory.value = false
  }
}

const handleCreateNewHistory = async () => {
  if (!webSocketStore.isConnected) {
    message.warning('请先连接服务器')
    return
  }

  try {
    await chatStore.createNewHistory()
    message.success('新对话已创建')
    showHistoryDrawer.value = false
  } catch (error) {
    console.error('❌ [ChatInterface] 创建新对话失败:', error)
    message.error(`创建新对话失败: ${error.message || '未知错误'}`)
  }
}

const handleSwitchHistory = async (historyId) => {
  if (!webSocketStore.isConnected) {
    message.warning('请先连接服务器')
    return
  }

  if (historyId === chatStore.currentHistoryId) {
    showHistoryDrawer.value = false
    return
  }

  try {
    await chatStore.loadHistory(historyId)
    message.success('正在切换到选中的对话')
    showHistoryDrawer.value = false
  } catch (error) {
    console.error('❌ [ChatInterface] 切换对话失败:', error)
    message.error(`切换对话失败: ${error.message || '未知错误'}`)
  }
}

const handleDeleteHistory = async (historyId) => {
  if (!webSocketStore.isConnected) {
    message.warning('请先连接服务器')
    return
  }

  try {
    await chatStore.deleteHistory(historyId)
    message.success('删除请求已发送')
  } catch (error) {
    console.error('❌ [ChatInterface] 删除对话失败:', error)
    message.error(`删除对话失败: ${error.message || '未知错误'}`)
  }
}

// 历史记录辅助方法
const getHistoryId = (history) => {
  return history.uid || history.id || history.history_uid
}

const getHistoryTimestamp = (history) => {
  const timestamp = history.timestamp || history.created_at || history.latest_message?.timestamp
  return typeof timestamp === 'string' ? new Date(timestamp).getTime() : (timestamp || Date.now())
}

const getHistoryMessageCount = (history) => {
  return history.messageCount || history.message_count || history.messages?.length || 0
}

const isCurrentHistory = (history) => {
  const historyId = getHistoryId(history)
  return historyId === chatStore.currentHistoryId
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleEnter()
  }
}

const handleRegenerate = (message) => {
  // TODO: 实现消息重新生成功能
  console.log('🔄 [ChatInterface] 重新生成消息:', message)
}

const formatTime = (timestamp) => {
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

const scrollToBottom = () => {
  if (scrollbar.value) {
    scrollbar.value.scrollTo({ top: scrollbar.value.scrollHeight, behavior: 'smooth' })
  }
}

// 监听消息变化，自动滚动到底部
watch(() => chatStore.messages.length, () => {
  if (chatStore.chatSettings.autoScroll) {
    nextTick(scrollToBottom)
  }
})

// 监听WebSocket连接状态，自动加载历史记录
watch(() => webSocketStore.isConnected, (connected) => {
  if (connected) {
    handleRefreshHistory()
  }
})

// 监听历史记录抽屉打开，确保数据是最新的
watch(() => showHistoryDrawer.value, (show) => {
  if (show && webSocketStore.isConnected && chatStore.historyList.length === 0) {
    handleRefreshHistory()
  }
})

onMounted(() => {
  if (chatStore.messages.length > 0 && chatStore.chatSettings.autoScroll) {
    nextTick(scrollToBottom)
  }

  // 如果已连接，立即加载历史记录
  if (webSocketStore.isConnected) {
    handleRefreshHistory()
  }
})
</script>

<style scoped>
.chat-interface-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
}

.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--n-body-color);
}

.chat-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--n-border-color);
  background-color: var(--n-card-color);
}

.messages-container {
  height: 800px;
  max-height: 1200px;
  overflow-y: auto;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-input-container {
  padding: 2px;
  background-color: var(--n-card-color);
  border-top: 1px solid var(--n-border-color);
}

.input-container {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px 16px 16px 16px;
  background: var(--n-card-color, #fff);
  border-top: 1px solid var(--n-border-color, #eee);
  border-radius: 0 0 12px 12px;
  display: flex;
  align-items: flex-end;
}

.input-wrapper {
  display: flex;
  width: 100%;
  align-items: flex-end;
}

.n-input {
  min-width: 0;
  margin-right: 8px;
}

.n-button {
  height: 40px;
  border-radius: 8px;
}

.history-list {
  max-height: 60vh;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.history-item:hover {
  background-color: var(--n-item-color-hover);
}

.history-item-selected {
  background-color: var(--n-item-color-active);
}

.history-item-selected:hover {
  background-color: var(--n-item-color-active-hover);
}

:deep(.n-list-item) {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  border: 1px solid transparent;
}

:deep(.n-list-item:hover) {
  background-color: var(--n-item-color-hover);
  border-color: var(--n-border-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.history-item-selected) {
  background-color: var(--n-primary-color-suppl);
  border-color: var(--n-primary-color);
}

:deep(.history-item-selected:hover) {
  background-color: var(--n-primary-color-hover);
}

/* 模态框样式 */
:deep(.n-modal), :deep(.n-modal-body-wrapper) {
  z-index: 1000;
}

:deep(.n-modal-mask) {
  z-index: 999;
}

:deep(.n-input) {
  font-size: 14px;
}

:deep(.n-input__textarea) {
  padding: 8px;
}

:deep(.n-button) {
  height: 32px;
  padding: 0 16px;
}

:deep(.n-scrollbar-rail) {
  z-index: 1;
}

:deep(.n-scrollbar-rail__scrollbar) {
  z-index: 2;
}

.scrollable-content {
  height: 100%;
  width: 100%;
}

/* 历史记录相关样式 */
.history-loading {
  padding: 20px;
}

.history-empty {
  padding: 40px 20px;
}

.history-title-current {
  font-weight: 600;
  color: var(--n-primary-color);
}

/* 打字指示器样式 */
.typing-indicator {
  padding: 12px 16px;
  background: var(--n-card-color);
  border-radius: var(--n-border-radius);
  margin: 8px 12px;
  animation: fadeIn 0.3s ease-out;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--n-text-color-disabled);
  animation: typing-pulse 1.4s ease-in-out infinite both;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing-pulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
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

/* 空状态样式 */
.empty-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: var(--n-text-color-disabled);
}

/* 消息包装器样式 */
.message-wrapper {
  margin-bottom: 8px;
}

.message-user {
  align-items: flex-end;
}

.message-ai {
  align-items: flex-start;
}

/* 发送按钮样式 */
.send-button {
  min-width: 80px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-interface {
    padding: 8px;
  }
  
  .input-container {
    padding: 8px 12px 12px 12px;
  }
  
  .messages-container {
    height: 400px;
  }
  
  .history-drawer {
    width: 100% !important;
  }
}
</style> 