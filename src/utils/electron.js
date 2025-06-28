/**
 * Electron IPC 通信工具
 * 提供渲染进程与主进程之间的通信接口
 */

// 检查是否在 Electron 环境中
export const isElectron = () => {
  return typeof window !== 'undefined' && window.require && window.require('electron')
}

// 获取 Electron IPC 渲染器
export const getIpcRenderer = () => {
  if (isElectron()) {
    try {
      return window.require('electron').ipcRenderer
    } catch (error) {
      console.warn('无法获取 ipcRenderer:', error)
      return null
    }
  }
  return null
}

// 桌宠模式相关 API
export const petModeAPI = {
  // 切换桌宠模式
  async toggle() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('toggle-pet-mode')
      } catch (error) {
        console.error('切换桌宠模式失败:', error)
        return false
      }
    }
    return false
  },

  // 检查是否为桌宠模式
  async isActive() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('is-pet-mode')
      } catch (error) {
        console.error('检查桌宠模式状态失败:', error)
        return false
      }
    }
    return false
  },

  // 设置桌宠位置
  async setPosition(x, y) {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('set-pet-position', x, y)
      } catch (error) {
        console.error('设置桌宠位置失败:', error)
        return false
      }
    }
    return false
  },

  // 设置桌宠置顶
  async setAlwaysOnTop(alwaysOnTop) {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('set-pet-always-on-top', alwaysOnTop)
      } catch (error) {
        console.error('设置桌宠置顶失败:', error)
        return false
      }
    }
    return false
  },

  // 设置桌宠鼠标穿透
  async setIgnoreMouse(ignore) {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('set-pet-ignore-mouse', ignore)
      } catch (error) {
        console.error('设置桌宠鼠标穿透失败:', error)
        return false
      }
    }
    return false
  },

  // 获取屏幕信息
  async getScreenInfo() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('get-screen-info')
      } catch (error) {
        console.error('获取屏幕信息失败:', error)
        return null
      }
    }
    return null
  }
}

// 窗口控制 API
export const windowAPI = {
  // 最小化窗口
  async minimize() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('minimize-window')
      } catch (error) {
        console.error('最小化窗口失败:', error)
        return false
      }
    }
    return false
  },

  // 最大化/还原窗口
  async maximize() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('maximize-window')
      } catch (error) {
        console.error('最大化窗口失败:', error)
        return false
      }
    }
    return false
  },

  // 关闭窗口
  async close() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('close-window')
      } catch (error) {
        console.error('关闭窗口失败:', error)
        return false
      }
    }
    return false
  }
}

// 应用信息 API
export const appAPI = {
  // 获取应用版本
  async getVersion() {
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      try {
        return await ipcRenderer.invoke('get-app-version')
      } catch (error) {
        console.error('获取应用版本失败:', error)
        return null
      }
    }
    return null
  }
}

// 检查桌宠模式的工具函数
export const isPetMode = () => {
  if (typeof window !== 'undefined') {
    return window.location.search.includes('mode=pet')
  }
  return false
}

// 导出默认对象
export default {
  isElectron,
  getIpcRenderer,
  petModeAPI,
  windowAPI,
  appAPI,
  isPetMode
}
