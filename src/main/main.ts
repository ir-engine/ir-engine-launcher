/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import os from 'os'
import path from 'path'

import Endpoints from '../constants/Endpoints'
import ClusterHandler from './handlers/Cluster/Cluster.handler'
import ConfigFileHandler from './handlers/ConfigFile/ConfigFile.handler'
import EngineHandler from './handlers/Engine/Engine.handler'
import GitHandler from './handlers/Git/Git.handler'
import { IBaseHandler } from './handlers/IBaseHandler'
import ShellHandler from './handlers/Shell/Shell.handler'
import UpdatesHandler from './handlers/Updates/Updates.handler'
import UtilitiesHandler from './handlers/Utilities/Utilities.handler'
import WorkloadsHandler from './handlers/Workloads/Workloads.handler'
import MenuBuilder from './menu'
import { resolveHtmlPath } from './util'

// Log system info
log.info(
  `System Info:\n OS Type: ${os.type()}\n OS Platform: ${os.platform()}\n OS Version: ${os.version()}\n OS Arch: ${os.arch()}\n CPUs: ${
    os.cpus().length
  }\n Memory: ${os.totalmem() / (1024 * 1024)}`
)

// https://stackoverflow.com/a/55414549/2077741
if (process.env.NODE_ENV === 'production') {
  const prodFixes = require('./prodFixes')
  prodFixes.loadProdConfigs()
}

// To allow Engine certificate errors
// https://stackoverflow.com/a/51291249/2077741
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// To allow Engine certificate errors
// https://stackoverflow.com/a/63924528/2077741
// https://stackoverflow.com/a/46789486/2077741
app.on('certificate-error', (event, _webContents, url, _error, _cert, callback) => {
  const { host } = new URL(url)

  // Do some verification based on the URL to not allow potentially malicious certs:
  if (Endpoints.ALLOW_CERTIFICATES.includes(host)) {
    // Hint: For more security, you may actually perform some checks against
    // the passed certificate (parameter "cert") right here

    event.preventDefault() // Stop Chromium from rejecting the certificate
    callback(true) // Trust this certificate
  } else {
    callback(false) // Let Chromium do its thing
  }
})

let splashWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDebug) {
  require('electron-debug')()
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS']

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log)
}

const createWindow = async () => {
  if (splashWindow) {
    splashWindow.close()
    splashWindow = null
  }

  if (isDebug) {
    await installExtensions()
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  splashWindow = new BrowserWindow({
    show: false,
    width: 350,
    height: 300,
    frame: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      devTools: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.electron/dll/preload.js')
    }
  })

  log.transports.file.level = 'info'

  // We want the user to proactively download the install
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.autoDownload = false
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'ir-engine',
      repo: 'ir-engine-launcher'
    })
    autoUpdater.logger = log
  }

  const ipcHandlers: IBaseHandler[] = [new UpdatesHandler()]

  ipcHandlers.forEach((handler) => {
    handler.configure(splashWindow!)
  })

  splashWindow.loadURL(resolveHtmlPath('index.html', 'splash=true'))

  splashWindow.on('ready-to-show', () => {
    if (!splashWindow) {
      throw new Error('"splashWindow" is not defined')
    }
    if (process.env.START_MINIMIZED) {
      splashWindow.minimize()
    } else {
      splashWindow.show()
    }
  })

  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

export const createMainWindow = async () => {
  if (isDebug) {
    await installExtensions()
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths)
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.electron/dll/preload.js'),
      webviewTag: true
    }
  })

  // To allow Engine certificate errors
  // https://github.com/electron/electron/issues/14885#issuecomment-770953041
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request
    if (Endpoints.ALLOW_CERTIFICATES.includes(hostname)) {
      callback(0) //this means trust this domain
    } else {
      callback(-3) //use chromium's verification result
    }
  })

  const ipcHandlers: IBaseHandler[] = [
    new ConfigFileHandler(),
    new UtilitiesHandler(),
    new ShellHandler(),
    new EngineHandler(),
    new ClusterHandler(),
    new WorkloadsHandler(),
    new GitHandler()
  ]

  ipcHandlers.forEach((handler) => {
    handler.configure(mainWindow!)
  })

  mainWindow.loadURL(resolveHtmlPath('index.html'))

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize()
    } else {
      mainWindow.maximize()
      mainWindow.show()
    }

    if (splashWindow) {
      splashWindow.close()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url)
    return { action: 'deny' }
  })
}

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app
  .whenReady()
  .then(async () => {
    createWindow()
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow()
    })
  })
  .catch(console.log)
