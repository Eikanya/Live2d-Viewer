/**
 * Live2D Module Index
 * 统一导出所有Live2D相关的类和工具函数
 */

// 主管理器
export { Live2DManager } from './live2d-manager.js'

// 子管理器
export { Live2DCoreManager } from './core-manager.js'
export { Live2DModelManager } from './model-manager.js'
export { Live2DInteractionManager } from './interaction-manager.js'
export { Live2DAnimationManager } from './animation-manager.js'

// 工具函数
export * from './utils.js'

// 默认导出主管理器
export { Live2DManager as default } from './live2d-manager.js'
