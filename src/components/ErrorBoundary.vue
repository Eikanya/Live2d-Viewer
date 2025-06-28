<template>
  <div class="error-boundary">
    <div v-if="hasError" class="error-container">
      <n-result status="error" title="组件渲染错误" :description="errorMessage">
        <template #icon>
          <n-icon size="72" color="var(--n-error-color)">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </n-icon>
        </template>
        
        <template #footer>
          <n-space>
            <n-button @click="retry" type="primary">
              重试
            </n-button>
            <n-button @click="goHome" quaternary>
              返回首页
            </n-button>
            <n-button @click="showDetails = !showDetails" quaternary>
              {{ showDetails ? '隐藏' : '显示' }}详情
            </n-button>
          </n-space>
        </template>
      </n-result>
      
      <!-- 错误详情 -->
      <n-collapse v-if="showDetails" style="margin-top: 16px;">
        <n-collapse-item title="错误详情" name="details">
          <n-code :code="errorDetails" language="javascript" />
        </n-collapse-item>
      </n-collapse>
    </div>
    
    <div v-else class="content-wrapper">
      <slot />
    </div>
  </div>
</template>

<script>
import { ref, onErrorCaptured, nextTick } from 'vue'

export default {
  name: 'ErrorBoundary',
  emits: ['error', 'retry'],
  setup(props, { emit }) {
    const hasError = ref(false)
    const errorMessage = ref('')
    const errorDetails = ref('')
    const showDetails = ref(false)
    const retryCount = ref(0)
    const maxRetries = 3

    // 捕获子组件错误
    onErrorCaptured((error, instance, info) => {
      console.error('🚨 [ErrorBoundary] 捕获到组件错误:', error)
      console.error('🚨 [ErrorBoundary] 错误信息:', info)
      console.error('🚨 [ErrorBoundary] 组件实例:', instance)

      hasError.value = true
      errorMessage.value = getErrorMessage(error, info)
      errorDetails.value = getErrorDetails(error, info)
      
      // 发送错误事件
      emit('error', { error, instance, info })
      
      // 阻止错误继续向上传播
      return false
    })

    const getErrorMessage = (error, info) => {
      if (error.message) {
        if (error.message.includes('render function')) {
          return '组件渲染时发生错误，可能是数据状态或属性配置问题'
        } else if (error.message.includes('Cannot read property')) {
          return '访问未定义的属性，请检查数据初始化'
        } else if (error.message.includes('Cannot resolve component')) {
          return '无法解析组件，请检查组件导入和注册'
        } else {
          return error.message
        }
      }
      
      if (info) {
        if (info.includes('render')) {
          return '组件渲染过程中发生错误'
        } else if (info.includes('setup')) {
          return '组件初始化过程中发生错误'
        }
      }
      
      return '未知错误'
    }

    const getErrorDetails = (error, info) => {
      const details = []
      
      if (error.message) {
        details.push(`错误消息: ${error.message}`)
      }
      
      if (error.stack) {
        details.push(`错误堆栈:\n${error.stack}`)
      }
      
      if (info) {
        details.push(`Vue信息: ${info}`)
      }
      
      details.push(`重试次数: ${retryCount.value}/${maxRetries}`)
      details.push(`时间: ${new Date().toLocaleString()}`)
      
      return details.join('\n\n')
    }

    const retry = async () => {
      if (retryCount.value >= maxRetries) {
        errorMessage.value = `已达到最大重试次数 (${maxRetries})，请刷新页面或联系技术支持`
        return
      }

      console.log('🔄 [ErrorBoundary] 尝试重试...')
      retryCount.value++
      
      // 重置错误状态
      hasError.value = false
      errorMessage.value = ''
      errorDetails.value = ''
      showDetails.value = false
      
      // 等待下一个tick再重新渲染
      await nextTick()
      
      emit('retry')
    }

    const goHome = () => {
      console.log('🏠 [ErrorBoundary] 返回首页')
      // 重置所有状态
      hasError.value = false
      errorMessage.value = ''
      errorDetails.value = ''
      showDetails.value = false
      retryCount.value = 0
      
      // 触发路由跳转到首页
      window.dispatchEvent(new CustomEvent('navigate-home'))
    }

    const reset = () => {
      hasError.value = false
      errorMessage.value = ''
      errorDetails.value = ''
      showDetails.value = false
      retryCount.value = 0
    }

    return {
      hasError,
      errorMessage,
      errorDetails,
      showDetails,
      retry,
      goHome,
      reset
    }
  }
}
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-container {
  padding: 24px;
  text-align: center;
}

.content-wrapper {
  width: 100%;
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-container {
    padding: 1px;
  }
  
  :deep(.n-result-header) {
    font-size: 18px;
  }
  
  :deep(.n-result-description) {
    font-size: 14px;
  }
}
</style>
