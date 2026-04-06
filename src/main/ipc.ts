

import { LlmTool } from 'multi-llm-ts';
import { Application, RunCommandParams } from 'types/automation';
import { Configuration } from 'types/config';
import { Command, History } from 'types/index';
import { McpInstallStatus, McpServerWithTools, McpTool } from 'types/mcp';
import { Skill, SkillFileReadResult, SkillInstallResult, SkillSaveResult, SkillHeader, SkillUninstallResult } from 'types/skills';

import { app, clipboard, ipcMain, nativeImage, nativeTheme, shell } from 'electron';
import Store from 'electron-store';
import fontList from 'font-list';
import path from 'node:path';
import process from 'node:process';
import { getCachedText } from './utils';

import PromptAnywhere from './automations/anywhere';
import Automation, { AutomationAction } from './automations/automation';
import Commander, { askMeAnythingId, notEditablePrompts } from './automations/commander';
import Dictation from './automations/dictation';
import KeyMonitor from './keymonitor';
import DocumentRepository from './rag/docrepo';
import Embedder from './rag/embedder';
import AutoUpdater from './autoupdate';
import Computer from './computer';
import Mcp from './mcp';
import MemoryManager from './memory';
import MacOSPermissions from './permissions';
import LocalSearch from './search';

import * as IPC from '@/ipc_consts';
import * as agents from './agents';
import * as agentTracker from './agent_tracker';
import * as pyodide from './pyodide';
import * as backup from './backup';
import * as cliInstaller from './cli_installer';
import * as codeExec from './code_exec';
import * as commands from './commands';
import * as config from './config';
import * as experts from './experts';
import * as file from './file';
import * as google from './google';
import * as history from './history';
import * as i18n from './i18n';
import * as interpreter from './interpreter';
import * as markdown from './markdown';
import * as debug from './network';
import * as ollama from './ollama';
import * as pdf from './pdf';
import * as scratchpadManager from './scratchpad';
import * as shortcuts from './shortcuts';
import * as skills from './skills';
import * as text from './text';
import * as webview from './webview';
import * as window from './window';
import * as sttApple from './stt_apple';
import * as workspace from './workspace';
import { getTranscript } from './youtube';

import { AGENT_API_BASE_PATH } from './agent_webhook';
import { HttpServer } from './http_server';
import { importOpenAI } from './import_oai';
import { importMarkdown } from './import_md';

export const installIpc = (
  store: Store,
  autoUpdater: AutoUpdater,
  docRepo: DocumentRepository,
  memoryManager: MemoryManager,
  mcp: Mcp,
  installMenu: () => void,
  registerShortcuts: () => void,
  quitApp: () => void,
): void => {

  ipcMain.on(IPC.MAIN_WINDOW.UPDATE_MODE, (event, mode) => {
    window.setMainWindowMode(mode);
    installMenu();
  });

  ipcMain.on(IPC.MAIN_WINDOW.SET_CONTEXT_MENU_CONTEXT, (event, id) => {
    window.setMainContextMenuContext(id);
    installMenu();
  });

  ipcMain.on(IPC.MAIN_WINDOW.CLOSE, () => {
    window.mainWindow.close();
  });

  ipcMain.on(IPC.MAIN_WINDOW.HIDE_WINDOW_BUTTONS, () => {
    if (process.platform === 'darwin') {
      window.mainWindow.setWindowButtonVisibility(false);
    }
  });

  ipcMain.on(IPC.MAIN_WINDOW.SHOW_WINDOW_BUTTONS, () => {
    if (process.platform === 'darwin') {
      window.mainWindow.setWindowButtonVisibility(true);
    }
  });

  ipcMain.on(IPC.MAIN_WINDOW.MOVE_WINDOW, (_event, { deltaX, deltaY }) => {
    window.moveMainWindowBy(deltaX, deltaY);
  });

  ipcMain.on(IPC.APP.GET_VERSION, (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on(IPC.APP.SHOW_ABOUT, () => {
    app.showAboutPanel();
  });

  ipcMain.on(IPC.UPDATE.CHECK, () => {
    autoUpdater.check()
  })

  ipcMain.on(IPC.UPDATE.IS_AVAILABLE, (event) => {
    event.returnValue = autoUpdater.updateAvailable;
  });

  ipcMain.on(IPC.UPDATE.APPLY, () => {
    autoUpdater.install();
  });

  const updateThemeBasedOnTime = () => {
    const hour = new Date().getHours();
    // 6:00 - 18:00 使用明亮模式，其他时间使用黑暗模式
    const isDaytime = hour >= 6 && hour < 18;
    nativeTheme.themeSource = isDaytime ? 'light' : 'dark';
  };

  let themeUpdateInterval: NodeJS.Timeout | null = null;

  ipcMain.on(IPC.APP.SET_APPEARANCE_THEME, (event, theme) => {
    if (theme === 'system') {
      // 当选择系统主题时，根据时间自动切换
      updateThemeBasedOnTime();
      // 每小时检查一次时间，更新主题
      if (themeUpdateInterval) {
        clearInterval(themeUpdateInterval);
      }
      themeUpdateInterval = setInterval(updateThemeBasedOnTime, 60 * 60 * 1000);
    } else {
      // 当选择具体主题时，清除时间检查定时器
      if (themeUpdateInterval) {
        clearInterval(themeUpdateInterval);
        themeUpdateInterval = null;
      }
      nativeTheme.themeSource = theme;
    }
    event.returnValue = theme;
  });

  ipcMain.on(IPC.APP.GET_HTTP_PORT, async (event) => {
    event.returnValue = HttpServer.getInstance().getPort();
  });

  ipcMain.handle(IPC.APP.PRINT_TO_PDF, async (_event, payload: { html: string, landscape?: boolean }) => {
    const data = await pdf.printPdfFromHtml(payload);
    return data.toString('base64');
  });

  // ipcMain.handle(IPC.APP.SHOW_DIALOG, (event, payload): Promise<Electron.MessageBoxReturnValue> => {
  //   return dialog.showMessageBox(payload);
  // });

  ipcMain.on(IPC.DEBUG.SHOW_CONSOLE, () => {
    window.openDebugWindow();
  })

  ipcMain.on(IPC.DEBUG.GET_NETWORK_HISTORY, (event) => {
    event.returnValue = debug.getNetworkHistory();
  })

  ipcMain.on(IPC.DEBUG.CLEAR_NETWORK_HISTORY, () => {
    debug.clearNetworkHistory();
  })

  ipcMain.on(IPC.DEBUG.OPEN_APP_FOLDER, (event, name) => {
    shell.openPath(app.getPath(name))
  })

  ipcMain.on(IPC.APP.GET_APP_PATH, (event) => {
    event.returnValue = app.getPath('userData');
  });

  ipcMain.on(IPC.APP.GET_ASSET_PATH, (event, assetPath) => {
    const assetsFolder = process.env.DEBUG ? 'assets' : process.resourcesPath;
    event.returnValue = path.join(assetsFolder, assetPath.replace('./assets/', ''));
  });

  ipcMain.on(IPC.APP.FONTS_LIST, async (event) => {
    event.returnValue = await fontList.getFonts();
  });

  ipcMain.on(IPC.STORE.GET_VALUE, (event, payload) => {
    event.returnValue = store.get(payload.key, payload.fallback);
  });

  ipcMain.on(IPC.STORE.SET_VALUE, (event, payload) => {
    store.set(payload.key, payload.value);
  });

  ipcMain.on(IPC.CLIPBOARD.READ_TEXT, (event) => {
    const text = clipboard.readText();
    event.returnValue = text;
  });

  ipcMain.on(IPC.CLIPBOARD.WRITE_TEXT, async (event, payload) => {
    event.returnValue = await Automation.writeTextToClipboard(payload);
  });

  ipcMain.on(IPC.CLIPBOARD.WRITE_IMAGE, (event, payload) => {
    const image = nativeImage.createFromPath(payload.replace('file://', ''))
    clipboard.writeImage(image);
    event.returnValue = true;
  });

  ipcMain.on(IPC.CONFIG.GET_LOCALE_UI, (event) => {
    event.returnValue = i18n.getLocaleUI(app);
  });

  ipcMain.on(IPC.CONFIG.GET_LOCALE_LLM, (event) => {
    event.returnValue = i18n.getLocaleLLM(app);
  });

  ipcMain.on(IPC.CONFIG.GET_I18N_MESSAGES, (event) => {
    event.returnValue = i18n.getLocaleMessages(app);
  });

  ipcMain.on(IPC.CONFIG.LOAD, (event) => {
    event.returnValue = JSON.stringify(config.loadSettings(app));
  });

  ipcMain.on(IPC.CONFIG.SAVE, (event, payload) => {
    config.saveSettings(app, JSON.parse(payload) as Configuration);
  });

  ipcMain.on(IPC.HISTORY.LOAD, async (event, workspaceId) => {
    event.returnValue = JSON.stringify(await history.loadHistory(app, workspaceId));
  });

  ipcMain.on(IPC.HISTORY.SAVE, (event, payload) => {
    const { workspaceId, history: historyData } = JSON.parse(payload);
    event.returnValue = history.saveHistory(app, workspaceId, historyData as History);
  });

  ipcMain.on(IPC.COMMANDS.LOAD, (event) => {
    event.returnValue = JSON.stringify(commands.loadCommands(app));
  });

  ipcMain.on(IPC.COMMANDS.SAVE, (event, payload) => {
    event.returnValue = commands.saveCommands(app, JSON.parse(payload) as Command[]);
  });

  ipcMain.on(IPC.COMMANDS.EXPORT, (event) => {
    event.returnValue = commands.exportCommands(app);
  });

  ipcMain.on(IPC.COMMANDS.IMPORT, (event) => {
    event.returnValue = commands.importCommands(app);
  });

  ipcMain.on(IPC.COMMANDS.PICKER_CLOSE, async (_, sourceApp: Application) => {
    window.closeCommandPicker(sourceApp);
  });

  ipcMain.on(IPC.COMMANDS.ASK_ME_ANYTHING_ID, (event) => {
    event.returnValue = askMeAnythingId;
  });

  ipcMain.on(IPC.COMMANDS.IS_PROMPT_EDITABLE, (event, payload) => {
    event.returnValue = !notEditablePrompts.includes(payload);
  });

  ipcMain.on(IPC.COMMANDS.RUN, async (event, payload) => {

    // prepare
    const args: RunCommandParams = JSON.parse(payload);
    await window.closeCommandPicker(args.sourceApp);

    // now run
    const commander = new Commander();
    await commander.execCommand(app, args);
    
  });

  ipcMain.on(IPC.EXPERTS.LOAD, (event, workspaceId) => {
    event.returnValue = JSON.stringify(experts.loadExperts(app, workspaceId));
  });

  ipcMain.on(IPC.EXPERTS.SAVE, (event, payload) => {
    const { workspaceId, experts: data } = JSON.parse(payload);
    event.returnValue = experts.saveExperts(app, workspaceId, data);
  });

  ipcMain.on(IPC.EXPERTS.LOAD_CATEGORIES, (event, workspaceId) => {
    event.returnValue = JSON.stringify(experts.loadCategories(app, workspaceId));
  });

  ipcMain.on(IPC.EXPERTS.SAVE_CATEGORIES, (event, payload) => {
    const { workspaceId, categories } = JSON.parse(payload);
    event.returnValue = experts.saveCategories(app, workspaceId, categories);
  });

  ipcMain.on(IPC.EXPERTS.EXPORT, (event, workspaceId) => {
    event.returnValue = experts.exportExperts(app, workspaceId);
  });

  ipcMain.on(IPC.EXPERTS.IMPORT, (event, workspaceId) => {
    event.returnValue = experts.importExperts(app, workspaceId);
  });

  ipcMain.on(IPC.BACKUP.EXPORT, async (event) => {
    event.returnValue = await backup.exportBackup(app);
  });

  ipcMain.on(IPC.BACKUP.IMPORT, async (event) => {
    event.returnValue = await backup.importBackup(app, quitApp);
  });

  ipcMain.on(IPC.IMPORT.OPENAI, async (event, workspaceId: string) => {
    event.returnValue = await importOpenAI(app, workspaceId);
  });

  ipcMain.on(IPC.IMPORT.MARKDOWN, async (event) => {
    const chat = await importMarkdown(app);
    event.returnValue = chat || null;
  });

  ipcMain.on(IPC.AGENTS.OPEN_FORGE,  () => {
    //window.openAgentForgeWindow();
  });

  ipcMain.on(IPC.AGENTS.LIST, (event, workspaceId) => {
    event.returnValue = JSON.stringify(agents.listAgents(app, workspaceId));
  });

  ipcMain.on(IPC.AGENTS.LOAD, (event, payload) => {
    const { workspaceId, agentId } = JSON.parse(payload);
    event.returnValue = JSON.stringify(agents.loadAgent(app, workspaceId, agentId));
  });

  ipcMain.on(IPC.AGENTS.SAVE, (event, payload) => {
    const { workspaceId, agent: agentData } = JSON.parse(payload);
    event.returnValue = agents.saveAgent(app, workspaceId, agentData);
  });

  ipcMain.on(IPC.AGENTS.DELETE, (event, payload) => {
    const { workspaceId, agentId } = JSON.parse(payload);
    event.returnValue = agents.deleteAgent(app, workspaceId, agentId);
  });

  ipcMain.on(IPC.AGENTS.GET_RUNS, (event, payload) => {
    const { workspaceId, agentId } = JSON.parse(payload);
    event.returnValue = JSON.stringify(agents.getAgentRuns(app, workspaceId, agentId));
  });

  ipcMain.on(IPC.AGENTS.GET_RUN, (event, payload) => {
    const { workspaceId, agentId, runId } = JSON.parse(payload);
    event.returnValue = JSON.stringify(agents.getAgentRun(app, workspaceId, agentId, runId));
  });

  ipcMain.on(IPC.AGENTS.SAVE_RUN, (event, payload) => {
    const { workspaceId, run: runData } = JSON.parse(payload);
    event.returnValue = agents.saveAgentRun(app, workspaceId, runData);
  });

  ipcMain.on(IPC.AGENTS.DELETE_RUN, (event, payload) => {
    const { workspaceId, agentId, runId } = JSON.parse(payload);
    event.returnValue = agents.deleteAgentRun(app, workspaceId, agentId, runId);
  });

  ipcMain.on(IPC.AGENTS.DELETE_RUNS, (event, payload) => {
    const { workspaceId, agentId } = JSON.parse(payload);
    event.returnValue = agents.deleteAgentRuns(app, workspaceId, agentId);
  });

  ipcMain.on(IPC.AGENTS.GET_RUNNING_RUNS, (event) => {
    event.returnValue = JSON.stringify(agentTracker.getRunningAgentRuns());
  });

  ipcMain.on(IPC.AGENTS.ABORT_RUN, (event, payload) => {
    const { agentId, runId } = JSON.parse(payload);
    event.returnValue = agentTracker.abortRun(agentId, runId);
  });

  ipcMain.handle(IPC.AGENTS.GENERATE_WEBHOOK_TOKEN, async (_event, workspaceId: string, agentId: string) => {
    const { generateWebhookToken } = await import('./agent_utils');
    return generateWebhookToken(app, workspaceId, agentId);
  });

  ipcMain.on(IPC.AGENTS.GET_API_BASE_PATH, (event) => {
    event.returnValue = AGENT_API_BASE_PATH;
  });

  ipcMain.on(IPC.WORKSPACE.LIST, (event) => {
    event.returnValue = JSON.stringify(workspace.listWorkspaces(app));
  });

  ipcMain.on(IPC.WORKSPACE.LOAD, (event, workspaceId) => {
    event.returnValue = JSON.stringify(workspace.loadWorkspace(app, workspaceId));
  });

  ipcMain.on(IPC.WORKSPACE.SAVE, (event, payload) => {
    event.returnValue = workspace.saveWorkspace(app, JSON.parse(payload));
  });

  ipcMain.on(IPC.WORKSPACE.DELETE, (event, workspaceId) => {
    event.returnValue = workspace.deleteWorkspace(app, workspaceId);
  });

  ipcMain.handle(IPC.CLI.INSTALL, async () => {
    return await cliInstaller.retryInstallCLI();
  });

  ipcMain.on(IPC.SETTINGS.OPEN, (event, payload) => {
    window.openSettingsWindow(payload);
  });

  ipcMain.on(IPC.APP.RUN_AT_LOGIN_GET, (event) => {
    event.returnValue = app.getLoginItemSettings();
  });

  ipcMain.on(IPC.APP.RUN_AT_LOGIN_SET, (_, value) => {
    if (app.getLoginItemSettings().openAtLogin != value) {
      app.setLoginItemSettings({
        openAtLogin: value,
        openAsHidden: true,
      });
    }
  });

  ipcMain.on(IPC.SHORTCUTS.REGISTER, () => {
    registerShortcuts();
  });

  ipcMain.on(IPC.SHORTCUTS.UNREGISTER, () => {
    shortcuts.unregisterShortcuts();
  });

  ipcMain.on(IPC.SHORTCUTS.IS_NATIVE_SUPPORTED, (event) => {
    event.returnValue = KeyMonitor.isPlatformSupported();
  });

  ipcMain.on(IPC.SHORTCUTS.IS_VALID_NATIVE, (event, shortcut) => {
    event.returnValue = KeyMonitor.parseNativeShortcut(shortcut) !== null;
  });

  ipcMain.on(IPC.APP.FULLSCREEN, (_, payload) => {
    if (payload.window === 'main') {
      window.mainWindow.setFullScreen(payload.state);
    } else if (payload.window === 'create') {
      window.mainWindow.setFullScreen(payload.state);
    }
  });

  ipcMain.on(IPC.FILE.DELETE_FILE, (event, payload) => {
    event.returnValue = file.deleteFile(payload);
  });

  ipcMain.on(IPC.FILE.PICK_FILE, (event, payload) => {
    event.returnValue = file.pickFile(app, JSON.parse(payload));
  });

  ipcMain.on(IPC.FILE.PICK_DIRECTORY, (event) => {
    event.returnValue = file.pickDirectory(app);
  });

  ipcMain.on(IPC.FILE.FIND_PROGRAM, (event, payload) => {
    event.returnValue = file.findProgram(app, payload);
  });

  ipcMain.on(IPC.FILE.READ_FILE, (event, payload) => {
    event.returnValue = file.getFileContents(app, payload);
  });

  ipcMain.on(IPC.FILE.READ_ICON, async (event, payload) => {
    event.returnValue = await file.getIconContents(app, payload);
  });

  ipcMain.on(IPC.FILE.SAVE_FILE, (event, payload) => {
    event.returnValue = file.writeFileContents(app, JSON.parse(payload));
  });

  ipcMain.on(IPC.FILE.DOWNLOAD, async (event, payload) => {
    event.returnValue = await file.downloadFile(app, JSON.parse(payload));
  });

  ipcMain.handle(IPC.FILE.GET_TEXT_CONTENT, async (event, contents, format) => {
    return await text.getTextContent(contents, format);
  });

  ipcMain.on(IPC.FILE.GET_APP_INFO, async (event, payload) => {
    event.returnValue = await file.getAppInfo(app, payload);
  });

  ipcMain.on(IPC.FILE.LIST_DIRECTORY, (event, dirPath, includeHidden) => {
    try {
      event.returnValue = {
        success: true,
        items: file.listDirectory(app, dirPath, includeHidden)
      }
    } catch (error) {
      console.error('Error while listing directory', error);
      event.returnValue = {
        success: false,
        error: error.message
      }
    }
  });

  ipcMain.on(IPC.FILE.FILE_EXISTS, (event, filePath) => {
    event.returnValue = file.fileExists(app, filePath);
  });

  ipcMain.on(IPC.FILE.FILE_STATS, (event, filePath) => {
    event.returnValue = file.fileStats(app, filePath);
  });

  ipcMain.on(IPC.FILE.WRITE_FILE, (event, filePath, content) => {
    event.returnValue = file.writeFile(app, filePath, content);
  });

  ipcMain.handle(IPC.FILE.FIND_FILES, async (event, basePath, pattern, maxResults) => {
    try {
      return await file.findFiles(app, basePath, pattern, maxResults);
    } catch (error) {
      console.error('Error while finding files', error);
      throw error;
    }
  });

  ipcMain.on(IPC.FILE.NORMALIZE_PATH, (event, filePath) => {
    event.returnValue = file.normalizePath(app, filePath);
  });

  ipcMain.on(IPC.FILE.OPEN_IN_EXPLORER, (event, filePath) => {
    try {
      ollama.openInFileExplorer(filePath);
      event.returnValue = { success: true };
    } catch (error) {
      event.returnValue = { success: false, error: error.message };
    }
  });

  ipcMain.on(IPC.MARKDOWN.RENDER, (event, payload) => {
    event.returnValue = markdown.renderMarkdown(payload);
  });

  ipcMain.handle(IPC.INTERPRETER.PYTHON_RUN, async (event, payload) => {
    try {
      const result = await interpreter.runPython(payload);
      return { result: result }
    } catch (error) {
      console.log('Error while running python', error);
      return { error: error || 'Unknown error' }
    }
  })

  ipcMain.handle(IPC.INTERPRETER.PYODIDE_RUN, async (event, payload) => {
    return await pyodide.runPythonCode(payload)
  })

  ipcMain.handle(IPC.INTERPRETER.PYODIDE_DOWNLOAD, async () => {
    try {
      await pyodide.downloadPyodideRuntime()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC.INTERPRETER.PYODIDE_IS_CACHED, () => {
    return pyodide.isPyodideCached()
  })

  ipcMain.handle(IPC.INTERPRETER.PYODIDE_CLEAR_CACHE, async () => {
    return pyodide.clearPyodideCache();
  })

  ipcMain.on(IPC.AUTOMATION.GET_TEXT, (event, payload) => {
    event.returnValue = getCachedText(payload);
  })

  ipcMain.on(IPC.AUTOMATION.INSERT, async (event, payload) => {
    const { text, sourceApp } = payload
    event.returnValue = await Automation.automate(text, sourceApp, AutomationAction.INSERT_BELOW);
  })

  ipcMain.on(IPC.AUTOMATION.REPLACE, async (event, payload) => {
    const { text, sourceApp } = payload
    event.returnValue = await Automation.automate(text, sourceApp, AutomationAction.REPLACE);
  })

  ipcMain.on(IPC.CHAT.OPEN, async (_, chatId) => {
    await window.openMainWindow({ queryParams: { view: 'chat', chatId: chatId } });
  })

  ipcMain.on(IPC.ANYWHERE.PROMPT, async () => {
    await PromptAnywhere.open();
  });

  ipcMain.on(IPC.ANYWHERE.CLOSE, async (_, sourceApp: Application) => {
    await PromptAnywhere.close(sourceApp);
  })

  ipcMain.on(IPC.ANYWHERE.RESIZE, async (_, payload) => {
    await window.resizePromptAnywhere(payload.deltaX, payload.deltaY);
  })

  ipcMain.on(IPC.READALOUD.CLOSE_PALETTE, async (_, sourceApp: Application) => {
    await window.releaseFocus({ sourceApp });
    await window.closeReadAloudPalette();
  });

  ipcMain.on(IPC.DICTATION.CLOSE, async (_, payload: { text: string, sourceApp: Application }) => {
    await window.closeDictationWindow(payload.text, payload.sourceApp);
  });

  ipcMain.on(IPC.TRANSCRIBE.INSERT, async (_, payload) => {
    await Dictation.insertTranscription(payload);
  });

  ipcMain.handle(IPC.TRANSCRIBE.APPLE_CLI, async (_, audioData: ArrayBuffer, options?: sttApple.AppleTranscribeOptions) => {
    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(audioData);
    return await sttApple.transcribeWithAppleCLI(buffer, options);
  });

  ipcMain.on(IPC.DOCREPO.OPEN, (_, create?: boolean) => {
    window.openMainWindow({ queryParams: { view: 'docrepos', create: create } });
  });

  ipcMain.on(IPC.DOCREPO.LIST, (event, workspaceId: string) => {
    event.returnValue = JSON.stringify(docRepo.list(workspaceId));
  });

  ipcMain.on(IPC.DOCREPO.CONNECT, async (event, baseId) => {
    try {
      await docRepo.connect(baseId, true);
      event.returnValue = true
    } catch (error) {
      console.error(error);
      event.returnValue = false
    }
  });

  ipcMain.on(IPC.DOCREPO.DISCONNECT, async (event) => {
    try {
      await docRepo.disconnect();
      event.returnValue = true
    } catch (error) {
      console.error(error);
      event.returnValue = false
    }
  });

  ipcMain.on(IPC.DOCREPO.CREATE, async (event, payload) => {
    try {
      const { workspaceId, title, embeddingEngine, embeddingModel } = payload;
      event.returnValue = await docRepo.createDocBase(workspaceId, title, embeddingEngine, embeddingModel);
    } catch (error) {
      console.error(error);
      event.returnValue = null
    }
  });

  ipcMain.on(IPC.DOCREPO.UPDATE, async (event, payload) => {
    try {
      const { baseId, title, description } = payload;
      await docRepo.updateDocBase(baseId, title, description);
      event.returnValue = true
    } catch (error) {
      console.error(error);
      event.returnValue = false
    }
  });

  ipcMain.on(IPC.DOCREPO.DELETE, async (event, baseId) => {
    try {
      await docRepo.deleteDocBase(baseId);
      event.returnValue = true
    } catch (error) {
      console.error(error);
      event.returnValue = false
    }
  });

  ipcMain.handle(IPC.DOCREPO.ADD_DOCUMENT, async (_, payload) => {
    try {
      const { baseId, type, origin, opts } = payload;
      return await docRepo.addDocumentSource(baseId, type, origin, true, opts);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle(IPC.DOCREPO.CANCEL_TASK, async (_, payload) => {
    try {
      const { taskId } = payload;
      docRepo.cancelTask(taskId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  ipcMain.handle(IPC.DOCREPO.REMOVE_DOCUMENT, async (_, payload) => {
    try {
      const { baseId, docId } = payload;
      console.log('docrepo-remove-document', baseId, docId);
      await docRepo.removeDocumentSource(baseId, docId);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });

  ipcMain.handle(IPC.DOCREPO.QUERY, async(_, payload) => {
    try {
      const { baseId, text } = payload;
      console.log('docrepo-query', baseId, text);
      const results = await docRepo.query(baseId, text);
      console.log('docrepo-query results returned = ', results.length);
      return results
    } catch (error) {
      console.error(error);
      return []
    }
  });

  ipcMain.on(IPC.DOCREPO.IS_EMBEDDING_AVAILABLE, async(event, payload) => {
    try {
      const { engine, model } = payload;
      event.returnValue = Embedder.isModelReady(app, engine, model);
    } catch (error) {
      console.error(error);
      event.returnValue = false
    }
  });

  ipcMain.handle(IPC.DOCREPO.GET_CURRENT_QUEUE_ITEM, async() => {
    return docRepo.getCurrentQueueItem()
  });

  ipcMain.on(IPC.DOCREPO.IS_SOURCE_SUPPORTED, (event, payload) => {
    try {
      const { type, origin } = payload;
      event.returnValue = docRepo.isSourceSupported(type, origin);
    } catch (error) {
      console.error('Error checking if file is supported:', error);
      event.returnValue = false;
    }
  });

  ipcMain.handle(IPC.DOCREPO.SCAN_FOR_UPDATES, async (_, payload) => {
    const { baseId, forceWebRescan } = payload;
    await docRepo.doScanForUpdates(baseId, forceWebRescan);
  });

  ipcMain.on(IPC.MCP.IS_AVAILABLE, (event) => {
    event.returnValue = mcp !== null;
  });

  ipcMain.on(IPC.MCP.GET_SERVERS, (event) => {
    event.returnValue = mcp ? mcp.getServers() : [];
  });

  ipcMain.handle(IPC.MCP.EDIT_SERVER, async (_, server): Promise<boolean> => {
    return mcp ? await mcp.editServer(JSON.parse(server)) : false;
  });

  ipcMain.handle(IPC.MCP.DELETE_SERVER, async (_, uuid): Promise<boolean> => {
    return await mcp?.deleteServer(uuid) || false;
  });

  ipcMain.on(IPC.MCP.GET_INSTALL_COMMAND, (event, payload) => {
    const { registry, server } = payload;
    event.returnValue = mcp ? mcp.getInstallCommand(registry, server, '') : '';
  });

  ipcMain.handle(IPC.MCP.INSTALL_SERVER, async (_, payload): Promise<McpInstallStatus> => {
    const { registry, server, apiKey } = payload;
    return await mcp?.installServer(registry, server, apiKey) || 'error';
  });

  ipcMain.handle(IPC.MCP.RELOAD, async () => {
    await mcp?.reload();
  });

  ipcMain.handle(IPC.MCP.RESTART_SERVER, async (_, uuid: string): Promise<boolean> => {
    return mcp ? await mcp.restartServer(uuid) : false;
  });

  ipcMain.on(IPC.MCP.GET_STATUS, (event): void => {
    event.returnValue = mcp ? mcp.getStatus() : null;
  });

  ipcMain.handle(IPC.MCP.GET_ALL_SERVERS_WITH_TOOLS, async (): Promise<McpServerWithTools[]> => {
    return mcp ? await mcp.getAllServersWithTools() : [];
  });

  ipcMain.handle(IPC.MCP.GET_SERVER_TOOLS, async (_, payload): Promise<McpTool[]> => {
    return mcp ? await mcp.getServerTools(payload) : [];
  });

  ipcMain.handle(IPC.MCP.GET_LLM_TOOLS, async (): Promise<LlmTool[]> => {
    return mcp ? await mcp.getLlmTools() : [];
  });

  // Track active MCP tool calls
  const activeMcpCalls = new Map<string, AbortController>();

  ipcMain.handle(IPC.MCP.CALL_TOOL, async (_, payload) => {
    const { name, parameters, signalId } = payload;

    if (!mcp) return null;

    // Create abort controller if signalId provided
    let abortController: AbortController | undefined;
    if (signalId) {
      abortController = new AbortController();
      activeMcpCalls.set(signalId, abortController);
    }

    try {
      return await mcp.callTool(name, parameters, abortController?.signal);
    } finally {
      // Clean up
      if (signalId) {
        activeMcpCalls.delete(signalId);
      }
    }
  });

  ipcMain.on(IPC.MCP.CANCEL_TOOL, (_, signalId: string) => {
    const controller = activeMcpCalls.get(signalId);
    if (controller) {
      controller.abort();
      activeMcpCalls.delete(signalId);
    }
  });

  ipcMain.on(IPC.MCP.ORIGINAL_TOOL_NAME, (event, payload) => {
    event.returnValue = mcp ? mcp.originalToolName(payload) : payload;
  });

  ipcMain.handle(IPC.MCP.DETECT_OAUTH, async (_, payload): Promise<any> => {
    const { type, url, headers } = payload;
    return mcp ? await mcp.detectOAuth(type, url, headers) : { requiresOAuth: false };
  });

  ipcMain.handle(IPC.MCP.START_OAUTH_FLOW, async (_, payload): Promise<string> => {
    const { type, url, clientMetadata, clientCredentials } = JSON.parse(payload);
    return mcp ? await mcp.startOAuthFlow(type, url, clientMetadata, clientCredentials) : '';
  });

  ipcMain.handle(IPC.MCP.COMPLETE_OAUTH_FLOW, async (_, payload): Promise<boolean> => {
    const { serverUuid, authCode } = JSON.parse(payload);
    return mcp ? await mcp.completeOAuthFlow(serverUuid, authCode) : false;
  });

  ipcMain.on(IPC.SCRATCHPAD.CREATE, (event, { workspaceId, text }) => {
    const uuid = crypto.randomUUID();
    const now = Date.now();
    const scratchpadData = {
      uuid,
      title: 'Untitled',
      contents: { content: text },
      chat: null as any,
      createdAt: now,
      lastModified: now
    };
    scratchpadManager.saveScratchpad(app, workspaceId, scratchpadData);
    event.returnValue = uuid;
  });

  ipcMain.on(IPC.SCRATCHPAD.OPEN, async (_, { uuid }) => {
    // Switch main window to scratchpad mode instead of opening new window
    if (window.mainWindow) {
      window.mainWindow.show();
      window.mainWindow.focus();

      const params: any = {
        view: 'scratchpad',
        scratchpadId: uuid
      };

      window.emitIpcEvent(window.mainWindow, 'query-params', params);
    }
  });

  ipcMain.on(IPC.SCRATCHPAD.LIST, (event, workspaceId) => {
    event.returnValue = scratchpadManager.listScratchpads(app, workspaceId);
  });

  ipcMain.on(IPC.SCRATCHPAD.LOAD, (event, { workspaceId, uuid }) => {
    event.returnValue = scratchpadManager.loadScratchpad(app, workspaceId, uuid);
  });

  ipcMain.on(IPC.SCRATCHPAD.SAVE, (event, { workspaceId, data }) => {
    event.returnValue = scratchpadManager.saveScratchpad(app, workspaceId, data);
  });

  ipcMain.on(IPC.SCRATCHPAD.RENAME, (event, { workspaceId, uuid, newTitle }) => {
    event.returnValue = scratchpadManager.renameScratchpad(app, workspaceId, uuid, newTitle);
  });

  ipcMain.on(IPC.SCRATCHPAD.DELETE, (event, { workspaceId, uuid }) => {
    event.returnValue = scratchpadManager.deleteScratchpad(app, workspaceId, uuid);
  });

  ipcMain.on(IPC.SCRATCHPAD.IMPORT, (event, { workspaceId, filePath, title }) => {
    event.returnValue = scratchpadManager.importScratchpad(app, workspaceId, filePath, title);
  });

  ipcMain.on(IPC.COMPUTER.IS_AVAILABLE, async (event) => {
    event.returnValue = await Computer.isAvailable();
  });

  ipcMain.on(IPC.COMPUTER.GET_SCALED_SCREEN_SIZE, (event) => {
    event.returnValue = Computer.getScaledScreenSize();
  });

  ipcMain.on(IPC.COMPUTER.GET_SCREEN_NUMBER, (event) => {
    event.returnValue = Computer.getScreenNumber();
  });

  ipcMain.on(IPC.COMPUTER.GET_SCREENSHOT, async (event) => {
    event.returnValue = await Computer.takeScreenshot();
  });

  ipcMain.on(IPC.COMPUTER.EXECUTE_ACTION, async (event, payload) => {
    event.returnValue = await Computer.executeAction(payload);
  });

  ipcMain.on(IPC.COMPUTER.START, async () => {
    window.mainWindow?.minimize();
    window.openComputerStatusWindow();
  });

  ipcMain.on(IPC.COMPUTER.CLOSE, async () => {
    window.closeComputerStatusWindow();
    window.mainWindow?.restore();
  });

  ipcMain.on(IPC.COMPUTER.STOP, async () => {
    try {
      if (window.mainWindow) {
        window.emitIpcEvent(window.mainWindow, 'computer-stop');
      }
    } catch { /* empty */ }
  });

  ipcMain.on(IPC.COMPUTER.STATUS, async (_, payload) => {
    try {
      if (window.computerStatusWindow) {
        window.emitIpcEvent(window.computerStatusWindow, 'computer-status', payload);
      }
    } catch { /* empty */ }
  });

  ipcMain.on(IPC.MEMORY.RESET, async () => {
    await memoryManager.reset();
  });

  ipcMain.on(IPC.MEMORY.HAS_FACTS, async (event) => {
    event.returnValue = await memoryManager.isNotEmpty();
  });

  ipcMain.on(IPC.MEMORY.FACTS, async (event) => {
    event.returnValue = await memoryManager.list();
  });

  ipcMain.on(IPC.MEMORY.STORE, async (event, payload) => {
    event.returnValue = await memoryManager.store(payload);
  });

  ipcMain.on(IPC.MEMORY.RETRIEVE, async (event, payload) => {
    event.returnValue = await memoryManager.query(payload);
  });

  ipcMain.on(IPC.MEMORY.DELETE, async (event, payload) => {
    event.returnValue = await memoryManager.delete(payload);
  });

  ipcMain.on(IPC.CODE_EXECUTION.LOAD, (event) => {
    event.returnValue = JSON.stringify(codeExec.loadCodeExecutionData(app));
  });

  ipcMain.on(IPC.CODE_EXECUTION.SAVE, (event, payload) => {
    codeExec.saveCodeExecutionData(app, JSON.parse(payload));
  });

  // Track active search operations
  const activeSearches = new Map<string, AbortController>();

  ipcMain.handle(IPC.SEARCH.QUERY, async (_, payload) => {
    
    const { query, num, signalId } = payload;

    // Create abort controller if signalId provided
    let abortController: AbortController | undefined;
    if (signalId) {
      abortController = new AbortController();
      activeSearches.set(signalId, abortController);
    }

    try {
      const localSearch = new LocalSearch();
      const results = await localSearch.search(query, num, false, abortController?.signal);
      return results;
    } catch (error: any) {
      return error;
    } finally {
      if (signalId) {
        activeSearches.delete(signalId);
      }
    }
  });

  ipcMain.on(IPC.SEARCH.CANCEL, (_, signalId: string) => {
    const controller = activeSearches.get(signalId);
    if (controller) {
      controller.abort();
      activeSearches.delete(signalId);
    }
  });

  ipcMain.handle(IPC.SEARCH.TEST, async () => {
    const localSearch = new LocalSearch();
    const result = localSearch.test();
    return result;
  });

  ipcMain.on(IPC.SKILLS.DEFAULT_LOCATIONS, (event, workspaceId: string) => {
    event.returnValue = skills.defaultSkillLocations(app, workspaceId)
  })

  ipcMain.on(IPC.SKILLS.LIST, (event, workspaceId: string) => {
    const list: SkillHeader[] = skills.listSkills(app, workspaceId)
    event.returnValue = list
  })

  ipcMain.on(IPC.SKILLS.LOAD, (event, payload: { workspaceId: string, skillId: string }) => {
    const loaded: Skill | null = skills.loadSkill(app, payload.workspaceId, payload.skillId)
    event.returnValue = loaded
  })

  ipcMain.on(IPC.SKILLS.GET_FILE, (event, payload: {
    workspaceId: string
    skillId: string
    relativePath: string
    startLine?: number
    endLine?: number
  }) => {
    const result: SkillFileReadResult = skills.getSkillFile(
      app,
      payload.workspaceId,
      payload.skillId,
      payload.relativePath,
      payload.startLine,
      payload.endLine,
    )
    event.returnValue = result
  })

  ipcMain.handle(IPC.SKILLS.INSTALL_FROM_URL, async (_event, payload: { url: string, installPath: string }) => {
    const result: SkillInstallResult = await skills.installSkillFromUrl(app, payload.url, payload.installPath)
    return result
  })

  ipcMain.on(IPC.SKILLS.UNINSTALL, (event, payload: { workspaceId: string, skillId: string }) => {
    const result: SkillUninstallResult = skills.uninstallSkill(app, payload.workspaceId, payload.skillId)
    event.returnValue = result
  })

  ipcMain.on(IPC.SKILLS.CREATE, (event, payload: {
    workspaceId: string
    payload: { name: string, description?: string, instructions: string }
  }) => {
    const result: SkillSaveResult = skills.createSkill(app, payload.workspaceId, payload.payload)
    event.returnValue = result
  })

  ipcMain.on(IPC.SKILLS.UPDATE, (event, payload: {
    workspaceId: string
    skillId: string
    payload: { name: string, description?: string, instructions: string }
  }) => {
    const result: SkillSaveResult = skills.updateSkill(app, payload.workspaceId, payload.skillId, payload.payload)
    event.returnValue = result
  })

  ipcMain.on(IPC.STUDIO.START, () => {
    window.openDesignStudioWindow();
  })

  ipcMain.on(IPC.VOICE_MODE.START, () => {
    window.openRealtimeChatWindow();
  })

  // YouTube transcript handler
  ipcMain.handle(IPC.YOUTUBE.GET_TRANSCRIPT, (_, url: string) => {
    return getTranscript(url);
  });

  // Ollama download handlers
  ipcMain.handle(IPC.OLLAMA.DOWNLOAD_START, async (event, targetDirectory: string) => {
    try {
      const downloadId = ollama.startDownload(targetDirectory);
      return { success: true, downloadId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC.OLLAMA.DOWNLOAD_CANCEL, async () => {
    const cancelled = ollama.cancelDownload();
    return { success: cancelled };
  });

  // Permissions handlers (macOS only)
  ipcMain.handle(IPC.PERMISSIONS.CHECK_ACCESSIBILITY, async () => {
    if (process.platform === 'darwin') {
      return await MacOSPermissions.checkAccessibility();
    }
    return true; // Non-macOS platforms don't need these permissions
  });

  ipcMain.handle(IPC.PERMISSIONS.CHECK_AUTOMATION, async () => {
    if (process.platform === 'darwin') {
      return await MacOSPermissions.checkAutomation();
    }
    return true; // Non-macOS platforms don't need these permissions
  });

  ipcMain.handle(IPC.PERMISSIONS.OPEN_ACCESSIBILITY_SETTINGS, async () => {
    if (process.platform === 'darwin') {
      return await MacOSPermissions.openAccessibilitySettings();
    }
  });

  ipcMain.handle(IPC.PERMISSIONS.OPEN_AUTOMATION_SETTINGS, async () => {
    if (process.platform === 'darwin') {
      return await MacOSPermissions.openAutomationSettings();
    }
  });

  ipcMain.handle(IPC.GOOGLE.DOWNLOAD_MEDIA, async (event, payload: any) => {
    try {
      const { url, mimeType } = payload;
      return await google.downloadMedia(app, url, mimeType);
    } catch (error) {
      console.error('Error downloading Google media:', error);
      return null;
    }
  })

  // webview
  ipcMain.handle(IPC.WEBVIEW.SET_LINK_BEHAVIOR, (_, webviewId: number, isExternal: boolean) => {
    webview.setWebviewLinkBehavior(webviewId, isExternal);
  });

  ipcMain.handle(IPC.WEBVIEW.SET_SPELL_CHECK, (_, webviewId: number, enabled: boolean) => {
    webview.setWebviewSpellCheck(webviewId, enabled);
  });

}
