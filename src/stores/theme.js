import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { globalResourceManager } from '../utils/resource-manager.js'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const currentTheme = ref('auto') // 'light', 'dark', 'auto'
  const systemPrefersDark = ref(false)
  const mediaQuery = ref(null)

  // 计算属性
  const isDark = computed(() => {
    if (currentTheme.value === 'auto') {
      return systemPrefersDark.value
    }
    return currentTheme.value === 'dark'
  })

  // 获取当前实际主题
  const actualTheme = computed(() => {
    if (currentTheme.value === 'auto') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return currentTheme.value
  })

  // 应用主题到 DOM
  const applyThemeToDOM = (theme) => {
    const body = document.body
    
    // 移除所有主题相关的类名和属性
    body.classList.remove('light-theme', 'dark-theme')
    body.removeAttribute('aria-hidden')
    body.removeAttribute('data-theme')
    
    // 添加新的主题类名
    body.classList.add(`${theme}-theme`)
    
    // 设置 data-theme 属性用于 CSS 选择器
    body.setAttribute('data-theme', theme)
    
    // 设置正确的 color-scheme
    body.style.colorScheme = theme
    
    // 更新 HTML 根元素的主题属性
    document.documentElement.setAttribute('data-theme', theme)
    
    // console.log(`🎨 [ThemeStore] 主题已切换为: ${theme}`)
  }

  // 方法
  const setTheme = (theme) => {
    if (['light', 'dark', 'auto'].includes(theme)) {
      currentTheme.value = theme
      localStorage.setItem('theme', theme)
      
      // 应用主题到 DOM
      if (theme === 'auto') {
        applyThemeToDOM(systemPrefersDark.value ? 'dark' : 'light')
      } else {
        applyThemeToDOM(theme)
      }
      
      // 触发主题变化事件
      window.dispatchEvent(new CustomEvent('theme:changed', {
        detail: { theme: actualTheme.value }
      }))
    }
  }

  const toggleTheme = () => {
    if (currentTheme.value === 'light') {
      setTheme('dark')
    } else if (currentTheme.value === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }

  // 处理系统主题变化
  const handleSystemThemeChange = (e) => {
    systemPrefersDark.value = e.matches
    
    // 当系统主题改变时，如果是自动模式，更新主题
    if (currentTheme.value === 'auto') {
      applyThemeToDOM(e.matches ? 'dark' : 'light')
      
      // 触发主题变化事件
      window.dispatchEvent(new CustomEvent('theme:changed', {
        detail: { theme: actualTheme.value }
      }))
    }
  }

  const initTheme = () => {
    // 从localStorage读取主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    }

    // 监听系统主题变化
    mediaQuery.value = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.value.matches

    // 注册事件监听器到资源管理器
    const changeHandler = handleSystemThemeChange
    mediaQuery.value.addEventListener('change', changeHandler)
    
    globalResourceManager.registerEventListener(
      mediaQuery.value, 
      'change', 
      changeHandler
    )

    // 应用初始主题
    applyThemeToDOM(actualTheme.value)
    
    // console.log(`🎨 [ThemeStore] 主题初始化完成: ${actualTheme.value}`)
  }

  // 清理资源
  const cleanup = () => {
    if (mediaQuery.value) {
      mediaQuery.value.removeEventListener('change', handleSystemThemeChange)
      mediaQuery.value = null
    }
  }

  // 注册清理回调
  globalResourceManager.registerCleanupCallback(cleanup)

  return {
    currentTheme,
    systemPrefersDark,
    isDark,
    actualTheme,
    setTheme,
    toggleTheme,
    initTheme,
    cleanup
  }
})
