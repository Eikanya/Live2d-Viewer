/**
 * 聊天历史记录服务类
 */
export class ChatHistoryService {
  constructor() {
    this.history = []
    this.maxHistoryLength = 100 // 最大历史记录条数
  }

  /**
   * 添加新的聊天记录
   * @param {Object} message - 聊天消息对象
   * @param {string} message.type - 消息类型 ('user' | 'assistant')
   * @param {string} message.content - 消息内容
   * @param {string} message.timestamp - 时间戳
   */
  addMessage(message) {
    this.history.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    })

    // 如果超过最大长度，删除最旧的记录
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift()
    }

    // 保存到本地存储
    this.saveToLocalStorage()
  }

  /**
   * 获取所有聊天记录
   * @returns {Array} 聊天记录数组
   */
  getHistory() {
    return this.history
  }

  /**
   * 清空聊天记录
   */
  clearHistory() {
    this.history = []
    this.saveToLocalStorage()
  }

  /**
   * 保存到本地存储
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(this.history))
    } catch (error) {
      console.error('保存聊天记录失败:', error)
    }
  }

  /**
   * 从本地存储加载
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('chatHistory')
      if (saved) {
        this.history = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error)
      this.history = []
    }
  }

  /**
   * 设置最大历史记录长度
   * @param {number} length - 最大长度
   */
  setMaxHistoryLength(length) {
    this.maxHistoryLength = length
    // 如果当前历史记录超过新的最大长度，删除多余的记录
    while (this.history.length > this.maxHistoryLength) {
      this.history.shift()
    }
    this.saveToLocalStorage()
  }
} 