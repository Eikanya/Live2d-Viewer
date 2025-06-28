const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  // 接收消息
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  },
  // 移除监听器
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func)
  },
  // 移除所有监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  // 调用方法并等待响应
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data)
  }
}) 