const { app, BrowserWindow, Menu, ipcMain, Tray, nativeImage } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow, petWindow, tray

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
    titleBarStyle: 'default'
  })

  // 加载应用
  if (isDev) {
    // 尝试多个端口
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devUrl)
    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 当窗口关闭时
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createPetWindow() {
  // 创建桌宠窗口
  petWindow = new BrowserWindow({
    width: 400,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true, // 不在任务栏显示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    show: false
  })

  // 加载桌宠模式
  const petUrl = isDev
    ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173') + '?mode=pet'
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=pet`

  petWindow.loadURL(petUrl)

  // 窗口准备好后显示
  petWindow.once('ready-to-show', () => {
    petWindow.show()
    // 设置窗口位置到屏幕右下角
    const { screen } = require('electron')
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    petWindow.setPosition(width - 420, height - 620)
  })

  // 当窗口关闭时
  petWindow.on('closed', () => {
    petWindow = null
  })

  // 开发模式下打开开发者工具
  if (isDev) {
    petWindow.webContents.openDevTools()
  }
}

// 应用准备就绪时创建窗口和系统托盘
app.whenReady().then(() => {
  createWindow()
  createTray()
})

// 当所有窗口关闭时退出应用 (macOS除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 创建系统托盘
function createTray() {
  // 创建托盘图标
  const iconPath = path.join(__dirname, '../public/favicon.ico')
  let trayIcon

  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      // 如果图标为空，创建一个简单的图标
      trayIcon = nativeImage.createEmpty()
    }
  } catch (error) {
    console.log('托盘图标加载失败，使用默认图标')
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Live2D Viewer')

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: petWindow ? '关闭桌宠模式' : '开启桌宠模式',
      click: () => {
        if (petWindow) {
          petWindow.close()
          petWindow = null
        } else {
          createPetWindow()
        }
        // 更新托盘菜单
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // 双击托盘图标显示主窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

// 更新托盘菜单
function updateTrayMenu() {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: petWindow ? '关闭桌宠模式' : '开启桌宠模式',
      click: () => {
        if (petWindow) {
          petWindow.close()
          petWindow = null
        } else {
          createPetWindow()
        }
        // 更新托盘菜单
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

// 设置菜单
const template = [
  {
    label: '文件',
    submenu: [
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit()
        }
      }
    ]
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload', label: '重新加载' },
      { role: 'forceReload', label: '强制重新加载' },
      { role: 'toggleDevTools', label: '开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom', label: '重置缩放' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' }
    ]
  },
  {
    label: '桌宠',
    submenu: [
      {
        label: '切换桌宠模式',
        accelerator: 'Ctrl+P',
        click: () => {
          if (petWindow) {
            petWindow.close()
            petWindow = null
          } else {
            createPetWindow()
          }
          updateTrayMenu()
        }
      },
      { type: 'separator' },
      {
        label: '桌宠设置',
        enabled: false, // 暂时禁用，后续可以添加设置窗口
        click: () => {
          // TODO: 打开桌宠设置窗口
        }
      }
    ]
  },
  {
    label: '窗口',
    submenu: [
      { role: 'minimize', label: '最小化' },
      { role: 'close', label: '关闭' }
    ]
  }
]

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about', label: '关于' },
      { type: 'separator' },
      { role: 'services', label: '服务' },
      { type: 'separator' },
      { role: 'hide', label: '隐藏' },
      { role: 'hideothers', label: '隐藏其他' },
      { role: 'unhide', label: '显示全部' },
      { type: 'separator' },
      { role: 'quit', label: '退出' }
    ]
  })
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

// 桌宠模式相关 IPC 处理
ipcMain.handle('toggle-pet-mode', () => {
  if (petWindow) {
    petWindow.close()
    petWindow = null
    updateTrayMenu()
    return false
  } else {
    createPetWindow()
    updateTrayMenu()
    return true
  }
})

ipcMain.handle('is-pet-mode', () => {
  return !!petWindow
})

ipcMain.handle('set-pet-position', (event, x, y) => {
  if (petWindow) {
    petWindow.setPosition(x, y)
  }
})

ipcMain.handle('set-pet-always-on-top', (event, alwaysOnTop) => {
  if (petWindow) {
    petWindow.setAlwaysOnTop(alwaysOnTop)
  }
})

ipcMain.handle('set-pet-ignore-mouse', (event, ignore) => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(ignore)
  }
})

// 获取屏幕信息
ipcMain.handle('get-screen-info', () => {
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  return {
    workAreaSize: display.workAreaSize,
    size: display.size,
    scaleFactor: display.scaleFactor
  }
})
