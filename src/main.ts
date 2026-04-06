
import { app, BrowserWindow, dialog, Menu, nativeTheme, Notification, systemPreferences } from 'electron';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import log from 'electron-log/main';
import Store from 'electron-store';
import process from 'node:process';

// Prevent EPIPE errors from crashing the app
process.on('uncaughtException', (error) => {
  if (error.message?.includes('EPIPE') || error.message?.includes('EBADF')) {
    // Silently ignore pipe errors
    return;
  }
  // Log other errors to file only
  log.error('Uncaught exception:', error);
});

import PromptAnywhere from './main/automations/anywhere';
import Automator from './main/automations/automator';
import Commander from './main/automations/commander';
import ReadAloud from './main/automations/readaloud';
import Dictation from './main/automations/dictation';
import AutoUpdater from './main/autoupdate';
import Mcp from './main/mcp';
import MemoryManager from './main/memory';
import DocumentMonitor from './main/rag/docmonitor';
import DocumentRepository from './main/rag/docrepo';
import Scheduler from './main/scheduler';
import TrayIconManager from './main/tray';

import { fixPath } from './main/utils';
//import { useI18n } from './main/i18n';
import { kDefaultHttpPort } from './consts';
import { installAgentWebhook } from './main/agent_webhook';
import { checkAndInstallCLI } from './main/cli_installer';
import { installApiEndpoints } from './main/http_api';
import { HttpServer } from './main/http_server';
import { installHttpTriggers } from './main/http_triggers';
import { importMarkdown } from './main/import_md';
import { importOpenAI } from './main/import_oai';
import { installIpc } from './main/ipc';
import { migrateMcpToolNames } from './main/migrations/mcp_tool_names';

import * as agents from './main/agents';
import * as backup from './main/backup';
import * as config from './main/config';
import * as menu from './main/menu';
import * as shortcuts from './main/shortcuts';
import * as webview from './main/webview';
import * as window from './main/window';
import * as workspace from './main/workspace';
import KeyMonitor from './main/keymonitor';

let mcp: Mcp;
let scheduler: Scheduler;
let autoUpdater: AutoUpdater;
let docMonitor: DocumentMonitor;
let trayIconManager: TrayIconManager;
let keyMonitor: KeyMonitor;
let dictation: Dictation;

// first-thing: single instance
// on darwin this is done through Info.plist (LSMultipleInstancesProhibited)
if (process.platform !== 'darwin' && !process.env.TEST) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  }
}

// changes path
if (process.env.WITSY_HOME) {
  const originalGetPath = app.getPath;
  app.getPath = (name: string) => {
    if (name === 'userData') {
      return process.env.WITSY_HOME;
    } else {
      return originalGetPath(name as any);
    }
  }
}

// set up logging - wrap console transport to prevent EPIPE errors
const originalConsoleFn = log.transports.console.writeFn;
log.transports.console.writeFn = function(data: any) {
  try {
    originalConsoleFn(data);
  } catch {
    // Silently ignore all console write errors (EPIPE, EBADF, etc)
  }
};

Object.assign(console, log.functions);
log.eventLogger.startLogging();

try {
  console.log('Log file:',log.transports.file.getFile().path);
} catch {
  // Ignore if this fails
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
  app.quit();
}

// open store
const store = new Store({ name: 'window' });
window.setStore(store);

// this is going to be called later
const installMenu = () => {
  const settings = config.loadSettings(app);
  menu.installMenu(app, {
    quit: app.quit,
    checkForUpdates: autoUpdater.check,
    quickPrompt: PromptAnywhere.open,
    openMain: window.openMainWindow,
    scratchpad: () => window.openMainWindow({ queryParams: { view: 'scratchpad' } }),
    settings: window.openSettingsWindow,
    studio: window.openDesignStudioWindow,
    forge: window.openAgentForgeWindow,
    backupExport: async () => await backup.exportBackup(app),
    backupImport: async () => await backup.importBackup(app, quitApp),
    importMarkdown: async () => await importMarkdown(app, settings.workspaceId),
    importOpenAI: async () => await importOpenAI(app, settings.workspaceId),
  }, settings.shortcuts);
}

// this is going to be called later
const registerShortcuts = () => {
  shortcuts.registerShortcuts(app, {
    prompt: PromptAnywhere.open,
    chat: () => window.openMainWindow({ queryParams: { view: 'chat' } }),
    command: () => Commander.initCommand(app),
    readaloud: () => ReadAloud.read(app),
    dictation: Dictation.initDictation,
    audioBooth: window.openAudioBooth,
    scratchpad: () => window.openMainWindow({ queryParams: { view: 'scratchpad' } }),
    realtime: window.openRealtimeChatWindow,
    studio: window.openDesignStudioWindow,
    forge: window.openAgentForgeWindow,
  });
  keyMonitor?.reload();
}

// quit at all costs
let quitAnyway = false;
const quitApp = () => {
  quitAnyway = true;
  app.quit();
}

// this needs to be done before onReady
if (process.platform === 'darwin') {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  //systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {

  // check if run from app folder
  if (process.platform === 'darwin' && !process.env.DEBUG && !process.env.TEST && !app.isInApplicationsFolder()) {
    dialog.showMessageBox({
      type: 'error',
      message: 'You need to run Witsy from the Applications folder. Move the app icon there and try again.',
      detail: 'If you already moved the app icon there, make sure you run Witsy from the Applications folder.',
      buttons: ['OK'],
    });
    quitApp();
    return;
  }

  // we need settings
  const settings = config.loadSettings(app);

  // initialize current workspace
  workspace.initializeWorkspace(app, settings.workspaceId)

  // run migrations for MCP tool names (one-time, strips old ___xxxx suffixes)
  migrateMcpToolNames(app)

  // initialize webview session
  webview.initWebviewSession()

  // error
  if (config.settingsFileHadError()) {
    const { useI18n } = await import('./main/i18n');
    const t = useI18n(app)
    dialog.showMessageBox({
      type: 'error',
      message: t('settings.load.error.title'),
      detail: t('settings.load.error.text'),
    })
  }

  // proxy
  if (settings.general.proxyMode === 'bypass') {
    app.commandLine.appendSwitch('no-proxy-server');
  } else if (settings.general.proxyMode === 'custom' && settings.general.customProxy?.length) {
    app.commandLine.appendSwitch('proxy-server', settings.general.customProxy);
  }

  // debugging
  if (process.env.DEBUG) {
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error while installing Extension: ', err));
  }

  // set theme
  if (settings.appearance.theme === 'system') {
    // 当主题设置为系统时，根据时间自动切换
    const hour = new Date().getHours();
    // 6:00 - 18:00 使用明亮模式，其他时间使用黑暗模式
    const isDaytime = hour >= 6 && hour < 18;
    nativeTheme.themeSource = isDaytime ? 'light' : 'dark';
  } else {
    nativeTheme.themeSource = settings.appearance.theme;
  }

  // we need an http server
  const httpServer = HttpServer.getInstance();
  await httpServer.ensureServerRunning(settings?.general?.httpPort || kDefaultHttpPort);

  // install HTTP triggers
  try {
    installHttpTriggers(httpServer, app);
  } catch (error) {
    console.error('Error installing HTTP triggers:', error);
  }

  // auto-updater (we need it now for menu)
  autoUpdater = new AutoUpdater(app, {
    preInstall: () => {
      quitApp();
    },
    onUpdateAvailable: () => {
      window.emitIpcEventToAll('update-available');
      trayIconManager.install();
    },
  });

  // tray icon
  trayIconManager = new TrayIconManager(app, autoUpdater, quitApp);  
  
  // install the menu
  window.addWindowListener({
    onWindowCreated: () => setTimeout(installMenu, 500), 
    onWindowFocused: () => setTimeout(installMenu, 500), 
    onWindowTitleChanged: () => setTimeout(installMenu, 500), 
    onWindowClosed: () => setTimeout(installMenu, 500), 
  });
  installMenu();

  // register shortcuts
  registerShortcuts();

  // start key monitor for native shortcuts (macOS/Windows only)
  if (KeyMonitor.isPlatformSupported()) {
    dictation = new Dictation(app)
    keyMonitor = new KeyMonitor(app, {
      prompt: { onDown: () => {}, onUp: PromptAnywhere.open },
      chat: { onDown: () => {}, onUp: () => window.openMainWindow({ queryParams: { view: 'chat' } }) },
      command: { onDown: () => {}, onUp: () => Commander.initCommand(app) },
      readaloud: { onDown: () => {}, onUp: () => ReadAloud.read(app) },
      dictation: { onDown: () => dictation.onShortcutDown(), onUp: () => dictation.onShortcutUp() },
      audioBooth: { onDown: () => {}, onUp: window.openAudioBooth },
      scratchpad: { onDown: () => {}, onUp: () => window.openMainWindow({ queryParams: { view: 'scratchpad' } }) },
      realtime: { onDown: () => {}, onUp: window.openRealtimeChatWindow },
      studio: { onDown: () => {}, onUp: window.openDesignStudioWindow },
      forge: { onDown: () => {}, onUp: window.openAgentForgeWindow },
    });
    keyMonitor.start();
  }

  // start mcp
  await fixPath()
  mcp = new Mcp(app);
  mcp.connect();

  // check and install CLI (skip in DEBUG mode)
  if (!process.env.DEBUG) {
    await checkAndInstallCLI(false);
  }

  // create the main window
  if (!settings.general.hideOnStartup || process.env.TEST) {
    log.info('Creating initial main window');
    window.openMainWindow({ queryParams: { view: 'chat'} });
  } else {
    app.dock?.hide();
  }

  // on config change
  config.setOnSettingsChange(() => {

    console.log('Settings changed');

    // notify browser windows
    window.emitIpcEventToAll('file-modified', 'settings');

    // update tray icon
    trayIconManager.install();

    // update main menu
    installMenu();

  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (window.areAllWindowsClosed()) {
      window.openMainWindow();
    }
  });

  // tray icon
  trayIconManager.install();

  // request notification permission
  new Notification();

  // create the document repository
  const docRepo = new DocumentRepository(app);
  docRepo.scanForUpdates(() => {
    docMonitor = new DocumentMonitor(app, docRepo);
    docMonitor.start();
  });

  // create the memory manager
  const memoryManager = new MemoryManager(app);

  // some platforms have a one-time automator initialization to do so give them a chance
  new Automator();

  // install IPC handlers
  installIpc(store, autoUpdater, docRepo, memoryManager, mcp, installMenu, registerShortcuts, quitApp);

  // install API endpoints
  try {
    installApiEndpoints(httpServer, app, mcp, docRepo);
  } catch (error) {
    console.error('Error installing API endpoints:', error);
  }

  // install agent webhook
  try {
    installAgentWebhook(httpServer, app, mcp, docRepo);
  } catch (error) {
    console.error('Error installing agent webhook:', error);
  }

  // cancel any stale running runs from previous crash
  agents.cancelStaleRunningRuns(app);

  // and now scheduler
  scheduler = new Scheduler(app, mcp, docRepo);
  scheduler.start();

  // we want some windows to be as fast as possible
  if (!process.env.TEST) {
    window.prepareMainWindow();
    window.preparePromptAnywhere();
    window.prepareCommandPicker();
    window.prepareDictationWindow();
  }

});

// called when the app is already running
app.on('second-instance', () => {
  window.openMainWindow();
});

//
app.on('before-quit', (ev) => {

  const closeAllWindows = () => {

    // close all windows
    BrowserWindow.getAllWindows().forEach((win) => {
      win.removeAllListeners('close');
      win.close();
    });

    // clean up when debugging (vscode restarts the app)
    if (process.env.DEBUG) {
      trayIconManager.destroy();
      shortcuts.unregisterShortcuts();
    }

  }

  // if force quit
  if (/*process.env.DEBUG ||*/ process.env.TEST || quitAnyway) {
    closeAllWindows();
    return;
  }

  // check settings
  const settings = config.loadSettings(app);
  if (!settings.general.keepRunning) {
    closeAllWindows();
    return;
  }

  // close all windows but do not quit
  BrowserWindow.getAllWindows().forEach((win) => win.close());
  ev.preventDefault();

});

// real quit
app.on('will-quit', () => {
  try { Menu.setApplicationMenu(null)  } catch { /* empty */ }
  try { trayIconManager.destroy();  } catch { /* empty */ }
  try { shortcuts.unregisterShortcuts(); } catch { /* empty */ }
  try { keyMonitor?.stop(); } catch { /* empty */ }
  try { docMonitor.stop(); } catch { /* empty */ }
  try { mcp?.shutdown(); } catch { /* empty */ }
})

// vscode debugging
app.on('render-process-gone', () => {
  quitAnyway = true;
  app.quit();
})
