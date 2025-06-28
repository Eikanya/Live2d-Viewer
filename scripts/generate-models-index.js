#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 递归扫描目录，查找包含model3的JSON文件
 * @param {string} dir - 要扫描的目录
 * @param {number} maxDepth - 最大扫描深度
 * @param {number} currentDepth - 当前深度
 * @returns {Array} 找到的模型文件列表
 */
function scanDirectory(dir, maxDepth = 4, currentDepth = 0) {
  const models = [];
  
  if (currentDepth >= maxDepth) {
    return models;
  }
  
  try {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  目录不存在: ${dir}`);
      return models;
    }
    
    const items = fs.readdirSync(dir);
    console.log(`🔍 扫描目录: ${dir} (深度: ${currentDepth})`);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        // 检查是否是包含model3的JSON文件
        if (item.includes('model3') && item.endsWith('.json')) {
          const relativePath = path.relative('public', fullPath).replace(/\\/g, '/');
          const webPath = '/' + relativePath;
          const folderName = path.basename(path.dirname(fullPath));
          const modelName = item.replace(/\.(model3\.)?json$/, '');
          
          models.push({
            name: modelName,
            path: webPath,
            folder: folderName,
            description: `${folderName} Live2D Model`,
            file: item,
            size: stat.size,
            lastModified: stat.mtime.toISOString()
          });
          
          console.log(`✅ 找到模型文件: ${webPath}`);
        }
      } else if (stat.isDirectory()) {
        // 递归扫描子目录
        if (!item.startsWith('.') && item !== 'node_modules') {
          const subModels = scanDirectory(fullPath, maxDepth, currentDepth + 1);
          models.push(...subModels);
        }
      }
    }
  } catch (error) {
    console.error(`❌ 扫描目录失败: ${dir}`, error.message);
  }
  
  return models;
}

/**
 * 生成模型索引文件
 */
function generateModelsIndex() {
  console.log('🚀 开始生成Live2D模型索引...');
  
  const live2dModelsDir = path.join(__dirname, '../public/models');
  const outputFile = path.join(live2dModelsDir, 'models-index.json');
  
  // 扫描模型文件
  const models = scanDirectory(live2dModelsDir);
  
  // 按文件夹和名称排序
  models.sort((a, b) => {
    if (a.folder !== b.folder) {
      return a.folder.localeCompare(b.folder);
    }
    return a.name.localeCompare(b.name);
  });
  
  // 提取文件夹信息用于日志记录
  const folders = [...new Set(models.map(m => m.folder))].sort();
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 创建目录: ${outputDir}`);
  }
  
  // 写入索引文件，根元素为模型数组
  try {
    fs.writeFileSync(outputFile, JSON.stringify(models, null, 2), 'utf8');
    console.log(`✅ 模型索引生成成功: ${outputFile}`);
    console.log(`📊 找到 ${models.length} 个模型文件`);
    console.log(`📂 涉及 ${folders.length} 个文件夹: ${folders.join(', ')}`);
    
    // 显示找到的模型列表
    if (models.length > 0) {
      console.log('\n📋 模型列表:');
      models.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model.folder}/${model.name} -> ${model.path}`);
      });
    }
  } catch (error) {
    console.error(`❌ 写入索引文件失败:`, error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  generateModelsIndex();
}

module.exports = { generateModelsIndex, scanDirectory };
